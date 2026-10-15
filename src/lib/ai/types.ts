import type { JsonValue } from "@prisma/client/runtime/library";

export type ModerationFlag =
  | "NSFW"
  | "HATE"
  | "SPAM"
  | "VIOLENCE"
  | "PII"
  | "COPYRIGHT"
  | "MALICIOUS_URL"
  | "HARASSMENT"
  | "MISINFORMATION";

export interface AIModerationResult {
  passed: boolean;
  flags: ModerationFlag[];
  score: number;
  details?: JsonValue;
}

export interface AIGeneratedQuestions {
  questions: string[];
}

export interface AIClassificationResult {
  categorySlug: string;
  confidence: number;
  suggestedTags: string[];
}

export type Sentiment = "positive" | "neutral" | "negative";

export interface AISummary {
  summary: string;
  sentiment: Sentiment;
  keyPoints: string[];
}

export interface CommentForSummary {
  id: string;
  text: string;
  likeCount: number;
}

export interface LocalPulsePostDraft {
  caption: string;
  tags: string[];
  categorySlug: string;
  /** Prompt used to generate/select a representative image. */
  imagePrompt: string;
}

export interface AIProvider {
  moderateText(text: string): Promise<AIModerationResult>;
  moderateImage(imageUrl: string, mimeType?: string): Promise<AIModerationResult>;
  moderateVideo(videoUrl: string, posterUrl?: string): Promise<AIModerationResult>;
  generateQuestion(mediaUrls: string[], context?: string): Promise<AIGeneratedQuestions>;
  classifyContent(
    title: string,
    description?: string,
    mediaUrls?: string[],
  ): Promise<AIClassificationResult>;
  summarizeComments(comments: CommentForSummary[]): Promise<AISummary>;
  /**
   * Generate N short, location-aware LocalPulse post drafts.
   * Content must be non-controversial (no politics, no community conflict),
   * funny / informative / interesting, aimed at ages 10–30.
   */
  generateLocalPulseContent(
    location: { latitude: number; longitude: number; city?: string },
    count: number,
  ): Promise<LocalPulsePostDraft[]>;
}
