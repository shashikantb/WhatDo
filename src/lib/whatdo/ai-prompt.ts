import type { WhatDoArchetype } from "./archetypes";
import { getArchetypeDefinition } from "./archetypes";
import type { SignalScores, WhatDoSignal } from "./signals";
import { WHATDO_SIGNALS, SIGNAL_META } from "./signals";
import type { ScoreEngineResult } from "./score-engine";
import { INSUFFICIENT_DATA } from "./score-engine";

export const CARD_TEMPLATES = [
  "MINIMAL",
  "NEON_GENZ",
  "PREMIUM_DARK",
  "COLORFUL",
  "FUTURISTIC_AI",
  "LOCAL_CITY",
] as const;

export type WhatDoCardTemplate = (typeof CARD_TEMPLATES)[number];

export interface AIPromptIdentityInput {
  archetype: WhatDoArchetype;
  signalScores: SignalScores;
  agreementScorePct: number | null;
  rarityScorePct: number | null;
  cityAlignmentPct: number | null;
  userCity?: string | null;
  userRegion?: string | null;
  userCountry?: string | null;
  displayName?: string | null;
  rarestAnswerRarityPct: number | null;
  strongestTraits: WhatDoSignal[];
  cardTemplate?: WhatDoCardTemplate;
}

export interface GeneratedAIPrompt {
  imagePrompt: string;
  shareCaption: string;
  signalSummary: string;
  warnings: string[];
  template: WhatDoCardTemplate;
}

const TEMPLATE_STYLES: Record<
  WhatDoCardTemplate,
  { palette: string; mood: string; typography: string; composition: string }
> = {
  MINIMAL: {
    palette:
      "clean off-white background, subtle warm neutrals, single accent color, no gradients",
    mood: "editorial, minimalist, elegant, understated, premium magazine cover",
    typography:
      "sans-serif serif hybrid, large airy type, generous white space, single bold weight for type label",
    composition:
      "centered vertical stack, 9:16 Instagram Story, breathing room on all sides, no clutter",
  },
  NEON_GENZ: {
    palette:
      "electric magenta, acid lime, cyan neon, black background, glow effects, Y2K gradient",
    mood: "high-energy Gen-Z social, playful, bold, cyber Y2K aesthetic, Instagram-ready",
    typography:
      "rounded display font, chunky outline, drop shadow, bright outline, overlapping text layers",
    composition:
      "9:16 dynamic diagonal layout, sticker accents, holographic sheen, sparkle details",
  },
  PREMIUM_DARK: {
    palette:
      "deep matte black, warm gold foil accents, charcoal gradients, single accent green or sapphire",
    mood: "luxury premium, dark cinematic, sophisticated, high-end men's magazine vibe",
    typography:
      "sharp serif display font, thin elegant weights, gold numerals, tight tracking",
    composition:
      "9:16 cinematic rule of thirds, off-center composition, dramatic side lighting, subtle grain",
  },
  COLORFUL: {
    palette:
      "block color palette, 3-4 bright cheerful pastels, Memphis-style accents, no black",
    mood: "playful, friendly, optimistic, colorful editorial, Dribbble-adjacent illustration vibe",
    typography:
      "soft rounded sans, layered text cards, bold and regular mix, friendly uppercase labels",
    composition:
      "9:16 geometric block layout, soft corners, illustration accents, sticker-style badges",
  },
  FUTURISTIC_AI: {
    palette:
      "iridescent holographic, soft electric blue, deep purple gradients, glassmorphism, neon rim light",
    mood: "sci-fi cinematic, near-future optimistic, innovative, AI-forward but warm and human",
    typography:
      "tech-forward geometric sans, thin hairline weights, gradient type masks, holographic foil text",
    composition:
      "9:16 portrait with subtle tech HUD framing, floating UI elements, depth of field, soft bokeh",
  },
  LOCAL_CITY: {
    palette:
      "warm sunset tones, local city landmark-inspired hues, orange-pink-gold gradient",
    mood: "local pride, cinematic travel poster, nostalgic but modern, city pride vibes",
    typography:
      "bold display sans with city-name serif pairing, outlined city tagline, location pin accent",
    composition:
      "9:16 hero city skyline silhouette background, portrait overlay, location badge, warm golden hour light",
  },
};

function topSignals(
  scores: SignalScores,
  n = 3,
): Array<{ signal: WhatDoSignal; score: number; meta: (typeof SIGNAL_META)[WhatDoSignal] }> {
  return (Object.entries(scores) as [WhatDoSignal, number][])
    .map(([signal, score]) => ({ signal, score, meta: SIGNAL_META[signal] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

function pickOrDefaultTemplate(input: AIPromptIdentityInput): WhatDoCardTemplate {
  if (input.cardTemplate && CARD_TEMPLATES.includes(input.cardTemplate)) {
    return input.cardTemplate;
  }
  if (input.userCity) return "LOCAL_CITY";
  if (input.signalScores.CURIOSITY > 80 || input.signalScores.RISK_TAKING > 80)
    return "FUTURISTIC_AI";
  if (input.signalScores.SOCIAL > 80) return "NEON_GENZ";
  return "PREMIUM_DARK";
}

function buildSignalList(scores: SignalScores, topN = 3): string {
  const tops = topSignals(scores, topN);
  return tops
    .map((t) => `${t.meta.icon} ${t.meta.label} ${t.score}/100`)
    .join(", ");
}

export function buildAIPromptIdentityInput(
  engineResult: ScoreEngineResult,
  opts: {
    userCity?: string | null;
    userRegion?: string | null;
    userCountry?: string | null;
    displayName?: string | null;
    cardTemplate?: WhatDoCardTemplate;
  } = {},
): AIPromptIdentityInput | null {
  if (!engineResult.whatDoArchetype || !engineResult.signalScores) {
    return null;
  }
  const signals = engineResult.signalScores;
  const entries = (Object.entries(signals) as [WhatDoSignal, number][]).sort(
    (a, b) => b[1] - a[1],
  );
  const strongestTraits = entries.slice(0, 2).map(([s]) => s);
  return {
    archetype: engineResult.whatDoArchetype,
    signalScores: signals,
    agreementScorePct: engineResult.agreementScorePct,
    rarityScorePct: engineResult.rarityScorePct,
    cityAlignmentPct: engineResult.cityAlignmentPct,
    userCity: opts.userCity ?? null,
    userRegion: opts.userRegion ?? null,
    userCountry: opts.userCountry ?? null,
    displayName: opts.displayName ?? null,
    rarestAnswerRarityPct: engineResult.rarestAnswer?.rarityPct ?? null,
    strongestTraits,
    cardTemplate: opts.cardTemplate,
  };
}

export function generateAIPrompts(input: AIPromptIdentityInput): GeneratedAIPrompt {
  const template = pickOrDefaultTemplate(input);
  const style = TEMPLATE_STYLES[template];
  const def = getArchetypeDefinition(input.archetype);
  const warnings: string[] = [];
  if (input.agreementScorePct === null) {
    warnings.push(INSUFFICIENT_DATA);
  }
  const tops = topSignals(input.signalScores, 3);
  const signalList = tops
    .map((t) => `- ${t.meta.label}: ${t.score}/100 (${t.meta.description})`)
    .join("\n");
  const strongTraitsText = input.strongestTraits
    .map((s) => SIGNAL_META[s].label)
    .join(", ");
  const signalBadgesText = tops
    .map((t) => `${t.meta.icon} ${t.meta.label} ████████████ ${t.score}`)
    .join("  |  ");
  const cityLine = input.userCity
    ? input.cityAlignmentPct !== null
      ? `City alignment: ${input.cityAlignmentPct.toFixed(0)}% with ${input.userCity}.`
      : `Based in ${input.userCity}.`
    : "";
  const rarityLine = input.rarityScorePct !== null
    ? `Thinks differently from ${input.rarityScorePct.toFixed(0)}% of WhatDo users.`
    : "";
  const rareAnswerLine = input.rarestAnswerRarityPct !== null
    ? `Rarest answer rarity: ${input.rarestAnswerRarityPct.toFixed(0)}%.`
    : "";
  const agreementLine = input.agreementScorePct !== null
    ? `Agrees ${input.agreementScorePct.toFixed(0)}% overall with WhatDo community.`
    : "";
  const templateNote =
    template === "LOCAL_CITY" && input.userCity
      ? `Subtle ${input.userCity} skyline silhouette or iconic landmark hints in background. No GPS or precise map markers.`
      : "";
  const portraitLine = input.displayName
    ? `If a reference photo is provided, keep the person's facial identity, age, gender, and ethnicity fully recognizable. Use the photo as the exact identity reference.`
    : `Compose as a cinematic Instagram Story portrait visual. If a reference photo is later provided, preserve the person's exact facial identity, age, and ethnicity.`;
  const imagePrompt = `Using the uploaded photo (if provided) as the identity reference, create a premium cinematic 9:16 Instagram Story visual representing this person's WhatDo identity.

WHATDO TYPE: ${def.emoji} ${def.label}
WhatDo Type tagline: ${def.tagline}
Strongest WhatDo Signals: ${strongTraitsText || "Balanced profile."}
${agreementLine}
${rarityLine}
${rareAnswerLine}
${cityLine}

WhatDo Signals (clearly labelled as "WhatDo Signals", entertainment-only scores based on WhatDo responses, not scientific measurement):
${signalList}

VISUAL STYLE — Template: ${template}
Palette: ${style.palette}
Mood: ${style.mood}
Typography: ${style.typography}
Composition: ${style.composition}
${templateNote}

${portraitLine}

REQUIRED ON-CARD TEXT — elegant typography integrated into composition:
[WHATDO logo or wordmark in corner]
🔥 MY WHATDO TYPE
${def.emoji} ${def.label}
${rarityLine || agreementLine}
Strongest: ${strongTraitsText || "Balanced"}
⚡ Rarity: ${input.rarityScorePct !== null ? `${input.rarityScorePct.toFixed(0)}% different` : "—"}
${input.userCity ? `📍 ${input.userCity}${input.cityAlignmentPct !== null ? ` · ${input.cityAlignmentPct.toFixed(0)}% aligned` : ""}` : ""}
WHATDO SIGNALS: ${signalBadgesText}
Footer: "WhatDo you get? · whatdo.app"

RULES THAT MUST BE FOLLOWED:
1. Do NOT change the person's facial identity, age, gender, ethnicity, or any core identifying features.
2. Do NOT fabricate claims about actual career level, salary, wealth, IQ, leadership %, or real-world skills.
3. All scores must be explicitly labelled as entertainment-only "WhatDo Signals" derived from WhatDo answer patterns.
4. No exact address, GPS pin, or precise map marker. City level only.
5. Render at 1080×1920 px, 9:16 vertical, Instagram Story safe zones respected.
6. Keep typography fully legible; no text behind face.
7. Do NOT add watermarks, AI tool credits, or unrelated logos.`;

  const rareShareHook =
    input.rarestAnswerRarityPct !== null && input.rarestAnswerRarityPct <= 20
      ? `Only ${input.rarestAnswerRarityPct.toFixed(0)}% answered like me on my rarest take 👀`
      : "";
  const cityHook = input.userCity
    ? `📍 ${input.userCity}`
    : "";
  const shareCaption = `I got ${def.emoji} ${def.label} on WhatDo.
${def.tagline}
${rarityLine || agreementLine}
${rareShareHook}
${cityHook}

What's your WhatDo Type? 👇
Find yours → `;

  const signalSummary = [
    `WhatDo Type: ${def.label}`,
    `Top signals: ${buildSignalList(input.signalScores, 3)}`,
    rarityLine,
    agreementLine,
    cityLine,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    imagePrompt,
    shareCaption,
    signalSummary,
    warnings,
    template,
  };
}

export function generateShortShareText(
  archetype: WhatDoArchetype,
  opts: {
    rarityScorePct?: number | null;
    agreementScorePct?: number | null;
    userCity?: string | null;
  } = {},
): string {
  const def = getArchetypeDefinition(archetype);
  const parts: string[] = [];
  parts.push(`I got ${def.emoji} ${def.label} on WhatDo`);
  if (opts.rarityScorePct !== null && opts.rarityScorePct !== undefined) {
    parts.push(`Different from ${opts.rarityScorePct.toFixed(0)}% of people`);
  } else if (
    opts.agreementScorePct !== null &&
    opts.agreementScorePct !== undefined
  ) {
    parts.push(`Matched ${opts.agreementScorePct.toFixed(0)}% of WhatDo users`);
  }
  if (opts.userCity) parts.push(`📍 ${opts.userCity}`);
  parts.push("What's your WhatDo Type? 👇");
  return parts.join(" · ");
}

export function validateAIPrompt(prompt: GeneratedAIPrompt): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const forbidden = [
    /ceo/i,
    /millionaire|billionaire/i,
    /salary|earns?|net worth/i,
    /iq|intelligence score/i,
    /leadership.*%/i,
    /guaranteed|will become/i,
    /gps|coordinates|latitude|longitude/i,
    /scientifically validated|clinical|research-proven/i,
  ];
  for (const re of forbidden) {
    if (re.test(prompt.imagePrompt)) {
      issues.push(
        `Prompt contains forbidden pattern: ${re.toString().slice(1, -3)}`,
      );
    }
  }
  if (!prompt.imagePrompt.includes("WhatDo Signals")) {
    issues.push('Prompt missing explicit "WhatDo Signals" label.');
  }
  if (!prompt.imagePrompt.includes("1080×1920") && !prompt.imagePrompt.includes("9:16")) {
    issues.push("Prompt missing size specification (1080×1920 / 9:16).");
  }
  return { valid: issues.length === 0, issues };
}

export { WHATDO_SIGNALS };
