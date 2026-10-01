import type { WhatDoSignal, SignalScores, QuestionTaxonomy } from "./signals";
import {
  accumulateSignalContribution,
  createEmptySignalScores,
  normalizeSignalScores,
  getStrongestSignal,
  SIGNAL_META,
} from "./signals";
import { classifyArchetype, type WhatDoArchetype } from "./archetypes";

export const INSUFFICIENT_DATA = "Not enough WhatDo data yet.";

export interface OptionAggregate {
  optionId: string;
  responseCount: number;
  responsePct: number | null;
}

export interface QuestionAggregate {
  questionId: string;
  totalResponses: number;
  optionAggregates: OptionAggregate[];
  cityTotalResponses?: number;
  cityOptionAggregates?: OptionAggregate[];
}

export interface UserAnswer {
  questionId: string;
  optionId: string;
  taxonomy: QuestionTaxonomy;
  optionIndex: number;
  totalOptions: number;
  answeredAt: Date;
  userCitySnapshot?: string | null;
}

export interface AggregationSource {
  getQuestionAggregate(questionId: string, city?: string | null): Promise<QuestionAggregate>;
  getQuestionAggregatesBatch(
    questionIds: string[],
    city?: string | null,
  ): Promise<Record<string, QuestionAggregate>>;
}

export interface AnswerWithAggregate {
  answer: UserAnswer;
  aggregate: QuestionAggregate;
  selectedCount: number;
  totalCount: number;
  agreementPct: number | null;
  cityAgreementPct: number | null;
  isMajority: boolean;
  isContrarian: boolean;
  isRare: boolean;
  isVeryRare: boolean;
}

export interface PerQuestionResult {
  questionId: string;
  optionId: string;
  agreementPct: number | null;
  rarityPct: number | null;
  cityAlignmentPct: number | null;
  isMajority: boolean;
  isContrarian: boolean;
  isRare: boolean;
  isVeryRare: boolean;
}

export interface EngineThresholds {
  rareAnswerThresholdPct: number;
  veryRareAnswerThresholdPct: number;
  minGlobalSampleSize: number;
  minCitySampleSize: number;
}

export const DEFAULT_THRESHOLDS: EngineThresholds = {
  rareAnswerThresholdPct: 20,
  veryRareAnswerThresholdPct: 10,
  minGlobalSampleSize: 30,
  minCitySampleSize: 50,
};

export interface ScoreEngineInput {
  answers: UserAnswer[];
  aggregates: Record<string, QuestionAggregate>;
  userCity?: string | null;
  thresholds?: Partial<EngineThresholds>;
}

export interface ScoreEngineResult {
  perQuestion: PerQuestionResult[];
  summary: {
    answerableCount: number;
    sufficientDataCount: number;
    citySufficientDataCount: number;
  };
  agreementScorePct: number | null;
  rarityScorePct: number | null;
  cityAlignmentPct: number | null;
  majorityMatches: number;
  totalMajorityEligible: number;
  contrarianCount: number;
  totalContrarianEligible: number;
  rareAnswerCount: number;
  veryRareAnswerCount: number;
  rarestAnswer: {
    questionId: string;
    optionId: string;
    rarityPct: number;
  } | null;
  strongestTrait: WhatDoSignal | null;
  signalScores: SignalScores | null;
  whatDoArchetype: WhatDoArchetype | null;
  archetypeScores: Partial<Record<WhatDoArchetype, number>> | null;
}

function safePct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return (numerator / denominator) * 100;
}

function isRare(pct: number | null, thresholdPct: number): boolean {
  return pct !== null && pct <= thresholdPct;
}

export function buildAnswerWithAggregate(
  answer: UserAnswer,
  aggregate: QuestionAggregate,
  thresholds: EngineThresholds,
  userCity?: string | null,
): AnswerWithAggregate {
  const selected =
    aggregate.optionAggregates.find((o) => o.optionId === answer.optionId) ??
    null;
  const selectedCount = selected?.responseCount ?? 0;
  const totalCount = aggregate.totalResponses;
  const agreementPct =
    totalCount >= thresholds.minGlobalSampleSize
      ? safePct(selectedCount, totalCount)
      : null;
  let cityAgreementPct: number | null = null;
  if (
    userCity &&
    aggregate.cityTotalResponses !== undefined &&
    aggregate.cityOptionAggregates &&
    aggregate.cityTotalResponses >= thresholds.minCitySampleSize
  ) {
    const citySelected = aggregate.cityOptionAggregates.find(
      (o) => o.optionId === answer.optionId,
    );
    cityAgreementPct = safePct(
      citySelected?.responseCount ?? 0,
      aggregate.cityTotalResponses,
    );
  }
  const sortedByCount = [...aggregate.optionAggregates].sort(
    (a, b) => b.responseCount - a.responseCount,
  );
  const topOption = sortedByCount[0];
  const bottomOption = [...sortedByCount]
    .filter((o) => o.responseCount > 0)
    .sort((a, b) => a.responseCount - b.responseCount)[0];
  const isMajority =
    topOption !== undefined &&
    totalCount >= thresholds.minGlobalSampleSize &&
    topOption.optionId === answer.optionId;
  const isContrarian =
    bottomOption !== undefined &&
    totalCount >= thresholds.minGlobalSampleSize &&
    bottomOption.optionId === answer.optionId &&
    !isMajority;
  return {
    answer,
    aggregate,
    selectedCount,
    totalCount,
    agreementPct,
    cityAgreementPct,
    isMajority,
    isContrarian,
    isRare: isRare(agreementPct, thresholds.rareAnswerThresholdPct),
    isVeryRare: isRare(agreementPct, thresholds.veryRareAnswerThresholdPct),
  };
}

export function calculateScoreEngine(
  input: ScoreEngineInput,
): ScoreEngineResult {
  const thresholds: EngineThresholds = {
    ...DEFAULT_THRESHOLDS,
    ...(input.thresholds ?? {}),
  };
  const perQuestion: PerQuestionResult[] = [];
  let sumAgreement = 0;
  let agreementN = 0;
  let sumCity = 0;
  let cityN = 0;
  let majorityMatches = 0;
  let majorityEligible = 0;
  let contrarianCount = 0;
  let contrarianEligible = 0;
  let rareCount = 0;
  let veryRareCount = 0;
  let rarest: { questionId: string; optionId: string; rarityPct: number } | null = null;
  let signalAccumulator = createEmptySignalScores();
  let signalContributions = 0;
  let sufficientDataCount = 0;
  let citySufficientDataCount = 0;
  const MIN_SIGNAL_CONTRIBUTIONS_TO_CLASSIFY = 6;
  for (const answer of input.answers) {
    const aggregate = input.aggregates[answer.questionId];
    if (!aggregate) continue;
    const built = buildAnswerWithAggregate(
      answer,
      aggregate,
      thresholds,
      input.userCity,
    );
    const sampleOk =
      aggregate.totalResponses >= thresholds.minGlobalSampleSize &&
      built.agreementPct !== null;
    if (sampleOk) {
      sufficientDataCount += 1;
      const agree = built.agreementPct!;
      sumAgreement += agree;
      agreementN += 1;
      if (built.isRare) rareCount += 1;
      if (built.isVeryRare) veryRareCount += 1;
      majorityEligible += 1;
      contrarianEligible += 1;
      if (built.isMajority) majorityMatches += 1;
      if (built.isContrarian) contrarianCount += 1;
      if (rarest === null || agree < rarest.rarityPct) {
        rarest = {
          questionId: answer.questionId,
          optionId: answer.optionId,
          rarityPct: agree,
        };
      }
    }
    signalAccumulator = accumulateSignalContribution(
      signalAccumulator,
      answer.taxonomy,
      answer.optionIndex,
      answer.totalOptions,
      sampleOk && built.isMajority,
    );
    signalContributions += 1;
    if (built.cityAgreementPct !== null) {
      citySufficientDataCount += 1;
      sumCity += built.cityAgreementPct;
      cityN += 1;
    }
    perQuestion.push({
      questionId: answer.questionId,
      optionId: answer.optionId,
      agreementPct: built.agreementPct,
      rarityPct:
        built.agreementPct !== null ? 100 - built.agreementPct : null,
      cityAlignmentPct: built.cityAgreementPct,
      isMajority: built.isMajority,
      isContrarian: built.isContrarian,
      isRare: built.isRare,
      isVeryRare: built.isVeryRare,
    });
  }
  const agreementScorePct = agreementN > 0 ? sumAgreement / agreementN : null;
  const rarityScorePct =
    agreementScorePct !== null ? 100 - agreementScorePct : null;
  const cityAlignmentPct = cityN > 0 ? sumCity / cityN : null;
  let signalScores: SignalScores | null = null;
  let strongestTrait: WhatDoSignal | null = null;
  let archetype: WhatDoArchetype | null = null;
  let archetypeScores: Partial<Record<WhatDoArchetype, number>> | null = null;
  if (signalContributions >= MIN_SIGNAL_CONTRIBUTIONS_TO_CLASSIFY) {
    signalScores = normalizeSignalScores(signalAccumulator, signalContributions);
    strongestTrait = getStrongestSignal(signalScores);
    const classified = classifyArchetype({
      signals: signalScores,
      contrarianAnswerCount: contrarianCount,
      totalQuestions: Math.max(majorityEligible, signalContributions),
      rareAnswerCount: rareCount,
    });
    archetype = classified.archetype;
    archetypeScores = classified.scores;
  }
  return {
    perQuestion,
    summary: {
      answerableCount: input.answers.length,
      sufficientDataCount,
      citySufficientDataCount,
    },
    agreementScorePct:
      agreementScorePct !== null ? Number(agreementScorePct.toFixed(1)) : null,
    rarityScorePct:
      rarityScorePct !== null ? Number(rarityScorePct.toFixed(1)) : null,
    cityAlignmentPct:
      cityAlignmentPct !== null ? Number(cityAlignmentPct.toFixed(1)) : null,
    majorityMatches,
    totalMajorityEligible: majorityEligible,
    contrarianCount,
    totalContrarianEligible: contrarianEligible,
    rareAnswerCount: rareCount,
    veryRareAnswerCount: veryRareCount,
    rarestAnswer: rarest
      ? {
          ...rarest,
          rarityPct: Number(rarest.rarityPct.toFixed(1)),
        }
      : null,
    strongestTrait,
    signalScores,
    whatDoArchetype: archetype,
    archetypeScores,
  };
}

export function formatPctOrFallback(
  value: number | null | undefined,
  decimals = 0,
  fallback = INSUFFICIENT_DATA,
): string {
  if (value === null || value === undefined) return fallback;
  const rounded = Number(value.toFixed(decimals));
  return `${rounded}%`;
}

export function getSignalScoreLabel(
  signalScores: SignalScores | null,
  signal: WhatDoSignal,
): string {
  if (!signalScores) return INSUFFICIENT_DATA;
  return `${SIGNAL_META[signal].icon} ${SIGNAL_META[signal].label} ${signalScores[signal]}`;
}

export function getStrongestTraitsDisplay(
  result: ScoreEngineResult,
  topN = 2,
): Array<{ signal: WhatDoSignal; score: number; label: string }> {
  if (!result.signalScores) return [];
  const entries = Object.entries(result.signalScores) as [WhatDoSignal, number][];
  return entries
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([signal, score]) => ({
      signal,
      score,
      label: SIGNAL_META[signal].label,
    }));
}

export interface LegacyPerQuestionResult {
  questionId: string;
  optionId?: string | null;
  taxonomy?: QuestionTaxonomy | null;
  agreementPct: number | null;
  rarityPct: number | null;
  isMajority?: boolean | null;
  isContrarian?: boolean | null;
  isRare?: boolean | null;
  isVeryRare?: boolean | null;
  isMostPopular?: boolean | null;
  isRarest?: boolean | null;
}

export interface LegacyCalculateResult {
  result?: {
    archetype: WhatDoArchetype;
    agreementPct: number | null;
    overallRarityPct: number | null;
    majorityMatches: number;
    contrarianAnswers: number;
    totalQuestions: number;
    cityAlignmentPct: number | null;
    strongestTrait: WhatDoSignal | string;
    signalScores: SignalScores;
    perQuestionResults: LegacyPerQuestionResult[];
    rareAnswersCount: number;
    veryRareAnswersCount: number;
  } | null;
  reason?: string | null;
}

export async function calculateWhatDoResult(
  answers: UserAnswer[],
  source: AggregationSource,
  thresholds: EngineThresholds,
  opts: { city?: string | null; minQuestions?: number },
): Promise<LegacyCalculateResult> {
  if (answers.length < (opts.minQuestions ?? 10)) {
    return {
      result: null,
      reason: "Not enough answers.",
    };
  }
  const qids = Array.from(new Set(answers.map((a) => a.questionId)));
  const agg = await source.getQuestionAggregatesBatch(qids, opts.city ?? null);
  const engine = calculateScoreEngine({
    answers,
    aggregates: agg,
    userCity: opts.city ?? null,
    thresholds,
  });
  if (!engine.whatDoArchetype || !engine.signalScores) {
    return { result: null, reason: INSUFFICIENT_DATA };
  }
  const perQuestionResults: LegacyPerQuestionResult[] = engine.perQuestion.map(
    (p) => ({
      questionId: p.questionId,
      optionId: p.optionId ?? null,
      agreementPct: p.agreementPct ?? null,
      rarityPct: p.rarityPct ?? null,
      isMajority: p.isMajority,
      isContrarian: p.isContrarian,
      isRare: p.isRare,
      isVeryRare: p.isVeryRare,
    }),
  );
  return {
    result: {
      archetype: engine.whatDoArchetype,
      agreementPct: engine.agreementScorePct,
      overallRarityPct: engine.rarityScorePct,
      majorityMatches: engine.majorityMatches,
      contrarianAnswers: engine.contrarianCount,
      totalQuestions: answers.length,
      cityAlignmentPct: engine.cityAlignmentPct,
      strongestTrait: engine.strongestTrait ?? "CURIOSITY",
      signalScores: engine.signalScores,
      perQuestionResults,
      rareAnswersCount: engine.rareAnswerCount,
      veryRareAnswersCount: engine.veryRareAnswerCount,
    },
    reason: null,
  };
}

function buildAggregatesFromRows(
  globalRows: Array<{ assessmentQuestionId: string; selectedOptionId: string; count: bigint | number | string }>,
  cityRows: Array<{ assessmentQuestionId: string; selectedOptionId: string; count: bigint | number | string }>,
  optionRecords: Record<string, Record<string, { optionId: string; sortOrder: number }>>,
): Record<string, QuestionAggregate> {
  const bn = (v: any): number => {
    if (typeof v === "bigint") return Number(v);
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const globalMap = new Map<string, Map<string, number>>();
  const cityMap = new Map<string, Map<string, number>>();
  const qTotals = new Map<string, number>();
  const qCityTotals = new Map<string, number>();
  for (const r of globalRows) {
    const q = r.assessmentQuestionId;
    const cnt = bn(r.count);
    let byOpt = globalMap.get(q);
    if (!byOpt) { byOpt = new Map(); globalMap.set(q, byOpt); }
    byOpt.set(r.selectedOptionId, cnt);
    qTotals.set(q, (qTotals.get(q) ?? 0) + cnt);
  }
  for (const r of cityRows) {
    const q = r.assessmentQuestionId;
    const cnt = bn(r.count);
    let byOpt = cityMap.get(q);
    if (!byOpt) { byOpt = new Map(); cityMap.set(q, byOpt); }
    byOpt.set(r.selectedOptionId, cnt);
    qCityTotals.set(q, (qCityTotals.get(q) ?? 0) + cnt);
  }
  const out: Record<string, QuestionAggregate> = {};
  const allQids = new Set<string>([...globalMap.keys(), ...cityMap.keys(), ...Object.keys(optionRecords)]);
  for (const qid of allQids) {
    const optMap = optionRecords[qid] ?? {};
    const optIds = Object.values(optMap)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((o) => o.optionId);
    const global = globalMap.get(qid) ?? new Map<string, number>();
    const city = cityMap.get(qid) ?? new Map<string, number>();
    const totalGlobal = qTotals.get(qid) ?? 0;
    const totalCity = qCityTotals.get(qid) ?? 0;
    const safePct = (n: number, d: number): number | null => d > 0 ? Math.round((n / d) * 100) : null;
    out[qid] = {
      questionId: qid,
      totalResponses: totalGlobal,
      optionAggregates: optIds.map((oid) => ({
        optionId: oid,
        responseCount: global.get(oid) ?? 0,
        responsePct: safePct(global.get(oid) ?? 0, totalGlobal),
      })),
      cityTotalResponses: totalCity,
      cityOptionAggregates: optIds.map((oid) => ({
        optionId: oid,
        responseCount: city.get(oid) ?? 0,
        responsePct: safePct(city.get(oid) ?? 0, totalCity),
      })),
    };
  }
  return out;
}

export function createPrismaAggregationSource(prisma: any): AggregationSource {
  return {
    async getQuestionAggregate(questionId, city) {
      const batch = await this.getQuestionAggregatesBatch([questionId], city);
      return (
        batch[questionId] ?? {
          questionId,
          totalResponses: 0,
          optionAggregates: [],
          cityTotalResponses: 0,
          cityOptionAggregates: [],
        }
      );
    },
    async getQuestionAggregatesBatch(questionIds, city) {
      if (questionIds.length === 0) return {};
      const ids = Array.from(new Set(questionIds));
      const placeholders = ids.map((i) => `'${String(i).replace(/'/g, "''")}'`).join(",");
      const [globalRawRaw, cityRawRaw, optionsRawRaw] = await Promise.all([
        prisma.$queryRawUnsafe(
          `SELECT "assessmentQuestionId", "selectedOptionId", COUNT(*)::bigint count
           FROM "QuestionResponse"
           WHERE "assessmentQuestionId" IN (${placeholders})
           GROUP BY "assessmentQuestionId", "selectedOptionId";`
        ),
        city
          ? prisma.$queryRawUnsafe(
              `SELECT "assessmentQuestionId", "selectedOptionId", COUNT(*)::bigint count
               FROM "QuestionResponse"
               WHERE "assessmentQuestionId" IN (${placeholders})
                 AND "citySnapshot" = '${String(city).replace(/'/g, "''")}'
               GROUP BY "assessmentQuestionId", "selectedOptionId";`
            )
          : Promise.resolve([]),
        prisma.$queryRawUnsafe(
          `SELECT "assessmentQuestionId", id, "sortOrder"
           FROM "AssessmentQuestionOption"
           WHERE "assessmentQuestionId" IN (${placeholders})
           ORDER BY "assessmentQuestionId", "sortOrder" ASC;`
        ),
      ]);
      const globalRaw = globalRawRaw as Array<{
        assessmentQuestionId: string;
        selectedOptionId: string;
        count: bigint;
      }>;
      const cityRaw = cityRawRaw as Array<{
        assessmentQuestionId: string;
        selectedOptionId: string;
        count: bigint;
      }>;
      const optionsRaw = optionsRawRaw as Array<{
        assessmentQuestionId: string;
        id: string;
        sortOrder: number;
      }>;
      const optionRecords: Record<string, Record<string, { optionId: string; sortOrder: number }>> = {};
      for (const o of optionsRaw) {
        const q = o.assessmentQuestionId;
        const obj = optionRecords[q] ?? {};
        obj[o.id] = { optionId: o.id, sortOrder: Number(o.sortOrder) };
        optionRecords[q] = obj;
      }
      return buildAggregatesFromRows(globalRaw, cityRaw, optionRecords);
    },
  };
}

export type { QuestionTaxonomy } from "@prisma/client";
