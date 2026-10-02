import { z } from "zod";
import {
  createTRPCRouter,
  adminProcedure,
} from "../trpc";
import { USER_SELECT_PUBLIC, OPINION } from "../../constants";
import { setSystemSetting, getSystemSetting, GLOBAL_CONFIG_KEYS } from "../../config";

const UserAction = z.enum(["VERIFY", "SUSPEND", "BAN", "RESTORE"]);
const PostAction = z.enum(["APPROVE", "HIDE", "REMOVE", "FEATURE", "UNFEATURE"]);

export const adminRouter = createTRPCRouter({
  dashboardStats: adminProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalPosts,
      totalVotes,
      totalComments,
      totalShares,
      totalReports,
      newUsers,
      newUsers30d,
      dau,
      mau,
    ] = await Promise.all([
      ctx.prisma.user.count(),
      ctx.prisma.post.count(),
      ctx.prisma.vote.count(),
      ctx.prisma.comment.count(),
      ctx.prisma.post.aggregate({ _sum: { shareCount: true } }),
      ctx.prisma.report.count(),
      ctx.prisma.user.count({ where: { createdAt: { gte: oneDayAgo } } }),
      ctx.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      ctx.prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: oneDayAgo } },
        distinct: ["userId"],
        select: { userId: true },
      }).then((r) => r.filter((x) => x.userId).length),
      ctx.prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        distinct: ["userId"],
        select: { userId: true },
      }).then((r) => r.filter((x) => x.userId).length),
    ]);

    const dailyEventsRaw = await ctx.prisma.analyticsEvent.groupBy({
      by: ["eventType"],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
    });
    const dailyEvents = Object.fromEntries(
      dailyEventsRaw.map((e) => [e.eventType, e._count._all]),
    );

    return {
      totals: {
        users: totalUsers,
        posts: totalPosts,
        votes: totalVotes,
        comments: totalComments,
        shares: totalShares._sum.shareCount ?? 0,
        reports: totalReports,
      },
      growth: {
        newUsers24h: newUsers,
        newUsers30d: newUsers30d,
      },
      activity: {
        dau,
        mau,
        retention: mau > 0 ? dau / mau : 0,
      },
      events: dailyEvents,
    };
  }),

  usersList: adminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(["ALL", "SUSPENDED", "BANNED", "VERIFIED"]).default("ALL"),
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.search) {
        where.OR = [
          { username: { contains: input.search, mode: "insensitive" } },
          { email: { contains: input.search, mode: "insensitive" } },
          { displayName: { contains: input.search, mode: "insensitive" } },
        ];
      }
      if (input.status === "SUSPENDED") where.isSuspended = true;
      if (input.status === "BANNED") where.isBanned = true;
      if (input.status === "VERIFIED") where.isVerified = true;

      const items = await ctx.prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        select: {
          ...USER_SELECT_PUBLIC,
          email: true,
          isSuspended: true,
          isBanned: true,
          suspensionExpiresAt: true,
          banReason: true,
          lastActiveAt: true,
          _count: {
            select: {
              posts: true,
              comments: true,
              votes: true,
              followers: true,
              following: true,
            },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      let hasMore = false;
      if (items.length > input.limit) {
        hasMore = true;
        items.pop();
        nextCursor = items[items.length - 1]?.id;
      }
      return { items, nextCursor, hasMore };
    }),

  usersUpdateStatus: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        action: UserAction,
        reason: z.string().max(500).optional(),
        suspensionExpiresAt: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = {};
      let modAction: "APPROVED" | "WARNING" | "SUSPENDED" | "BANNED" = "WARNING";

      switch (input.action) {
        case "VERIFY":
          data.isVerified = true;
          modAction = "APPROVED";
          break;
        case "SUSPEND":
          data.isSuspended = true;
          data.suspensionExpiresAt = input.suspensionExpiresAt;
          modAction = "SUSPENDED";
          break;
        case "BAN":
          data.isBanned = true;
          data.banReason = input.reason;
          modAction = "BANNED";
          break;
        case "RESTORE":
          data.isSuspended = false;
          data.isBanned = false;
          data.suspensionExpiresAt = null;
          data.banReason = null;
          modAction = "APPROVED";
          break;
      }

      await ctx.prisma.moderationEvent.create({
        data: {
          moderatorId: ctx.session.user.id,
          userId: input.id,
          action: modAction,
          reason: input.reason,
        },
      });

      return ctx.prisma.user.update({
        where: { id: input.id },
        data,
        select: USER_SELECT_PUBLIC,
      });
    }),

  postsList: adminProcedure
    .input(
      z.object({
        categoryId: z.string().cuid().optional(),
        status: z.enum(["ALL", "PUBLISHED", "PENDING_MODERATION", "HIDDEN", "REMOVED", "CLOSED"]).default("ALL"),
        search: z.string().optional(),
        sortBy: z.enum(["newest", "oldest", "reports", "engagement"]).default("newest"),
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.categoryId) where.categoryId = input.categoryId;
      if (input.status !== "ALL") where.status = input.status;
      if (input.search) {
        where.question = { contains: input.search, mode: "insensitive" };
      }

      const orderBy: Record<string, unknown>[] = [];
      if (input.sortBy === "oldest") orderBy.push({ createdAt: "asc" });
      else if (input.sortBy === "reports") orderBy.push({ reports: { _count: "desc" } });
      else if (input.sortBy === "engagement") orderBy.push({ voteCount: "desc" });
      else orderBy.push({ createdAt: "desc" });

      const items = await ctx.prisma.post.findMany({
        where,
        orderBy,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: {
          creator: { select: USER_SELECT_PUBLIC },
          category: true,
          _count: {
            select: { reports: true, votes: true, comments: true },
          },
        },
      });

      let nextCursor: string | undefined = undefined;
      let hasMore = false;
      if (items.length > input.limit) {
        hasMore = true;
        items.pop();
        nextCursor = items[items.length - 1]?.id;
      }
      return { items, nextCursor, hasMore };
    }),

  postsModerate: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        action: PostAction,
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = { moderatedBy: ctx.session.user.id };
      let modAction: "APPROVED" | "HIDDEN" | "REMOVED" | "FEATURED" | "UNFEATURED" = "APPROVED";

      switch (input.action) {
        case "APPROVE":
          data.status = "PUBLISHED";
          modAction = "APPROVED";
          break;
        case "HIDE":
          data.status = "HIDDEN";
          modAction = "HIDDEN";
          break;
        case "REMOVE":
          data.status = "REMOVED";
          modAction = "REMOVED";
          break;
        case "FEATURE":
          data.isFeatured = true;
          modAction = "FEATURED";
          break;
        case "UNFEATURE":
          data.isFeatured = false;
          modAction = "UNFEATURED";
          break;
      }

      await ctx.prisma.moderationEvent.create({
        data: {
          moderatorId: ctx.session.user.id,
          postId: input.id,
          action: modAction,
          reason: input.reason,
        },
      });

      return ctx.prisma.post.update({
        where: { id: input.id },
        data,
      });
    }),

  tagsCrud: adminProcedure
    .input(
      z.object({
        operation: z.enum(["create", "update", "delete"]),
        id: z.string().cuid().optional(),
        name: z.string().max(50).optional(),
        slug: z.string().max(50).optional(),
        categoryId: z.string().cuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.operation === "create" && input.name && input.slug) {
        return ctx.prisma.tag.create({
          data: {
            name: input.name,
            slug: input.slug,
            categoryId: input.categoryId,
          },
        });
      }
      if (input.operation === "update" && input.id) {
        const { id, operation, ...rest } = input;
        return ctx.prisma.tag.update({ where: { id }, data: rest });
      }
      if (input.operation === "delete" && input.id) {
        return ctx.prisma.tag.delete({ where: { id: input.id } });
      }
      throw new Error("Invalid operation");
    }),

  adsCrud: adminProcedure
    .input(
      z.object({
        operation: z.enum(["create", "update", "delete"]),
        id: z.string().cuid().optional(),
        name: z.string().max(100).optional(),
        placement: z.enum(["FEED_EVERY_N", "BANNER", "SPONSORED_NATIVE", "DESKTOP_SIDEBAR"]).optional(),
        isEnabled: z.boolean().optional(),
        linkUrl: z.string().url().optional(),
        everyNPosts: z.number().int().optional(),
        priority: z.number().int().optional(),
        contentJson: z.record(z.unknown()).optional(),
        scheduleStart: z.coerce.date().optional(),
        scheduleEnd: z.coerce.date().optional(),
        budgetClicks: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { operation, id, ...rest } = input;
      if (operation === "create" && input.name && input.placement) {
        return ctx.prisma.adConfiguration.create({ data: rest as any });
      }
      if (operation === "update" && id) {
        return ctx.prisma.adConfiguration.update({ where: { id }, data: rest as any });
      }
      if (operation === "delete" && id) {
        return ctx.prisma.adConfiguration.delete({ where: { id } });
      }
      throw new Error("Invalid operation");
    }),

  analyticsEvents: adminProcedure
    .input(
      z.object({
        eventType: z.string().optional(),
        timeRange: z.enum(["1h", "24h", "7d", "30d"]).default("24h"),
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(500).default(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      let gte: Date;
      switch (input.timeRange) {
        case "1h":
          gte = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case "7d":
          gte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          gte = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "24h":
        default:
          gte = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
      }

      const where: Record<string, unknown> = { createdAt: { gte } };
      if (input.eventType) where.eventType = input.eventType;

      const items = await ctx.prisma.analyticsEvent.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
      });

      let nextCursor: string | undefined = undefined;
      let hasMore = false;
      if (items.length > input.limit) {
        hasMore = true;
        items.pop();
        nextCursor = items[items.length - 1]?.id;
      }
      return { items, nextCursor, hasMore };
    }),

  settingsUpdate: adminProcedure
    .input(z.record(z.unknown()))
    .mutation(async ({ input }) => {
      const writes: Promise<void>[] = [];
      for (const [section, settings] of Object.entries(input)) {
        if (typeof settings !== "object" || settings === null) continue;
        const entries = Object.entries(settings as Record<string, unknown>);
        for (const [k, v] of entries) {
          const key = `${section}.${k}`;
          writes.push(setSystemSetting(key, v));
        }
      }
      if ((input.moderation as any)?.aiModeration !== undefined) {
        writes.push(
          setSystemSetting<boolean>(
            GLOBAL_CONFIG_KEYS.AI_MODERATION_ENABLED,
            Boolean((input.moderation as any).aiModeration),
          ),
        );
      }
      if ((input.moderation as any)?.aiProvider !== undefined) {
        writes.push(
          setSystemSetting<string>(
            GLOBAL_CONFIG_KEYS.AI_PROVIDER,
            String((input.moderation as any).aiProvider),
          ),
        );
      }
      if ((input.opinion as any)?.scorePerVote !== undefined) {
        writes.push(
          setSystemSetting<number>(
            GLOBAL_CONFIG_KEYS.OPINION_SCORE_PER_VOTE,
            Number((input.opinion as any).scorePerVote),
          ),
        );
      }
      if ((input.opinion as any)?.scorePerPost !== undefined) {
        writes.push(
          setSystemSetting<number>(
            GLOBAL_CONFIG_KEYS.OPINION_SCORE_PER_POST,
            Number((input.opinion as any).scorePerPost),
          ),
        );
      }
      writes.push(
        setSystemSetting<number>(
          GLOBAL_CONFIG_KEYS.OPINION_PREDICTION_CORRECT,
          OPINION.PREDICTION_CORRECT,
        ),
      );
      await Promise.all(writes);
      return { ok: true };
    }),

  predictionsList: adminProcedure
    .input(
      z.object({
        status: z.enum(["ALL", "OPEN", "CLOSED", "RESOLVED"]).default("ALL"),
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const where: Record<string, unknown> = {};
      if (input.status === "OPEN") {
        where.isResolved = false;
        where.OR = [
          { closingTime: null },
          { closingTime: { gt: now } },
        ];
      } else if (input.status === "CLOSED") {
        where.isResolved = false;
        where.closingTime = { lte: now };
      } else if (input.status === "RESOLVED") {
        where.isResolved = true;
      }

      const items = await ctx.prisma.prediction.findMany({
        where,
        orderBy: [{ isResolved: "asc" }, { post: { createdAt: "desc" } }],
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: {
          post: {
            select: {
              id: true,
              question: true,
              voteCount: true,
              isClosed: true,
              expiresAt: true,
              creator: { select: USER_SELECT_PUBLIC },
            },
          },
          correctOption: true,
          options: false,
          postOptions: false,
          postId: true,
        } as any,
      });

      const withOptions = await Promise.all(
        items.map(async (p) => {
          const options = await ctx.prisma.postOption.findMany({
            where: { postId: p.postId },
            orderBy: { sortOrder: "asc" },
          });
          return { ...p, options };
        }),
      );

      let nextCursor: string | undefined = undefined;
      let hasMore = false;
      if (withOptions.length > input.limit) {
        hasMore = true;
        withOptions.pop();
        nextCursor = withOptions[withOptions.length - 1]?.id;
      }
      return { items: withOptions, nextCursor, hasMore };
    }),

  resolvePrediction: adminProcedure
    .input(
      z.object({
        predictionId: z.string().cuid(),
        correctOptionId: z.string().cuid(),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const resolverId = ctx.session.user.id;
      const now = new Date();

      const prediction = await ctx.prisma.prediction.findUnique({
        where: { id: input.predictionId },
        include: {
          post: { include: { options: true } },
          results: true,
        },
      });
      if (!prediction) throw new Error("Prediction not found");

      const validOption = prediction.post.options.find(
        (o) => o.id === input.correctOptionId,
      );
      if (!validOption) throw new Error("Invalid correct option");

      await ctx.prisma.$transaction(async (tx) => {
        await tx.prediction.update({
          where: { id: input.predictionId },
          data: {
            correctOptionId: input.correctOptionId,
            isResolved: true,
            resolvedBy: resolverId,
            resolvedAt: now,
          },
        });

        await tx.post.update({
          where: { id: prediction.postId },
          data: {
            isClosed: true,
            predictionResolvedAt: now,
            predictionCorrect: null,
          },
        });

        const votes = await tx.vote.findMany({
          where: { postId: prediction.postId },
          include: { user: { select: { id: true, opinionScore: true, predictionsCorrect: true } } },
        });

        const predictionAwardScore = await getSystemSetting<number>(
          GLOBAL_CONFIG_KEYS.OPINION_PREDICTION_CORRECT,
          OPINION.PREDICTION_CORRECT,
        );

        const resultUpserts = [];
        const userUpdates: Record<string, { scoreDelta: number; correctInc: number }> = {};
        const notificationCreates = [];

        for (const vote of votes) {
          const userId = vote.userId;
          const votedOptionId = vote.optionId ?? "";
          const isCorrect = votedOptionId === input.correctOptionId;
          const awardedScore = isCorrect ? predictionAwardScore : 0;

          resultUpserts.push(
            tx.predictionResult.upsert({
              where: {
                predictionId_userId: {
                  predictionId: input.predictionId,
                  userId,
                },
              },
              create: {
                predictionId: input.predictionId,
                userId,
                votedOptionId,
                isCorrect,
                awardedScore,
                processed: true,
              },
              update: {
                votedOptionId,
                isCorrect,
                awardedScore,
                processed: true,
              },
            }),
          );

          if (!userUpdates[userId]) {
            userUpdates[userId] = { scoreDelta: 0, correctInc: 0 };
          }
          if (isCorrect) {
            userUpdates[userId].scoreDelta += awardedScore;
            userUpdates[userId].correctInc += 1;
          }

          notificationCreates.push(
            tx.notification.create({
              data: {
                recipientId: userId,
                actorId: resolverId,
                postId: prediction.postId,
                type: "PREDICTION_RESOLVED",
                payload: {
                  correct: isCorrect,
                  awardedScore,
                  correctOption: validOption.label,
                  reason: input.reason ?? null,
                } as any,
              },
            }),
          );
        }

        if (resultUpserts.length > 0) {
          try { await Promise.all(resultUpserts); } catch {}
        }

        const userUpdatePromises = [];
        for (const [uid, delta] of Object.entries(userUpdates)) {
          userUpdatePromises.push(
            tx.user.update({
              where: { id: uid },
              data: {
                opinionScore: { increment: delta.scoreDelta },
                predictionsCorrect: { increment: delta.correctInc },
              },
            }),
          );
        }
        if (userUpdatePromises.length > 0) {
          try { await Promise.all(userUpdatePromises); } catch {}
        }

        if (notificationCreates.length > 0) {
          try { await Promise.all(notificationCreates); } catch {}
        }
      });

      return { ok: true, predictionId: input.predictionId, correctOptionId: input.correctOptionId };
    }),

  usersUpdateRole: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        role: z.enum(["USER", "MODERATOR", "ADMIN"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.id === ctx.session.user.id) throw new Error("Cannot modify your own role");
      const u = await ctx.prisma.user.update({
        where: { id: input.id },
        data: { role: input.role },
        select: { id: true, role: true, email: true, username: true, displayName: true },
      });
      try {
        await ctx.prisma.moderationEvent.create({
          data: {
            moderatorId: ctx.session.user.id,
            userId: input.id,
            action: "APPROVED",
            reason: `Role updated to ${input.role}`,
          },
        });
      } catch {}
      return u;
    }),

  dashboardTimeseries: adminProcedure
    .input(z.object({ days: z.number().int().min(1).max(180).default(30) }))
    .query(async ({ ctx, input }) => {
      const days = Math.min(input.days, 180);
      const now = new Date();
      const since = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      since.setHours(0, 0, 0, 0);

      const buckets: { day: string; dateISO: string; start: Date }[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
        const label = `${d.getMonth() + 1}/${d.getDate()}`;
        buckets.push({
          day: label,
          dateISO: d.toISOString().slice(0, 10),
          start: new Date(d),
        });
      }

      // Group-by helpers on timestamp columns (user.createdAt / whatDoId.createdAt / etc.)
      type Bucket = typeof buckets[number];
      function countByDay<T extends { createdAt: Date }>(rows: T[], bucket: Bucket): number {
        const from = bucket.start.getTime();
        const to = from + 24 * 60 * 60 * 1000;
        let c = 0;
        for (const r of rows) {
          const t = r.createdAt.getTime();
          if (t >= from && t < to) c++;
        }
        return c;
      }
      function distinctUserByDay<T extends { createdAt: Date; userId?: string | null }>(rows: T[], bucket: Bucket): number {
        const from = bucket.start.getTime();
        const to = from + 24 * 60 * 60 * 1000;
        const set = new Set<string>();
        for (const r of rows) {
          const t = r.createdAt.getTime();
          if (t >= from && t < to && r.userId) set.add(r.userId);
        }
        return set.size;
      }

      const end = new Date(since.getTime() + days * 24 * 60 * 60 * 1000);
      const [users, identities, responsesRaw, sharesRaw, eventsRaw] = await Promise.all([
        ctx.prisma.user.findMany({ where: { createdAt: { gte: since, lt: end } }, select: { createdAt: true } }),
        ctx.prisma.whatDoIdentityResult.findMany({ where: { createdAt: { gte: since, lt: end } }, select: { createdAt: true, userId: true } }),
        ctx.prisma.questionResponse.findMany({ where: { createdAt: { gte: since, lt: end } }, select: { createdAt: true, userId: true, sessionId: true } }),
        ctx.prisma.referralShareEvent.findMany({ where: { createdAt: { gte: since, lt: end } }, select: { createdAt: true, clicks: true, signups: true, ownerId: true } }),
        ctx.prisma.analyticsEvent.findMany({ where: { createdAt: { gte: since, lt: end } }, select: { createdAt: true, userId: true, eventType: true } }),
      ] as const);

      // User activity by day (distinct userId in analyticsEvent per day)
      const series = buckets.map((b) => {
        const signups = countByDay(users, b);
        const reveals = countByDay(identities, b);
        const responses = countByDay(responsesRaw, b);
        const activeUsers = distinctUserByDay(eventsRaw, b);
        const shareClicks = (() => {
          const from = b.start.getTime();
          const to = from + 24 * 60 * 60 * 1000;
          let s = 0;
          for (const r of sharesRaw) {
            const t = r.createdAt.getTime();
            if (t >= from && t < to) s += r.clicks ?? 0;
          }
          return s;
        })();
        const referralSignups = (() => {
          const from = b.start.getTime();
          const to = from + 24 * 60 * 60 * 1000;
          let s = 0;
          for (const r of sharesRaw) {
            const t = r.createdAt.getTime();
            if (t >= from && t < to) s += r.signups ?? 0;
          }
          return s;
        })();
        const quizStarts = (() => {
          // quiz starts: unique sessionId in questionResponse OR unique (user | session) per day with first answer
          const from = b.start.getTime();
          const to = from + 24 * 60 * 60 * 1000;
          const s = new Set<string>();
          for (const r of responsesRaw) {
            const t = r.createdAt.getTime();
            if (t >= from && t < to) {
              if (r.userId) s.add("u:" + r.userId);
              if (r.sessionId) s.add("s:" + r.sessionId);
            }
          }
          return s.size;
        })();
        const aiPromptCopies = (() => {
          const from = b.start.getTime();
          const to = from + 24 * 60 * 60 * 1000;
          let c = 0;
          for (const ev of eventsRaw) {
            if (!ev.eventType) continue;
            const low = ev.eventType.toLowerCase();
            if (low.indexOf("ai_prompt") > -1 || low.indexOf("copyprompt") > -1 || low.indexOf("copy_prompt") > -1) c++;
          }
          void from; void to;
          return c;
        })();
        const shareDownloads = (() => {
          let c = 0;
          for (const ev of eventsRaw) {
            if (!ev.eventType) continue;
            const low = ev.eventType.toLowerCase();
            if (low.indexOf("download_share") > -1 || low.indexOf("sharedownload") > -1 || low.indexOf("download_png") > -1 || low.indexOf("share_card") > -1) c++;
          }
          return c;
        })();
        return {
          day: b.day,
          dateISO: b.dateISO,
          signups,
          activeUsers,
          quizStarts,
          quizReveals: reveals,
          quizAnswerResponses: responses,
          shareClicks,
          referralSignups,
          shareDownloads,
          aiPromptCopies,
        };
      });

      // Totals (all time — for stat cards) that aren't in the basic dashboardStats.
      const [whatdoIdentsTotal, whatdoUniqueUsers, qrRows, referralEvents, verifiedUsers, mods, adminUsers] = await Promise.all([
        ctx.prisma.whatDoIdentityResult.count(),
        ctx.prisma.whatDoIdentityResult.aggregate({ _count: { _all: true } }).then(
          async () => {
            const g = await ctx.prisma.whatDoIdentityResult.groupBy({ by: ["userId"], _count: { _all: true } });
            return g.filter((x) => x.userId).length;
          },
          async () => 0,
        ),
        ctx.prisma.questionResponse.count(),
        ctx.prisma.referralShareEvent.aggregate({
          _sum: { clicks: true, signups: true, impressionCount: true },
          _count: { _all: true },
        }),
        ctx.prisma.user.count({ where: { isVerified: true } }),
        ctx.prisma.user.count({ where: { role: "MODERATOR" } }),
        ctx.prisma.user.count({ where: { role: "ADMIN" } }),
      ]);

      // Top referrers (ReferralShareEvent signups desc)
      const topReferrersRaw = await ctx.prisma.referralShareEvent.findMany({
        orderBy: [{ signups: "desc" }, { clicks: "desc" }],
        take: 10,
        select: {
          owner: {
            select: {
              id: true, username: true, displayName: true, avatarUrl: true,
            },
          },
          shareType: true,
          shareChannel: true,
          shareToken: true,
          clicks: true,
          signups: true,
          impressionCount: true,
          createdAt: true,
        },
      });
      const topReferrers = topReferrersRaw.map((r) => ({
        ownerId: r.owner?.id ?? null,
        username: r.owner?.username ?? null,
        displayName: r.owner?.displayName ?? null,
        avatarUrl: r.owner?.avatarUrl ?? null,
        shareType: r.shareType,
        shareChannel: r.shareChannel,
        shareToken: r.shareToken,
        clicks: r.clicks ?? 0,
        signups: r.signups ?? 0,
        impressions: r.impressionCount ?? 0,
      })).filter((r) => r.ownerId && (r.clicks > 0 || r.signups > 0));

      // Funnel stats (for whatdo funnel cards)
      const funnel = {
        quizStartSessions: await (async () => {
          const today = new Date(); today.setHours(0,0,0,0);
          const seven = new Date(today.getTime() - 6 * 24*60*60*1000);
          const r7 = await ctx.prisma.questionResponse.findMany({
            where: { createdAt: { gte: seven } },
            select: { sessionId: true, userId: true },
            distinct: ["sessionId"],
          });
          return r7.length;
        })(),
        complete12Last7: await (async () => {
          const today = new Date(); today.setHours(0,0,0,0);
          const seven = new Date(today.getTime() - 6 * 24*60*60*1000);
          // Count userId/sessionId with exactly 12 question responses last 7 days
          const rows = await ctx.prisma.questionResponse.findMany({
            where: { createdAt: { gte: seven } },
            select: { userId: true, sessionId: true, assessmentQuestionId: true },
          });
          const buckets = new Map<string, Set<string>>();
          for (const r of rows) {
            const k = r.userId ? `u:${r.userId}` : `s:${r.sessionId}`;
            if (!buckets.has(k)) buckets.set(k, new Set());
            buckets.get(k)!.add(r.assessmentQuestionId);
          }
          let c = 0;
          for (const [, qs] of buckets) if (qs.size >= 12) c++;
          return c;
        })(),
      };

      const whatdoAvgPerUser = whatdoUniqueUsers > 0 ? (qrRows / whatdoUniqueUsers) : 0;
      return {
        series,
        days,
        totals: {
          whatdoIdentities: whatdoIdentsTotal,
          whatdoUniqueUsers,
          questionResponses: qrRows,
          whatdoAvgPerUser,
          referralShareEvents: referralEvents._count._all,
          referralClicks: referralEvents._sum.clicks ?? 0,
          referralSignups: referralEvents._sum.signups ?? 0,
          referralImpressions: referralEvents._sum.impressionCount ?? 0,
          verifiedUsers,
          moderators: mods,
          admins: adminUsers,
        },
        topReferrers,
        funnelLast7: funnel,
      };
    }),
});
