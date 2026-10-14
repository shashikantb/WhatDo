import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "../trpc";
import { USER_SELECT_PUBLIC } from "../../constants";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const businessRouter = createTRPCRouter({
  /** Get the current user's business profile + services + hours + resources. */
  getMyBusiness: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        isBusiness: true,
        businessName: true,
        businessCategory: true,
        businessDescription: true,
        businessServices: { orderBy: { createdAt: "asc" } },
        businessHours: { orderBy: { dayOfWeek: "asc" } },
        businessResources: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
    return user;
  }),

  /** Update the current user's business profile fields. */
  updateProfile: protectedProcedure
    .input(
      z.object({
        isBusiness: z.boolean().optional(),
        businessName: z.string().min(1).max(100).optional().nullable(),
        businessCategory: z.string().max(50).optional().nullable(),
        businessDescription: z.string().max(1000).optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.session.user.id },
        data: input,
        select: {
          id: true,
          isBusiness: true,
          businessName: true,
          businessCategory: true,
          businessDescription: true,
        },
      });
    }),

  // ── Services ────────────────────────────────────────────────────────
  listServices: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.businessService.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "asc" },
    });
  }),

  createService: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(1000).optional().nullable(),
        price: z.number().min(0).default(0),
        durationMinutes: z.number().int().min(1).max(1440).default(30),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ensureBusiness(ctx);
      return ctx.prisma.businessService.create({
        data: { ...input, userId: ctx.session.user.id },
      });
    }),

  updateService: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(1000).optional().nullable(),
        price: z.number().min(0).optional(),
        durationMinutes: z.number().int().min(1).max(1440).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const svc = await ctx.prisma.businessService.findUnique({ where: { id } });
      if (!svc || svc.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service not found." });
      }
      return ctx.prisma.businessService.update({ where: { id }, data });
    }),

  deleteService: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const svc = await ctx.prisma.businessService.findUnique({ where: { id: input.id } });
      if (!svc || svc.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Service not found." });
      }
      await ctx.prisma.businessService.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ── Hours ───────────────────────────────────────────────────────────
  listHours: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.businessHour.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { dayOfWeek: "asc" },
    });
  }),

  /** Upsert hours for a single day of week (0-6). */
  setHours: protectedProcedure
    .input(
      z.object({
        dayOfWeek: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
        endTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
        isClosed: z.boolean().default(true),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ensureBusiness(ctx);
      const userId = ctx.session.user.id;
      return ctx.prisma.businessHour.upsert({
        where: { userId_dayOfWeek: { userId, dayOfWeek: input.dayOfWeek } },
        update: {
          startTime: input.isClosed ? null : input.startTime ?? null,
          endTime: input.isClosed ? null : input.endTime ?? null,
          isClosed: input.isClosed,
        },
        create: {
          userId,
          dayOfWeek: input.dayOfWeek,
          startTime: input.isClosed ? null : input.startTime ?? null,
          endTime: input.isClosed ? null : input.endTime ?? null,
          isClosed: input.isClosed,
        },
      });
    }),

  // ── Resources ───────────────────────────────────────────────────────
  listResources: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.businessResource.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: "asc" },
    });
  }),

  createResource: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      await ensureBusiness(ctx);
      return ctx.prisma.businessResource.create({
        data: { name: input.name, userId: ctx.session.user.id },
      });
    }),

  updateResource: protectedProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(1).max(100).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const res = await ctx.prisma.businessResource.findUnique({ where: { id } });
      if (!res || res.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found." });
      }
      return ctx.prisma.businessResource.update({ where: { id }, data });
    }),

  deleteResource: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const res = await ctx.prisma.businessResource.findUnique({ where: { id: input.id } });
      if (!res || res.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found." });
      }
      await ctx.prisma.businessResource.delete({ where: { id: input.id } });
      return { success: true };
    }),

  // ── Public business lookup ──────────────────────────────────────────
  getByUsername: publicProcedure
    .input(z.object({ username: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { username: input.username },
        select: {
          ...USER_SELECT_PUBLIC,
          isBusiness: true,
          businessName: true,
          businessCategory: true,
          businessDescription: true,
          businessServices: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
          businessHours: { orderBy: { dayOfWeek: "asc" } },
          businessResources: { where: { isActive: true } },
        },
      });
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found." });
      return user;
    }),
});

/** Throw if the caller has not enabled business mode. */
async function ensureBusiness(ctx: { session: { user: { id: string } }; prisma: import("@prisma/client").PrismaClient }) {
  const u = await ctx.prisma.user.findUnique({
    where: { id: ctx.session.user.id },
    select: { isBusiness: true },
  });
  if (!u?.isBusiness) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Business mode is not enabled for this account." });
  }
}

export { DAYS };
