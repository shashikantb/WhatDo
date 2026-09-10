import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../trpc";
import { USER_SELECT_PUBLIC } from "../../constants";

export const usersRouter = createTRPCRouter({
  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { username: input.username },
        select: USER_SELECT_PUBLIC,
      });
      if (!user) return null;

      const [postsCount, votesCount, followersCount, followingCount] =
        await Promise.all([
          ctx.prisma.post.count({
            where: { creatorId: user.id, status: "PUBLISHED" },
          }),
          ctx.prisma.vote.count({ where: { userId: user.id } }),
          ctx.prisma.follow.count({ where: { followingId: user.id } }),
          ctx.prisma.follow.count({ where: { followerId: user.id } }),
        ]);

      let following = false;
      if (ctx.session?.user?.id) {
        const exists = await ctx.prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: ctx.session.user.id,
              followingId: user.id,
            },
          },
        });
        following = !!exists;
      }

      return {
        ...user,
        postsCount,
        votesCount,
        followersCount,
        followingCount,
        following,
      };
    }),

  getPosts: publicProcedure
    .input(
      z.object({
        username: z.string(),
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { username: input.username },
        select: { id: true },
      });
      if (!user) return { items: [], nextCursor: undefined, hasMore: false };

      const items = await ctx.prisma.post.findMany({
        where: {
          creatorId: user.id,
          status: { in: ["PUBLISHED", "PENDING_MODERATION"] },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: {
          creator: { select: USER_SELECT_PUBLIC },
          category: true,
          tags: { include: { tag: true } },
          _count: {
            select: {
              votes: true,
              comments: true,
              likes: true,
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

  getOpinions: publicProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.vote.findMany({
        where: { userId: input.userId },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: {
          post: {
            include: {
              creator: { select: USER_SELECT_PUBLIC },
              options: true,
              category: true,
            },
          },
          option: true,
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

  getSaved: protectedProcedure
    .input(
      z.object({
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.savedPost.findMany({
        where: { userId: ctx.session.user.id },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: {
          post: {
            include: {
              creator: { select: USER_SELECT_PUBLIC },
              options: true,
              category: true,
              tags: { include: { tag: true } },
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

  getPredictions: publicProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.predictionResult.findMany({
        where: { userId: input.userId },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: {
          prediction: {
            include: {
              post: true,
              correctOption: true,
            },
          },
          votedOption: true,
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

  leaderboard: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(10),
        offset: z.number().int().min(0).max(1000).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const users = await ctx.prisma.user.findMany({
        where: {
          opinionScore: { gt: 0 },
        },
        orderBy: [
          { opinionScore: "desc" },
          { predictionsCorrect: "desc" },
          { totalPosts: "desc" },
          { totalVotes: "desc" },
          { createdAt: "asc" },
        ],
        take: Math.min(input.limit, 100),
        skip: Math.min(input.offset, 1000),
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          isVerified: true,
          opinionScore: true,
          totalVotes: true,
          totalPosts: true,
          predictionsCorrect: true,
          predictionsMade: true,
          createdAt: true,
        },
      });
      return users;
    }),
});
