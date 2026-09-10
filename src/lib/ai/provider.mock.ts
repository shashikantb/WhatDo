import type {
  AIProvider,
  AIModerationResult,
  AIGeneratedQuestions,
  AIClassificationResult,
  AISummary,
  CommentForSummary,
  ModerationFlag,
} from "./types";

const PROFANE_WORD_FLAGS: Record<string, ModerationFlag[]> = {
  nigger: ["HATE"],
  nigga: ["HATE"],
  cunt: ["HARASSMENT"],
  whore: ["HARASSMENT"],
  slut: ["HARASSMENT"],
  retard: ["HARASSMENT"],
  retarded: ["HARASSMENT"],
  kill: ["VIOLENCE"],
  murder: ["VIOLENCE"],
  suicide: ["VIOLENCE"],
  rape: ["VIOLENCE"],
  bomb: ["VIOLENCE"],
  porn: ["NSFW"],
  hentai: ["NSFW"],
  nude: ["NSFW"],
  sex: ["NSFW"],
  "http://spam": ["SPAM"],
  "spam.example": ["SPAM"],
  "ssn": ["PII"],
  "credit card": ["PII"],
  "password:": ["PII"],
  "phone number": ["PII"],
  "home address": ["PII"],
  "fake news": ["MISINFORMATION"],
  "do not take this vaccine": ["MISINFORMATION"],
  "covid is a hoax": ["MISINFORMATION"],
  "copyright": ["COPYRIGHT"],
  "pirated": ["COPYRIGHT"],
  "malware": ["MALICIOUS_URL"],
  "phishing": ["MALICIOUS_URL"],
};

const MODERATION_THRESHOLD = 0.5;

function normalizeForModeration(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s:/.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mockModerateTextInternal(text: string): AIModerationResult {
  if (!text) {
    return { passed: true, flags: [], score: 0 };
  }

  const normalized = normalizeForModeration(text);
  const flagsSet = new Set<ModerationFlag>();
  let baseScore = 0;

  for (const [word, flags] of Object.entries(PROFANE_WORD_FLAGS)) {
    const pattern = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (pattern.test(normalized) || normalized.includes(word)) {
      for (const f of flags) flagsSet.add(f);
      baseScore = Math.min(1, baseScore + 0.35);
    }
  }

  const words = normalized.split(/\s+/);
  const exclaimCount = (text.match(/!/g) || []).length;
  const capsRatio =
    text.length > 0
      ? (text.match(/[A-Z]/g) || []).length / text.length
      : 0;

  if (words.length > 300) {
    baseScore = Math.min(1, baseScore + 0.05);
  }

  const linkCount = (text.match(/https?:\/\//g) || []).length;
  if (linkCount >= 3) {
    flagsSet.add("SPAM");
    baseScore = Math.min(1, baseScore + 0.2);
  }

  if (exclaimCount > 8 || capsRatio > 0.6) {
    baseScore = Math.min(1, baseScore + 0.05);
  }

  const flags = Array.from(flagsSet);
  const passed = baseScore < MODERATION_THRESHOLD;
  const score = Math.round(baseScore * 100) / 100;

  return {
    passed,
    flags,
    score,
    details: {
      provider: "mock",
      linkCount,
      capsRatio: Math.round(capsRatio * 100) / 100,
    },
  };
}

export class MockAIProvider implements AIProvider {
  async moderateText(text: string): Promise<AIModerationResult> {
    return mockModerateTextInternal(text);
  }

  async moderateImage(
    imageUrl: string,
    _mimeType?: string,
  ): Promise<AIModerationResult> {
    void imageUrl;
    return { passed: true, flags: [], score: 0, details: { provider: "mock", skipped: true } };
  }

  async moderateVideo(
    videoUrl: string,
    _posterUrl?: string,
  ): Promise<AIModerationResult> {
    void videoUrl;
    return { passed: true, flags: [], score: 0, details: { provider: "mock", skipped: true } };
  }

  async generateQuestion(
    mediaUrls: string[],
    context?: string,
  ): Promise<AIGeneratedQuestions> {
    void mediaUrls;
    const prompt = context?.slice(0, 50) ?? "this topic";
    return {
      questions: [
        `What do you think about ${prompt}?`,
        `How would you rate ${prompt}?`,
        `Which option best describes your take on ${prompt}?`,
      ],
    };
  }

  async classifyContent(
    title: string,
    _description?: string,
    _mediaUrls?: string[],
  ): Promise<AIClassificationResult> {
    const lower = title.toLowerCase();
    let slug = "general";
    const suggestions: string[] = [];

    if (lower.includes("tech") || lower.includes("code") || lower.includes("ai") || lower.includes("app")) {
      slug = "technology";
      suggestions.push("tech", "ai");
    } else if (lower.includes("movie") || lower.includes("show") || lower.includes("music")) {
      slug = "entertainment";
      suggestions.push("entertainment", "culture");
    } else if (lower.includes("game") || lower.includes("play")) {
      slug = "gaming";
      suggestions.push("games");
    } else if (lower.includes("sport") || lower.includes("team")) {
      slug = "sports";
      suggestions.push("sports");
    } else if (lower.includes("news") || lower.includes("politic") || lower.includes("election")) {
      slug = "news";
      suggestions.push("news", "politics");
    } else if (lower.includes("food") || lower.includes("recipe") || lower.includes("cook")) {
      slug = "food";
      suggestions.push("food", "recipes");
    } else if (lower.includes("travel") || lower.includes("trip") || lower.includes("visit")) {
      slug = "travel";
      suggestions.push("travel");
    } else if (lower.includes("fitness") || lower.includes("gym") || lower.includes("health")) {
      slug = "fitness";
      suggestions.push("fitness", "health");
    } else if (lower.includes("learn") || lower.includes("study") || lower.includes("school")) {
      slug = "education";
      suggestions.push("education");
    } else if (lower.includes("money") || lower.includes("invest") || lower.includes("stock") || lower.includes("price")) {
      slug = "finance";
      suggestions.push("finance", "investing");
    } else if (lower.includes("art") || lower.includes("design") || lower.includes("draw")) {
      slug = "art";
      suggestions.push("art", "design");
    } else if (lower.includes("sci") || lower.includes("research") || lower.includes("experiment")) {
      slug = "science";
      suggestions.push("science", "research");
    }

    return {
      categorySlug: slug,
      confidence: 0.7,
      suggestedTags: suggestions,
    };
  }

  async summarizeComments(
    comments: CommentForSummary[],
  ): Promise<AISummary> {
    const total = comments.length;
    if (total === 0) {
      return {
        summary: "No comments yet.",
        sentiment: "neutral",
        keyPoints: [],
      };
    }

    const sample = comments
      .slice()
      .sort((a, b) => b.likeCount - a.likeCount)
      .slice(0, 3);

    const positiveWords = ["great", "good", "love", "best", "excellent", "amazing", "perfect", "agree", "yes"];
    const negativeWords = ["bad", "terrible", "awful", "worst", "hate", "disagree", "no", "wrong", "awful"];

    let pos = 0;
    let neg = 0;
    const normalizedAll = comments.map((c) => c.text.toLowerCase()).join(" ");
    for (const w of positiveWords) if (normalizedAll.includes(w)) pos++;
    for (const w of negativeWords) if (normalizedAll.includes(w)) neg++;

    let sentiment: "positive" | "neutral" | "negative" = "neutral";
    if (pos > neg + 1) sentiment = "positive";
    else if (neg > pos + 1) sentiment = "negative";

    const keyPoints = sample
      .map((c) => c.text.slice(0, 120).trim())
      .filter((s) => s.length > 10);

    const summary =
      sentiment === "positive"
        ? "Most comments are enthusiastic and positive."
        : sentiment === "negative"
        ? "Comments are generally critical or skeptical."
        : "Comments reflect a balanced mix of opinions.";

    return { summary, sentiment, keyPoints };
  }
}
