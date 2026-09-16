import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  type TRPCContext,
} from "../trpc";
import { USER_SELECT_PUBLIC } from "../../constants";
import {
  computeTrendingScore,
  computeViralityScore,
  feedScoreWeighted,
} from "../../utils/scoring";
import type { Prisma } from "@prisma/client";

const PostSort = z.enum(["hot", "new", "top", "rising"]);
const TrendingRange = z.enum(["1h", "24h", "7d"]);

const postBasicInclude = {
  creator: { select: USER_SELECT_PUBLIC },
  category: true,
  tags: { include: { tag: true } },
  options: true,
  media: true,
  _count: {
    select: {
      votes: true,
      comments: true,
      likes: true,
      savedPosts: true,
    },
  },
};

type PostWithBasic = Prisma.PostGetPayload<{ include: typeof postBasicInclude }>;

async function enrichPostsWithViewerState<T extends PostWithBasic>(
  ctx: TRPCContext,
  posts: T[],
): Promise<Array<T & { userVote: unknown | null; userLiked: boolean; userSaved: boolean; creatorIsFollowed: boolean }>> {
  const viewerId = ctx.session?.user?.id;
  const postIds = posts.map((p) => p.id);
  const creatorIds = posts.map((p) => p.creatorId).filter(Boolean) as string[];

  if (!viewerId || postIds.length === 0) {
    return posts.map((p) => ({
      ...p,
      userVote: null,
      userLiked: false,
      userSaved: false,
      creatorIsFollowed: false,
    }));
  }

  const [votes, likes, saved, follows] = await ctx.prisma.$transaction([
    ctx.prisma.vote.findMany({
      where: { userId: viewerId, postId: { in: postIds } },
      select: {
        postId: true,
        optionId: true,
        ratingValue: true,
        emojiValue: true,
        priceValue: true,
      },
    }),
    ctx.prisma.like.findMany({
      where: { userId: viewerId, postId: { in: postIds } },
      select: { postId: true },
    }),
    ctx.prisma.savedPost.findMany({
      where: { userId: viewerId, postId: { in: postIds } },
      select: { postId: true },
    }),
    creatorIds.length
      ? ctx.prisma.follow.findMany({
          where: { followerId: viewerId, followingId: { in: creatorIds } },
          select: { followingId: true },
        })
      : Promise.resolve([] as { followingId: string }[]),
  ]);

  const voteByPost = new Map(votes.map((v) => [v.postId, v]));
  const likedSet = new Set(likes.map((l) => l.postId));
  const savedSet = new Set(saved.map((s) => s.postId));
  const followSet = new Set(follows.map((f) => f.followingId));

  return posts.map((p) => ({
    ...p,
    userVote: voteByPost.get(p.id) ?? null,
    userLiked: likedSet.has(p.id),
    userSaved: savedSet.has(p.id),
    creatorIsFollowed: p.creatorId ? followSet.has(p.creatorId) : false,
  }));
}

export const feedRouter = createTRPCRouter({
  getForYou: publicProcedure
    .input(
      z.object({
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id;

      const blockedUserIds: string[] = [];
      const votedPostIds: string[] = [];

      if (userId) {
        const blocks = await ctx.prisma.userBlock.findMany({
          where: { blockerId: userId },
          select: { blockedId: true },
        });
        blockedUserIds.push(...blocks.map((b) => b.blockedId));

        const voted = await ctx.prisma.vote.findMany({
          where: { userId },
          select: { postId: true },
        });
        votedPostIds.push(...voted.map((v) => v.postId));
      }

      const posts = await ctx.prisma.post.findMany({
        where: {
          status: { in: ["PUBLISHED"] },
          creatorId: { notIn: blockedUserIds },
          NOT: votedPostIds.length ? { id: { in: votedPostIds } } : undefined,
        },
        orderBy: [{ isFeatured: "desc" }, { trendingScore: "desc" }, { createdAt: "desc" }],
        take: Math.min(input.limit + 1, 100),
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: postBasicInclude,
      });

      const enriched = await enrichPostsWithViewerState(ctx, posts);

      let categoryWeights: Record<string, number> = {};
      if (userId) {
        const interests = await ctx.prisma.userCategoryInterest.findMany({
          where: { userId },
          select: { categoryId: true, weight: true },
        });
        categoryWeights = Object.fromEntries(
          interests.map((i) => [i.categoryId, Number(i.weight)]),
        );
      }

      const creatorPostCount: Record<string, number> = {};
      const items = enriched.map((p) => {
        const count = (creatorPostCount[p.creatorId] ?? 0) + 1;
        creatorPostCount[p.creatorId] = count;

        const tScore =
          p.trendingScore != null
            ? Number(p.trendingScore)
            : computeTrendingScore({
                voteCount: p._count.votes,
                commentCount: p._count.comments,
                likeCount: p._count.likes,
                shareCount: p.shareCount,
                createdAt: p.createdAt,
              });
        const vScore =
          p.viralityScore != null
            ? Number(p.viralityScore)
            : computeViralityScore({
                voteCount: p._count.votes,
                commentCount: p._count.comments,
                likeCount: p._count.likes,
                shareCount: p.shareCount,
                createdAt: p.createdAt,
                controversyScore: p.controversyScore,
              });
        const feedScore = feedScoreWeighted({
          trendingScore: tScore,
          viralityScore: vScore,
          controversyScore: p.controversyScore,
          createdAt: p.createdAt,
          categoryInterestWeight: p.categoryId
            ? categoryWeights[p.categoryId] ?? 1
            : 1,
          isFeatured: p.isFeatured,
          creatorId: p.creatorId,
          recentCreatorPosts: count,
        });

        return {
          ...p,
          voteCount: p._count.votes,
          commentCount: p._count.comments,
          likeCount: p._count.likes,
          saveCount: p._count.savedPosts,
          feedScore,
        };
      });

      items.sort((a, b) => b.feedScore - a.feedScore);

      let nextCursor: string | undefined = undefined;
      let hasMore = false;
      if (items.length > input.limit) {
        hasMore = true;
        const trimmed = items.slice(0, input.limit);
        nextCursor = trimmed[trimmed.length - 1]?.id;
        return { items: trimmed, nextCursor, hasMore };
      }
      return { items, nextCursor, hasMore };
    }),

  getFollowing: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid().optional(),
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const viewerId = ctx.session.user.id;
      const targetUserId = input.userId ?? viewerId;

      const following = await ctx.prisma.follow.findMany({
        where: { followerId: targetUserId },
        select: { followingId: true },
      });
      const followingIds = following.map((f) => f.followingId);

      if (followingIds.length === 0) {
        return { items: [], nextCursor: undefined, hasMore: false };
      }

      const items = await ctx.prisma.post.findMany({
        where: {
          creatorId: { in: followingIds },
          status: "PUBLISHED",
        },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: postBasicInclude,
      });

      const enriched = await enrichPostsWithViewerState(ctx, items);

      let nextCursor: string | undefined = undefined;
      let hasMore = false;
      const formatted = enriched.map((p) => ({
        ...p,
        voteCount: p._count.votes,
        commentCount: p._count.comments,
        likeCount: p._count.likes,
        saveCount: p._count.savedPosts,
      }));
      if (formatted.length > input.limit) {
        hasMore = true;
        formatted.pop();
        nextCursor = formatted[formatted.length - 1]?.id;
      }
      return { items: formatted, nextCursor, hasMore };
    }),

  getTrending: publicProcedure
    .input(
      z.object({
        timeRange: TrendingRange.default("24h"),
        limit: z.number().int().min(1).max(200).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      let createdAtGte: Date;
      switch (input.timeRange) {
        case "1h":
          createdAtGte = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case "7d":
          createdAtGte = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "24h":
        default:
          createdAtGte = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
      }

      const items = await ctx.prisma.post.findMany({
        where: {
          status: "PUBLISHED",
          createdAt: { gte: createdAtGte },
        },
        orderBy: [{ trendingScore: "desc" as const }, { voteCount: "desc" as const }],
        take: input.limit,
        include: postBasicInclude,
      });

      const enriched = await enrichPostsWithViewerState(ctx, items);

      return enriched.map((p) => ({
        ...p,
        voteCount: p._count.votes,
        commentCount: p._count.comments,
        likeCount: p._count.likes,
        saveCount: p._count.savedPosts,
      }));
    }),

  getNew: publicProcedure
    .input(
      z.object({
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.post.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: postBasicInclude,
      });
      const enriched = await enrichPostsWithViewerState(ctx, items);
      let nextCursor: string | undefined = undefined;
      let hasMore = false;
      const formatted = enriched.map((p) => ({
        ...p,
        voteCount: p._count.votes,
        commentCount: p._count.comments,
        likeCount: p._count.likes,
        saveCount: p._count.savedPosts,
      }));
      if (formatted.length > input.limit) {
        hasMore = true;
        formatted.pop();
        nextCursor = formatted[formatted.length - 1]?.id;
      }
      return { items: formatted, nextCursor, hasMore };
    }),

  getByCategory: publicProcedure
    .input(
      z.object({
        categoryId: z.string().cuid().optional(),
        slug: z.string().optional(),
        sort: PostSort.default("hot"),
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!input.categoryId && !input.slug) {
        throw new Error("Either categoryId or slug is required");
      }

      let categoryId: string | undefined = input.categoryId;
      if (!categoryId && input.slug) {
        const cat = await ctx.prisma.category.findUnique({
          where: { slug: input.slug },
          select: { id: true },
        });
        categoryId = cat?.id;
      }
      if (!categoryId) {
        return { items: [], nextCursor: undefined, hasMore: false };
      }

      const orderBy: Record<string, unknown>[] = [];
      if (input.sort === "new") orderBy.push({ createdAt: "desc" });
      else if (input.sort === "top") orderBy.push({ voteCount: "desc" });
      else orderBy.push({ trendingScore: "desc" }, { createdAt: "desc" });

      const items = await ctx.prisma.post.findMany({
        where: { status: "PUBLISHED", categoryId },
        orderBy,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: postBasicInclude,
      });
      const enriched = await enrichPostsWithViewerState(ctx, items);
      let nextCursor: string | undefined = undefined;
      let hasMore = false;
      const formatted = enriched.map((p) => ({
        ...p,
        voteCount: p._count.votes,
        commentCount: p._count.comments,
        likeCount: p._count.likes,
        saveCount: p._count.savedPosts,
      }));
      if (formatted.length > input.limit) {
        hasMore = true;
        formatted.pop();
        nextCursor = formatted[formatted.length - 1]?.id;
      }
      return { items: formatted, nextCursor, hasMore };
    }),
});
