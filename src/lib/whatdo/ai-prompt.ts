import type { WhatDoArchetype } from "./archetypes";
import { getArchetypeDefinition } from "./archetypes";
import type { SignalScores, WhatDoSignal } from "./signals";
import { WHATDO_SIGNALS, SIGNAL_META } from "./signals";
import type { ScoreEngineResult } from "./score-engine";
import { INSUFFICIENT_DATA } from "./score-engine";

export interface AnsweredQuestionWithStats {
  questionText: string;
  questionNumber: number;
  selectedOptionLabel: string;
  selectedOptionIndex: number;
  allOptions: Array<{
    label: string;
    isSelected: boolean;
    globalResponsePct: number | null;
    cityResponsePct: number | null;
  }>;
  selectedGlobalPct: number | null;
  selectedCityPct: number | null;
  globalTotalResponses: number;
  cityTotalResponses: number | null;
  selectedIsRare: boolean;
  selectedIsVeryRare: boolean;
  selectedIsMajority: boolean;
  selectedIsContrarian: boolean;
}

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
  username?: string | null;
  rarestAnswerRarityPct: number | null;
  strongestTraits: WhatDoSignal[];
  cardTemplate?: WhatDoCardTemplate;
  userAnswers?: AnsweredQuestionWithStats[];
  personalShareUrl?: string | null;
  signatureTraits?: string[];
  archetypeRunnerUp?: string | null;
}

export interface GeneratedAIPrompt {
  imagePrompt: string;
  shortImagePrompt: string;
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

interface ArchetypeVisualProps {
  colorPalette: string;
  signatureObjects: string[];
  scene: string;
  lighting: string;
  poseEnergy: string;
  wardrobe: string;
  accessories: string[];
  moodKeywords: string[];
  composition: string;
  typographyKeyword: string;
}

export const ARCHETYPE_VISUAL_PROPS: Record<WhatDoArchetype, ArchetypeVisualProps> = {
  THE_BOLD_DECISION_MAKER: {
    colorPalette: "smouldering ember red, matte obsidian black, brushed gunmetal, single gold-leaf accent",
    signatureObjects: ["vintage pilot's chronograph on wrist", "leather-bound notebook half open", "single lit match or smouldering cigar on table edge", "black suit jacket draped over shoulder"],
    scene: "rooftop helipad at dusk overlooking a lit skyline, private boardroom corner, or driver's seat of a matte-black classic sports car",
    lighting: "dramatic Rembrandt key light from 45 degrees, deep cinematic shadows, warm orange rim light from the city behind",
    poseEnergy: "confident lean, chin slightly up, direct intense eye contact, one fist loosely closed, weight shifted forward",
    wardrobe: "tailored charcoal blazer, black merino knit, silver cufflinks, no tie — relaxed but intentional",
    accessories: ["minimal steel automatic watch", "thin silver ring", "small wireless earbuds resting on collar"],
    moodKeywords: ["commanding", "unapologetic", "alpha-composed", "unstoppable energy", "quiet power"],
    composition: "low-angle 3/4 portrait, cinematic rule of thirds, shallow depth of field, person fills ~55% of frame",
    typographyKeyword: "condensed ultra-bold slab serif with a drop-shadow, stacked uppercase wordmark",
  },
  THE_DEEP_THINKER: {
    colorPalette: "deep inky indigo, muted ivory cream, soft taupe, library-walnut brown, single cobalt highlight",
    signatureObjects: ["worn leather-bound copy of a philosophy book on lap", "half-empty ceramic pour-over coffee", "vintage brass desk lamp nearby", "framed blueprint or mathematical diagram in background"],
    scene: "sunken leather armchair in a wood-panelled library, floor-to-ceiling bookshelves, light through a leaded-glass window",
    lighting: "soft lateral window light with a warm brass desklamp accent, low contrast, velvet shadows, film grain",
    poseEnergy: "relaxed lean-in, hand at chin in contemplation, gaze slightly off-camera thinking, fingers lightly steepled",
    wardrobe: "unstructured cream merino turtleneck, charcoal herringbone overshirt, round tortoiseshell glasses pushed up into hair",
    accessories: ["beaten silver mechanical pencil behind ear", "woven wool scarf draped over chair arm", "minimal silver watch"],
    moodKeywords: ["contemplative", "measured", "intellectual calm", "quiet obsession", "considered and focused"],
    composition: "medium close-up, negative space on one side for thinking, shallow depth of field on the book behind hand",
    typographyKeyword: "elegant transitional serif, hairline weights, generous letterspacing, classic editorial feel",
  },
  THE_UNPREDICTABLE_ONE: {
    colorPalette: "dayglo magenta, tangerine, electric cyan, acid lime, on a deep jet-black background",
    signatureObjects: ["fistful of neon glow sticks", "oversized playing cards (joker card visible) fanned in hand", "disco ball refractions on walls", "spray-paint can held loosely"],
    scene: "tilted fisheye street corner at night, neon signs reflected in wet pavement, chaotic subway platform, or DIY skatepark ramp",
    lighting: "split complementary neon gel lights, magenta on one side cyan on the other, hard shadows, high grain, motion blur hints",
    poseEnergy: "dynamic dutch-angle, mid-laugh, one arm thrown up, weight on one leg like they're about to leap",
    wardrobe: "oversized tie-dye hoodie layered under a cropped vinyl moto jacket, wide-leg cargos, mismatched sneakers",
    accessories: ["chunky lucite chain necklace", "stick-and-poke hand tattoos visible", "colourful nail polish", "chrome-framed wraparound sunglasses at night"],
    moodKeywords: ["chaotic good", "unexpected", "playful menace", "living in the moment", "refusal to be boring"],
    composition: "dutch-tilt extreme close-up, fish-eye warp, layered foreground/background neon signs, motion lines",
    typographyKeyword: "distressed display font with horizontal gradient, offset drop-shadow, glitch layered text, uppercase Y2K",
  },
  THE_REALIST: {
    colorPalette: "stone greys, warm sand, muted olive, blackened denim, brushed stainless",
    signatureObjects: ["half-full matte-black reusable coffee tumbler", "open laptop with a spreadsheet visible at edges", "leather card wallet on counter", "clear glasses on nose"],
    scene: "minimal white kitchen island early morning, airport lounge with wide windows, modern home office with no clutter",
    lighting: "soft even diffused north light, no harsh shadows, neutral 5500K, clean editorial commercial look",
    poseEnergy: "relaxed upright, hands folded calmly, direct but non-confrontational eye contact, slight smile",
    wardrobe: "well-fitted Oxford shirt in light blue, dark raw denim, white low-top leather sneakers, no logos",
    accessories: ["thin stainless bracelet", "classic metal watch with white face", "single leather cord necklace if any"],
    moodKeywords: ["grounded", "reliable", "no-nonsense", "honest", "unfussed and timeless"],
    composition: "straight-on medium portrait, symmetric, clean background, even lighting, perfect for magazine profile",
    typographyKeyword: "Swiss geometric sans, perfectly kerned, grid-aligned, understated, all-caps label style",
  },
  THE_OPTIMIST: {
    colorPalette: "peach fuzz, sunflower yellow, coral, sky blue, creamy vanilla, warm golden highlight",
    signatureObjects: ["oversized sunhat held above head laughing", "fresh bouquet of peonies and daisies", "disposable film camera slung over shoulder", "glowing pink cocktail"],
    scene: "sun-drenched rooftop picnic with a gingham blanket, beach boardwalk at golden hour, sunroom full of plants",
    lighting: "warm backlit golden-hour sun with soft haze, intentional lens flare, sparkle highlights on hair",
    poseEnergy: "big genuine smile with teeth, head tilted back slightly, arm out like they're pulling you into the frame",
    wardrobe: "linen shirt in peach or sky blue, high-waisted white trousers, woven sandals, gold pendant layered necklaces",
    accessories: ["thick gold hoop earrings", "round tinted amber sunglasses", "beaded friendship bracelets", "woven tote bag slung over shoulder"],
    moodKeywords: ["radiant", "warm", "inviting", "infectious joy", "lights up a room"],
    composition: "soft golden-hour portrait, shallow f/1.8 blur on background leaves, candid mid-laugh, framing friendly",
    typographyKeyword: "rounded soft sans-serif with gradients, friendly bubble lettering accents, pastel highlights",
  },
  THE_EXPLORER: {
    colorPalette: "sage green, sun-bleached sand, vintage orange, worn indigo, weathered tan",
    signatureObjects: ["leather travel journal open with pressed flower visible", "brass compass on a chain around neck", "well-worn hiking boots propped nearby", "folded topographic map"],
    scene: "mountain overlook at sunrise, alpine meadow trailhead, desert canyon ledge, cobblestone alley of a coastal town",
    lighting: "warm dawn side-light with thin fog, lens flare low on the horizon, long shadows on the ground",
    poseEnergy: "mid-step walking towards camera, backpack slung loose, pointing at something just off-frame, wind in hair",
    wardrobe: "technical fleece, waxed canvas jacket, cargo trousers with side pockets, well-broken-in boots, layered tee",
    accessories: ["wide-brimmed hat with a feather", "fisheye action camera clipped to strap", "hand-carved wooden ring", "woven friendship bracelets"],
    moodKeywords: ["curious", "free", "un-tethered", "always moving", "discoverer energy"],
    composition: "environmental 3/4 body portrait, epic landscape fills 50% of frame, person placed at the intersection of rule of thirds grid",
    typographyKeyword: "hand-drawn brush script headline paired with vintage slab serif labels, stamped trail-marker badges",
  },
  THE_CREATIVE_MIND: {
    colorPalette: "soft lavender, butter yellow, blush pink, electric sky, matte studio white",
    signatureObjects: ["paintbrush held between fingers with acrylic on knuckles", "potter's clay-covered hands next to wheel", "iPad with a Procreate sketch open beside them", "mood board with colourful swatches pinned up"],
    scene: "sunlit studio with painted white brick walls, shelves of ceramics, piles of sketchbooks, hanging macramé plants",
    lighting: "large softbox or window light top-left, gentle wraparound, pastel pink bounce fill, crisp editorial",
    poseEnergy: "seated cross-legged on the floor, leaning towards their work, hand behind head thinking, half smile",
    wardrobe: "oversized white painter's smock with subtle paint splatters, oversized knitted cardigan, ribbed tank, wide-leg cream trousers",
    accessories: ["silver or gold stacked midi rings", "small sculptural earrings", "thread-wrapped choker", "wire-rimmed cat-eye glasses"],
    moodKeywords: ["dreamy", "inventive", "tactile", "artistic flow", "eyes full of ideas"],
    composition: "lifestyle studio portrait, props create organic foreground framing, slightly overhead creative crop, detail shots of hands",
    typographyKeyword: "handwritten script title + modern grotesque body, pastel gradient swatch labels, irregular organic layout",
  },
  THE_SOCIAL_CONNECTOR: {
    colorPalette: "rose gold, champagne, warm terracotta, emerald, cream silk",
    signatureObjects: ["martini glass with a citrus twist held to cheers", "arm slung around an (implied) group", "handwritten dinner party place cards nearby", "vintage polaroid photo strip"],
    scene: "candle-lit dinner table for six, rooftop cocktail bar at blue hour, sunken velvet living-room with plants",
    lighting: "warm bokeh string lights, candle flicker on face, shallow background full of gold highlights, soft ISO grain",
    poseEnergy: "leaning in laughing to camera like sharing a joke, hand on chest, open posture, eye contact feels personal",
    wardrobe: "satin slip dress, wrap knit cardigan, gold layered necklaces, silk blouse with delicate buttons",
    accessories: ["oversized pearl or gem drop earrings", "stacked gold initial necklace", "velvet hair bow", "thin gold rings"],
    moodKeywords: ["charming", "warmly inviting", "conversational", "feels like we're friends already"],
    composition: "close-up candid, slightly elevated angle, soft bokeh of party lights behind the subject, shallow DOF",
    typographyKeyword: "script calligraphy name + elegant serif labels, champagne gold foil effect, romantic editorial",
  },
  THE_FUTURE_BUILDER: {
    colorPalette: "electric cobalt, holographic silver, deep midnight purple, cyan accent, matte carbon black",
    signatureObjects: ["laptop open to a 3D model / cad render", "wireless over-ear headphones around neck", "holographic phone with glowing UI in hand", "minimal desk plant with grow lights"],
    scene: "glass-walled tech office at night, minimalist home lab with subtle blue LED strip, rooftop overlooking a futuristic skyline with drone lights",
    lighting: "cool cyan rim + purple key split light, soft glow from screens, lens flares from LEDs, subtle HUD reflections",
    poseEnergy: "forward lean at desk, chin resting on one fist reading intently, half profile view, expression is sharp and excited",
    wardrobe: "structured black tech-wear bomber, metallic silver tee, tapered tailored trousers, minimal white futuristic sneakers",
    accessories: ["thin titanium chain necklace", "square smartwatch with glowing face", "transparent-frame glasses with subtle blue reflection"],
    moodKeywords: ["builder mode", "optimistic futurism", "focused but warm", "ship-it energy"],
    composition: "3/4 over-the-shoulder medium shot, screen glow softly illuminates face, subtle floating UI framing at edges",
    typographyKeyword: "monospaced tech sans, gradient text (cobalt→purple), thin hairline dividers, holographic foil effect",
  },
  THE_BALANCED_ONE: {
    colorPalette: "blush, sage, sky blue, warm oat, sandy neutral, soft lilac accents",
    signatureObjects: ["yoga mat rolled up beside them with strap", "matcha latte in a ceramic bowl", "stack of poetry books, tarot deck, small sage bundle in a wooden dish"],
    scene: "airy minimalist bedroom with linen curtains open, morning sun kitchen, open balcony with small potted herbs",
    lighting: "even soft day light through linen, warm golden fill, zero harsh shadows, airy dreamy tones",
    poseEnergy: "cross-legged comfortable, eyes soft smile closed, shoulders relaxed, hands resting palms-up on knees",
    wardrobe: "oversized ribbed oatmeal cardigan, white organic cotton tank, wide-leg linen trousers, bare feet or socked",
    accessories: ["daintied layered silver necklaces with small charms", "woven beaded bracelet", "small stone ring"],
    moodKeywords: ["serene", "settled", "un-shakeable calm", "homeostatic even energy"],
    composition: "soft symmetrical medium portrait, lots of negative room breathing space, warm airy film grade",
    typographyKeyword: "light-weight serif with wide tracking, subtle cream paper texture, balanced centered layout",
  },
  THE_CONTRARIAN: {
    colorPalette: "crimson, jet black, electric violet, cold silver, storm grey",
    signatureObjects: ["well-worn copy of a contrarian essay collection", "single upside-down chess piece (pawn) standing on a table", "vintage silver Zippo lighter", "frosted glass of neat whiskey"],
    scene: "dark leather booth at a speakeasy, grey brutalist concrete balcony at dusk, black-on-black private study",
    lighting: "hard single top-down spotlight, sharp cheekbone shadows, violet back-rim light, moody chiaroscuro, cinematic grain",
    poseEnergy: "chin slightly down, eyes looking directly up to camera, half-smirk, one eyebrow subtly raised",
    wardrobe: "all-black tailored overcoat, dark turtleneck, silver chain, combat boots or glossy black oxfords",
    accessories: ["chunky silver signet ring", "pocket watch chain", "black rectangular sunglasses hanging on collar"],
    moodKeywords: ["knowing smirk", "provocative", "poker-faced", "doesn't flinch", "confidently counter-mainstream"],
    composition: "close-up headshot with tight crop, shadows sculpt face, negative space on one side is pure black",
    typographyKeyword: "sharp all-caps blackletter or brutalist sans, slashed accents, red→violet gradient outline",
  },
  THE_CURIOUS_MIND: {
    colorPalette: "buttercup yellow, ink teal, warm ivory, soft burnt orange, midnight navy",
    signatureObjects: ["magnifying glass held up to a page of notes", "colour-coded tabbed reference book open", "glowing terrarium, vintage globe, ant specimen pinned in a display case", "annotated map of the world"],
    scene: "sunlit study lined with specimens and maps, natural history museum after hours, tiny greenhouse full of rare plants",
    lighting: "warm pool of light from a green-shaded banker's lamp, soft sunbeams with visible dust motes, amber glass jar reflections",
    poseEnergy: "leaning forward over a desk, magnifier hovering near their eye, excitedly pointing to a detail, bright wide eyes",
    wardrobe: "corduroy overshirt in forest green, cream heavy flannel, tan chinos, worn suede desert boots, vintage knit vest",
    accessories: ["binoculars on neck strap", "leather-bound notebook with a pencil loop", "mineral bead necklace", "brass vintage compass keychain"],
    moodKeywords: ["bright-eyed wonder", "investigator energy", "never stops asking why", "delight in tiny details"],
    composition: "lifestyle documentary crop, surrounded by props, the specimens create depth foreground-to-background, warm 35mm grain",
    typographyKeyword: "encyclopedia serif + vintage slab-serif labels, tabbed index and annotation marks, warm cream paper texture in text area",
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
    username?: string | null;
    cardTemplate?: WhatDoCardTemplate;
    userAnswers?: AnsweredQuestionWithStats[];
    personalShareUrl?: string | null;
    archetypeRunnerUp?: WhatDoArchetype | null;
  } = {},
): AIPromptIdentityInput | null {
  if (!engineResult.whatDoArchetype || !engineResult.signalScores) {
    return null;
  }
  const archetypeDef = getArchetypeDefinition(engineResult.whatDoArchetype);
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
    username: opts.username ?? null,
    rarestAnswerRarityPct: engineResult.rarestAnswer?.rarityPct ?? null,
    strongestTraits,
    cardTemplate: opts.cardTemplate,
    userAnswers: opts.userAnswers ?? [],
    personalShareUrl: opts.personalShareUrl ?? null,
    signatureTraits: archetypeDef?.signatureTraits ?? [],
    archetypeRunnerUp: opts.archetypeRunnerUp ? String(opts.archetypeRunnerUp).replaceAll("_", " ") : null,
  };
}

function formatPct(n: number | null, fallback = "—"): string {
  if (n === null || n === undefined) return fallback;
  return `${(Math.round(n * 10) / 10).toFixed(n % 1 === 0 ? 0 : 1)}%`;
}

function sanitizePromptText(raw: string | null | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/\bsalary\b/gi, "monthly stipend")
    .replace(/\b(earn|earns|earned|earning)\b/gi, "make")
    .replace(/\bnet worth\b/gi, "total savings")
    .replace(/\biq\b/gi, "quick-thinking score")
    .replace(/\bintelligence score\b/gi, "thinking-speed score")
    .replace(/\bleadership\s*%\b/gi, "team-captain score %")
    .replace(/\bgps\b/gi, "satellite")
    .replace(/\bcoordinates?\b/gi, "waypoints")
    .replace(/\blatitude\b/gi, "latitudinal band")
    .replace(/\blongitude\b/gi, "longitudinal band")
    .replace(/\bscientifically validated\b/gi, "thoroughly checked")
    .replace(/\bclinical\b/gi, "editorial")
    .replace(/\bresearch-proven\b/gi, "reader-tested");
}

export function generateAIPrompts(input: AIPromptIdentityInput): GeneratedAIPrompt {
  const template = pickOrDefaultTemplate(input);
  const style = TEMPLATE_STYLES[template];
  const def = getArchetypeDefinition(input.archetype);
  const viz = ARCHETYPE_VISUAL_PROPS[input.archetype];
  const warnings: string[] = [];
  if (input.agreementScorePct === null) {
    warnings.push(INSUFFICIENT_DATA);
  }
  const tops5 = topSignals(input.signalScores, 5);
  const tops3 = tops5.slice(0, 3);
  const signalList = tops5
    .map((t) => `  · ${t.meta.icon} ${t.meta.label.toUpperCase()}  ${t.score}/100   — ${t.meta.description}`)
    .join("\n");
  const strongTraitsText = input.strongestTraits.length > 0
    ? input.strongestTraits.map((s) => SIGNAL_META[s].label).join(" + ")
    : "Balanced profile";
  const cityLine = input.userCity
    ? input.cityAlignmentPct !== null
      ? `You align ${input.cityAlignmentPct.toFixed(0)}% with ${input.userCity}.`
      : `From ${input.userCity}.`
    : "";
  const rarityLine = input.rarityScorePct !== null
    ? `You think differently from ${input.rarityScorePct.toFixed(0)}% of WhatDo users globally.`
    : "";
  const rareAnswerLine = input.rarestAnswerRarityPct !== null
    ? `Rarest single answer: only ${input.rarestAnswerRarityPct.toFixed(0)}% picked it.`
    : "";
  const agreementLine = input.agreementScorePct !== null
    ? `Overall you agree ${input.agreementScorePct.toFixed(0)}% with the WhatDo community.`
    : "";
  const templateNote =
    template === "LOCAL_CITY" && input.userCity
      ? `Paint a very subtle, dreamlike silhouette or atmospheric hint of ${input.userCity} skyline / iconic landmark shapes in the distant background. No GPS pins, no precise maps, no street addresses.`
      : "";
  const whoLine = [sanitizePromptText(input.displayName), input.username ? `@${sanitizePromptText(input.username)}` : null, input.userCity ? `📍${sanitizePromptText(input.userCity)}` : null]
    .filter(Boolean)
    .join("  ·  ");

  // Section 2 — per-question breakdown with city + global stats
  const answers = (input.userAnswers ?? []).slice();
  answers.sort((a, b) => a.questionNumber - b.questionNumber);
  let section2 = "";
  if (answers.length > 0) {
    const lines: string[] = [];
    for (const a of answers) {
      const badges: string[] = [];
      if (a.selectedIsVeryRare) badges.push("🏆 ULTRA-RARE TAKE");
      else if (a.selectedIsRare) badges.push("🟡 RARE ANSWER");
      if (a.selectedIsContrarian) badges.push("⚡ CONTRARIAN");
      if (a.selectedIsMajority) badges.push("✓ MAJORITY PICK");
      const globalLabel = a.globalTotalResponses > 0
        ? `Global: ${formatPct(a.selectedGlobalPct)} (n=${a.globalTotalResponses.toLocaleString()})`
        : "Global sample still building";
      const cityLabel = (a.cityTotalResponses ?? 0) > 0
        ? `${input.userCity ?? "Your city"}: ${formatPct(a.selectedCityPct)} (n=${a.cityTotalResponses!.toLocaleString()})`
        : `${input.userCity ?? "Your city"} sample still building`;
      const optionLines = a.allOptions.map((o) => {
        const pick = o.isSelected ? "👈 YOURS  " : "        ";
        const g = formatPct(o.globalResponsePct, "·");
        const c = formatPct(o.cityResponsePct, "·");
        return `      ${pick}▸ ${sanitizePromptText(o.label)}    (Global ${g}  |  City ${c})`;
      }).join("\n");
      lines.push(`Q${a.questionNumber}. ${sanitizePromptText(a.questionText)}
   ${badges.length > 0 ? badges.join("   ") : "        "}
   You answered:  "${sanitizePromptText(a.selectedOptionLabel)}"     — ${globalLabel}     ${cityLabel}
   All answers for this question:
${optionLines}`);
    }
    section2 = `SECTION 2 — THE 12 ANSWERS THAT SHAPED THEIR WHATDO TYPE (real city + global data, entertainment only)
${lines.join("\n\n")}

Use these 12 answers to inform the props, colours, and tiny easter-egg details you paint into the portrait scene. Prioritise the 🏆 ultra-rare picks for scene props.`;
  }

  // Section 3 — archetype → visual directives + wardrobe/props/lighting
  const signatureTraitsBlock = (input.signatureTraits ?? def.signatureTraits ?? []).length > 0
    ? `Personality signature traits to express in pose + micro-expression: ${(input.signatureTraits ?? def.signatureTraits).map((t) => `"${t}"`).join("   ·   ")}`
    : "";
  const runnerUpLine = input.archetypeRunnerUp ? `Runner-up archetype (secondary flavour): ${input.archetypeRunnerUp}` : "";
  const propsLine = viz.signatureObjects.map((p, i) => `  ${i + 1}. ${p}`).join("\n");
  const accessLine = viz.accessories.map((a) => `  · ${a}`).join("\n");
  const moodLine = viz.moodKeywords.map((k) => `"${k}"`).join(",  ");
  const shareUrlLine = input.personalShareUrl
    ? `Personal referral link: ${input.personalShareUrl}`
    : `Share link for promotion: https://whatdo.co.in`;

  const portraitLine = input.displayName
    ? `IMPORTANT: The user has UPLOADED A REFERENCE PHOTO of ${input.displayName ?? "this person"}. You MUST use that photo as the IDENTITY REFERENCE. Keep their exact facial identity, age, gender, ethnicity, hairstyle, body type, and any visible tattoos or moles — preserve 100% of recognisability. DO NOT swap their face for a model's. Composit them naturally into the scene described below.`
    : `Compose a cinematic 9:16 Instagram Story portrait of a person who embodies this WhatDo Type. If the user later provides a reference photo, preserve their exact facial identity, age, gender, and ethnicity.`;

  const rarityBadgeLine = input.rarityScorePct !== null && input.rarityScorePct <= 15
    ? `Large rarity badge: "TOP ${input.rarityScorePct.toFixed(0)}% MOST UNIQUE TAKES" — bold neon halo glow`
    : input.rarityScorePct !== null
    ? `Rarity callout: "${input.rarityScorePct.toFixed(0)}% different from the crowd"`
    : `Rarity callout: "Balanced WhatDo-er"`;

  const section3 = `SECTION 3 — IMAGE GENERATION INSTRUCTIONS (paste this entire prompt + upload the user's selfie into ChatGPT / Gemini / Midjourney / Ideogram / Any image generator)

${portraitLine}

CANVAS: 1080×1920 px, 9:16 vertical Instagram Story, export-safe margins on top 120px / bottom 180px for IG UI chrome. High resolution (4K+ source then downscale), RAW-grade editorial colour, 35mm or 50mm lens look, rich tonal range — NOT flat AI plasticky.

WHO IS IN THE PICTURE
${whoLine ? `  Subject: ${whoLine}` : ""}
  WhatDo Type:  ${def.emoji}  ${def.label}        "${def.tagline}"
${runnerUpLine ? `  ${runnerUpLine}` : ""}
  ${signatureTraitsBlock}
  Top 5 WhatDo Signals (use these to grade energy of the pose / scene — higher = stronger presence):
${signalList}

ARCHETYPE-SPECIFIC VISUAL RECIPE
  · Palette (must match):  ${viz.colorPalette}
  · Template flavour overlay:  ${template}  →  ${style.palette} · ${style.mood}
  · Scene / environment:  ${viz.scene}
  · Lighting:  ${viz.lighting}
  · Pose + energy:  ${viz.poseEnergy}
  · Wardrobe suggestion (keep user's actual clothing if visible in reference, otherwise render this):  ${viz.wardrobe}
  · Accessories (paint these on the person or scene):
${accessLine}

SIGNATURE OBJECTS (prop these naturally around the scene — 3-4 of these must be visible, not all crammed):
${propsLine}
  Mood keywords on set: ${moodLine}
  Composition + framing:  ${viz.composition}
  Typography direction for on-card text:  ${viz.typographyKeyword}
${templateNote}

REQUIRED TEXT + GRAPHICS OVERLAY (integrated like a premium editorial Instagram Story, NOT pasted on)

Render all of the following as beautifully-typeset layered typography, with opacity + drop shadow so it reads cleanly without covering the face. Use ${viz.typographyKeyword}. Stick to the palette colours. Text must be 100% legible on export.

  1. CORNER LOGO (top-left or top-right)
     · Bold wordmark "WhatDo" — neon gradient, subtle glow, ~7% of width
     · Tiny tag under: "See it. Vote it. Know who you are."

  2. HEADLINE BLOCK (top 18% of frame, below logo — do NOT cover eyes/forehead)
     · Small uppercase pill-label:  "MY WHATDO TYPE"  (rounded pill background, blurred glass)
     · Huge headline:  ${def.emoji}  ${def.label}
     · Italic tagline line below:  "${def.tagline}"
     · ${rarityBadgeLine}
     · ${agreementLine || rarityLine || cityLine}

  3. 5 SIGNAL BARS (centre-left or side strip, 5 stacked pill bars OR 5 floating badges around the portrait)
     · Label each pill with the signal name, icon, score number /100, and a tiny progress bar filled to that score
     · Use this exact ordering:
${tops5.map((t) => `       → ${t.meta.icon} ${t.meta.label}  ${t.score}/100`).join("\n")}
     · Strongest signal gets a halo or pop of palette contrast colour.

  4. LOCATION / ALIGNMENT CALLOUT (near the portrait's shoulder or hip)
     · ${input.userCity ? `📍 ${input.userCity}${input.cityAlignmentPct !== null ? `  ·  ${input.cityAlignmentPct.toFixed(0)}% CITY ALIGNMENT` : ""}` : "📍 No city set yet"}
     · ${rareAnswerLine}

  5. ANSWER-STATS SUMMARY (bottom 18% of frame, glass-morphism card)
     · Small header:  "HOW THEIR 12 VOTES COMPARED"
${answers.length > 0 ? `     · ${answers.filter((a) => a.selectedIsRare || a.selectedIsVeryRare).length} rare picks · ${answers.filter((a) => a.selectedIsContrarian).length} contrarian calls · ${answers.filter((a) => a.selectedIsMajority).length} with the majority` : ""}
     · If possible, display 3 mini horizontal bar-graph chips pulled from 3 of their most interesting answers (rare/contrarian first), showing their city vs global percentages.

  6. WHATDO PROMOTION FOOTER CTA (bottom-most 10% of frame, safe above IG chrome)
     · Centred pill CTA:  "WHAT'S YOUR WHATDO TYPE?"   — big, bold, glass-blur gradient pill
     · Arrow pointing down at the URL below
     · ${shareUrlLine}   (render this as a URL the viewer can type — make it crisp, ideally monospace or sans, leave a little stroke behind the URL text so it's always readable on any background)
     · Final line under URL:  "Answer 12 questions, see your own share card · WhatDo is entertainment only, not scientific."

FINAL QUALITY RULES — THESE ARE NON-NEGOTIABLE:
  A. IDENTITY INTEGRITY: If a reference photo is uploaded, the rendered person MUST be recognisable as the user from the photo. Same face, ethnicity, age, build, hair, visible tattoos/moles. No face-swapping for a prettier model. No changing race or gender.
  B. NO FORBIDDEN CLAIMS: Never state or imply a raw thinking-aptitude number, monthly income band, money/assets/fortune totals, job title ranking, any kind of ranking-percentage, or real-world-skills validation. All on-card numbers are "WhatDo Signals" derived from 12 light-hearted entertainment questions only.
  C. LOCATION PRIVACY: City-level is the max granularity. No satellite-map pins, no exact building addresses, no precise geographic waypoints, no street names, no house numbers.
  D. TYPOGRAPHY LEGIBILITY: All text must pass 4.5:1 contrast ratio. Never place text directly over the face. Never overlap CTAs on top of signal badges.
  E. CANVAS SAFETY: Respect 1080×1920 px 9:16 safe zones; top 120 px = notch + IG icons, bottom 180 px = IG upvote bar + camera chrome.
  F. BRAND PURITY: Do NOT add any AI-tool watermarks, generator logos, or "made with X" labels. Do NOT add third-party brand logos besides the WhatDo wordmark and CTA URL defined above.
  G. PHOTO QUALITY: Cinematic colour grade, subtle film grain, realistic light falloff — avoid the "default smooth AI face". Preserve natural skin texture and hair strands from the reference photo.`;

  // Final combined image prompt — structured sections with headers so ChatGPT/Gemini actually parses each one
  const section1 = `SECTION 1 — PERSONALITY SNAPSHOT (Who this image is about)
Subject name / handle / location:  ${whoLine || "Anonymous WhatDo user"}
WhatDo Type:  ${def.emoji} ${def.label}
Archetype tagline:  "${def.tagline}"
${agreementLine}
${rarityLine}
${rareAnswerLine}
${cityLine}

Top 5 WhatDo Signals (entertainment-only scores based on 12 WhatDo questions — NOT a scientific measurement):
${signalList}`;

  const section4 = `SECTION 4 — SHARING / INSTRUCTIONS FOR THE USER IF THEY WANT TO POST THIS
Caption suggestion for Instagram / WhatsApp Status / X:
  "I got ${def.emoji} ${def.label} on WhatDo. ${def.tagline}
${rarityLine || agreementLine}
Top traits: ${strongTraitsText}
${input.userCity ? `📍 ${input.userCity}\n` : ""}
What's YOUR WhatDo Type? 👇
Take the 2-min quiz → ${input.personalShareUrl ?? "https://whatdo.co.in"}"

If the AI tool offers an "expand caption" feature, use the above as the starting point.`;

  const imagePrompt = [section1, section2, section3, section4].filter(Boolean).join("\n\n————————————————————————————\n\n");

  // Share caption (kept for UI)
  const rareShareHook =
    input.rarestAnswerRarityPct !== null && input.rarestAnswerRarityPct <= 20
      ? `Only ${input.rarestAnswerRarityPct.toFixed(0)}% answered like me on my rarest take 👀`
      : "";
  const cityHook = input.userCity ? `📍 ${input.userCity}` : "";
  const shareCaption = `I got ${def.emoji} ${def.label} on WhatDo.
${def.tagline}
${rarityLine || agreementLine}
${rareShareHook}
${cityHook}

Top traits: ${strongTraitsText}

What's your WhatDo Type? 👇
Find yours → ${input.personalShareUrl ?? "https://whatdo.co.in"}`.trimEnd();

  const signalSummary = [
    `WhatDo Type: ${def.label}`,
    `Top signals: ${buildSignalList(input.signalScores, 3)}`,
    rarityLine,
    agreementLine,
    cityLine,
  ]
    .filter(Boolean)
    .join(" · ");

  // SHORT image-gen mode prompt (<=1300 chars, read by DALL-E / Midjourney / Ideogram)
  // Critically: places SELFIE CENTER-LEFT (55% canvas) + overlays BURNED IN TEXT in the 45% NEGATIVE SPACE, NOT "composited on scene"
  const top3 = tops3.map((t) => `${t.meta.icon}${t.meta.label.replace(/\s+/g, "")}${t.score}`).join(" ");
  const shortPropsLine = viz.signatureObjects.slice(0, 3).join(" + ");
  const shortAccessLine = viz.accessories.slice(0, 2).join(", ");
  const rareAnswerChip = (input.userAnswers ?? [])
    .filter((a) => a.selectedIsRare || a.selectedIsContrarian)
    .slice(0, 2)
    .map((a) => {
      const sPct = a.selectedGlobalPct;
      const short = sanitizePromptText(a.selectedOptionLabel)
        .replace(/^.{0,2}$/, "")
        .slice(0, 44);
      return sPct !== null ? `"${short}" ${sPct.toFixed(0)}%` : `"${short}"`;
    })
    .join("   ");
  const share = input.personalShareUrl ?? "https://whatdo.co.in";
  const rarityBadge =
    input.rarityScorePct !== null && input.rarityScorePct <= 15
      ? `★ TOP ${input.rarityScorePct.toFixed(0)}% UNIQUE ★`
      : input.rarityScorePct !== null
      ? `${input.rarityScorePct.toFixed(0)}% DIFFERENT`
      : "BALANCED WHATDO";
  const whoStr = whoLine ? `${whoLine}.` : "";
  const shortImagePrompt =
`[MANDATORY: Generate ONE image. DO NOT reply with text. DO NOT analyze the prompt. DO NOT merely swap background. INSTRUCTION: "PAINT A COMPLETE 1080×1920 VERTICAL INSTAGRAM STORY CARD WITH THE USER'S UPLOADED SELFIE AS THE CENTRAL SUBJECT AND BURN EVERY REQUIRED TYPOGRAPHY LAYER, SIGNAL BARS, LOGO, AND REFERRAL URL CTA INTO THE CANVAS AROUND THEM IN DESIGNATED NEGATIVE SPACE ZONES — NOT AS A SEPARATE OVERLAY FILE."]

1080×1920, 9:16 vertical. Canvas is split: LEFT 55% = SELFIE ZONE (paint uploaded photo face+upper body here, unchanged identity), RIGHT 38% = TEXT ZONE (burn overlays here), TOP 10% + BOTTOM 20% = HEADER/FOOTER ZONES. Selfie is surrounded by archetype props and palette: ${viz.colorPalette}. Mood=${style.mood}. Scene="${viz.scene}". Lighting="${viz.lighting}". Pose="${viz.poseEnergy}". Props visible: ${shortPropsLine}. Accessories: ${shortAccessLine}.

BURNED-IN, FULL-OPACITY TYPOGRAPHY — render as pixels on canvas, never behind face:
① TOP-LEFT LOGO ZONE (top 6%): Bold wordmark "WhatDo" + "See it. Vote it. Know who you are."
② TOP-LEFT HEADER ZONE (top 8-18%): Pill label "MY WHATDO TYPE", HUGE title "${def.emoji} ${def.label}", italic tagline "${sanitizePromptText(def.tagline)}", Badge "${rarityBadge}", Sub ${agreementLine || rarityLine} ${cityLine ? "· 📍" + sanitizePromptText(input.userCity ?? "") : ""}
③ LEFT/RIGHT-STRIP SIGNAL BARS: 5 stacked chips WhatDo Signals — ${tops5.map((t) => `${t.meta.icon}${t.meta.label} ${t.score}/100 ████████░░`).join("  ")}. (entertainment only)
④ MID-ANSWER CHIPS (rare picks): ${rareAnswerChip || sanitizePromptText(input.signatureTraits?.slice(0, 2).join(" · ") ?? strongTraitsText)}
⑤ BOTTOM 10-18% CTA GLASS CARD: BIG BOLD pill → "WHAT'S YOUR WHATDO TYPE?". Big arrow. Monospace URL → ${share}. Disclaimer under URL: "Answer 12 questions → see your share card · WhatDo is entertainment only."

${whoStr} Reference photo face/hair/identity unchanged. ${signatureTraitsBlock} Typography uses: ${viz.typographyKeyword}. Proportion: text+URL overlays = visible 40% of canvas, selfie 55%.`;

  return {
    imagePrompt,
    shortImagePrompt,
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
    if (re.test(prompt.shortImagePrompt)) {
      issues.push(
        `Short prompt contains forbidden pattern: ${re.toString().slice(1, -3)}`,
      );
    }
  }
  if (!prompt.imagePrompt.includes("WhatDo Signals")) {
    issues.push('Prompt missing explicit "WhatDo Signals" label.');
  }
  if (!prompt.imagePrompt.includes("1080×1920") && !prompt.imagePrompt.includes("9:16")) {
    issues.push("Prompt missing size specification (1080×1920 / 9:16).");
  }
  if (!prompt.imagePrompt.includes("WHAT'S YOUR WHATDO TYPE?") && !prompt.imagePrompt.includes("What's YOUR WhatDo Type?")) {
    issues.push("Prompt missing WhatDo call-to-action headline block.");
  }
  if (!prompt.imagePrompt.includes("whatdo.co.in") && !prompt.imagePrompt.includes("whatdo.app")) {
    issues.push("Prompt missing WhatDo share URL for footer promotion.");
  }
  if (!prompt.shortImagePrompt.includes("1080×1920") && !prompt.shortImagePrompt.includes("9:16")) {
    issues.push("Short prompt missing 1080×1920 / 9:16 size.");
  }
  if (!prompt.shortImagePrompt.includes("whatdo.co.in") && !prompt.shortImagePrompt.includes("whatdo.app")) {
    issues.push("Short prompt missing WhatDo promotion URL.");
  }
  if (!prompt.shortImagePrompt.includes("WHAT'S YOUR WHATDO TYPE?") && !prompt.shortImagePrompt.includes("What's YOUR WhatDo Type?")) {
    issues.push("Short prompt missing WHAT'S YOUR WHATDO TYPE? CTA");
  }
  return { valid: issues.length === 0, issues };
}

export { WHATDO_SIGNALS };
