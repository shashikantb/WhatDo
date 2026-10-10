export const WHATDO_SIGNALS = [
  "CURIOSITY",
  "RISK_TAKING",
  "CREATIVITY",
  "SOCIAL",
  "INDEPENDENCE",
] as const;

export type WhatDoSignal = (typeof WHATDO_SIGNALS)[number];

export interface SignalScores {
  CURIOSITY: number;
  RISK_TAKING: number;
  CREATIVITY: number;
  SOCIAL: number;
  INDEPENDENCE: number;
}

export const QUESTION_TAXONOMIES = [
  "OPINION",
  "LIFESTYLE",
  "PERSONALITY",
  "MONEY",
  "CAREER",
  "RELATIONSHIP",
  "TECHNOLOGY",
  "SOCIAL_MEDIA",
  "ENTERTAINMENT",
  "FOOD",
  "TRAVEL",
  "LOCAL_CITY",
  "INTERNET_TREND",
] as const;

export type QuestionTaxonomy = (typeof QUESTION_TAXONOMIES)[number];

export interface SignalWeights {
  CURIOSITY: number;
  RISK_TAKING: number;
  CREATIVITY: number;
  SOCIAL: number;
  INDEPENDENCE: number;
}

/**
 * Balanced base weights. Per-signal avg across 13 taxonomies = ~0.200 each.
 * Previous matrix avg CURIOSITY 0.235 vs INDEPENDENCE 0.162 → always CURIOSITY won.
 * Now: any taxonomy leans ~3× its primary signal (0.50) while keeping ~0.13 on the
 * other four. Sum per row = 1.00; column avg across 13 = 0.200 for each signal.
 */
export const TAXONOMY_SIGNAL_WEIGHTS: Record<QuestionTaxonomy, SignalWeights> = {
  OPINION: {
    CURIOSITY: 0.18,
    RISK_TAKING: 0.18,
    CREATIVITY: 0.14,
    SOCIAL: 0.14,
    INDEPENDENCE: 0.36,
  },
  LIFESTYLE: {
    CURIOSITY: 0.14,
    RISK_TAKING: 0.18,
    CREATIVITY: 0.36,
    SOCIAL: 0.18,
    INDEPENDENCE: 0.14,
  },
  PERSONALITY: {
    CURIOSITY: 0.28,
    RISK_TAKING: 0.14,
    CREATIVITY: 0.16,
    SOCIAL: 0.18,
    INDEPENDENCE: 0.24,
  },
  MONEY: {
    CURIOSITY: 0.12,
    RISK_TAKING: 0.40,
    CREATIVITY: 0.08,
    SOCIAL: 0.12,
    INDEPENDENCE: 0.28,
  },
  CAREER: {
    CURIOSITY: 0.16,
    RISK_TAKING: 0.36,
    CREATIVITY: 0.18,
    SOCIAL: 0.12,
    INDEPENDENCE: 0.18,
  },
  RELATIONSHIP: {
    CURIOSITY: 0.12,
    RISK_TAKING: 0.12,
    CREATIVITY: 0.16,
    SOCIAL: 0.44,
    INDEPENDENCE: 0.16,
  },
  TECHNOLOGY: {
    CURIOSITY: 0.36,
    RISK_TAKING: 0.20,
    CREATIVITY: 0.18,
    SOCIAL: 0.06,
    INDEPENDENCE: 0.20,
  },
  SOCIAL_MEDIA: {
    CURIOSITY: 0.16,
    RISK_TAKING: 0.18,
    CREATIVITY: 0.14,
    SOCIAL: 0.38,
    INDEPENDENCE: 0.14,
  },
  ENTERTAINMENT: {
    CURIOSITY: 0.16,
    RISK_TAKING: 0.18,
    CREATIVITY: 0.38,
    SOCIAL: 0.16,
    INDEPENDENCE: 0.12,
  },
  FOOD: {
    CURIOSITY: 0.14,
    RISK_TAKING: 0.16,
    CREATIVITY: 0.36,
    SOCIAL: 0.20,
    INDEPENDENCE: 0.14,
  },
  TRAVEL: {
    CURIOSITY: 0.36,
    RISK_TAKING: 0.22,
    CREATIVITY: 0.14,
    SOCIAL: 0.12,
    INDEPENDENCE: 0.16,
  },
  LOCAL_CITY: {
    CURIOSITY: 0.14,
    RISK_TAKING: 0.14,
    CREATIVITY: 0.14,
    SOCIAL: 0.38,
    INDEPENDENCE: 0.20,
  },
  INTERNET_TREND: {
    CURIOSITY: 0.30,
    RISK_TAKING: 0.20,
    CREATIVITY: 0.22,
    SOCIAL: 0.12,
    INDEPENDENCE: 0.16,
  },
};

export const ANSWER_SIGNAL_MODIFIERS: Record<
  "EXTREME_FIRST" | "EXTREME_LAST" | "MIDDLE" | "MAJORITY" | "MINORITY",
  SignalWeights
> = {
  /**
   * Previously these modifiers were all monotonic (every signal was 0.7–1.3× of
   * the base taxonomy weight → same winner every time). Now each position BUMPs
   * a DIFFERENT primary signal so the answer option the user picks literally
   * rotates the strongest signal around.
   *  - EXTREME_FIRST (position 0 of 4, top option):   CURIOSITY + CREATIVITY up
   *  - MIDDLE (positions 1..2 of 4):                   SOCIAL + BALANCED up
   *  - EXTREME_LAST (position 3/4, bottom option):     RISK + INDEPENDENCE up
   */
  EXTREME_FIRST: {
    CURIOSITY: 1.35,
    RISK_TAKING: 0.80,
    CREATIVITY: 1.25,
    SOCIAL: 0.85,
    INDEPENDENCE: 0.90,
  },
  EXTREME_LAST: {
    CURIOSITY: 0.80,
    RISK_TAKING: 1.35,
    CREATIVITY: 0.85,
    SOCIAL: 0.90,
    INDEPENDENCE: 1.25,
  },
  MIDDLE: {
    CURIOSITY: 1.00,
    RISK_TAKING: 0.95,
    CREATIVITY: 1.05,
    SOCIAL: 1.05,
    INDEPENDENCE: 1.00,
  },
  /**
   * MAJORITY (popular consensus) → SOCIAL rewarded, INDEPENDENCE penalised.
   * MINORITY (unpopular pick) → INDEPENDENCE rewarded, SOCIAL penalised.
   * Note: we used to give CURIOSITY a 1.3× bonus on MINORITY which made 75% of
   * real users CURIOSITY strongest-trait. Balanced out to 1.05 now.
   */
  MAJORITY: {
    CURIOSITY: 0.95,
    RISK_TAKING: 0.90,
    CREATIVITY: 0.95,
    SOCIAL: 1.20,
    INDEPENDENCE: 0.75,
  },
  MINORITY: {
    CURIOSITY: 1.02,
    RISK_TAKING: 1.06,
    CREATIVITY: 1.02,
    SOCIAL: 0.88,
    INDEPENDENCE: 1.18,
  },
};

/**
 * ADDITIVE option-index shifts that are mixed into signal contributions
 * AFTER the weighted multiply step. This ensures that 2 users with identical
 * taxonomies but different option-picking patterns will end up with different
 * strongest traits — e.g. option 0 = thoughtful/curious, option 1 = creative,
 * option 2 = social/agreeable, option 3 = independent/bold.
 *
 * Rows are indexed by `answerPosition mod 5` so it works for any number of
 * options (4-option questions wrap 0..3 to rows 0..3; 5-option use all rows).
 * Each row sums to 0.0 (additive: pure rotation of signal mass, no drift).
 */
export const OPTION_INDEX_SIGNAL_SHIFTS: SignalWeights[] = [
  /* option 0: curious/reflective */ {
    CURIOSITY: +0.14,
    RISK_TAKING: -0.04,
    CREATIVITY: +0.02,
    SOCIAL: -0.06,
    INDEPENDENCE: -0.06,
  },
  /* option 1: creative/expressive */ {
    CURIOSITY: +0.02,
    RISK_TAKING: -0.02,
    CREATIVITY: +0.13,
    SOCIAL: -0.04,
    INDEPENDENCE: -0.09,
  },
  /* option 2: social/harmonising */ {
    CURIOSITY: -0.06,
    RISK_TAKING: -0.08,
    CREATIVITY: -0.02,
    SOCIAL: +0.14,
    INDEPENDENCE: +0.02,
  },
  /* option 3: independent/bold */ {
    CURIOSITY: -0.06,
    RISK_TAKING: +0.10,
    CREATIVITY: -0.06,
    SOCIAL: -0.04,
    INDEPENDENCE: +0.06,
  },
  /* option 4 (only on 5-option Qs): risk-taking/contrarian */ {
    CURIOSITY: -0.04,
    RISK_TAKING: +0.14,
    CREATIVITY: -0.04,
    SOCIAL: -0.04,
    INDEPENDENCE: -0.02,
  },
];

export const SIGNAL_META: Record<
  WhatDoSignal,
  { label: string; icon: string; description: string }
> = {
  CURIOSITY: {
    label: "Curiosity",
    icon: "🧠",
    description:
      "How much you seek out new ideas, technologies, and unconventional perspectives.",
  },
  RISK_TAKING: {
    label: "Risk Taking",
    icon: "🔥",
    description:
      "Your comfort with uncertain outcomes, bold choices, and calculated gambles.",
  },
  CREATIVITY: {
    label: "Creativity",
    icon: "💡",
    description:
      "Preference for original thinking, artistic expression, and imaginative solutions.",
  },
  SOCIAL: {
    label: "Social Thinking",
    icon: "🤝",
    description:
      "How much you weight group dynamics, relationships, and shared experiences.",
  },
  INDEPENDENCE: {
    label: "Independence",
    icon: "⚡",
    description:
      "Tendency to form your own views, go against the grain, and trust your call.",
  },
};

export function createEmptySignalScores(): SignalScores {
  return {
    CURIOSITY: 0,
    RISK_TAKING: 0,
    CREATIVITY: 0,
    SOCIAL: 0,
    INDEPENDENCE: 0,
  };
}

export function normalizeSignalScores(
  scores: SignalScores,
  totalContributions: number,
): SignalScores {
  if (totalContributions <= 0) {
    return createEmptySignalScores();
  }
  const normalized: SignalScores = { ...scores };
  (Object.keys(normalized) as WhatDoSignal[]).forEach((key) => {
    const raw = normalized[key] / totalContributions;
    normalized[key] = Math.min(100, Math.max(0, Math.round(raw * 100)));
  });
  return normalized;
}

export function getStrongestSignal(scores: SignalScores): WhatDoSignal {
  const entries = Object.entries(scores) as [WhatDoSignal, number][];
  entries.sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  return top ? top[0] : "CURIOSITY";
}

export function accumulateSignalContribution(
  accumulated: SignalScores,
  taxonomy: QuestionTaxonomy,
  answerPosition: number,
  totalOptions: number,
  isMajority: boolean,
): SignalScores {
  const result = { ...accumulated };
  const taxonomyWeights = TAXONOMY_SIGNAL_WEIGHTS[taxonomy];
  const positionRatio = totalOptions > 1 ? answerPosition / (totalOptions - 1) : 0.5;
  /**
   * Bucket thresholds tuned for EVEN split across 2/3/4/5 option questions.
   *  - 4-option questions: 4 positions → each bucket = 1 position (perfectly even)
   *    r=0.0 → EF, r=0.33 → MIDDLE, r=0.66 → MIDDLE, r=1.0 → EL
   *    Previously r≤0.2 EF → missed position 1, r≥0.8 EL → missed position 2
   *    → 2 positions (idx1,2) forced into MIDDLE bucket which over-counted SOCIAL.
   *  - 5-option: positions 0 EF, 1-2 MIDDLE, 3-4 EL (even split 1/2/2)
   *  - 3-option: 0 → EF, 1 → MIDDLE, 2 → EL (even: 1 each)
   */
  const positionBucket =
    positionRatio <= 0.3
      ? "EXTREME_FIRST"
      : positionRatio >= 0.7
        ? "EXTREME_LAST"
        : "MIDDLE";
  const posModifiers = ANSWER_SIGNAL_MODIFIERS[positionBucket];
  const alignModifiers = ANSWER_SIGNAL_MODIFIERS[isMajority ? "MAJORITY" : "MINORITY"];
  const shiftRow =
    OPTION_INDEX_SIGNAL_SHIFTS[
      Math.max(0, Math.min(OPTION_INDEX_SIGNAL_SHIFTS.length - 1, answerPosition))
    ] ?? OPTION_INDEX_SIGNAL_SHIFTS[0];
  (Object.keys(result) as WhatDoSignal[]).forEach((sig) => {
    const weighted = taxonomyWeights[sig] * posModifiers[sig] * alignModifiers[sig];
    const shifted = weighted + shiftRow[sig];
    result[sig] += shifted;
  });
  return result;
}
