import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  adminProcedure,
} from "../trpc";

const PlacementEnum = z.enum([
  "FEED_EVERY_N",
  "BANNER",
  "SPONSORED_NATIVE",
  "DESKTOP_SIDEBAR",
]);

export const adsRouter = createTRPCRouter({
  getActiveForPlacement: publicProcedure
    .input(
      z.object({
        placement: PlacementEnum,
        limit: z.number().int().min(1).max(50).default(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const items = await ctx.prisma.adConfiguration.findMany({
        where: {
          placement: input.placement,
          isEnabled: true,
          OR: [
            { scheduleStart: null },
            { scheduleStart: { lte: now } },
          ],
          AND: [
            {
              OR: [
                { scheduleEnd: null },
                { scheduleEnd: { gte: now } },
              ],
            },
            {
              OR: [
                { budgetClicks: null },
                { budgetClicks: { gt: ctx.prisma.adConfiguration.fields.clickCount } },
              ],
            },
          ],
        },
        orderBy: [
          { priority: "desc" },
          { createdAt: "desc" },
        ],
        take: input.limit,
      });

      const filtered = items.filter((ad) => {
        if (ad.budgetClicks === null || ad.budgetClicks === undefined) return true;
        return ad.clickCount < ad.budgetClicks;
      });

      return filtered;
    }),

  registerImpression: publicProcedure
    .input(
      z.object({
        adId: z.string().cuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.adConfiguration.update({
          where: { id: input.adId },
          data: { impressionCount: { increment: 1 } },
        });
      } catch {
      }

      try {
        const userId = ctx.session?.user?.id ?? undefined;
        await ctx.prisma.analyticsEvent.create({
          data: {
            userId,
            eventType: "ad_impression",
            properties: { adId: input.adId } as any,
            pageUrl: ctx.req?.url,
            userAgent: ctx.headers.get("user-agent") ?? undefined,
            ipHash: ctx.userIp ?? undefined,
          },
        });
      } catch {
      }

      return { ok: true };
    }),

  registerClick: publicProcedure
    .input(
      z.object({
        adId: z.string().cuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.prisma.adConfiguration.update({
          where: { id: input.adId },
          data: { clickCount: { increment: 1 } },
        });
      } catch {
      }

      try {
        const userId = ctx.session?.user?.id ?? undefined;
        await ctx.prisma.analyticsEvent.create({
          data: {
            userId,
            eventType: "ad_click",
            properties: { adId: input.adId } as any,
            pageUrl: ctx.req?.url,
            userAgent: ctx.headers.get("user-agent") ?? undefined,
            ipHash: ctx.userIp ?? undefined,
          },
        });
      } catch {
      }

      return { ok: true };
    }),

  list: adminProcedure
    .input(
      z.object({
        placement: PlacementEnum.optional(),
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.placement) where.placement = input.placement;

      const items = await ctx.prisma.adConfiguration.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
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
});
