import { PrismaClient } from "@prisma/client";
import {
  DEFAULT_THRESHOLDS,
  calculateWhatDoResult,
  createPrismaAggregationSource,
} from "@/lib/whatdo/score-engine";
import type { UserAnswer } from "@/lib/whatdo/score-engine";
import { normalizeCityName } from "@/lib/whatdo/cities";

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.whatDoIdentityResult.findMany({
    include: { user: { select: { city: true } } },
    orderBy: { createdAt: "asc" },
  });
  console.log(`Recomputing ${rows.length} identity rows...`);
  for (const id of rows) {
    const userId = id.userId ?? null;
    const sessionId = id.sessionId ?? null;
    const whereClause: any = userId
      ? { userId }
      : sessionId
        ? { sessionId, userId: null }
        : null;
    if (!whereClause) {
      console.log(`SKIP ${id.id}: no userId or sessionId`);
      continue;
    }
    const responses = await prisma.questionResponse.findMany({
      where: whereClause,
      include: { question: { include: { options: true } } },
      orderBy: { createdAt: "asc" },
    });
    if (responses.length < 10) {
      console.log(`SKIP ${id.id}: ${responses.length} responses < 10`);
      continue;
    }
    const citySnapshot = normalizeCityName(
      (id.user?.city as string | null | undefined) ??
        responses[0].citySnapshot ??
        null,
    );
    const answers: UserAnswer[] = responses.map((r: any) => {
      const sortedOpts = [...r.question.options].sort(
        (a: any, b: any) =>
          (a.sortOrder ?? 0) - (b.sortOrder ?? 0) ||
          a.createdAt.localeCompare(b.createdAt),
      );
      const optionIndex = Math.max(
        0,
        sortedOpts.findIndex((o: any) => o.id === r.selectedOptionId),
      );
      return {
        questionId: r.assessmentQuestionId,
        optionId: r.selectedOptionId,
        taxonomy: r.question.category,
        optionIndex,
        totalOptions: sortedOpts.length,
        answeredAt: r.createdAt,
        userCitySnapshot: normalizeCityName(r.citySnapshot) ?? citySnapshot,
      };
    });
    const source = createPrismaAggregationSource(prisma as any);
    const { result } = await calculateWhatDoResult(
      answers,
      source,
      DEFAULT_THRESHOLDS,
      { city: citySnapshot },
    );
    if (!result) {
      console.log(`SKIP ${id.id}: engine returned no result`);
      continue;
    }
    const rarest = [...result.perQuestionResults]
      .filter((p: any) => p.rarityPct != null)
      .sort(
        (a: any, b: any) => (a.rarityPct ?? 100) - (b.rarityPct ?? 100),
      )[0];
    const sig = result.signalScores ?? {
      CURIOSITY: 50,
      RISK_TAKING: 50,
      CREATIVITY: 50,
      SOCIAL: 50,
      INDEPENDENCE: 50,
    };
    await prisma.whatDoIdentityResult.update({
      where: { id: id.id },
      data: {
        whatdoType: result.archetype,
        agreementScorePct:
          result.agreementPct != null ? Math.round(result.agreementPct) : null,
        rarityScorePct:
          result.overallRarityPct != null
            ? Math.round(result.overallRarityPct)
            : null,
        cityAlignmentPct:
          result.cityAlignmentPct != null
            ? Math.round(result.cityAlignmentPct)
            : null,
        majorityMatches: result.majorityMatches,
        contrarianAnswers: result.contrarianAnswers,
        totalQuestions: result.totalQuestions,
        strongestTrait: result.strongestTrait,
        signalCuriosity: sig.CURIOSITY,
        signalRiskTaking: sig.RISK_TAKING,
        signalCreativity: sig.CREATIVITY,
        signalSocial: sig.SOCIAL,
        signalIndependence: sig.INDEPENDENCE,
        citySnapshot,
        rarestAnswerPct:
          rarest?.rarityPct != null ? Math.round(rarest.rarityPct) : null,
        rarestAnswerQuestionId: rarest?.questionId ?? null,
      },
    });
    console.log(
      `${id.id.slice(0, 14)}… → type=${String(result.archetype).padEnd(24, " ")} strongest=${String(result.strongestTrait).padEnd(14, " ")} agree=${result.agreementPct} rarity=${result.overallRarityPct} sig=[C=${sig.CURIOSITY} RT=${sig.RISK_TAKING} Cr=${sig.CREATIVITY} S=${sig.SOCIAL} I=${sig.INDEPENDENCE}] city=${citySnapshot ?? "-"}`,
    );
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect().finally(() => process.exit(1));
  });
