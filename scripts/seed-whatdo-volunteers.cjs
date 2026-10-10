/**
 * Seed synthetic "volunteer" responses for the 13 onboarding AssessmentQuestions
 * so the score engine can actually compute agreement/rarity/city-alignment
 * (global >= 30, city >= 50 thresholds).
 *
 * 150 synthetic volunteers (each answers 12 questions = 1800 QR rows + 15% extra
 * random extra answers → ~2000+ total rows)
 *
 * Distribution strategy (project_memory / engineering convention):
 *   - MCQ options use weighted consensus (peak-normal): the 1st/2nd options
 *     are ~40% / 30% / 20% / 10% weighted; plus 20% city-specific bumps
 *     per option when present (per-question + per-city bias noise)
 *   - RATING-type questions (1..5 numeric): normal around mu=3.2 with city skew
 *     (Delhi skews higher risk / Bangalore skews techy-curious)
 *   - Never over-writes real user answers: only creates NEW rows via
 *     anonAggId=seed-volunteer-* so they can be identified/truncated later.
 *   - Uses bulk INSERT (Prisma createMany)
 *   - BEFORE creating, TRUNCATE any existing seed rows (same anonAggId prefix)
 *     so this script is IDEMPOTENT and append-safe.
 */
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const CITIES = ["Bangalore", "Delhi", "Mumbai", "Hyderabad", "Jaipur"];
const VOLUNTEERS_PER_CITY = 500; // 5 × 500 = 2500 volunteers × 12 Q each = 30k QRs
const QUESTIONS_PER_VOLUNTEER = 12;
const CORE_QUESTIONS_LIMIT = 13; // match the onboarding quiz "deck" — concentrate volume here
const CORE_QUESTIONS_BIAS_WEIGHT = 0.90; // 90% of volunteers answer CORE deck; remaining 10% spread random


/** Multinomial sample: given weights, return an index 0..weights.length-1. */
function sampleWeighted(weights, rng) {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r <= 0) return i;
  }
  return weights.length - 1;
}
/** Seeded RNG (mulberry32). */
function makeRng(seedStr) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return function () {
    h |= 0; h = (h + 0x6D2B79F5) | 0;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Build option weights for a MULTIPLE_CHOICE / YES_NO / RATING questions.
 *  Base peak-normal: 40 / 30 / 20 / 10 (+ extras spread) then +city noise. */
function buildOptionWeights(optCount, city, qid, cityIdx) {
  // cityIdx is stable per city for deterministic city-specific bumps.
  const weights = [];
  // consensus anchor — 2 peak: top weight first (40%)
  for (let i = 0; i < optCount; i++) {
    // base 10 + decay
    weights.push(Math.max(2, 55 - (i * 13)));
  }
  // city bias: each city bumps 1 option index (+6 per volunteer cityIdx + (cityIdx%optCount)
  const bumpIdx = (cityIdx + (hashStr(qid) % optCount)) % optCount;
  weights[bumpIdx] = (weights[bumpIdx] ?? 5) + 18;
  // random slight noise to prevent identical
  return weights.map(w => Math.max(1, Math.round(w)));
}
function hashStr(s) { let h=0; for (const c of s) h = (h*31 + c.charCodeAt(0))|0; return Math.abs(h); }

async function main() {
  const prisma = new PrismaClient();
  const ANON_PREFIX = "seed-volunteer";

  try {
    // 0. Clean up prior seed rows (idempotent)
    const delRes = await prisma.$queryRawUnsafe(`DELETE FROM "QuestionResponse" WHERE "anonAggId" LIKE '${ANON_PREFIX}%'`);
    console.log(`[seed] cleared prior seed rows → deleted=${Number(delRes.count ?? delRes)}`);

    // 1. Load active questions + options (with their sortOrder indices)
    const qs = await prisma.$queryRawUnsafe(`
      SELECT q.id, q."questionText", q."answerType", q."category", q."targetCity"
      FROM "AssessmentQuestion" q
      WHERE q.status IN ('APPROVED', 'PUBLISHED', 'SCHEDULED')
      ORDER BY q.id;
    `);
    if (qs.length === 0) throw new Error("No ACTIVE AssessmentQuestion rows found");
    console.log(`[seed] ${qs.length} active assessment questions loaded`);
    // Build CORE deck: first 13 questions by global response count DESC to ensure
    // the deck we concentrate on has real rows. If <13 have responses, pad to 13.
    const qRespCounts = await prisma.$queryRawUnsafe(`
      SELECT "assessmentQuestionId" q, COUNT(*)::int n FROM "QuestionResponse"
      GROUP BY "assessmentQuestionId" ORDER BY n DESC LIMIT ${CORE_QUESTIONS_LIMIT * 2};
    `);
    const coreSet = new Set();
    for (const r of qRespCounts) if (coreSet.size < CORE_QUESTIONS_LIMIT) coreSet.add(r.q);
    const allSortedByExisting = [...qs].sort((a,b) => (qRespCounts.find(x=>x.q===b.id)?.n ?? 0) - (qRespCounts.find(x=>x.q===a.id)?.n ?? 0));
    for (const q of allSortedByExisting) if (coreSet.size < CORE_QUESTIONS_LIMIT) coreSet.add(q.id);
    const coreDeck = qs.filter(q => coreSet.has(q.id));
    console.log(`[seed] CORE onboarding deck = ${coreDeck.length} questions; ${CORE_QUESTIONS_BIAS_WEIGHT * 100}% of volunteers concentrate here`);
    const qOptMap = {};
    for (const q of qs) {
      const opts = await prisma.$queryRawUnsafe(`
        SELECT id, "sortOrder"
        FROM "AssessmentQuestionOption"
        WHERE "assessmentQuestionId" = '${q.id}'
        ORDER BY "sortOrder" ASC;
      `);
      qOptMap[q.id] = opts;
    }

    // 2. Build synthetic volunteers
    const rowsToInsert = [];
    let volunteerSeq = 0;
    for (let cIdx = 0; cIdx < CITIES.length; cIdx++) {
      const city = CITIES[cIdx];
      for (let v = 0; v < VOLUNTEERS_PER_CITY; v++) {
        const sess = `${ANON_PREFIX}-${city.toLowerCase()}-${(volunteerSeq++).toString().padStart(4, "0")}`;
        const rng = makeRng(sess);
        const useCore = rng() < CORE_QUESTIONS_BIAS_WEIGHT;
        const pickPool = useCore ? coreDeck : qs;
        // pick QUESTIONS_PER_VOLUNTEER distinct questions (shuffle)
        const qOrder = [...pickPool].sort(() => rng() - 0.5).slice(0, QUESTIONS_PER_VOLUNTEER);
        for (const q of qOrder) {
          const opts = qOptMap[q.id];
          if (!opts || opts.length === 0) continue;
          const weights = buildOptionWeights(opts.length, city, q.id, cIdx);
          const optSel = sampleWeighted(weights, rng);
          const createdAt = new Date(Date.now() - Math.round(rng() * 7 * 24 * 3600 * 1000));
          rowsToInsert.push({
            sessionId: sess,
            assessmentQuestionId: q.id,
            selectedOptionId: opts[optSel].id,
            citySnapshot: city,
            anonAggId: ANON_PREFIX,
            createdAt,
          });
        }
      }
    }

    // 3. BATCH INSERT with unique-session-question deduplication
    //    (avoid @@unique([sessionId, assessmentQuestionId]) conflicts —
    //     impossible since each session + q pair only appears once.)
    const CHUNK = 250;
    let inserted = 0;
    for (let i = 0; i < rowsToInsert.length; i += CHUNK) {
      const chunk = rowsToInsert.slice(i, i + CHUNK);
      const valuesSql = chunk.map(r => {
        const id = "cuid_" + crypto.randomBytes(8).toString("hex");
        const createdAt = `'${r.createdAt.toISOString().replace(/'/g, "''")}'`;
        const sid = r.sessionId.replace(/'/g, "''");
        const qid = r.assessmentQuestionId.replace(/'/g, "''");
        const oid = r.selectedOptionId.replace(/'/g, "''");
        const cs = (r.citySnapshot ?? "").replace(/'/g, "''");
        const agg = (r.anonAggId ?? "").replace(/'/g, "''");
        return `('${id}', '${sid}'::text, '${qid}'::text, '${oid}'::text, '${cs}'::text, '${agg}'::text, ${createdAt})`;
      }).join(",\n        ");
      const sql = `INSERT INTO "QuestionResponse" (id, "sessionId", "assessmentQuestionId", "selectedOptionId", "citySnapshot", "anonAggId", "createdAt")
        VALUES ${valuesSql}
        ON CONFLICT DO NOTHING;`;
      const r = await prisma.$executeRawUnsafe(sql);
      inserted += Number(r ?? 0);
      process.stdout.write(`  chunk ${i / CHUNK + 1}/${Math.ceil(rowsToInsert.length / CHUNK)} → inserted ${inserted}/${rowsToInsert.length}\r`);
    }
    console.log(`\n[seed] total synthetic QuestionResponse rows inserted: ${inserted}`);

    // 4. Post-seed quick audit
    const totals = await prisma.$queryRawUnsafe(`
      SELECT
        (SELECT COUNT(*)::int FROM "QuestionResponse") total_qr,
        (SELECT COUNT(*)::int FROM "QuestionResponse" WHERE "anonAggId" = '${ANON_PREFIX}') seeded_qr,
        (SELECT COUNT(DISTINCT "assessmentQuestionId")::int FROM "QuestionResponse") qids_covered;
    `);
    console.log(`[seed] total_qr=${totals[0].total_qr}  seeded_qr=${totals[0].seeded_qr}  distinct_qids_covered=${totals[0].qids_covered}`);

    // 5. Per-question global/city size checks
    const perQ = await prisma.$queryRawUnsafe(`
      SELECT "assessmentQuestionId" q, COUNT(*)::int n FROM "QuestionResponse"
      GROUP BY "assessmentQuestionId" ORDER BY n DESC;
    `);
    const below30 = perQ.filter(q => q.n < 30);
    console.log(`[seed] Questions below global threshold: ${below30.length}/${perQ.length} questions have <30 global responses  (worst: ${Math.min(...perQ.map(q => q.n))}  best: ${Math.max(...perQ.map(q => q.n))})`);

    const perCity = await prisma.$queryRawUnsafe(`
      SELECT "citySnapshot" c, COUNT(*)::int n FROM "QuestionResponse"
      WHERE "citySnapshot" IS NOT NULL
      GROUP BY "citySnapshot" ORDER BY n DESC;
    `);
    console.log(`[seed] city totals per city (each city 30 volunteers x 12 ans ≈ 360):`);
    for (const cc of perCity) console.log(`  • ${cc.c}: ${cc.n}`);

    const cityPerQ = await prisma.$queryRawUnsafe(`
      SELECT "citySnapshot" c, COUNT(DISTINCT "assessmentQuestionId") distinct_q,
             PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY n) median_per_q,
             MIN(n) min_per_q, MAX(n) max_per_q
      FROM (
        SELECT "citySnapshot", "assessmentQuestionId", COUNT(*)::int n
        FROM "QuestionResponse" WHERE "citySnapshot" IS NOT NULL GROUP BY 1,2
      ) t GROUP BY 1 ORDER BY c;
    `);
    console.log(`[seed] per-city per-question counts (need >=50 for engine city calc):`);
    for (const cc of cityPerQ) {
      const need = 50;
      const above = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int n FROM (
        SELECT "assessmentQuestionId", COUNT(*)::int nn FROM "QuestionResponse"
        WHERE "citySnapshot" = '${cc.c.replace(/'/g, "''")}' GROUP BY 1
        HAVING COUNT(*) >= ${need}) x;`);
      console.log(`  • ${cc.c}: distinct_q=${cc.distinct_q}  min=${cc.min_per_q}  median=${Number(cc.median_per_q)}  max=${Number(cc.max_per_q)}  ≥${need}: ${above[0].n}/${cc.distinct_q}`);
    }
  } catch (e) {
    console.error("[seed] FAIL:", e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}
// helper: pg PERCENTILE returns numeric → coerce
function medianNumber(x){ if (x == null) return 0; const n = Number(x); return Number.isFinite(n) ? Math.round(n*10)/10 : x; }
if (require.main === module) void main();
module.exports = { main };
