import { z } from "zod";
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  rateLimitVoteMiddleware,
} from "../trpc";
import {
  computeControversyScoreFromCounts,
  computeTrendingScore,
  computeViralityScore,
  computeOpinionScoreForVote,
} from "../../utils/scoring";

export const votingRouter = createTRPCRouter({
  submitVote: protectedProcedure
    .use(rateLimitVoteMiddleware)
    .input(
      z.object({
        postId: z.string().cuid(),
        optionId: z.string().cuid().optional(),
        ratingValue: z.number().int().min(1).max(10).optional(),
        emojiValue: z.string().max(10).optional(),
        priceValue: z.coerce.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;

      const post = await ctx.prisma.post.findUnique({
        where: { id: input.postId },
        select: {
          status: true,
          isClosed: true,
          expiresAt: true,
          creatorId: true,
          categoryId: true,
          voteCount: true,
          commentCount: true,
          likeCount: true,
          shareCount: true,
          createdAt: true,
          options: { select: { id: true, voteCount: true } },
        },
      });

      if (!post) {
        throw new Error("Post not found");
      }
      if (post.status !== "PUBLISHED") {
        throw new Error("Post is not available for voting");
      }
      if (post.isClosed) {
        throw new Error("Voting is closed for this post");
      }
      if (post.expiresAt && post.expiresAt < new Date()) {
        throw new Error("This post has expired");
      }

      if (input.optionId) {
        const validOption = post.options.find((o) => o.id === input.optionId);
        if (!validOption) {
          throw new Error("Invalid option");
        }
      }

      try {
        const voteData: Record<string, unknown> = {
          postId: input.postId,
          userId,
          ipHash: ctx.userIp ? ctx.userIp.slice(0, 50) : undefined,
        };
        if (input.optionId) voteData.optionId = input.optionId;
        if (input.ratingValue !== undefined) voteData.ratingValue = input.ratingValue;
        if (input.emojiValue) voteData.emojiValue = input.emojiValue;
        if (input.priceValue !== undefined)
          voteData.priceValue = new Prisma.Decimal(input.priceValue);

        const isSelfVote = post.creatorId === userId;

        const [, voterBefore, , , , postAfterVote] = (await ctx.prisma.$transaction([
          ctx.prisma.vote.create({ data: voteData as any, select: { id: true } }),
          ctx.prisma.user.findUnique({
            where: { id: userId },
            select: { opinionScore: true, totalVotes: true },
          }),
          input.optionId
            ? ctx.prisma.postOption.update({
                where: { id: input.optionId },
                data: { voteCount: { increment: 1 } },
                select: { id: true },
              })
            : Promise.resolve(null),
          ctx.prisma.post.update({
            where: { id: input.postId },
            data: { voteCount: { increment: 1 } },
            select: { id: true },
          }),
          post.categoryId
            ? ctx.prisma.userCategoryInterest.upsert({
                where: {
                  userId_categoryId: { userId, categoryId: post.categoryId },
                },
                create: { userId, categoryId: post.categoryId, voteCount: 1 },
                update: { voteCount: { increment: 1 } },
                select: { userId: true },
              })
            : Promise.resolve(null),
          ctx.prisma.post.findUnique({
            where: { id: input.postId },
            select: {
              id: true,
              voteCount: true,
              options: {
                select: { id: true, voteCount: true },
                orderBy: { sortOrder: "asc" },
              },
              commentCount: true,
              likeCount: true,
              shareCount: true,
              createdAt: true,
            },
          }),
        ])) as any;

        try {
          await ctx.prisma.analyticsEvent.create({
            data: {
              userId,
              eventType: "vote_completed",
              properties: {
                postId: input.postId,
                optionId: input.optionId,
              } as any,
            },
          });
        } catch {
        }

        const voter = voterBefore as { opinionScore: number | null; totalVotes: number | null } | null;
        const nextVoterData = voter
          ? {
              totalVotes: { increment: 1 },
              opinionScore: isSelfVote ? (voter.opinionScore ?? 0) : computeOpinionScoreForVote(voter.opinionScore, voter.totalVotes),
            }
          : { totalVotes: { increment: 1 } };

        const updatedPost: any = postAfterVote;

        let scoringUpdates: Promise<any>[] = [];
        let notificationPromise: Promise<any> | null = null;

        if (updatedPost) {
          const optionCounts = updatedPost.options.map((o: any) => o.voteCount);
          const controversy = computeControversyScoreFromCounts(optionCounts);
          const trending = computeTrendingScore({
            voteCount: updatedPost.voteCount,
            commentCount: updatedPost.commentCount,
            likeCount: updatedPost.likeCount,
            shareCount: updatedPost.shareCount,
            createdAt: updatedPost.createdAt,
          });
          const virality = computeViralityScore({
            voteCount: updatedPost.voteCount,
            commentCount: updatedPost.commentCount,
            likeCount: updatedPost.likeCount,
            shareCount: updatedPost.shareCount,
            createdAt: updatedPost.createdAt,
            controversyScore: controversy,
          });

          scoringUpdates = [
            ctx.prisma.user.update({
              where: { id: userId },
              data: nextVoterData,
              select: { id: true },
            }),
            ctx.prisma.post.update({
              where: { id: input.postId },
              data: {
                controversyScore: controversy,
                trendingScore: trending,
                viralityScore: virality,
              },
            }),
          ];

          if (post.creatorId !== userId) {
            notificationPromise = ctx.prisma.notification.create({
              data: {
                recipientId: post.creatorId,
                actorId: userId,
                postId: input.postId,
                type: "VOTE",
              },
            });
          }

          await ctx.prisma.$transaction([
            ...scoringUpdates,
            notificationPromise ?? Promise.resolve(null),
          ]);

          const returnResult = {
            id: updatedPost.id,
            voteCount: updatedPost.voteCount,
            controversyScore: controversy,
            trendingScore: trending,
            viralityScore: virality,
            options: updatedPost.options.map((o: any) => ({
              id: o.id,
              voteCount: o.voteCount,
            })),
          };
          return returnResult;
        }

        if (voter) {
          await ctx.prisma.user.update({
            where: { id: userId },
            data: nextVoterData,
          });
        }

        if (post.creatorId !== userId) {
          await ctx.prisma.notification.create({
            data: {
              recipientId: post.creatorId,
              actorId: userId,
              postId: input.postId,
              type: "VOTE",
            },
          });
        }

        return updatedPost;
      } catch (e: any) {
        if (e?.code === "P2002") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Already voted on this post",
          });
        }
        throw e;
      }
    }),

  getResults: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          voteCount: true,
          type: true,
          options: {
            select: {
              id: true,
              label: true,
              value: true,
              voteCount: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: "asc" },
          },
        },
      });

      if (!post) return null;

      const totalVotes = post.voteCount;
      const options = post.options.map((o) => {
        const percentage =
          totalVotes > 0 ? (o.voteCount / totalVotes) * 100 : 0;
        return {
          ...o,
          percentage,
        };
      });

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

      return {
        id: post.id,
        type: post.type,
        totalVotes,
        options,
        userVote,
        alreadyVoted: !!userVote,
      };
    }),
});
