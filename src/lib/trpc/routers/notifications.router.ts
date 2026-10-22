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

  /**
   * Registers a native push (FCM) device token for the signed-in user.
   *
   * Called by the Android app when the Capacitor PushNotifications plugin
   * returns a registration token. Purely additive: the existing website never
   * calls it, and it fails soft when the DeviceToken table has not been created
   * in a given environment yet, so shipping the app cannot break the site.
   */
  registerDevice: protectedProcedure
    .input(
      z.object({
        token: z.string().min(10).max(4096),
        platform: z.enum(["android", "ios", "web"]).default("android"),
        deviceId: z.string().max(200).optional(),
        appVersion: z.string().max(40).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      try {
        await ctx.prisma.deviceToken.upsert({
          where: { token: input.token },
          create: {
            userId,
            token: input.token,
            platform: input.platform,
            deviceId: input.deviceId,
            appVersion: input.appVersion,
          },
          update: {
            userId,
            platform: input.platform,
            deviceId: input.deviceId,
            appVersion: input.appVersion,
            isActive: true,
            lastSeenAt: new Date(),
          },
        });
        return { success: true };
      } catch {
        return { success: false };
      }
    }),

  /** Marks a device token inactive (e.g. on sign-out). */
  unregisterDevice: protectedProcedure
    .input(z.object({ token: z.string().min(10).max(4096) }))
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.deviceToken.updateMany({
          where: { token: input.token, userId: ctx.session.user.id },
          data: { isActive: false },
        });
        return { success: true };
      } catch {
        return { success: false };
      }
    }),
});
