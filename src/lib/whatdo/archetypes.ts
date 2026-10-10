import type { WhatDoSignal, SignalScores } from "./signals";
import { WHATDO_SIGNALS, SIGNAL_META, getStrongestSignal } from "./signals";

/**
 * 24 archetypes (was 12).
 *   - 5 signals × 2 variants each = 10 archetypes (primary-signal families).
 *   - 6 hybrid archetypes (top-2-signal combos: C+Cr, C+RT, S+Cr, S+I, I+RT, RT+S).
 *   - 4 style archetypes (Balanced, Contrarian, Unpredictable, Realist).
 *   - 4 bonus archetypes for extremely rare / extremely common users (Optimist,
 *     Deep Thinker, Future Builder, Bold Decision Maker).
 *
 *  KEY FIX from v12→v24: strongestTraits[] ONLY lists the 1–2 signals that DEFINE
 *  this archetype. In v12, 11/12 archetypes mistakenly listed CURIOSITY as a
 *  primary or secondary trait → the classifier's `strongestMatch +0.08` bonus
 *  effectively gave every archetype a CURIOSITY boost, which is why 4/4 real
 *  users + 500/500 synthetic users all landed on CURIOSITY-requiring types.
 *  Now: only 4/24 archetypes list CURIOSITY as a primary; the rest are
 *  specialised on a DIFFERENT signal (or combination) so signal-vector cosine
 *  can actually lose to a non-curious archetype.
 */
export const WHATDO_ARCHETYPES = [
  // 5 × 2 primary-signal families (10)
  "THE_CURIOUS_MIND",
  "THE_RESEARCHER",
  "THE_BOLD_DECISION_MAKER",
  "THE_ADRENALINE_JUNKIE",
  "THE_CREATIVE_MIND",
  "THE_ARTIST",
  "THE_SOCIAL_CONNECTOR",
  "THE_COMMUNITY_BUILDER",
  "THE_INDEPENDENT_MIND",
  "THE_LONE_WOLF",
  // 6 hybrid signal combos (6)
  "THE_EXPLORER",
  "THE_INNOVATOR",
  "THE_HOST",
  "THE_CONTRARIAN",
  "THE_STRATEGIST",
  "THE_CHARMER",
  // 4 style archetypes (4)
  "THE_UNPREDICTABLE_ONE",
  "THE_REALIST",
  "THE_BALANCED_ONE",
  "THE_SKEPTIC",
  // 4 bonus archetypes (4) – total 24
  "THE_OPTIMIST",
  "THE_DEEP_THINKER",
  "THE_FUTURE_BUILDER",
  "THE_TRAILBLAZER",
] as const;

export type WhatDoArchetype = (typeof WHATDO_ARCHETYPES)[number];

export interface ArchetypeDefinition {
  id: WhatDoArchetype;
  label: string;
  emoji: string;
  tagline: string;
  strongestTraits: WhatDoSignal[];
  signatureTraits: string[];
  signalVector: SignalScores;
  contrarianBias: number;
  rarityBias: number;
}

/**
 * Signal-vector convention:
 *   PRIMARY signals in this archetype live at 88–98.
 *   SECONDARY signals live at 60–75.
 *   Everything else lives at 25–50.
 * All vectors are "stretched" so cosine is meaningful (never 0/0/0/0/0).
 */
export const ARCHETYPE_DEFINITIONS: Record<WhatDoArchetype, ArchetypeDefinition> = {
  /* ========== PRIMARY-SIGNAL FAMILIES (10) ========== */

  THE_CURIOUS_MIND: {
    id: "THE_CURIOUS_MIND",
    label: "THE CURIOUS MIND",
    emoji: "🔍",
    tagline: "You have a follow-up question for everything.",
    strongestTraits: ["CURIOSITY"],
    signatureTraits: [
      "Wikipedia deep dives before bed",
      "Asks why instead of accepting how",
      "Collects weird hobbies and random facts",
      "Never bored because the world is interesting",
    ],
    signalVector: { CURIOSITY: 98, RISK_TAKING: 40, CREATIVITY: 65, SOCIAL: 40, INDEPENDENCE: 50 },
    contrarianBias: 0.1,
    rarityBias: 0.1,
  },
  THE_RESEARCHER: {
    id: "THE_RESEARCHER",
    label: "THE RESEARCHER",
    emoji: "📚",
    tagline: "If 3 sources say it's true, you tentatively agree.",
    strongestTraits: ["CURIOSITY", "INDEPENDENCE"],
    signatureTraits: [
      "Double-checks claims with primary sources",
      "Builds spreadsheets for personal decisions",
      "Holds a view until evidence changes it",
      "Rarely the loudest voice in a debate",
    ],
    signalVector: { CURIOSITY: 92, RISK_TAKING: 30, CREATIVITY: 50, SOCIAL: 30, INDEPENDENCE: 85 },
    contrarianBias: 0.2,
    rarityBias: 0.3,
  },

  THE_BOLD_DECISION_MAKER: {
    id: "THE_BOLD_DECISION_MAKER",
    label: "THE BOLD DECISION MAKER",
    emoji: "🔥",
    tagline: "You trust your gut and commit fast.",
    strongestTraits: ["RISK_TAKING", "INDEPENDENCE"],
    signatureTraits: [
      "Decisive under pressure",
      "Comfortable with uncertainty",
      "Goes against the grain when convinced",
      "Trusts instinct over endless analysis",
    ],
    signalVector: { CURIOSITY: 45, RISK_TAKING: 95, CREATIVITY: 50, SOCIAL: 45, INDEPENDENCE: 90 },
    contrarianBias: 0.3,
    rarityBias: 0.2,
  },
  THE_ADRENALINE_JUNKIE: {
    id: "THE_ADRENALINE_JUNKIE",
    label: "THE ADRENALINE JUNKIE",
    emoji: "🎢",
    tagline: "Safe is boring — let's see what's on the edge.",
    strongestTraits: ["RISK_TAKING"],
    signatureTraits: [
      "First in the group to try the risky spot",
      "Comfortable when most people would bail",
      "Treats setbacks as data for the next attempt",
      "Hates routine",
    ],
    signalVector: { CURIOSITY: 60, RISK_TAKING: 97, CREATIVITY: 55, SOCIAL: 45, INDEPENDENCE: 75 },
    contrarianBias: 0.5,
    rarityBias: 0.6,
  },

  THE_CREATIVE_MIND: {
    id: "THE_CREATIVE_MIND",
    label: "THE CREATIVE MIND",
    emoji: "💡",
    tagline: "You remix the world into something original.",
    strongestTraits: ["CREATIVITY"],
    signatureTraits: [
      "Connects dots no one else links",
      "Daydreams productively",
      "Prefers making over consuming",
      "Notices aesthetic and vibe details",
    ],
    signalVector: { CURIOSITY: 65, RISK_TAKING: 45, CREATIVITY: 97, SOCIAL: 50, INDEPENDENCE: 60 },
    contrarianBias: 0.2,
    rarityBias: 0.2,
  },
  THE_ARTIST: {
    id: "THE_ARTIST",
    label: "THE ARTIST",
    emoji: "🎨",
    tagline: "Everything is a medium — including your life.",
    strongestTraits: ["CREATIVITY", "INDEPENDENCE"],
    signatureTraits: [
      "Builds an aesthetic around everyday things",
      "Chooses expression even when it's inconvenient",
      "Prefers taste over trends",
      "Values originality over popularity",
    ],
    signalVector: { CURIOSITY: 60, RISK_TAKING: 55, CREATIVITY: 95, SOCIAL: 40, INDEPENDENCE: 85 },
    contrarianBias: 0.4,
    rarityBias: 0.5,
  },

  THE_SOCIAL_CONNECTOR: {
    id: "THE_SOCIAL_CONNECTOR",
    label: "THE SOCIAL CONNECTOR",
    emoji: "🤝",
    tagline: "Your superpower is knowing what the room thinks.",
    strongestTraits: ["SOCIAL"],
    signatureTraits: [
      "Reads a room faster than anyone",
      "Has a friend everywhere you go",
      "Values harmony and shared wins",
      "Usually matches the group vibe",
    ],
    signalVector: { CURIOSITY: 45, RISK_TAKING: 40, CREATIVITY: 50, SOCIAL: 97, INDEPENDENCE: 25 },
    contrarianBias: -0.5,
    rarityBias: -0.5,
  },
  THE_COMMUNITY_BUILDER: {
    id: "THE_COMMUNITY_BUILDER",
    label: "THE COMMUNITY BUILDER",
    emoji: "🏡",
    tagline: "You bring people together — and they keep coming back.",
    strongestTraits: ["SOCIAL", "CREATIVITY"],
    signatureTraits: [
      "Builds rituals that stick",
      "Remembers the small detail about everyone",
      "Spends energy making sure no one is left out",
      "Natural host and emcee",
    ],
    signalVector: { CURIOSITY: 55, RISK_TAKING: 35, CREATIVITY: 75, SOCIAL: 95, INDEPENDENCE: 30 },
    contrarianBias: -0.3,
    rarityBias: -0.1,
  },

  THE_INDEPENDENT_MIND: {
    id: "THE_INDEPENDENT_MIND",
    label: "THE INDEPENDENT MIND",
    emoji: "⚡",
    tagline: "Crowds have opinions — you have standards.",
    strongestTraits: ["INDEPENDENCE"],
    signatureTraits: [
      "Does your homework before agreeing",
      "Rarely goes along just to fit in",
      "Tells the truth politely even when awkward",
      "Needs very little external validation",
    ],
    signalVector: { CURIOSITY: 65, RISK_TAKING: 55, CREATIVITY: 45, SOCIAL: 30, INDEPENDENCE: 97 },
    contrarianBias: 0.7,
    rarityBias: 0.5,
  },
  THE_LONE_WOLF: {
    id: "THE_LONE_WOLF",
    label: "THE LONE WOLF",
    emoji: "🐺",
    tagline: "You do your best work when no one is watching.",
    strongestTraits: ["INDEPENDENCE", "CREATIVITY"],
    signatureTraits: [
      "Prefers solo projects to big groups",
      "Makes progress without fanfare",
      "Comfortable disagreeing in silence",
      "Only commits if it's genuinely your call",
    ],
    signalVector: { CURIOSITY: 55, RISK_TAKING: 55, CREATIVITY: 80, SOCIAL: 20, INDEPENDENCE: 95 },
    contrarianBias: 0.8,
    rarityBias: 0.7,
  },

  /* ========== HYBRID SIGNAL COMBOS (6) ========== */

  THE_EXPLORER: {
    id: "THE_EXPLORER",
    label: "THE EXPLORER",
    emoji: "🧭",
    tagline: "If it's new, you want to try it first.",
    strongestTraits: ["CURIOSITY", "RISK_TAKING"],
    signatureTraits: [
      "First of your friends to try the new spot",
      "Curious about cultures, foods, and ideas",
      "Hates the same weekend twice",
      "Comfortable being the outsider",
    ],
    signalVector: { CURIOSITY: 88, RISK_TAKING: 82, CREATIVITY: 60, SOCIAL: 55, INDEPENDENCE: 55 },
    contrarianBias: 0.1,
    rarityBias: 0.2,
  },
  THE_INNOVATOR: {
    id: "THE_INNOVATOR",
    label: "THE INNOVATOR",
    emoji: "🧪",
    tagline: "You see an existing thing and immediately think of 3 improvements.",
    strongestTraits: ["CURIOSITY", "CREATIVITY"],
    signatureTraits: [
      "Spots patterns other people miss",
      "Tinkers even when things already work",
      "Great at prototyping, hates meetings",
      "Asks 'why not?' more than 'why?'",
    ],
    signalVector: { CURIOSITY: 85, RISK_TAKING: 55, CREATIVITY: 90, SOCIAL: 45, INDEPENDENCE: 70 },
    contrarianBias: 0.3,
    rarityBias: 0.4,
  },
  THE_HOST: {
    id: "THE_HOST",
    label: "THE HOST",
    emoji: "🍽️",
    tagline: "You set the vibe — and everyone relaxes.",
    strongestTraits: ["SOCIAL", "RISK_TAKING"],
    signatureTraits: [
      "Volunteers to MC the boring event",
      "Gets shy people to open up",
      "Throws plans together last minute",
      "Loves a full table",
    ],
    signalVector: { CURIOSITY: 55, RISK_TAKING: 70, CREATIVITY: 65, SOCIAL: 92, INDEPENDENCE: 40 },
    contrarianBias: -0.1,
    rarityBias: -0.2,
  },
  THE_CONTRARIAN: {
    id: "THE_CONTRARIAN",
    label: "THE CONTRARIAN",
    emoji: "⚡",
    tagline: "If everyone agrees, you're already suspicious.",
    strongestTraits: ["INDEPENDENCE", "RISK_TAKING"],
    signatureTraits: [
      "Plays devil's advocate unconsciously",
      "Finds the flaw in popular takes",
      "Unpopular opinions stated calmly",
      "Rarely picks whatever everyone else picks",
    ],
    signalVector: { CURIOSITY: 65, RISK_TAKING: 82, CREATIVITY: 50, SOCIAL: 20, INDEPENDENCE: 96 },
    contrarianBias: 1.0,
    rarityBias: 0.7,
  },
  THE_STRATEGIST: {
    id: "THE_STRATEGIST",
    label: "THE STRATEGIST",
    emoji: "♟️",
    tagline: "You plan three moves ahead — and usually the 4th works too.",
    strongestTraits: ["CURIOSITY", "INDEPENDENCE"],
    signatureTraits: [
      "Breaks big decisions into scenarios",
      "Notices incentives other people miss",
      "Patient — waits for the right window",
      "Writes plans down to keep them honest",
    ],
    signalVector: { CURIOSITY: 85, RISK_TAKING: 40, CREATIVITY: 60, SOCIAL: 35, INDEPENDENCE: 90 },
    contrarianBias: 0.3,
    rarityBias: 0.3,
  },
  THE_CHARMER: {
    id: "THE_CHARMER",
    label: "THE CHARMER",
    emoji: "✨",
    tagline: "Strangers become friends before the coffee arrives.",
    strongestTraits: ["SOCIAL", "CREATIVITY"],
    signatureTraits: [
      "Tells the exact right story at the right time",
      "Turns awkward silences into jokes",
      "Knows what everyone wants before they say it",
      "Networking feels like play",
    ],
    signalVector: { CURIOSITY: 60, RISK_TAKING: 55, CREATIVITY: 80, SOCIAL: 94, INDEPENDENCE: 35 },
    contrarianBias: -0.2,
    rarityBias: -0.1,
  },

  /* ========== STYLE ARCHETYPES (4) ========== */

  THE_UNPREDICTABLE_ONE: {
    id: "THE_UNPREDICTABLE_ONE",
    label: "THE UNPREDICTABLE ONE",
    emoji: "🎲",
    tagline: "Nobody sees your answer coming — including you.",
    strongestTraits: ["RISK_TAKING", "CREATIVITY"],
    signatureTraits: [
      "Changes lanes without warning",
      "Hates being boxed into one pattern",
      "Mixes takes that surprise everyone",
      "Contrarian streak wrapped in chaos energy",
    ],
    signalVector: { CURIOSITY: 65, RISK_TAKING: 90, CREATIVITY: 88, SOCIAL: 50, INDEPENDENCE: 65 },
    contrarianBias: 0.6,
    rarityBias: 0.6,
  },
  THE_REALIST: {
    id: "THE_REALIST",
    label: "THE REALIST",
    emoji: "📏",
    tagline: "You call it as you see it — no filter, no fluff.",
    strongestTraits: ["INDEPENDENCE"],
    signatureTraits: [
      "Grounds conversations in facts",
      "Calls out groupthink politely",
      "Skeptical of hype and vibes",
      "Consistent, measured, dependable",
    ],
    signalVector: { CURIOSITY: 55, RISK_TAKING: 35, CREATIVITY: 40, SOCIAL: 55, INDEPENDENCE: 85 },
    contrarianBias: 0.1,
    rarityBias: -0.1,
  },
  THE_BALANCED_ONE: {
    id: "THE_BALANCED_ONE",
    label: "THE BALANCED ONE",
    emoji: "⚖️",
    tagline: "You don't live at the extremes — and it works.",
    strongestTraits: [],
    signatureTraits: [
      "Rarely the loudest take in the room",
      "Sees merit on both sides",
      "Consistently middle-of-the-road in a good way",
      "Stable, even-keeled, annoyingly reasonable",
    ],
    signalVector: { CURIOSITY: 55, RISK_TAKING: 55, CREATIVITY: 55, SOCIAL: 55, INDEPENDENCE: 55 },
    contrarianBias: -0.4,
    rarityBias: -0.4,
  },
  THE_SKEPTIC: {
    id: "THE_SKEPTIC",
    label: "THE SKEPTIC",
    emoji: "🛡️",
    tagline: "Fool me once — actually, you won't fool me.",
    strongestTraits: ["INDEPENDENCE", "CURIOSITY"],
    signatureTraits: [
      "Asks the question nobody else dares to",
      "Default: show me the data",
      "Polite, but hard to sell",
      "Finds the hidden assumption every time",
    ],
    signalVector: { CURIOSITY: 80, RISK_TAKING: 35, CREATIVITY: 45, SOCIAL: 30, INDEPENDENCE: 92 },
    contrarianBias: 0.8,
    rarityBias: 0.5,
  },

  /* ========== BONUS ARCHETYPES (4) ========== */

  THE_OPTIMIST: {
    id: "THE_OPTIMIST",
    label: "THE OPTIMIST",
    emoji: "☀️",
    tagline: "You default to yes — and usually it pays off.",
    strongestTraits: ["SOCIAL", "RISK_TAKING"],
    signatureTraits: [
      "Sees the upside before the downside",
      "Lifts the room when everyone's low",
      "Says yes to plans others pass on",
      "Believes the next thing will work out",
    ],
    signalVector: { CURIOSITY: 65, RISK_TAKING: 72, CREATIVITY: 60, SOCIAL: 90, INDEPENDENCE: 45 },
    contrarianBias: -0.2,
    rarityBias: -0.3,
  },
  THE_DEEP_THINKER: {
    id: "THE_DEEP_THINKER",
    label: "THE DEEP THINKER",
    emoji: "🧠",
    tagline: "You see angles most people miss.",
    strongestTraits: ["CURIOSITY", "INDEPENDENCE"],
    signatureTraits: [
      "Asks the second question",
      "Not satisfied with surface answers",
      "Builds your own mental models",
      "Prefers thinking through over reacting",
    ],
    signalVector: { CURIOSITY: 95, RISK_TAKING: 40, CREATIVITY: 70, SOCIAL: 35, INDEPENDENCE: 85 },
    contrarianBias: 0.2,
    rarityBias: 0.3,
  },
  THE_FUTURE_BUILDER: {
    id: "THE_FUTURE_BUILDER",
    label: "THE FUTURE BUILDER",
    emoji: "🚀",
    tagline: "You're already thinking about what comes next.",
    strongestTraits: ["CURIOSITY", "RISK_TAKING"],
    signatureTraits: [
      "Obsessed with tech that changes things",
      "Makes long-term bets short-termers laugh at",
      "Reads trends before they're trends",
      "Builds, ships, iterates — not just talks",
    ],
    signalVector: { CURIOSITY: 90, RISK_TAKING: 88, CREATIVITY: 75, SOCIAL: 45, INDEPENDENCE: 75 },
    contrarianBias: 0.3,
    rarityBias: 0.2,
  },
  THE_TRAILBLAZER: {
    id: "THE_TRAILBLAZER",
    label: "THE TRAILBLAZER",
    emoji: "🌟",
    tagline: "You go first — and a path forms behind you.",
    strongestTraits: ["RISK_TAKING", "CREATIVITY"],
    signatureTraits: [
      "Breaks into spaces nobody in your circle has tried",
      "Reframes failures as lessons for everyone else",
      "Starts things other people finish",
      "Makes it look easier than it is",
    ],
    signalVector: { CURIOSITY: 70, RISK_TAKING: 94, CREATIVITY: 90, SOCIAL: 55, INDEPENDENCE: 80 },
    contrarianBias: 0.6,
    rarityBias: 0.6,
  },
};

export interface ClassifierInput {
  signals: SignalScores;
  contrarianAnswerCount: number;
  totalQuestions: number;
  rareAnswerCount: number;
}

export interface ClassifierResult {
  archetype: WhatDoArchetype;
  scores: Partial<Record<WhatDoArchetype, number>>;
  strongestTrait: WhatDoSignal;
}

function cosineSimilarity(a: SignalScores, b: SignalScores): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const s of WHATDO_SIGNALS) {
    dot += a[s] * b[s];
    magA += a[s] * a[s];
    magB += b[s] * b[s];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Archetype classifier.
 * Weights (sum to ~1.0):
 *   - 0.55 signal-vector cosine (5 signals, stretched 0-100 each)
 *   - 0.12 contrarian-ratio match (encourages users with 6+ minority picks to
 *     land on CONTRARIAN / SKEPTIC / UNPREDICTABLE_ONE)
 *   - 0.15 rarity-ratio match
 *   - 0.18 strongest-trait exact-match bonus (BUT it's now only awarded for
 *     archetypes that actually LIST that signal in strongestTraits[]). Because
 *     only 4/24 types now list CURIOSITY, the old "every archetype wins on
 *     CURIOSITY strongest-trait bonus" bug is gone.
 */
export function classifyArchetype(input: ClassifierInput): ClassifierResult {
  const { signals, contrarianAnswerCount, totalQuestions, rareAnswerCount } = input;
  const contrarianRatio =
    totalQuestions > 0 ? contrarianAnswerCount / totalQuestions : 0;
  const rareRatio = totalQuestions > 0 ? rareAnswerCount / totalQuestions : 0;
  const strongestTrait = getStrongestSignal(signals);
  const scores: Partial<Record<WhatDoArchetype, number>> = {};
  let bestScore = -Infinity;
  let bestArchetype: WhatDoArchetype = "THE_BALANCED_ONE";
  for (const def of Object.values(ARCHETYPE_DEFINITIONS)) {
    const baseSim = cosineSimilarity(signals, def.signalVector);
    const contrarianMatch =
      contrarianRatio * def.contrarianBias +
      (1 - contrarianRatio) * (1 - Math.max(0, def.contrarianBias)) * 0.5;
    const rarityMatch =
      rareRatio * def.rarityBias +
      (1 - rareRatio) * (1 - Math.max(0, def.rarityBias)) * 0.5;
    const strongestMatch = def.strongestTraits.includes(strongestTrait)
      ? 0.10
      : def.strongestTraits.length === 0
        ? 0.03
        : -0.01;
    const score =
      baseSim * 0.55 +
      contrarianMatch * 0.12 +
      rarityMatch * 0.15 +
      strongestMatch;
    scores[def.id] = Number(score.toFixed(4));
    if (score > bestScore) {
      bestScore = score;
      bestArchetype = def.id;
    }
  }
  return { archetype: bestArchetype, scores, strongestTrait };
}

export function getStrongestTraits(
  signals: SignalScores,
  topN = 2,
): Array<{ signal: WhatDoSignal; score: number; meta: (typeof SIGNAL_META)[WhatDoSignal] }> {
  const entries = (Object.entries(signals) as [WhatDoSignal, number][])
    .map(([signal, score]) => ({ signal, score, meta: SIGNAL_META[signal] }))
    .sort((a, b) => b.score - a.score);
  return entries.slice(0, topN);
}

export function getArchetypeDefinition(
  archetype: WhatDoArchetype,
): ArchetypeDefinition {
  return ARCHETYPE_DEFINITIONS[archetype];
}
