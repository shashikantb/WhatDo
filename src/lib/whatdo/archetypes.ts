import type { WhatDoSignal, SignalScores } from "./signals";
import { WHATDO_SIGNALS, SIGNAL_META, getStrongestSignal } from "./signals";

export const WHATDO_ARCHETYPES = [
  "THE_BOLD_DECISION_MAKER",
  "THE_DEEP_THINKER",
  "THE_UNPREDICTABLE_ONE",
  "THE_REALIST",
  "THE_OPTIMIST",
  "THE_EXPLORER",
  "THE_CREATIVE_MIND",
  "THE_SOCIAL_CONNECTOR",
  "THE_FUTURE_BUILDER",
  "THE_BALANCED_ONE",
  "THE_CONTRARIAN",
  "THE_CURIOUS_MIND",
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

export const ARCHETYPE_DEFINITIONS: Record<WhatDoArchetype, ArchetypeDefinition> = {
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
    signalVector: {
      CURIOSITY: 60,
      RISK_TAKING: 95,
      CREATIVITY: 55,
      SOCIAL: 50,
      INDEPENDENCE: 90,
    },
    contrarianBias: 0.3,
    rarityBias: 0.2,
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
    signalVector: {
      CURIOSITY: 95,
      RISK_TAKING: 40,
      CREATIVITY: 70,
      SOCIAL: 35,
      INDEPENDENCE: 85,
    },
    contrarianBias: 0.2,
    rarityBias: 0.3,
  },
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
    signalVector: {
      CURIOSITY: 75,
      RISK_TAKING: 85,
      CREATIVITY: 85,
      SOCIAL: 55,
      INDEPENDENCE: 70,
    },
    contrarianBias: 0.8,
    rarityBias: 0.8,
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
    signalVector: {
      CURIOSITY: 65,
      RISK_TAKING: 35,
      CREATIVITY: 45,
      SOCIAL: 55,
      INDEPENDENCE: 80,
    },
    contrarianBias: 0.1,
    rarityBias: -0.1,
  },
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
    signalVector: {
      CURIOSITY: 70,
      RISK_TAKING: 70,
      CREATIVITY: 65,
      SOCIAL: 90,
      INDEPENDENCE: 45,
    },
    contrarianBias: -0.2,
    rarityBias: -0.3,
  },
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
    signalVector: {
      CURIOSITY: 90,
      RISK_TAKING: 80,
      CREATIVITY: 65,
      SOCIAL: 60,
      INDEPENDENCE: 55,
    },
    contrarianBias: 0.0,
    rarityBias: 0.1,
  },
  THE_CREATIVE_MIND: {
    id: "THE_CREATIVE_MIND",
    label: "THE CREATIVE MIND",
    emoji: "💡",
    tagline: "You remix the world into something original.",
    strongestTraits: ["CREATIVITY", "CURIOSITY"],
    signatureTraits: [
      "Connects dots no one else links",
      "Daydreams productively",
      "Prefers making over consuming",
      "Notices aesthetic and vibe details",
    ],
    signalVector: {
      CURIOSITY: 85,
      RISK_TAKING: 55,
      CREATIVITY: 95,
      SOCIAL: 60,
      INDEPENDENCE: 70,
    },
    contrarianBias: 0.2,
    rarityBias: 0.2,
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
    signalVector: {
      CURIOSITY: 55,
      RISK_TAKING: 40,
      CREATIVITY: 55,
      SOCIAL: 95,
      INDEPENDENCE: 25,
    },
    contrarianBias: -0.5,
    rarityBias: -0.5,
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
    signalVector: {
      CURIOSITY: 90,
      RISK_TAKING: 85,
      CREATIVITY: 75,
      SOCIAL: 45,
      INDEPENDENCE: 75,
    },
    contrarianBias: 0.25,
    rarityBias: 0.15,
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
    signalVector: {
      CURIOSITY: 50,
      RISK_TAKING: 50,
      CREATIVITY: 50,
      SOCIAL: 50,
      INDEPENDENCE: 50,
    },
    contrarianBias: -0.4,
    rarityBias: -0.4,
  },
  THE_CONTRARIAN: {
    id: "THE_CONTRARIAN",
    label: "THE CONTRARIAN",
    emoji: "⚡",
    tagline: "If everyone agrees, you're already suspicious.",
    strongestTraits: ["INDEPENDENCE", "CURIOSITY"],
    signatureTraits: [
      "Plays devil's advocate unconsciously",
      "Finds the flaw in popular takes",
      "Unpopular opinions stated calmly",
      "Rarely picks whatever everyone else picks",
    ],
    signalVector: {
      CURIOSITY: 80,
      RISK_TAKING: 65,
      CREATIVITY: 60,
      SOCIAL: 30,
      INDEPENDENCE: 95,
    },
    contrarianBias: 1.0,
    rarityBias: 0.7,
  },
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
    signalVector: {
      CURIOSITY: 98,
      RISK_TAKING: 50,
      CREATIVITY: 75,
      SOCIAL: 55,
      INDEPENDENCE: 65,
    },
    contrarianBias: 0.1,
    rarityBias: 0.0,
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
      ? 0.08
      : -0.02;
    const score = baseSim * 0.7 + contrarianMatch * 0.1 + rarityMatch * 0.12 + strongestMatch;
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
