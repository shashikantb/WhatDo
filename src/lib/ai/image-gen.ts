import crypto from "crypto";
import {
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";

type EnvShape = {
  GROQ_API_KEY?: string;
  CF_API_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET?: string;
  R2_PUBLIC_URL?: string;
  CF_WORKERS_AI_IMAGE_MODEL?: string;
};

const env = process.env as EnvShape;

export type ImageGenConfig = {
  userId?: string;
  identityId?: string;
  shareToken?: string;
};

export type ImageGenProgressFn = (stage: "prompt_enrich" | "render" | "upload") => void;

function sha256hex(s: string): string {
  return crypto.createHash("sha256").update(s).digest("hex");
}

export function hasWorkersAI(): boolean {
  return Boolean(env.CF_API_TOKEN && (env.CF_ACCOUNT_ID || env.R2_ACCOUNT_ID));
}

export function hasGroq(): boolean {
  return Boolean(env.GROQ_API_KEY);
}

export function hasImageGen(): boolean {
  return hasWorkersAI();
}

async function groqEnhancePrompt(rawPrompt: string): Promise<{ enhanced: string }> {
  if (!hasGroq()) {
    return { enhanced: rawPrompt.slice(0, 1200) };
  }
  const safe = rawPrompt.replace(/salary|net worth|networth|iq\b/gi, (m) => {
    const map: Record<string, string> = {
      salary: "monthly stipend",
      "net worth": "total savings",
      networth: "total savings",
      iq: "quick-thinking score",
    };
    return map[m.toLowerCase()] ?? m;
  }).slice(0, 1400);

  const system =
    "You rewrite image-generation prompts for a portrait social-share card (9:16 vertical, 1080x1920). Rules: (1) Portrait 9:16 composition. (2) Keep all specific identity, signal-bar, and branding-burn directives verbatim at the end. (3) Remove forbidden financial/medical jargon. (4) Keep total prompt under 800 chars. (5) Output ONLY the rewritten prompt, no commentary, no quotes, no markdown. Start directly.";
  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: system },
          { role: "user", content: safe },
        ],
        max_tokens: 350,
        temperature: 0.2,
        stream: false,
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!resp.ok) {
      return { enhanced: safe.slice(0, 1000) };
    }
    const data: any = await resp.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    if (!content) return { enhanced: safe.slice(0, 1000) };
    return { enhanced: content.trim().slice(0, 1000) };
  } catch {
    return { enhanced: safe.slice(0, 1000) };
  }
}

async function workersAIGenerateImage(params: {
  prompt: string;
  width?: number;
  height?: number;
  numSteps?: number;
  model?: string;
  signal?: AbortSignal;
}): Promise<{ bytes: Uint8Array; contentType: "image/png" }> {
  const accountId = env.CF_ACCOUNT_ID || env.R2_ACCOUNT_ID;
  if (!accountId || !env.CF_API_TOKEN) {
    throw new Error("Workers AI not configured");
  }
  const model = params.model ?? env.CF_WORKERS_AI_IMAGE_MODEL ?? "@cf/lykon/dreamshaper-8-lcm";
  const width = params.width ?? 1080;
  const height = params.height ?? 1920;
  const numSteps = params.numSteps ?? 4;
  const resp = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${encodeURIComponent(model)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.CF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: params.prompt,
        width,
        height,
        num_steps: numSteps,
      }),
      signal: params.signal ?? AbortSignal.timeout(120_000),
    },
  );
  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Workers AI ${resp.status} ${text.slice(0, 300)}`);
  }
  const contentType = (resp.headers.get("content-type") ?? "image/png").toLowerCase();
  const blob = await resp.arrayBuffer();
  const bytes = new Uint8Array(blob);
  // Workers AI sometimes returns JSON wrapping { result: "b64..." } — try detect
  if (contentType.includes("json") || (bytes.length > 16 && bytes[0] === 0x7b /* { */)) {
    try {
      const text = new TextDecoder().decode(bytes);
      const parsed = JSON.parse(text);
      const b64: string | undefined = parsed?.result ?? parsed?.image ?? parsed?.data?.image ?? undefined;
      if (typeof b64 === "string" && b64.length > 100) {
        const clean = b64.includes(",") ? b64.split(",")[1] ?? b64 : b64;
        const decoded = Uint8Array.from(globalThis.Buffer ? Buffer.from(clean, "base64") : new Uint8Array(0));
        if (globalThis.Buffer) {
          return { bytes: decoded, contentType: "image/png" };
        }
      }
    } catch {}
  }
  const finalCT = contentType.includes("png") ? "image/png" : "image/png";
  return { bytes, contentType: finalCT as "image/png" };
}

let s3Singleton: S3Client | null = null;
function getS3(): S3Client | null {
  if (
    !env.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_BUCKET
  ) {
    return null;
  }
  if (!s3Singleton) {
    s3Singleton = new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Singleton;
}

async function uploadBytesToR2(params: {
  bytes: Uint8Array;
  contentType: string;
  userId?: string;
  identityId?: string;
  shareToken?: string;
}): Promise<{ publicUrl: string; fileKey: string; size: number }> {
  const s3 = getS3();
  if (!s3 || !env.R2_BUCKET) throw new Error("R2 storage not configured");
  const hash = sha256hex(`${params.identityId || ""}:${params.shareToken || ""}:${Date.now()}:${Math.random()}`);
  const userSafe = params.userId ? `u_${params.userId.slice(0, 10)}` : "anon";
  const fileKey = `ai-generated/${userSafe}/${Date.now()}_${hash.slice(0, 12)}.png`;
  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: fileKey,
      Body: params.bytes,
      ContentType: params.contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  const base = (env.R2_PUBLIC_URL || "").replace(/\/+$/, "");
  const publicUrl = base ? `${base}/${fileKey}` : "";
  return { publicUrl, fileKey, size: params.bytes.length };
}

export async function generateAIImage(
  rawPrompt: string,
  config: ImageGenConfig,
  progress?: ImageGenProgressFn,
): Promise<{
  publicUrl: string;
  fileKey: string;
  sizeBytes: number;
  enhancedPrompt: string;
  contentType: "image/png";
}> {
  if (!hasImageGen()) {
    throw new Error(
      "Image generation is disabled: create a Cloudflare API token (Workers AI Write) at dash.cloudflare.com and set CF_API_TOKEN.",
    );
  }
  progress?.("prompt_enrich");
  const { enhanced } = await groqEnhancePrompt(rawPrompt);
  progress?.("render");
  const { bytes, contentType } = await workersAIGenerateImage({
    prompt: enhanced,
    width: 1080,
    height: 1920,
    numSteps: 4,
  });
  progress?.("upload");
  const { publicUrl, fileKey, size } = await uploadBytesToR2({
    bytes,
    contentType,
    userId: config.userId,
    identityId: config.identityId,
    shareToken: config.shareToken,
  });
  return {
    publicUrl,
    fileKey,
    sizeBytes: size,
    enhancedPrompt: enhanced,
    contentType,
  };
}
