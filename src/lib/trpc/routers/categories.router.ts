import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  adminProcedure,
} from "../trpc";

export const categoriesRouter = createTRPCRouter({
  listAll: publicProcedure.query(async ({ ctx }) => {
    return ctx.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { posts: true } },
      },
    });
  }),

  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.category.findUnique({
        where: { slug: input.slug },
        include: {
          _count: { select: { posts: true } },
          tags: true,
        },
      });
    }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(50),
        slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/),
        icon: z.string().optional(),
        color: z.string().optional(),
        description: z.string().max(500).optional(),
        sortOrder: z.number().int().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.category.create({ data: input });
    }),

  update: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        name: z.string().min(2).max(50).optional(),
        slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/).optional(),
        icon: z.string().optional().nullable(),
        color: z.string().optional().nullable(),
        description: z.string().max(500).optional().nullable(),
        sortOrder: z.number().int().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.category.update({ where: { id }, data });
    }),

  delete: adminProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.category.delete({ where: { id: input.id } });
    }),
});
