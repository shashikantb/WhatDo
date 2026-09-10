import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  rateLimitFollowMiddleware,
} from "../trpc";
import { USER_SELECT_PUBLIC } from "../../constants";
import { trackEvent } from "../../analytics";

export const socialRouter = createTRPCRouter({
  follow: protectedProcedure
    .use(rateLimitFollowMiddleware)
    .input(z.object({ userId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session!;
      const followerId = session.user.id;
      const followingId = input.userId;

      if (followerId === followingId) {
        throw new Error("Cannot follow yourself");
      }

      const existing = await ctx.prisma.follow.findUnique({
        where: { followerId_followingId: { followerId, followingId } },
      });

      if (existing) {
        await ctx.prisma.follow.delete({
          where: { followerId_followingId: { followerId, followingId } },
        });
        return { following: false };
      }

      await ctx.prisma.follow.create({
        data: { followerId, followingId },
      });

      const targetUser = await ctx.prisma.user.findUnique({
        where: { id: followingId },
      });
      if (targetUser) {
        await ctx.prisma.notification.create({
          data: {
            recipientId: followingId,
            actorId: followerId,
            type: "FOLLOW",
          },
        });
      }

      try {
        await trackEvent(
          "follow_created",
          { followerId, followingId },
          { skipThrottle: true },
        );
      } catch {
      }

      return { following: true };
    }),

  unfollow: protectedProcedure
    .input(z.object({ userId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session!;
      const followerId = session.user.id;
      const followingId = input.userId;

      await ctx.prisma.follow.deleteMany({
        where: { followerId, followingId },
      });
      return { success: true };
    }),

  followers: publicProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.follow.findMany({
        where: { followingId: input.userId },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: {
          follower: { select: USER_SELECT_PUBLIC },
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

  following: publicProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.follow.findMany({
        where: { followerId: input.userId },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: {
          following: { select: USER_SELECT_PUBLIC },
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

  suggestedUsers: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      const currentUserId = ctx.session?.user?.id;

      const excludedIds: string[] = [];
      if (currentUserId) {
        excludedIds.push(currentUserId);
        const follows = await ctx.prisma.follow.findMany({
          where: { followerId: currentUserId },
          select: { followingId: true },
        });
        excludedIds.push(...follows.map((f) => f.followingId));
      }

      return ctx.prisma.user.findMany({
        where: {
          id: { notIn: excludedIds },
          isBanned: false,
        },
        take: input.limit,
        orderBy: [
          { isVerified: "desc" },
          { opinionScore: "desc" },
          { totalPosts: "desc" },
        ],
        select: USER_SELECT_PUBLIC,
      });
    }),

  block: protectedProcedure
    .input(z.object({ userId: z.string().cuid(), reason: z.string().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session!;
      const blockerId = session.user.id;
      const blockedId = input.userId;

      if (blockerId === blockedId) {
        throw new Error("Cannot block yourself");
      }

      await ctx.prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId, blockedId } },
        create: { blockerId, blockedId, reason: input.reason },
        update: { reason: input.reason },
      });

      await ctx.prisma.follow.deleteMany({
        where: {
          OR: [
            { followerId: blockerId, followingId: blockedId },
            { followerId: blockedId, followingId: blockerId },
          ],
        },
      });

      return { success: true };
    }),

  mute: protectedProcedure
    .input(
      z.object({
        userId: z.string().cuid(),
        expiresAt: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session!;
      const muterId = session.user.id;
      const mutedId = input.userId;

      if (muterId === mutedId) {
        throw new Error("Cannot mute yourself");
      }

      await ctx.prisma.userMute.upsert({
        where: { muterId_mutedId: { muterId, mutedId } },
        create: { muterId, mutedId, expiresAt: input.expiresAt },
        update: { expiresAt: input.expiresAt },
      });

      return { success: true };
    }),
});
