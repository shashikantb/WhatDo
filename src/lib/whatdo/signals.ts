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

export const TAXONOMY_SIGNAL_WEIGHTS: Record<QuestionTaxonomy, SignalWeights> = {
  OPINION: {
    CURIOSITY: 0.25,
    RISK_TAKING: 0.1,
    CREATIVITY: 0.15,
    SOCIAL: 0.2,
    INDEPENDENCE: 0.3,
  },
  LIFESTYLE: {
    CURIOSITY: 0.2,
    RISK_TAKING: 0.2,
    CREATIVITY: 0.25,
    SOCIAL: 0.25,
    INDEPENDENCE: 0.1,
  },
  PERSONALITY: {
    CURIOSITY: 0.3,
    RISK_TAKING: 0.15,
    CREATIVITY: 0.2,
    SOCIAL: 0.15,
    INDEPENDENCE: 0.2,
  },
  MONEY: {
    CURIOSITY: 0.1,
    RISK_TAKING: 0.35,
    CREATIVITY: 0.05,
    SOCIAL: 0.1,
    INDEPENDENCE: 0.4,
  },
  CAREER: {
    CURIOSITY: 0.2,
    RISK_TAKING: 0.3,
    CREATIVITY: 0.15,
    SOCIAL: 0.15,
    INDEPENDENCE: 0.2,
  },
  RELATIONSHIP: {
    CURIOSITY: 0.15,
    RISK_TAKING: 0.1,
    CREATIVITY: 0.15,
    SOCIAL: 0.5,
    INDEPENDENCE: 0.1,
  },
  TECHNOLOGY: {
    CURIOSITY: 0.4,
    RISK_TAKING: 0.2,
    CREATIVITY: 0.2,
    SOCIAL: 0.05,
    INDEPENDENCE: 0.15,
  },
  SOCIAL_MEDIA: {
    CURIOSITY: 0.2,
    RISK_TAKING: 0.15,
    CREATIVITY: 0.2,
    SOCIAL: 0.35,
    INDEPENDENCE: 0.1,
  },
  ENTERTAINMENT: {
    CURIOSITY: 0.25,
    RISK_TAKING: 0.1,
    CREATIVITY: 0.35,
    SOCIAL: 0.2,
    INDEPENDENCE: 0.1,
  },
  FOOD: {
    CURIOSITY: 0.2,
    RISK_TAKING: 0.15,
    CREATIVITY: 0.3,
    SOCIAL: 0.25,
    INDEPENDENCE: 0.1,
  },
  TRAVEL: {
    CURIOSITY: 0.35,
    RISK_TAKING: 0.3,
    CREATIVITY: 0.15,
    SOCIAL: 0.1,
    INDEPENDENCE: 0.1,
  },
  LOCAL_CITY: {
    CURIOSITY: 0.15,
    RISK_TAKING: 0.1,
    CREATIVITY: 0.15,
    SOCIAL: 0.4,
    INDEPENDENCE: 0.2,
  },
  INTERNET_TREND: {
    CURIOSITY: 0.3,
    RISK_TAKING: 0.2,
    CREATIVITY: 0.25,
    SOCIAL: 0.2,
    INDEPENDENCE: 0.05,
  },
};

export const ANSWER_SIGNAL_MODIFIERS: Record<
  "EXTREME_FIRST" | "EXTREME_LAST" | "MIDDLE" | "MAJORITY" | "MINORITY",
  SignalWeights
> = {
  EXTREME_FIRST: {
    CURIOSITY: 1.2,
    RISK_TAKING: 1.3,
    CREATIVITY: 1.1,
    SOCIAL: 0.8,
    INDEPENDENCE: 1.2,
  },
  EXTREME_LAST: {
    CURIOSITY: 0.9,
    RISK_TAKING: 0.8,
    CREATIVITY: 0.9,
    SOCIAL: 1.1,
    INDEPENDENCE: 0.8,
  },
  MIDDLE: {
    CURIOSITY: 1.0,
    RISK_TAKING: 0.9,
    CREATIVITY: 1.0,
    SOCIAL: 1.0,
    INDEPENDENCE: 0.9,
  },
  MAJORITY: {
    CURIOSITY: 0.85,
    RISK_TAKING: 0.8,
    CREATIVITY: 0.85,
    SOCIAL: 1.2,
    INDEPENDENCE: 0.7,
  },
  MINORITY: {
    CURIOSITY: 1.3,
    RISK_TAKING: 1.25,
    CREATIVITY: 1.2,
    SOCIAL: 0.7,
    INDEPENDENCE: 1.4,
  },
};

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
  const positionBucket =
    positionRatio <= 0.2
      ? "EXTREME_FIRST"
      : positionRatio >= 0.8
        ? "EXTREME_LAST"
        : "MIDDLE";
  const posModifiers = ANSWER_SIGNAL_MODIFIERS[positionBucket];
  const alignModifiers = ANSWER_SIGNAL_MODIFIERS[isMajority ? "MAJORITY" : "MINORITY"];
  (Object.keys(result) as WhatDoSignal[]).forEach((sig) => {
    const combined =
      taxonomyWeights[sig] * posModifiers[sig] * alignModifiers[sig];
    result[sig] += combined;
  });
  return result;
}
