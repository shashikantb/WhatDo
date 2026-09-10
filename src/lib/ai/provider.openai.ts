import type {
  AIProvider,
  AIModerationResult,
  AIGeneratedQuestions,
  AIClassificationResult,
  AISummary,
  CommentForSummary,
  ModerationFlag,
} from "./types";
import { MockAIProvider } from "./provider.mock";

const OPENAI_MODERATION_FLAG_MAP: Record<string, ModerationFlag> = {
  harassment: "HARASSMENT",
  "harassment/threatening": "HARASSMENT",
  hate: "HATE",
  "hate/threatening": "HATE",
  "self-harm": "VIOLENCE",
  "self-harm/instructions": "VIOLENCE",
  "self-harm/intent": "VIOLENCE",
  sexual: "NSFW",
  "sexual/minors": "NSFW",
  violence: "VIOLENCE",
  "violence/graphic": "VIOLENCE",
};

class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 0;
}

export class OpenAIProvider implements AIProvider {
  private readonly apiKey: string | undefined;
  private readonly fallback: MockAIProvider;
  private _client: unknown | null = null;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.fallback = new MockAIProvider();
  }

  private async getClient() {
    if (!this.apiKey) {
      throw new ConfigurationError("OPENAI_API_KEY is not configured");
    }
    if (this._client) return this._client as any;
    try {
      // @ts-expect-error openai package is optional at install time
      const { default: OpenAI } = await import("openai");
      this._client = new OpenAI({ apiKey: this.apiKey });
    } catch {
      this._client = null;
    }
    return this._client as any;
  }

  private useFallback(): boolean {
    if (!isOpenAIConfigured()) return true;
    return false;
  }

  async moderateText(text: string): Promise<AIModerationResult> {
    if (this.useFallback()) {
      return this.fallback.moderateText(text);
    }

    try {
      const client = await this.getClient();
      if (!client) {
        return this.fallback.moderateText(text);
      }

      const res = await client.moderations.create({
        model: "omni-moderation-latest",
        input: text,
      });

      const result = res?.results?.[0];
      if (!result) {
        return this.fallback.moderateText(text);
      }

      const flags: ModerationFlag[] = [];
      let maxScore = 0;
      const categories: Record<string, boolean> = result.categories ?? {};
      const scores: Record<string, number> = result.category_scores ?? {};

      for (const [key, flagged] of Object.entries(categories)) {
        if (!flagged) continue;
        const mapped = OPENAI_MODERATION_FLAG_MAP[key];
        if (mapped) flags.push(mapped);
        const s = typeof scores[key] === "number" ? scores[key] : 0;
        if (s > maxScore) maxScore = s;
      }

      const score = Math.round(maxScore * 100) / 100;
      const passed = !result.flagged;

      return {
        passed,
        flags,
        score,
        details: { provider: "openai", model: "omni-moderation-latest" },
      };
    } catch {
      return this.fallback.moderateText(text);
    }
  }

  async moderateImage(
    imageUrl: string,
    mimeType?: string,
  ): Promise<AIModerationResult> {
    if (this.useFallback()) {
      return this.fallback.moderateImage(imageUrl, mimeType);
    }
    try {
      const client = await this.getClient();
      if (!client) {
        return this.fallback.moderateImage(imageUrl, mimeType);
      }

      const response = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageUrl, detail: "low" },
              },
              {
                type: "text",
                text: "Moderate this image. Return only a JSON object with fields passed (boolean), flags (array of: NSFW, HATE, SPAM, VIOLENCE, PII, COPYRIGHT, MALICIOUS_URL, HARASSMENT, MISINFORMATION), score (number 0-1).",
              },
            ],
          },
        ],
        max_tokens: 250,
      });

      const content =
        response?.choices?.[0]?.message?.content?.trim() ?? "{}";
      let parsed: AIModerationResult;
      try {
        parsed = JSON.parse(content);
      } catch {
        parsed = { passed: true, flags: [], score: 0 };
      }
      return {
        ...parsed,
        details: { provider: "openai", model: "gpt-4o-mini", vision: true },
      };
    } catch {
      return this.fallback.moderateImage(imageUrl, mimeType);
    }
  }

  async moderateVideo(
    videoUrl: string,
    posterUrl?: string,
  ): Promise<AIModerationResult> {
    if (this.useFallback()) {
      return this.fallback.moderateVideo(videoUrl, posterUrl);
    }
    return this.fallback.moderateVideo(videoUrl, posterUrl);
  }

  async generateQuestion(
    mediaUrls: string[],
    context?: string,
  ): Promise<AIGeneratedQuestions> {
    if (this.useFallback()) {
      return this.fallback.generateQuestion(mediaUrls, context);
    }

    try {
      const client = await this.getClient();
      if (!client) {
        return this.fallback.generateQuestion(mediaUrls, context);
      }

      const messages: any[] = [
        {
          role: "system",
          content:
            "You are an expert question-writer for a polling and opinion platform. Generate 3 engaging question prompts covering YES_NO, MULTIPLE_CHOICE, and RATING post types. Return JSON: { questions: string[] }.",
        },
      ];

      const userContent: any[] = [];
      if (mediaUrls && mediaUrls.length > 0) {
        for (const url of mediaUrls.slice(0, 3)) {
          userContent.push({ type: "image_url", image_url: { url, detail: "low" } });
        }
      }
      if (context) {
        userContent.push({ type: "text", text: `Context: ${context}` });
      } else if (userContent.length === 0) {
        userContent.push({ type: "text", text: "Generate 3 engaging polling questions about current events." });
      }
      messages.push({ role: "user", content: userContent });

      const res = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.9,
        messages,
        max_tokens: 500,
      });

      const raw = res?.choices?.[0]?.message?.content ?? '{"questions":[]}';
      try {
        const parsed = JSON.parse(raw);
        return {
          questions: Array.isArray(parsed.questions) ? parsed.questions : [],
        };
      } catch {
        return this.fallback.generateQuestion(mediaUrls, context);
      }
    } catch {
      return this.fallback.generateQuestion(mediaUrls, context);
    }
  }

  async classifyContent(
    title: string,
    description?: string,
    mediaUrls?: string[],
  ): Promise<AIClassificationResult> {
    if (this.useFallback()) {
      return this.fallback.classifyContent(title, description, mediaUrls);
    }
    try {
      const client = await this.getClient();
      if (!client) {
        return this.fallback.classifyContent(title, description, mediaUrls);
      }
      const sys = `You are a content classifier. CATEGORIES: technology, entertainment, sports, news, gaming, food, travel, fitness, education, finance, art, science. Return JSON: { categorySlug: string, confidence: number 0-1, suggestedTags: string[] }`;
      const user = `Title: ${title}\n${description ? `Description: ${description}` : ""}`;
      const res = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        max_tokens: 300,
      });
      const raw = res?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(raw);
        return {
          categorySlug: parsed.categorySlug ?? "general",
          confidence: Number(parsed.confidence) || 0.5,
          suggestedTags: Array.isArray(parsed.suggestedTags) ? parsed.suggestedTags : [],
        };
      } catch {
        return this.fallback.classifyContent(title, description, mediaUrls);
      }
    } catch {
      return this.fallback.classifyContent(title, description, mediaUrls);
    }
  }

  async summarizeComments(
    comments: CommentForSummary[],
  ): Promise<AISummary> {
    if (this.useFallback()) {
      return this.fallback.summarizeComments(comments);
    }
    try {
      const client = await this.getClient();
      if (!client) {
        return this.fallback.summarizeComments(comments);
      }
      const sample = comments
        .slice()
        .sort((a, b) => b.likeCount - a.likeCount)
        .slice(0, 20)
        .map((c) => `- ${c.text.slice(0, 500)} (+${c.likeCount} likes)`);
      const sys = `You summarize comment threads. Return JSON: { summary: string, sentiment: "positive"|"neutral"|"negative", keyPoints: string[] (max 3) }`;
      const user = `Comments (${comments.length} total, top ${sample.length}):\n${sample.join("\n")}`;
      const res = await client.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: user },
        ],
        max_tokens: 400,
      });
      const raw = res?.choices?.[0]?.message?.content ?? "{}";
      try {
        const parsed = JSON.parse(raw);
        return {
          summary: parsed.summary ?? "No summary available.",
          sentiment: ["positive", "negative", "neutral"].includes(parsed.sentiment)
            ? parsed.sentiment
            : "neutral",
          keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
        };
      } catch {
        return this.fallback.summarizeComments(comments);
      }
    } catch {
      return this.fallback.summarizeComments(comments);
    }
  }
}
