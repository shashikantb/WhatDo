import type { QuestionTaxonomy } from "./signals";
import { QUESTION_TAXONOMIES } from "./signals";
import type { AssessmentQuestion as PrismaAssessmentQuestion } from "@prisma/client";

export const SELECTION_WEIGHTS = {
  ENGAGEMENT_POTENTIAL: 0.25,
  RELEVANCE: 0.2,
  FRESHNESS: 0.15,
  DIVERSITY: 0.15,
  LOCALITY: 0.25,
  HISTORICAL_PERFORMANCE: 0.0,
} as const;

export const DEFAULT_CATEGORY_MIX: Record<QuestionTaxonomy, number> = {
  OPINION: 1,
  LIFESTYLE: 2,
  PERSONALITY: 2,
  MONEY: 1,
  CAREER: 1,
  TECHNOLOGY: 1,
  RELATIONSHIP: 1,
  SOCIAL_MEDIA: 0,
  ENTERTAINMENT: 1,
  FOOD: 1,
  TRAVEL: 1,
  LOCAL_CITY: 1,
  INTERNET_TREND: 1,
};

export interface AssessmentQuestionCandidate {
  id: string;
  taxonomy: QuestionTaxonomy;
  engagementScore: number;
  shareabilityScore: number;
  qualityScore: number;
  targetCity?: string | null;
  targetRegion?: string | null;
  targetCountry?: string | null;
  createdAt: Date;
  publishedAt?: Date | null;
  voteCount: number;
  responseCount: number;
  duplicateGroupId?: string | null;
}

export interface QuestionSelectionContext {
  userCity?: string | null;
  userRegion?: string | null;
  userCountry?: string | null;
  userAgeGroup?: string | null;
  answeredQuestionIds: Set<string>;
  categoryCounts: Partial<Record<QuestionTaxonomy, number>>;
  targetQuestionCount: number;
  categoryMix?: Partial<Record<QuestionTaxonomy, number>>;
  recentlyAnsweredWithinHours?: number;
  lastAnsweredAtByQuestion?: Record<string, Date>;
}

export interface ScoredQuestion {
  question: AssessmentQuestionCandidate;
  rawScores: {
    engagement: number;
    relevance: number;
    freshness: number;
    diversity: number;
    locality: number;
    historical: number;
  };
  weightedScore: number;
  categoryPenalty: number;
  diversityPenalty: number;
}

export interface SelectedQuestionSet {
  questions: AssessmentQuestionCandidate[];
  byCategory: Partial<Record<QuestionTaxonomy, AssessmentQuestionCandidate[]>>;
  scoreBreakdown: Record<string, ScoredQuestion>;
}

function normalize01(value: number, min = 0, max = 1): number {
  if (max - min <= 0) return 0.5;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

export function computeEngagementScore(
  q: AssessmentQuestionCandidate,
): number {
  const base = normalize01(q.engagementScore, 0, 100);
  const shareBoost = normalize01(q.shareabilityScore, 0, 100) * 0.4;
  const qualityBoost = normalize01(q.qualityScore, 0, 100) * 0.3;
  return Math.min(1, base * 0.6 + shareBoost + qualityBoost);
}

export function computeRelevanceScore(
  q: AssessmentQuestionCandidate,
  ctx: QuestionSelectionContext,
): number {
  let score = 0.5;
  if (ctx.userAgeGroup) score += 0.1;
  if (ctx.userCountry) {
    if (q.targetCountry && q.targetCountry === ctx.userCountry) score += 0.15;
    else if (!q.targetCountry) score += 0.05;
  }
  if (ctx.userRegion) {
    if (q.targetRegion && q.targetRegion === ctx.userRegion) score += 0.1;
  }
  return Math.min(1, Math.max(0, score));
}

export function computeFreshnessScore(
  q: AssessmentQuestionCandidate,
  now = Date.now(),
): number {
  const baseTime = q.publishedAt ?? q.createdAt;
  const ageMs = now - baseTime.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  const halfLifeDays = 21;
  const decay = Math.pow(0.5, ageDays / halfLifeDays);
  return Math.max(0.05, Math.min(1, decay));
}

export function computeHistoricalPerformanceScore(
  q: AssessmentQuestionCandidate,
): number {
  if (q.responseCount < 20) return 0.4;
  const volumeScore = normalize01(Math.log10(q.responseCount + 1), 0, 5);
  const completionScore =
    q.voteCount > 0 ? Math.min(1, q.responseCount / (q.voteCount + 1)) : 0.5;
  return volumeScore * 0.6 + completionScore * 0.4;
}

export function computeLocalityScore(
  q: AssessmentQuestionCandidate,
  ctx: QuestionSelectionContext,
): number {
  if (!ctx.userCity && !ctx.userRegion && !ctx.userCountry) return 0.3;
  let score = 0.05;
  if (ctx.userCountry && q.targetCountry === ctx.userCountry) score += 0.15;
  if (ctx.userRegion && q.targetRegion === ctx.userRegion) score += 0.15;

  // Hard rules for LOCAL_CITY: these questions:
  //  - if question.targetCity == user's exact city → max out +0.85
  //  - if user has a city but question targets a DIFFERENT specific city → 0.01 (irrelevant)
  //  - otherwise (no targetCity on question): +0.05 mild bonus
  if (q.taxonomy === "LOCAL_CITY") {
    if (ctx.userCity && q.targetCity === ctx.userCity) {
      score += 0.85;
    } else if (ctx.userCity && q.targetCity && q.targetCity !== ctx.userCity) {
      score = 0.01;
      return score;
    } else if (!q.targetCity) {
      score += 0.05;
    }
  } else {
    // Non-LOCAL_CITY: user->question.city match is a soft bonus +0.25 (not a hard gate).
    if (ctx.userCity && q.targetCity === ctx.userCity) score += 0.25;
    if (!q.targetCity && !q.targetRegion && !q.targetCountry) score += 0.05;
  }
  return Math.min(1, Math.max(0, score));
}

export function computeDiversityScore(
  q: AssessmentQuestionCandidate,
  ctx: QuestionSelectionContext,
  categoryMix: Record<QuestionTaxonomy, number>,
): { score: number; penalty: number } {
  const current = ctx.categoryCounts[q.taxonomy] ?? 0;
  const target = categoryMix[q.taxonomy] ?? 0;
  if (target <= 0) return { score: 0, penalty: 1 };
  const remaining = target - current;
  if (remaining <= 0) {
    return { score: 0.05, penalty: 1 };
  }
  const ratio = current / target;
  const score = Math.max(0.05, 1 - ratio * ratio);
  return { score, penalty: ratio >= 1 ? 1 : 0 };
}

export function scoreQuestion(
  q: AssessmentQuestionCandidate,
  ctx: QuestionSelectionContext,
  categoryMix: Record<QuestionTaxonomy, number>,
): ScoredQuestion {
  const engagement = computeEngagementScore(q);
  const relevance = computeRelevanceScore(q, ctx);
  const freshness = computeFreshnessScore(q);
  const { score: diversity, penalty: diversityPenalty } = computeDiversityScore(
    q,
    ctx,
    categoryMix,
  );
  const locality = computeLocalityScore(q, ctx);
  const historical = computeHistoricalPerformanceScore(q);
  const weightedScore =
    engagement * SELECTION_WEIGHTS.ENGAGEMENT_POTENTIAL +
    relevance * SELECTION_WEIGHTS.RELEVANCE +
    freshness * SELECTION_WEIGHTS.FRESHNESS +
    diversity * SELECTION_WEIGHTS.DIVERSITY +
    locality * SELECTION_WEIGHTS.LOCALITY +
    historical * SELECTION_WEIGHTS.HISTORICAL_PERFORMANCE;
  return {
    question: q,
    rawScores: { engagement, relevance, freshness, diversity, locality, historical },
    weightedScore: weightedScore * (1 - diversityPenalty * 0.6),
    categoryPenalty: 0,
    diversityPenalty,
  };
}

function resolveCategoryMix(
  ctx: QuestionSelectionContext & { pool?: AssessmentQuestionCandidate[] | null },
): Record<QuestionTaxonomy, number> {
  const targetCount = ctx.targetQuestionCount;
  const custom = ctx.categoryMix ?? {};
  const result = { ...DEFAULT_CATEGORY_MIX } as Record<QuestionTaxonomy, number>;
  for (const tax of QUESTION_TAXONOMIES) {
    if (custom[tax] !== undefined) {
      result[tax] = custom[tax]!;
    }
  }
  // If user provided a city but LOCAL_CITY category in the *available pool*
  // has zero questions matching that exact city → drop LOCAL_CITY slot entirely
  // and re-allocate it to LIFESTYLE (failsafe, non-local category) so the user
  // never receives a Hyderabad local question just because she typed "Pune".
  if (ctx.userCity && result.LOCAL_CITY > 0) {
    const pool = ctx.pool ?? null;
    const hasMatchingCity = pool
      ? pool.some(
          (q) =>
            q.taxonomy === "LOCAL_CITY" &&
            q.targetCity != null &&
            q.targetCity === ctx.userCity,
        )
      : true;
    if (!hasMatchingCity) {
      const move = result.LOCAL_CITY;
      result.LOCAL_CITY = 0;
      result.LIFESTYLE = (result.LIFESTYLE ?? 0) + move;
    }
  }
  const sum = Object.values(result).reduce((a, b) => a + b, 0);
  if (sum === 0) return result;
  if (sum !== targetCount) {
    const scale = targetCount / sum;
    let allocated = 0;
    for (const tax of QUESTION_TAXONOMIES) {
      result[tax] = Math.round(result[tax] * scale);
      allocated += result[tax];
    }
    let diff = targetCount - allocated;
    const sorted = [...QUESTION_TAXONOMIES].sort(
      (a, b) => result[b] - result[a],
    );
    for (const tax of sorted) {
      if (diff === 0) break;
      if (diff > 0) {
        result[tax] += 1;
        diff -= 1;
      } else if (result[tax] > 0) {
        result[tax] -= 1;
        diff += 1;
      }
    }
  }
  return result;
}

export function selectQuestionSet(
  pool: AssessmentQuestionCandidate[],
  ctx: QuestionSelectionContext,
): SelectedQuestionSet {
  const categoryMix = resolveCategoryMix({ ...ctx, pool });
  const targetCount = ctx.targetQuestionCount;
  const answered = new Set(ctx.answeredQuestionIds);
  const recentlyAnsweredHours = ctx.recentlyAnsweredWithinHours ?? 168;
  const now = Date.now();
  let filtered = pool.filter((q) => {
    if (answered.has(q.id)) return false;
    const lastAns = ctx.lastAnsweredAtByQuestion?.[q.id];
    if (lastAns) {
      const t = lastAns.getTime();
      if (now - t < recentlyAnsweredHours * 60 * 60 * 1000) return false;
    }
    return true;
  });
  const seenDuplicates = new Set<string>();
  filtered = filtered.filter((q) => {
    if (!q.duplicateGroupId) return true;
    if (seenDuplicates.has(q.duplicateGroupId)) return false;
    seenDuplicates.add(q.duplicateGroupId);
    return true;
  });
  const workingCtx: QuestionSelectionContext = {
    ...ctx,
    categoryCounts: { ...ctx.categoryCounts },
    answeredQuestionIds: new Set(answered),
  };
  const selected: AssessmentQuestionCandidate[] = [];
  const scoreBreakdown: Record<string, ScoredQuestion> = {};
  const byCategory: Partial<Record<QuestionTaxonomy, AssessmentQuestionCandidate[]>> = {};
  const requiredCategories = (
    Object.entries(categoryMix) as [QuestionTaxonomy, number][]
  ).filter(([, count]) => count > 0);
  for (const [tax, totalNeeded] of requiredCategories) {
    let pickedForCategory = 0;
    const alreadyPicked = workingCtx.categoryCounts[tax] ?? 0;
    const remaining = totalNeeded - alreadyPicked;
    if (remaining <= 0) continue;
    let catPool = filtered.filter(
      (q) =>
        q.taxonomy === tax &&
        !selected.some((s) => s.id === q.id),
    );
    catPool.sort((a, b) => {
      const sa = scoreQuestion(a, workingCtx, categoryMix);
      const sb = scoreQuestion(b, workingCtx, categoryMix);
      return sb.weightedScore - sa.weightedScore;
    });
    for (const q of catPool) {
      if (pickedForCategory >= remaining) break;
      if (selected.length >= targetCount) break;
      const scored = scoreQuestion(q, workingCtx, categoryMix);
      scoreBreakdown[q.id] = scored;
      selected.push(q);
      byCategory[tax] = byCategory[tax] ?? [];
      byCategory[tax]!.push(q);
      workingCtx.categoryCounts[tax] =
        (workingCtx.categoryCounts[tax] ?? 0) + 1;
      workingCtx.answeredQuestionIds.add(q.id);
      pickedForCategory += 1;
    }
  }
  const remainingSlots = targetCount - selected.length;
  if (remainingSlots > 0) {
    let fillPool = filtered.filter((q) => !selected.some((s) => s.id === q.id));
    fillPool.sort((a, b) => {
      const sa = scoreQuestion(a, workingCtx, categoryMix);
      const sb = scoreQuestion(b, workingCtx, categoryMix);
      return sb.weightedScore - sa.weightedScore;
    });
    for (const q of fillPool) {
      if (selected.length >= targetCount) break;
      const scored = scoreQuestion(q, workingCtx, categoryMix);
      scoreBreakdown[q.id] = scored;
      selected.push(q);
      byCategory[q.taxonomy] = byCategory[q.taxonomy] ?? [];
      byCategory[q.taxonomy]!.push(q);
      workingCtx.categoryCounts[q.taxonomy] =
        (workingCtx.categoryCounts[q.taxonomy] ?? 0) + 1;
      workingCtx.answeredQuestionIds.add(q.id);
    }
  }
  return { questions: selected, byCategory, scoreBreakdown };
}

export function pickNextQuestion(
  pool: AssessmentQuestionCandidate[],
  ctx: QuestionSelectionContext,
): {
  question: AssessmentQuestionCandidate | null;
  score: ScoredQuestion | null;
} {
  const singleCtx: QuestionSelectionContext = {
    ...ctx,
    targetQuestionCount: (ctx.categoryCounts
      ? Object.values(ctx.categoryCounts).reduce(
          (a, b) => a + (b ?? 0),
          0,
        )
      : 0) + 1,
  };
  const mix = resolveCategoryMix({
    ...ctx,
    targetQuestionCount: ctx.targetQuestionCount,
    pool,
  });
  const filtered = pool.filter(
    (q) => !singleCtx.answeredQuestionIds.has(q.id),
  );
  if (filtered.length === 0) return { question: null, score: null };
  const scored = filtered
    .map((q) => ({ q, s: scoreQuestion(q, singleCtx, mix) }))
    .sort((a, b) => b.s.weightedScore - a.s.weightedScore);
  const top = scored[0];
  return top
    ? { question: top.q, score: top.s }
    : { question: null, score: null };
}

export function fromPrismaQuestion(pq: PrismaAssessmentQuestion): AssessmentQuestionCandidate {
  const engagementScore = pq.engagementScore != null ? Number(pq.engagementScore) : 50;
  const shareabilityScore = pq.shareabilityScore ?? 50;
  const qualityScore = pq.aiQualityScore != null ? Number(pq.aiQualityScore) : 50;
  return {
    id: pq.id,
    taxonomy: pq.category as QuestionTaxonomy,
    engagementScore,
    shareabilityScore,
    qualityScore,
    targetCity: pq.targetCity,
    targetRegion: pq.targetRegion,
    targetCountry: pq.targetCountry,
    createdAt: pq.createdAt,
    publishedAt: pq.publishedAt,
    voteCount: pq.voteCount ?? 0,
    responseCount: pq.voteCount ?? 0,
    duplicateGroupId: pq.duplicateGroupId,
  };
}
