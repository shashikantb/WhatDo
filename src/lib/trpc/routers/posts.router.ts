import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  rateLimitPostMiddleware,
} from "../trpc";
import { USER_SELECT_PUBLIC } from "../../constants";
import { containsProfanity } from "../../utils/profanity-filter";
import {
  computeTrendingScore,
  computeViralityScore,
  computeOpinionScoreForPost,
} from "../../utils/scoring";
import { getAIProvider } from "../../ai";
import { getSystemSetting, GLOBAL_CONFIG_KEYS } from "../../config";
import { trackEvent } from "../../analytics";

const PostTypeEnum = z.enum([
  "YES_NO",
  "MULTIPLE_CHOICE",
  "A_VS_B",
  "RATING",
  "EMOJI",
  "POLL",
  "PRICE",
  "DECISION",
  "PREDICTION",
]);

const PostMediaTypeEnum = z.enum(["IMAGE", "VIDEO", "GIF", "LINK"]);

function slugifyShortCuid(cuidStr: string): string {
  return cuidStr.slice(Math.max(0, cuidStr.length - 10));
}

const postFullInclude = {
  creator: { select: USER_SELECT_PUBLIC },
  category: true,
  tags: { include: { tag: true } },
  options: { orderBy: { sortOrder: "asc" } },
  media: { orderBy: { sortOrder: "asc" } },
  prediction: true,
};

export const postsRouter = createTRPCRouter({
  getById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id },
        include: postFullInclude as any,
      });
      if (!post) return null;

      let userVote: unknown = null;
      if (ctx.session?.user?.id) {
        userVote = await ctx.prisma.vote.findUnique({
          where: {
            userId_postId: {
              userId: ctx.session.user.id,
              postId: input.id,
            },
          },
        });
      }

      return { ...post, userVote };
    }),

  create: protectedProcedure
    .use(rateLimitPostMiddleware)
    .input(
      z.object({
        question: z.string().min(10).max(500),
        type: PostTypeEnum,
        categoryId: z.string().cuid().optional(),
        isAnonymous: z.boolean().default(false),
        allowComments: z.boolean().default(true),
        tags: z.array(z.string().max(30)).max(10).default([]),
        options: z
          .array(
            z.object({
              label: z.string().max(60),
              value: z.string().max(60),
              imageUrl: z.string().url().optional(),
              sortOrder: z.number().int(),
            }),
          )
          .min(2)
          .max(10),
        media: z
          .array(
            z.object({
              type: PostMediaTypeEnum,
              url: z.string(),
              thumbnailUrl: z.string().optional(),
              posterUrl: z.string().optional(),
              mimeType: z.string().optional(),
              width: z.number().int().optional(),
              height: z.number().int().optional(),
              duration: z.number().int().optional(),
              fileSize: z.number().int().optional(),
              sortOrder: z.number().int().default(0),
            }),
          )
          .max(10)
          .default([]),
        expiresAt: z.coerce.date().optional(),
        anonymous: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session!;
      const userId = session.user.id;

      const allText =
        input.question +
        " " +
        input.options.map((o) => `${o.label} ${o.value}`).join(" ");
      const hasProfane = containsProfanity(allText);
      let status: "PUBLISHED" | "PENDING_MODERATION" = hasProfane
        ? "PENDING_MODERATION"
        : "PUBLISHED";
      let aiFlags: string[] = [];
      let autoModerationReports: Array<{
        reason: "SPAM" | "HATE" | "NUDITY" | "VIOLENCE" | "SCAM" | "MISINFORMATION" | "COPYRIGHT" | "OTHER";
        details?: string;
      }> = [];

      try {
        const aiEnabled = await getSystemSetting<boolean>(
          GLOBAL_CONFIG_KEYS.AI_MODERATION_ENABLED,
          true,
        );
        if (aiEnabled) {
          const aiProvider = getAIProvider();
          const textResult = await aiProvider.moderateText(allText);
          aiFlags.push(...textResult.flags);

          for (const m of input.media || []) {
            if (m.type === "IMAGE" && m.url) {
              const imgRes = await aiProvider.moderateImage(m.url, m.mimeType);
              aiFlags.push(...imgRes.flags);
            } else if (m.type === "VIDEO" && m.url) {
              const vidRes = await aiProvider.moderateVideo(m.url, m.posterUrl);
              aiFlags.push(...vidRes.flags);
            }
          }

          const uniqueFlags = Array.from(new Set(aiFlags));
          const badFlags = uniqueFlags.filter((f) =>
            ["NSFW", "HATE", "VIOLENCE", "PII", "MISINFORMATION", "COPYRIGHT"].includes(f),
          );

          if (badFlags.length > 0 || textResult.score >= 0.65) {
            status = "PENDING_MODERATION";
            for (const f of uniqueFlags) {
              if (["HATE"].includes(f)) autoModerationReports.push({ reason: "HATE", details: f });
              else if (["SPAM", "MALICIOUS_URL"].includes(f))
                autoModerationReports.push({ reason: "SPAM", details: f });
              else if (["NSFW"].includes(f))
                autoModerationReports.push({ reason: "NUDITY", details: f });
              else if (["VIOLENCE"].includes(f))
                autoModerationReports.push({ reason: "VIOLENCE", details: f });
              else if (["MISINFORMATION"].includes(f))
                autoModerationReports.push({ reason: "MISINFORMATION", details: f });
              else if (["COPYRIGHT"].includes(f))
                autoModerationReports.push({ reason: "COPYRIGHT", details: f });
              else autoModerationReports.push({ reason: "OTHER", details: f });
            }
          }
        }
      } catch {
      }

      const tempCuid = `c${Math.random().toString(36).slice(2, 14)}`;
      const slug = slugifyShortCuid(tempCuid);

      const tagRows = await Promise.all(
        input.tags.map(async (tagName) => {
          const slugTag = tagName
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, "-")
            .replace(/-+/g, "-")
            .slice(0, 50);
          return ctx.prisma.tag.upsert({
            where: { slug: slugTag },
            create: { name: tagName.slice(0, 50), slug: slugTag, postCount: 1 },
            update: { postCount: { increment: 1 } },
          });
        }),
      );

      const post = await ctx.prisma.post.create({
        data: {
          slug,
          creatorId: userId,
          categoryId: input.categoryId,
          type: input.type,
          question: input.question,
          isAnonymous: input.isAnonymous || input.anonymous,
          allowComments: input.allowComments,
          status,
          expiresAt: input.expiresAt,
          options: {
            create: input.options.map((o, idx) => ({
              label: o.label,
              value: o.value,
              imageUrl: o.imageUrl,
              sortOrder: o.sortOrder ?? idx,
            })),
          },
          media:
            input.media.length > 0
              ? {
                  create: input.media.map((m, idx) => ({
                    type: m.type,
                    url: m.url,
                    thumbnailUrl: m.thumbnailUrl,
                    posterUrl: m.posterUrl,
                    mimeType: m.mimeType,
                    width: m.width,
                    height: m.height,
                    duration: m.duration,
                    fileSize: m.fileSize,
                    sortOrder: m.sortOrder ?? idx,
                  })),
                }
              : undefined,
          tags: {
            create: tagRows.map((t) => ({
              tagId: t.id,
            })),
          },
        },
        include: postFullInclude as any,
      });

      await ctx.prisma.user.update({
        where: { id: userId },
        data: {
          totalPosts: { increment: 1 },
          opinionScore: computeOpinionScoreForPost(0),
        },
      });

      if (autoModerationReports.length > 0) {
        const uniqueReasons = new Map<string, string>();
        for (const r of autoModerationReports) {
          const existing = uniqueReasons.get(r.reason) ?? "";
          uniqueReasons.set(
            r.reason,
            existing ? `${existing}, ${r.details}` : r.details ?? "AI_Moderation",
          );
        }
        const reportCreates = [];
        for (const [reason, details] of uniqueReasons.entries()) {
          reportCreates.push(
            ctx.prisma.report.create({
              data: {
                reporterId: userId,
                type: "POST",
                reportedPostId: post.id,
                reason: reason as any,
                details: `AI moderation flags: ${details}`,
                status: "OPEN",
              },
            }),
          );
        }
        try {
          await Promise.all(reportCreates);
        } catch {
        }
      }

      if (input.categoryId) {
        await ctx.prisma.category.update({
          where: { id: input.categoryId },
          data: { postCount: { increment: 1 } },
        });
        await ctx.prisma.userCategoryInterest.upsert({
          where: {
            userId_categoryId: { userId, categoryId: input.categoryId },
          },
          create: { userId, categoryId: input.categoryId, viewCount: 1 },
          update: { viewCount: { increment: 1 } },
        });
      }

      if (input.type === "PREDICTION") {
        await ctx.prisma.prediction.create({
          data: {
            postId: post.id,
            closingTime: input.expiresAt,
            resolutionDate: input.expiresAt,
          },
        });
        await ctx.prisma.user.update({
          where: { id: userId },
          data: { predictionsMade: { increment: 1 } },
        });
      }

      try {
        await trackEvent("post_created", {
          userId,
          postId: post.id,
          postType: input.type,
          categoryId: input.categoryId ?? null,
          hasMedia: (input.media ?? []).length > 0,
          status: post.status,
        }, { skipThrottle: true });
      } catch {
      }

      return post;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session!;
      const userId = session.user.id;
      const role = session.user.role;

      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id },
        select: { creatorId: true, status: true },
      });
      if (!post) throw new Error("Post not found");

      const isOwner = post.creatorId === userId;
      const isAdmin = role === "ADMIN";
      if (!isOwner && !isAdmin) {
        throw new Error("Not authorized to delete this post");
      }

      return ctx.prisma.post.update({
        where: { id: input.id },
        data: { status: "REMOVED" },
      });
    }),

  listByUser: publicProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.post.findMany({
        where: {
          creatorId: input.userId,
          status: { in: ["PUBLISHED", "PENDING_MODERATION"] },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: postFullInclude as any,
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

  toggleLike: protectedProcedure
    .input(z.object({ postId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session!;
      const userId = session.user.id;
      const existing = await ctx.prisma.like.findUnique({
        where: { userId_postId: { userId, postId: input.postId } },
      });

      if (existing) {
        await ctx.prisma.like.delete({
          where: { userId_postId: { userId, postId: input.postId } },
        });
        await ctx.prisma.post.update({
          where: { id: input.postId },
          data: { likeCount: { decrement: 1 } },
        });
        return { liked: false };
      }

      await ctx.prisma.like.create({
        data: { userId, postId: input.postId },
      });
      const post = await ctx.prisma.post.update({
        where: { id: input.postId },
        data: { likeCount: { increment: 1 } },
        select: { creatorId: true },
      });

      if (post.creatorId !== userId) {
        await ctx.prisma.notification.create({
          data: {
            recipientId: post.creatorId,
            actorId: userId,
            postId: input.postId,
            type: "LIKE",
          },
        });
      }

      return { liked: true };
    }),

  toggleSave: protectedProcedure
    .input(z.object({ postId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session!;
      const userId = session.user.id;
      const existing = await ctx.prisma.savedPost.findUnique({
        where: { userId_postId: { userId, postId: input.postId } },
      });

      if (existing) {
        await ctx.prisma.savedPost.delete({
          where: { userId_postId: { userId, postId: input.postId } },
        });
        await ctx.prisma.post.update({
          where: { id: input.postId },
          data: { saveCount: { decrement: 1 } },
        });
        return { saved: false };
      }

      await ctx.prisma.savedPost.create({
        data: { userId, postId: input.postId },
      });
      await ctx.prisma.post.update({
        where: { id: input.postId },
        data: { saveCount: { increment: 1 } },
      });
      try {
        await trackEvent("post_saved", { userId, postId: input.postId }, { skipThrottle: true });
      } catch {
      }
      return { saved: true };
    }),

  incrementView: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;
      const fingerprint =
        ctx.headers.get("user-agent") +
        (ctx.userIp ?? "") +
        (userId ?? "");

      await ctx.prisma.post.update({
        where: { id: input.id },
        data: { viewCount: { increment: 1 } },
      });

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const recent = await ctx.prisma.analyticsEvent.findFirst({
        where: {
          eventType: "post_view",
          createdAt: { gte: oneHourAgo },
          deviceFingerprint: fingerprint.slice(0, 200),
        },
      });
      if (!recent) {
        await ctx.prisma.analyticsEvent.create({
          data: {
            userId,
            eventType: "post_view",
            properties: { postId: input.id } as any,
            pageUrl: ctx.req?.url,
            userAgent: ctx.headers.get("user-agent") ?? undefined,
            ipHash: ctx.userIp ?? undefined,
            deviceFingerprint: fingerprint.slice(0, 200),
          },
        });
      }

      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id },
        select: {
          categoryId: true,
          viewCount: true,
          voteCount: true,
          commentCount: true,
          likeCount: true,
          shareCount: true,
          createdAt: true,
          controversyScore: true,
        },
      });

      if (post && userId && post.categoryId) {
        await ctx.prisma.userCategoryInterest.upsert({
          where: {
            userId_categoryId: { userId, categoryId: post.categoryId },
          },
          create: { userId, categoryId: post.categoryId, viewCount: 1 },
          update: { viewCount: { increment: 1 } },
        });
      }

      if (post) {
        const trending = computeTrendingScore({
          voteCount: post.voteCount,
          commentCount: post.commentCount,
          likeCount: post.likeCount,
          shareCount: post.shareCount,
          createdAt: post.createdAt,
        });
        const virality = computeViralityScore({
          voteCount: post.voteCount,
          commentCount: post.commentCount,
          likeCount: post.likeCount,
          shareCount: post.shareCount,
          createdAt: post.createdAt,
          controversyScore: Number(post.controversyScore ?? 0),
        });
        await ctx.prisma.post.update({
          where: { id: input.id },
          data: {
            trendingScore: trending,
            viralityScore: virality,
          },
        });
      }

      return { success: true };
    }),

  share: publicProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        channel: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.post.update({
        where: { id: input.id },
        data: { shareCount: { increment: 1 } },
      });

      if (ctx.session?.user?.id) {
        await ctx.prisma.analyticsEvent.create({
          data: {
            userId: ctx.session.user.id,
            eventType: "post_share",
            properties: { postId: input.id, channel: input.channel } as any,
          },
        });
      }

      return { success: true };
    }),
});
