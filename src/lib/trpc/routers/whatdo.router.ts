import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "../trpc";
import { QuestionStatus } from "@prisma/client";
import {
  fromPrismaQuestion,
  pickNextQuestion,
  DEFAULT_CATEGORY_MIX,
} from "@/lib/whatdo/question-selector";
import type {
  QuestionAggregate,
  UserAnswer,
} from "@/lib/whatdo/score-engine";
import {
  DEFAULT_THRESHOLDS,
  INSUFFICIENT_DATA,
  calculateWhatDoResult,
  createPrismaAggregationSource,
} from "@/lib/whatdo/score-engine";
import {
  buildAIPromptIdentityInput,
  generateAIPrompts,
  validateAIPrompt,
  type AnsweredQuestionWithStats,
} from "@/lib/whatdo/ai-prompt";
import type { WhatDoCardTemplate } from "@/lib/whatdo/ai-prompt";
import { WhatDoArchetype } from "@/lib/whatdo/archetypes";
import crypto from "crypto";
import { WHATDO_FUNNEL_EVENT_NAMES } from "@/lib/whatdo/funnel-events";
export type WhatDoFunnelEventName = (typeof WHATDO_FUNNEL_EVENT_NAMES)[number];

function makeSessionId() {
  return `sess_${crypto.randomBytes(10).toString("hex")}`;
}
function makeShareToken() {
  return `wd_${crypto.randomBytes(8).toString("base64url")}`;
}

async function emitFunnel(
  prisma: any,
  event: WhatDoFunnelEventName,
  opts: { sessionId?: string; userId?: string; extraData?: any },
) {
  try {
    await prisma.analyticsFunnelEvent.create({
      data: {
        event,
        sessionId: opts.sessionId ?? undefined,
        userId: opts.userId ?? undefined,
        extraData: opts.extraData ?? undefined,
      },
    });
  } catch {
  }
}

export const whatdoRouter = createTRPCRouter({
  trackLanding: publicProcedure
    .input(z.object({ sessionId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const sid = input.sessionId ?? makeSessionId();
      await emitFunnel(ctx.prisma, "WHATDO_LANDING_VIEWED", { sessionId: sid });
      return { sessionId: sid };
    }),

  startAssessment: publicProcedure
    .input(
      z.object({
        sessionId: z.string().optional(),
        city: z.string().nullish(),
        region: z.string().nullish(),
        country: z.string().nullish(),
        ageGroup: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const sessionId = input.sessionId ?? makeSessionId();
      const userId = ctx.session?.user?.id ?? null;
      if (userId) {
        await ctx.prisma.user.update({
          where: { id: userId },
          data: {
            city: input.city ?? undefined,
            region: input.region ?? undefined,
            country: input.country ?? undefined,
            ageGroup: input.ageGroup ?? undefined,
            lastAssessmentSessionId: sessionId,
          },
        });
      }
      await emitFunnel(ctx.prisma, "QUIZ_STARTED", {
        sessionId,
        userId: userId ?? undefined,
        extraData: { city: input.city, ageGroup: input.ageGroup },
      });
      return { sessionId };
    }),

  nextQuestion: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        answeredQuestionIds: z.array(z.string()).default([]),
        city: z.string().nullish(),
        region: z.string().nullish(),
        country: z.string().nullish(),
        ageGroup: z.string().nullish(),
        targetQuestionCount: z.number().int().min(10).max(15).default(12),
      }),
    )
    .query(async ({ ctx, input }) => {
      const poolRaw = await ctx.prisma.assessmentQuestion.findMany({
        where: { status: QuestionStatus.PUBLISHED },
      });
      if (poolRaw.length === 0) {
        return { question: null, progress: { answered: 0, total: input.targetQuestionCount, done: true } };
      }
      const pool = poolRaw.map(fromPrismaQuestion);
      const answeredIds = new Set(input.answeredQuestionIds);
      const categoryCounts: Record<string, number> = {};
      if (input.answeredQuestionIds.length > 0) {
        const categories = await ctx.prisma.assessmentQuestion.findMany({
          where: { id: { in: input.answeredQuestionIds } },
          select: { category: true },
        });
        for (const c of categories) {
          categoryCounts[c.category] = (categoryCounts[c.category] ?? 0) + 1;
        }
      }
      const pick = pickNextQuestion(pool, {
        userCity: input.city ?? null,
        userRegion: input.region ?? null,
        userCountry: input.country ?? null,
        userAgeGroup: input.ageGroup ?? null,
        answeredQuestionIds: answeredIds,
        categoryCounts,
        targetQuestionCount: input.targetQuestionCount,
        categoryMix: DEFAULT_CATEGORY_MIX,
      });
      let fullQuestion: any = null;
      const reachedTarget = input.answeredQuestionIds.length >= input.targetQuestionCount;
      const pickQuestionForFull = reachedTarget ? null : pick.question;
      if (pickQuestionForFull) {
        fullQuestion = await ctx.prisma.assessmentQuestion.findUnique({
          where: { id: pickQuestionForFull.id },
          include: { options: { orderBy: { sortOrder: "asc" } } },
        });
        await emitFunnel(ctx.prisma, "QUESTION_SHOWN", {
          sessionId: input.sessionId,
          userId: ctx.session?.user?.id ?? undefined,
          extraData: { questionId: pickQuestionForFull.id },
        });
      }
      const done =
        pickQuestionForFull == null || reachedTarget;
      return {
        question: fullQuestion,
        progress: {
          answered: input.answeredQuestionIds.length,
          total: input.targetQuestionCount,
          done,
        },
        score: pick.score
          ? { weightedScore: pick.score.weightedScore }
          : null,
      };
    }),

  submitAnswer: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        questionId: z.string(),
        optionId: z.string(),
        citySnapshot: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? null;
      const whereUnique = userId
        ? { userId_assessmentQuestionId: { userId, assessmentQuestionId: input.questionId } }
        : { sessionId_assessmentQuestionId: { sessionId: input.sessionId, assessmentQuestionId: input.questionId } };
      try {
        await ctx.prisma.questionResponse.upsert({
          where: whereUnique as any,
          update: {
            selectedOptionId: input.optionId,
            citySnapshot: input.citySnapshot ?? undefined,
          },
          create: {
            userId: userId ?? undefined,
            sessionId: userId ? undefined : input.sessionId,
            assessmentQuestionId: input.questionId,
            selectedOptionId: input.optionId,
            citySnapshot: input.citySnapshot ?? undefined,
          },
        });
        await ctx.prisma.assessmentQuestion.update({
          where: { id: input.questionId },
          data: { voteCount: { increment: 1 }, timesSelected: { increment: 1 } },
        });
      } catch (e: any) {
        if (String(e?.code ?? "") === "P2002") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You already answered this question.",
          });
        }
        throw e;
      }
      await emitFunnel(ctx.prisma, "ANSWER_SUBMITTED", {
        sessionId: input.sessionId,
        userId: userId ?? undefined,
        extraData: { questionId: input.questionId, optionId: input.optionId },
      });
      return { ok: true };
    }),

  calculateResult: publicProcedure
    .input(
      z.object({
        sessionId: z.string(),
        minQuestions: z.number().int().default(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? null;
      const whereClause = userId
        ? { userId }
        : { sessionId: input.sessionId, userId: null };
      const responses = await ctx.prisma.questionResponse.findMany({
        where: whereClause,
        include: {
          question: { include: { options: true } },
        },
      });
      if (responses.length < input.minQuestions) {
        return {
          computed: false,
          reason: INSUFFICIENT_DATA,
          answeredCount: responses.length,
          minRequired: input.minQuestions,
        };
      }
      const user = userId
        ? await ctx.prisma.user.findUnique({ where: { id: userId }, select: { city: true } })
        : null;
      const citySnapshot = user?.city ?? responses[0]?.citySnapshot ?? null;
      const answers: UserAnswer[] = responses.map((r: any) => {
        const optionIndex = Math.max(
          0,
          r.question.options.findIndex((o: any) => o.id === r.selectedOptionId),
        );
        return {
          questionId: r.assessmentQuestionId,
          optionId: r.selectedOptionId,
          taxonomy: r.question.category,
          optionIndex,
          totalOptions: r.question.options.length,
          answeredAt: r.createdAt,
          userCitySnapshot: r.citySnapshot ?? citySnapshot,
        };
      });
      const source = createPrismaAggregationSource(ctx.prisma);
      const computed = calculateWhatDoResult(answers, source, DEFAULT_THRESHOLDS, {
        city: citySnapshot,
      });
      const awaited = await computed;
      if (!awaited.result) {
        await emitFunnel(ctx.prisma, "RESULT_VIEWED", {
          sessionId: input.sessionId,
          userId: userId ?? undefined,
          extraData: { answered: responses.length, insufficient: true },
        });
        return {
          computed: false,
          reason: awaited.reason ?? INSUFFICIENT_DATA,
          answeredCount: responses.length,
          minRequired: input.minQuestions,
        };
      }
      const result = awaited.result;
      const strongestTrait = result.strongestTrait;
      const rarest = result.perQuestionResults
        .filter((p) => p.rarityPct != null)
        .sort((a: any, b: any) => (a.rarityPct ?? 100) - (b.rarityPct ?? 100))[0];

      let referrerId: string | null = null;
      try {
        const cookieHeader = ctx.headers.get("cookie") ?? "";
        const match = cookieHeader
          .split(";")
          .map((s) => s.trim())
          .find((s) => s.startsWith("whatdo_ref="));
        if (match) {
          const token = decodeURIComponent(match.split("=")[1] ?? "");
          const ref = await ctx.prisma.referralShareEvent.findUnique({
            where: { shareToken: token },
            select: { userId: true },
          });
          if (ref?.userId) referrerId = ref.userId;
        }
      } catch {
      }

      const whatdoCreateData = {
        whatdoType: result.archetype as string,
        agreementScorePct: Math.round(result.agreementPct ?? 50),
        rarityScorePct: Math.round(result.overallRarityPct ?? 50),
        majorityMatches: result.majorityMatches,
        contrarianAnswers: result.contrarianAnswers,
        totalQuestions: responses.length,
        cityAlignmentPct:
          result.cityAlignmentPct != null
            ? Math.round(result.cityAlignmentPct)
            : null,
        citySnapshot,
        strongestTrait: String(strongestTrait),
        rarestAnswerQuestionId: rarest?.questionId ?? null,
        rarestAnswerPct:
          rarest?.rarityPct != null ? Math.round(rarest.rarityPct) : null,
        signalCuriosity: Math.round(result.signalScores.CURIOSITY),
        signalRiskTaking: Math.round(result.signalScores.RISK_TAKING),
        signalCreativity: Math.round(result.signalScores.CREATIVITY),
        signalSocial: Math.round(result.signalScores.SOCIAL),
        signalIndependence: Math.round(result.signalScores.INDEPENDENCE),
      } as const;

      let identity: any;
      if (userId) {
        identity = await ctx.prisma.whatDoIdentityResult.upsert({
          where: { userId },
          update: whatdoCreateData,
          create: {
            userId,
            referrerId: referrerId ?? undefined,
            ...whatdoCreateData,
          },
        });
      } else {
        const existing = await ctx.prisma.whatDoIdentityResult.findFirst({
          where: { sessionId: input.sessionId },
        });
        if (existing) {
          identity = await ctx.prisma.whatDoIdentityResult.update({
            where: { id: existing.id },
            data: whatdoCreateData,
          });
        } else {
          identity = await ctx.prisma.whatDoIdentityResult.create({
            data: {
              sessionId: input.sessionId,
              ...whatdoCreateData,
            },
          });
        }
      }

      if (referrerId) {
        try {
          const refRow = await ctx.prisma.referralShareEvent.findFirst({
            where: { userId: referrerId },
            orderBy: { createdAt: "desc" },
          });
          if (refRow) {
            await ctx.prisma.referralShareEvent.update({
              where: { id: refRow.id },
              data: {
                reveals: { increment: 1 },
                completions: { increment: 1 },
              },
            });
          }
          await emitFunnel(ctx.prisma, "REFERRAL_COMPLETED", {
            sessionId: input.sessionId,
            userId: referrerId,
            extraData: { referredUserId: userId ?? undefined, identityId: identity.id },
          });
        } catch {
        }
      }

      await emitFunnel(ctx.prisma, "RESULT_VIEWED", {
        sessionId: input.sessionId,
        userId: userId ?? undefined,
        extraData: { archetype: result.archetype, identityId: identity.id },
      });

      return {
        computed: true,
        identityId: identity.id,
        archetype: result.archetype,
        agreementPct: result.agreementPct,
        rarityPct: result.overallRarityPct,
        majorityMatches: result.majorityMatches,
        contrarianAnswers: result.contrarianAnswers,
        cityAlignmentPct: result.cityAlignmentPct,
        citySnapshot,
        strongestTrait,
        signalScores: result.signalScores,
        perQuestion: result.perQuestionResults,
        rareAnswersCount: result.rareAnswersCount,
        veryRareAnswersCount: result.veryRareAnswersCount,
      };
    }),

  revealAfterLogin: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const moved = await ctx.prisma.questionResponse.updateMany({
        where: { sessionId: input.sessionId, userId: null },
        data: { userId, sessionId: null },
      });
      const existingIdentity = await ctx.prisma.whatDoIdentityResult.findFirst({
        where: { sessionId: input.sessionId },
      });
      if (existingIdentity) {
        const mergeData = {
          whatdoType: existingIdentity.whatdoType,
          agreementScorePct: existingIdentity.agreementScorePct,
          rarityScorePct: existingIdentity.rarityScorePct,
          majorityMatches: existingIdentity.majorityMatches,
          contrarianAnswers: existingIdentity.contrarianAnswers,
          totalQuestions: existingIdentity.totalQuestions,
          cityAlignmentPct: existingIdentity.cityAlignmentPct,
          citySnapshot: existingIdentity.citySnapshot,
          strongestTrait: existingIdentity.strongestTrait,
          rarestAnswerQuestionId: existingIdentity.rarestAnswerQuestionId,
          rarestAnswerPct: existingIdentity.rarestAnswerPct,
          signalCuriosity: existingIdentity.signalCuriosity,
          signalRiskTaking: existingIdentity.signalRiskTaking,
          signalCreativity: existingIdentity.signalCreativity,
          signalSocial: existingIdentity.signalSocial,
          signalIndependence: existingIdentity.signalIndependence,
          referrerId: existingIdentity.referrerId,
        } as const;
        await ctx.prisma.whatDoIdentityResult.delete({
          where: { id: existingIdentity.id },
        });
        await ctx.prisma.whatDoIdentityResult.upsert({
          where: { userId },
          update: { ...mergeData, sessionId: null },
          create: { userId, ...mergeData },
        });
      }
      await emitFunnel(ctx.prisma, "RESULT_REVEALED", {
        sessionId: input.sessionId,
        userId,
        extraData: { movedCount: moved.count },
      });
      return { mergedCount: moved.count, identityUserId: userId };
    }),

  getIdentity: publicProcedure
    .input(z.object({ identityId: z.string().optional(), sessionId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session?.user?.id ?? null;
      let id: any = null;
      if (input.identityId) {
        id = await ctx.prisma.whatDoIdentityResult.findUnique({
          where: { id: input.identityId },
        });
      } else if (userId) {
        id = await ctx.prisma.whatDoIdentityResult.findUnique({
          where: { userId },
        });
      } else if (input.sessionId) {
        id = await ctx.prisma.whatDoIdentityResult.findFirst({
          where: { sessionId: input.sessionId, userId: null },
          orderBy: { createdAt: "desc" },
        });
      }
      if (!id) return null;
      return {
        id: id.id,
        whatdoType: id.whatdoType as WhatDoArchetype,
        agreementPct: id.agreementScorePct,
        rarityPct: id.rarityScorePct,
        majorityMatches: id.majorityMatches,
        contrarianAnswers: id.contrarianAnswers,
        totalQuestions: id.totalQuestions,
        cityAlignmentPct: id.cityAlignmentPct,
        citySnapshot: id.citySnapshot,
        strongestTrait: id.strongestTrait,
        rarestAnswerPct: id.rarestAnswerPct,
        signalScores: {
          CURIOSITY: id.signalCuriosity,
          RISK_TAKING: id.signalRiskTaking,
          CREATIVITY: id.signalCreativity,
          SOCIAL: id.signalSocial,
          INDEPENDENCE: id.signalIndependence,
        },
      };
    }),

  generateShareToken: protectedProcedure
    .input(z.object({ identityId: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const token = makeShareToken();
      const existing = await ctx.prisma.referralShareEvent.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });
      let share: any;
      if (existing) {
        share = await ctx.prisma.referralShareEvent.update({
          where: { id: existing.id },
          data: { shareToken: token },
        });
      } else {
        share = await ctx.prisma.referralShareEvent.create({
          data: { userId, shareToken: token, shareType: "IDENTITY_CARD" },
        });
      }
      const shareUrl = `${process.env.NEXTAUTH_URL ?? "https://whatdo.co.in"}/?ref=${share.shareToken}`;
      await emitFunnel(ctx.prisma, "SHARE_BUTTON_CLICKED", {
        userId,
        extraData: { identityId: input.identityId, shareToken: share.shareToken },
      });
      return { shareToken: share.shareToken, shareUrl };
    }),

  generateAIPrompt: publicProcedure
    .input(
      z.object({
        identityId: z.string().optional(),
        template: z.enum([
          "MINIMAL",
          "NEON_GENZ",
          "PREMIUM_DARK",
          "COLORFUL",
          "FUTURISTIC_AI",
          "LOCAL_CITY",
        ]),
        identityOverride: z
          .object({
            archetype: z.string(),
            agreementPct: z.number().nullish(),
            rarityPct: z.number().nullish(),
            strongestTrait: z.string().nullish(),
            citySnapshot: z.string().nullish(),
          })
          .optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      let identity: any = input.identityOverride ?? null;
      let identityOwner: { userId: string | null; sessionId: string | null; userCity: string | null } | null = null;
      if (!identity && input.identityId) {
        const row = await ctx.prisma.whatDoIdentityResult.findUnique({
          where: { id: input.identityId },
          select: {
            id: true,
            userId: true,
            sessionId: true,
            whatdoType: true,
            signalCuriosity: true,
            signalRiskTaking: true,
            signalCreativity: true,
            signalSocial: true,
            signalIndependence: true,
            agreementScorePct: true,
            rarityScorePct: true,
            cityAlignmentPct: true,
            rarestAnswerPct: true,
            citySnapshot: true,
            rarestAnswerQuestionId: true,
          },
        });
        if (row) {
          identityOwner = {
            userId: row.userId,
            sessionId: row.sessionId,
            userCity: row.citySnapshot ?? null,
          };
          identity = {
            whatDoArchetype: row.whatdoType as WhatDoArchetype,
            signalScores: {
              CURIOSITY: row.signalCuriosity,
              RISK_TAKING: row.signalRiskTaking,
              CREATIVITY: row.signalCreativity,
              SOCIAL: row.signalSocial,
              INDEPENDENCE: row.signalIndependence,
            },
            agreementScorePct: row.agreementScorePct,
            rarityScorePct: row.rarityScorePct,
            cityAlignmentPct: row.cityAlignmentPct,
            rarestAnswer: row.rarestAnswerPct ? { rarityPct: row.rarestAnswerPct, questionId: row.rarestAnswerQuestionId } : null,
            citySnapshot: row.citySnapshot,
          };
        }
      }
      if (!identity) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Identity not found." });
      }
      const engineResult: any = identity.whatDoArchetype ? identity : {
        whatDoArchetype: identity.whatdoType ?? identity.archetype ?? identity.whatDoArchetype,
        signalScores: identity.signalScores ?? {
          CURIOSITY: identity.signalCuriosity ?? 50,
          RISK_TAKING: identity.signalRiskTaking ?? 50,
          CREATIVITY: identity.signalCreativity ?? 50,
          SOCIAL: identity.signalSocial ?? 50,
          INDEPENDENCE: identity.signalIndependence ?? 50,
        },
        agreementScorePct: identity.agreementScorePct ?? identity.agreementPct ?? null,
        rarityScorePct: identity.rarityScorePct ?? identity.rarityPct ?? null,
        cityAlignmentPct: identity.cityAlignmentPct ?? null,
        rarestAnswer: identity.rarestAnswerPct ? { rarityPct: identity.rarestAnswerPct } : identity.rarestAnswer ?? null,
      };
      const userCity = (identityOwner?.userCity ?? identity.citySnapshot ?? identity.city ?? null) as string | null;

      // Step 2 — pull user (displayName/username/avatarUrl) + personal referral share token for branded URL CTA
      let userMeta: { displayName: string | null; username: string | null; shareToken: string | null } = {
        displayName: null,
        username: null,
        shareToken: null,
      };
      if (identityOwner?.userId) {
        const u = await ctx.prisma.user.findUnique({
          where: { id: identityOwner.userId },
          select: { displayName: true, username: true },
        }).catch(() => null);
        if (u) {
          userMeta.displayName = u.displayName ?? null;
          userMeta.username = u.username ?? null;
        }
        const share = await ctx.prisma.referralShareEvent.findFirst({
          where: { userId: identityOwner.userId, shareType: "WHATDO_IDENTITY" },
          orderBy: { createdAt: "desc" },
          select: { shareToken: true },
        }).catch(() => null);
        if (share?.shareToken) userMeta.shareToken = share.shareToken;
      } else if (identityOwner?.sessionId) {
        const shares = await ctx.prisma.referralShareEvent.findMany({
          where: { shareType: { in: ["WHATDO_IDENTITY_SESSION", "WHATDO_IDENTITY", "WHATDO_RESULT"] as any }, shareChannel: identityOwner.sessionId },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { shareToken: true },
        }).catch(() => []) as any[];
        if (shares && shares[0]?.shareToken) {
          userMeta.shareToken = shares[0].shareToken;
        }
      }
      const personalShareUrl = userMeta.shareToken
        ? `https://whatdo.co.in/?ref=${userMeta.shareToken}`
        : null;

      // Step 3 — resolve all 12 answers with question + option text
      let userAnswers: AnsweredQuestionWithStats[] = [];
      if (identityOwner && (identityOwner.userId || identityOwner.sessionId)) {
        try {
          const where: any = {};
          if (identityOwner.userId) where.userId = identityOwner.userId;
          else where.sessionId = identityOwner.sessionId;
          const responses = await ctx.prisma.questionResponse.findMany({
            where,
            orderBy: { createdAt: "asc" },
            include: {
              question: {
                select: {
                  id: true,
                  questionText: true,
                },
              },
              selectedOption: {
                select: {
                  id: true,
                  label: true,
                  sortOrder: true,
                },
              },
            },
          });
          if (responses && responses.length > 0) {
            const qIdList = Array.from(new Set(responses.map((r: any) => r.assessmentQuestionId)));
            // Fetch ALL option labels (sorted) for each answered question so the prompt shows distribution of every option
            const allOpts = await ctx.prisma.assessmentQuestionOption.findMany({
              where: { assessmentQuestionId: { in: qIdList } },
              orderBy: [{ assessmentQuestionId: "asc" }, { sortOrder: "asc" }],
              select: { assessmentQuestionId: true, id: true, label: true, sortOrder: true },
            });
            const optsByQ: Record<string, Array<{ id: string; label: string; sortOrder: number }>> = {};
            for (const o of allOpts) {
              (optsByQ[o.assessmentQuestionId] = optsByQ[o.assessmentQuestionId] ?? []).push(o);
            }
            // Batch aggregates: global + city (city = userCity from identity)
            const aggSource = createPrismaAggregationSource(ctx.prisma);
            const aggregates = await aggSource.getQuestionAggregatesBatch(qIdList, userCity ?? undefined);

            responses.forEach((r: any, idx: number) => {
              const qid = r.assessmentQuestionId;
              const agg: any = aggregates[qid] ?? null;
              const globalTotal = Number(agg?.totalResponses ?? 0);
              const cityTotal = Number(agg?.cityTotalResponses ?? 0);
              const globalOpts = new Map<string, { optionId: string; responseCount: number; responsePct: number | null }>((agg?.optionAggregates ?? []).map((o: any) => [String(o.optionId), o]));
              const cityOpts = new Map<string, { optionId: string; responseCount: number; responsePct: number | null }>((agg?.cityOptionAggregates ?? []).map((o: any) => [String(o.optionId), o]));
              const optionListAll = (optsByQ[qid] ?? []).sort((a, b) => a.sortOrder - b.sortOrder);
              const selectedIndex = optionListAll.findIndex((o) => o.id === r.selectedOptionId);
              const selectedGlobal = globalOpts.get(r.selectedOptionId) ?? null;
              const selectedCity = cityOpts.get(r.selectedOptionId) ?? null;
              const selGPct = selectedGlobal?.responsePct ?? (globalTotal > 0 ? (Number(selectedGlobal?.responseCount ?? 0) / globalTotal) * 100 : null);
              const selCPct = selectedCity?.responsePct ?? (cityTotal > 0 ? (Number(selectedCity?.responseCount ?? 0) / cityTotal) * 100 : null);
              const allOptsOut = optionListAll.map((o) => {
                const g = globalOpts.get(o.id) ?? null;
                const c = cityOpts.get(o.id) ?? null;
                const gp = g?.responsePct ?? (globalTotal > 0 ? (Number(g?.responseCount ?? 0) / globalTotal) * 100 : null);
                const cp = c?.responsePct ?? (cityTotal > 0 ? (Number(c?.responseCount ?? 0) / cityTotal) * 100 : null);
                return {
                  label: o.label,
                  isSelected: o.id === r.selectedOptionId,
                  globalResponsePct: gp,
                  cityResponsePct: cp,
                };
              });
              const isMajor = selGPct !== null && optionListAll.every((o) => {
                if (o.id === r.selectedOptionId) return true;
                const og = globalOpts.get(o.id);
                return selGPct >= (og?.responsePct ?? 0);
              });
              const isContra = selGPct !== null && selGPct <= 25;
              const isRare = selGPct !== null && selGPct <= DEFAULT_THRESHOLDS.rareAnswerThresholdPct;
              const isVRare = selGPct !== null && selGPct <= DEFAULT_THRESHOLDS.veryRareAnswerThresholdPct;
              userAnswers.push({
                questionText: r.question?.questionText ?? `Question #${idx + 1}`,
                questionNumber: idx + 1,
                selectedOptionLabel: r.selectedOption?.label ?? "",
                selectedOptionIndex: selectedIndex >= 0 ? selectedIndex : 0,
                allOptions: allOptsOut,
                selectedGlobalPct: selGPct,
                selectedCityPct: selCPct,
                globalTotalResponses: globalTotal,
                cityTotalResponses: cityTotal > 0 ? cityTotal : null,
                selectedIsMajority: isMajor,
                selectedIsContrarian: isContra,
                selectedIsRare: isRare,
                selectedIsVeryRare: isVRare,
              });
            });
          }
        } catch (e) {
          // leave userAnswers empty — prompt falls back gracefully
        }
      }
      const aiInput = buildAIPromptIdentityInput(engineResult, {
        userCity,
        displayName: userMeta.displayName,
        username: userMeta.username,
        cardTemplate: input.template as WhatDoCardTemplate,
        userAnswers,
        personalShareUrl,
      });
      if (!aiInput) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not build AI prompt input." });
      }
      const generated = generateAIPrompts(aiInput);
      const safe = validateAIPrompt(generated);
      if (!safe.valid) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Prompt validation failed: " + (safe.issues?.[0] ?? "Forbidden claim detected"),
        });
      }
      return {
        prompt: generated.imagePrompt,
        shareCaption: generated.shareCaption,
        signalSummary: generated.signalSummary,
        template: generated.template,
        validated: safe.valid,
      };
    }),

  trackShareClick: publicProcedure
    .input(
      z.object({
        shareToken: z.string(),
        event: z.enum([
          "CLICK",
          "SIGNUP",
          "DOWNLOAD",
          "CHALLENGE",
          "PROMPT_COPY",
        ]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const share = await ctx.prisma.referralShareEvent.findUnique({
        where: { shareToken: input.shareToken },
      });
      if (!share) {
        return { ok: false };
      }
      let funnelEvent: WhatDoFunnelEventName = "SHARE_LINK_CLICKED";
      const data: any = {};
      switch (input.event) {
        case "CLICK":
          data.clickedCount = { increment: 1 };
          funnelEvent = "SHARE_LINK_CLICKED";
          break;
        case "SIGNUP":
          data.signups = { increment: 1 };
          funnelEvent = "SHARE_LINK_SIGNUP";
          break;
        case "DOWNLOAD":
          funnelEvent = "SHARE_CARD_DOWNLOADED";
          break;
        case "CHALLENGE":
          data.clickedCount = { increment: 1 };
          funnelEvent = "FRIEND_CHALLENGED";
          break;
        case "PROMPT_COPY":
          funnelEvent = "AI_PROMPT_COPIED";
          break;
      }
      if (Object.keys(data).length > 0) {
        await ctx.prisma.referralShareEvent.update({
          where: { shareToken: input.shareToken },
          data,
        });
      }
      await emitFunnel(ctx.prisma, funnelEvent, {
        sessionId: undefined,
        userId: share.userId ?? undefined,
        extraData: { shareToken: input.shareToken, event: input.event },
      });
      return { ok: true, share };
    }),
});
