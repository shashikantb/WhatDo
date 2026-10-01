import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  moderatorProcedure,
  publicProcedure,
} from "../trpc";
import { QuestionStatus, QuestionTaxonomy } from "@prisma/client";
import { WHATDO_FUNNEL_EVENT_NAMES } from "@/lib/whatdo/funnel-events";

export const adminQuestionsRouter = createTRPCRouter({
  list: moderatorProcedure
    .input(
      z.object({
        status: z.nativeEnum(QuestionStatus).optional(),
        category: z.nativeEnum(QuestionTaxonomy).optional(),
        skip: z.number().int().default(0),
        take: z.number().int().min(1).max(100).default(50),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {};
      if (input.status) where.status = input.status;
      if (input.category) where.category = input.category;
      if (input.search && input.search.trim().length > 0) {
        where.questionText = { contains: input.search.trim(), mode: "insensitive" };
      }
      const [rows, total] = await Promise.all([
        ctx.prisma.assessmentQuestion.findMany({
          where,
          skip: input.skip,
          take: input.take,
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          include: { options: { orderBy: { sortOrder: "asc" } } },
        }),
        ctx.prisma.assessmentQuestion.count({ where }),
      ]);
      return { rows, total };
    }),

  get: moderatorProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await ctx.prisma.assessmentQuestion.findUnique({
        where: { id: input.id },
        include: { options: { orderBy: { sortOrder: "asc" } } },
      });
      if (!row) throw new TRPCError({ code: "NOT_FOUND" });
      return row;
    }),

  update: moderatorProcedure
    .input(
      z.object({
        id: z.string(),
        questionText: z.string().optional(),
        category: z.nativeEnum(QuestionTaxonomy).optional(),
        subcategory: z.string().nullish(),
        targetAgeGroup: z.string().nullish(),
        targetCity: z.string().nullish(),
        targetRegion: z.string().nullish(),
        targetCountry: z.string().nullish(),
        minSampleSize: z.number().int().optional(),
        engagementScore: z.number().nullish(),
        shareabilityScore: z.number().int().nullish(),
        sensitivityLevel: z.string().nullish(),
        aiGenerated: z.boolean().optional(),
        options: z
          .array(
            z.object({
              id: z.string().optional(),
              label: z.string(),
              sortOrder: z.number().int(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, options, ...rest } = input;
      const updateData: any = rest;
      if (updateData.engagementScore != null) {
        updateData.engagementScore = updateData.engagementScore;
      }
      const q = await ctx.prisma.assessmentQuestion.update({
        where: { id },
        data: {
          ...updateData,
          options: options
            ? {
                deleteMany: {},
                create: options.map((o) => ({
                  label: o.label,
                  sortOrder: o.sortOrder,
                })),
              }
            : undefined,
        },
      });
      return q;
    }),

  approve: moderatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const q = await ctx.prisma.assessmentQuestion.update({
        where: { id: input.id },
        data: {
          status: QuestionStatus.APPROVED,
          approvedById: ctx.session.user.id,
          approvedAt: new Date(),
        },
      });
      return q;
    }),

  reject: moderatorProcedure
    .input(z.object({ id: z.string(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const q = await ctx.prisma.assessmentQuestion.update({
        where: { id: input.id },
        data: {
          status: QuestionStatus.REJECTED,
        },
      });
      return q;
    }),

  publish: moderatorProcedure
    .input(
      z.object({
        id: z.string(),
        scheduledAt: z.date().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const status = input.scheduledAt
        ? QuestionStatus.SCHEDULED
        : QuestionStatus.PUBLISHED;
      const q = await ctx.prisma.assessmentQuestion.update({
        where: { id: input.id },
        data: {
          status,
          scheduledAt: input.scheduledAt ?? undefined,
          publishedAt: status === QuestionStatus.PUBLISHED ? new Date() : undefined,
          approvedById: ctx.session.user.id,
          approvedAt: new Date(),
        },
      });
      return q;
    }),

  close: moderatorProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const q = await ctx.prisma.assessmentQuestion.update({
        where: { id: input.id },
        data: { status: QuestionStatus.CLOSED, expiresAt: new Date() },
      });
      return q;
    }),

  generateSimilar: moderatorProcedure
    .input(
      z.object({
        id: z.string(),
        count: z.number().int().min(1).max(10).default(3),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const source = await ctx.prisma.assessmentQuestion.findUnique({
        where: { id: input.id },
        include: { options: true },
      });
      if (!source) throw new TRPCError({ code: "NOT_FOUND" });
      const drafts: any[] = [];
      for (let i = 0; i < input.count; i++) {
        const variants = [
          `V1: `,
          `V2: Would you agree — `,
          `V3: Hot take: `,
        ];
        drafts.push(
          await ctx.prisma.assessmentQuestion.create({
            data: {
              questionText: `${variants[i % variants.length]}${source.questionText}`,
              category: source.category,
              subcategory: source.subcategory ?? undefined,
              answerType: source.answerType,
              targetAgeGroup: source.targetAgeGroup ?? undefined,
              targetCity: source.targetCity ?? undefined,
              targetRegion: source.targetRegion ?? undefined,
              targetCountry: source.targetCountry ?? undefined,
              sourceType: "AI_SIMILAR",
              sourceReference: source.id,
              aiGenerated: true,
              status: QuestionStatus.DRAFT,
              createdById: ctx.session.user.id,
              minSampleSize: 50,
              timesSelected: 0,
              voteCount: 0,
              options: {
                create: source.options.map((o, i) => ({
                  label: o.label,
                  sortOrder: i + 1,
                })),
              },
            },
          }),
        );
      }
      return { drafts };
    }),

  generateTrendingDraft: moderatorProcedure
    .input(
      z.object({
        count: z.number().int().min(1).max(20).default(5),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const ideas = [
        "Do you think AI will replace 30%+ of entry-level jobs by 2028?",
        "₹10,000 unexpected bonus — what do you do first?",
        "Short-form video vs. long-form reading — which shapes your opinions more?",
        "Would you quit social media for 6 months for ₹50,000?",
        "Is renting a home better than buying right now in your city?",
        "Remote work vs. office — which makes you MORE productive?",
        "Should college education be free in India?",
      ];
      const taxonomies: any[] = [
        "OPINION",
        "MONEY",
        "TECHNOLOGY",
        "LIFESTYLE",
        "CAREER",
        "RELATIONSHIP",
        "INTERNET_TREND",
      ];
      const out: any[] = [];
      for (let i = 0; i < Math.min(input.count, ideas.length, taxonomies.length); i++) {
        out.push(
          await ctx.prisma.assessmentQuestion.create({
            data: {
              questionText: (ideas[i] ?? ideas[0] ?? ""),
              category: (taxonomies[i] ?? "OPINION") as any,
              answerType: "YES_NO",
              status: QuestionStatus.DRAFT,
              aiGenerated: true,
              sourceType: "TREND_DRAFT",
              createdById: ctx.session.user.id,
              minSampleSize: 50,
              timesSelected: 0,
              voteCount: 0,
              options: {
                create: [
                  { label: "Yes", sortOrder: 1 },
                  { label: "No", sortOrder: 2 },
                ],
              },
            },
          }),
        );
      }
      return { drafts: out };
    }),

  funnelStats: moderatorProcedure
    .input(
      z.object({
        days: z.number().int().min(1).max(90).default(14),
      }),
    )
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - input.days * 24 * 3600 * 1000);
      const rows = await ctx.prisma.analyticsFunnelEvent.groupBy({
        by: ["event"],
        where: { createdAt: { gte: since } },
        _count: true,
      });
      const totals = Object.fromEntries(
        WHATDO_FUNNEL_EVENT_NAMES.map((n) => [n, 0]),
      ) as Record<string, number>;
      for (const r of rows as any[]) {
        totals[r.event] = (totals[r.event] ?? 0) + r._count;
      }
      const dailyRaw = await ctx.prisma.analyticsFunnelEvent.groupBy({
        by: ["event", "createdAt"],
        where: { createdAt: { gte: since } },
        _count: true,
      });
      const byDay: Record<string, Record<string, number>> = {};
      for (const r of dailyRaw as any[]) {
        const day = new Date(r.createdAt).toISOString().slice(0, 10);
        byDay[day] = byDay[day] ?? {};
        byDay[day][r.event] = (byDay[day][r.event] ?? 0) + r._count;
      }
      return { totals, days: input.days, byDay, events: WHATDO_FUNNEL_EVENT_NAMES };
    }),

  summaryStats: publicProcedure.query(async ({ ctx }) => {
    const [questions, users, responses, identities, sharers] = await Promise.all([
      ctx.prisma.assessmentQuestion.count({ where: { status: QuestionStatus.PUBLISHED } }),
      ctx.prisma.user.count(),
      ctx.prisma.questionResponse.count(),
      ctx.prisma.whatDoIdentityResult.count(),
      ctx.prisma.referralShareEvent.aggregate({
        _sum: { clickedCount: true, signups: true, completions: true, reveals: true },
      }),
    ]);
    return {
      publishedQuestions: questions,
      users,
      responses,
      identities,
      sharers: sharers._sum,
    };
  }),
});
