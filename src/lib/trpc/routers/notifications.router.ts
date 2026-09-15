import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../trpc";

export const notificationsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z.object({
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const items = await ctx.prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: {
          actor: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          post: {
            select: { id: true, slug: true, question: true },
          },
          comment: {
            select: { id: true, text: true },
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

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.prisma.notification.updateMany({
      where: { recipientId: ctx.session.user.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { success: true };
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.notification.update({
        where: { id: input.id, recipientId: ctx.session.user.id },
        data: { isRead: true, readAt: new Date() },
      });
    }),

  unreadCount: publicProcedure.query(async ({ ctx }) => {
    const userId = ctx.session?.user?.id;
    if (!userId) return 0;
    return ctx.prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });
  }),
});
