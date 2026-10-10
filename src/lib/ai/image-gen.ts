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
  const safe = rawPrompt.replace(/\bsalary\b|\bnet worth\b|\bnetworth\b|\biq\b/gi, (m) => {
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

  const GROQ_CHAT_MODEL_FALLBACKS = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "canopylabs/orpheus-v1-english",
    "llama-3.1-8b-instant",
    "meta-llama/llama-3.3-70b-instruct",
  ];

  for (const model of GROQ_CHAT_MODEL_FALLBACKS) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: safe },
          ],
          max_tokens: 350,
          temperature: 0.2,
          stream: false,
        }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!resp.ok) continue;
      const data: any = await resp.json();
      const content: string = data?.choices?.[0]?.message?.content ?? "";
      if (!content) continue;
      const trimmed = content.trim().slice(0, 1000);
      if (trimmed.length >= 120) {
        return { enhanced: trimmed };
      }
    } catch {
      /* try next model */
    }
  }
  return { enhanced: safe.slice(0, 1000) };
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
  const baseModel = params.model ?? env.CF_WORKERS_AI_IMAGE_MODEL ?? "@cf/lykon/dreamshaper-8-lcm";
  const candidates: Array<{ model: string; width: number; height: number; numSteps: number }> = [];
  const w = params.width ?? 1080;
  const h = params.height ?? 1920;
  const s = params.numSteps ?? 6;
  candidates.push({ model: baseModel, width: w, height: h, numSteps: s });
  if (baseModel === "@cf/lykon/dreamshaper-8-lcm") {
    const w16 = Math.round(h * (9 / 16));
    candidates.push({
      model: "@cf/lykon/dreamshaper-8-lcm",
      width: 1024,
      height: 1792,
      numSteps: 8,
    });
    candidates.push({
      model: "@cf/bytedance/stable-diffusion-xl-lightning",
      width: 1024,
      height: 1792,
      numSteps: 4,
    });
  } else {
    candidates.push({ model: baseModel, width: 1024, height: 1792, numSteps: Math.max(8, s + 2) });
    candidates.push({ model: "@cf/bytedance/stable-diffusion-xl-lightning", width: 1024, height: 1792, numSteps: 4 });
  }
  candidates.push({ model: "@cf/stabilityai/stable-diffusion-xl-base-1.0", width: 1024, height: 1792, numSteps: 12 });

  let lastErr: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const cand of candidates) {
      try {
        const signal = params.signal ?? AbortSignal.timeout(150_000);
        const resp = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${cand.model}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.CF_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: params.prompt,
              width: cand.width,
              height: cand.height,
              num_steps: cand.numSteps,
            }),
            signal,
          },
        );
        const contentType = (resp.headers.get("content-type") ?? "image/png").toLowerCase();
        const blob = await resp.arrayBuffer();
        let bytes = new Uint8Array(blob);
        if (!resp.ok) {
          const text = await new Response(blob).text().catch(() => "");
          const code = /"code"\s*:\s*(\d+)/.exec(text)?.[1];
          lastErr = new Error(`Workers AI ${cand.model} HTTP${resp.status} CF${code}: ${text.slice(0, 240)}`);
          continue;
        }
        if (contentType.includes("json") || (bytes.length > 16 && bytes[0] === 0x7b /* { */)) {
          try {
            const text = new TextDecoder().decode(bytes);
            const parsed = JSON.parse(text);
            if (parsed?.success === false && parsed?.errors?.length) {
              lastErr = new Error(
                `Workers AI ${cand.model} CF${parsed.errors[0].code}: ${String(parsed.errors[0].message ?? "").slice(0, 200)}`,
              );
              continue;
            }
            const b64: string | undefined =
              parsed?.result?.result || parsed?.result || parsed?.result?.image || parsed?.image || undefined;
            if (typeof b64 === "string" && b64.length > 100) {
              const clean = b64.includes(",") ? b64.split(",")[1] ?? b64 : b64;
              const decoded = Uint8Array.from(
                globalThis.Buffer ? Buffer.from(clean, "base64") : new Uint8Array(0),
              );
              if (globalThis.Buffer && decoded.length > 2000) {
                return { bytes: decoded, contentType: "image/png" };
              }
            }
            lastErr = new Error(`Workers AI ${cand.model}: JSON result but no parseable image`);
            continue;
          } catch {
            /* fall through to binary signature check */
          }
        }
        const finalCT = bytes[1] === 0xd8 ? "image/jpeg" : "image/png";
        if (bytes.length > 2000 && ((bytes[0] === 0x89 && bytes[1] === 0x50) || (bytes[0] === 0xff && bytes[1] === 0xd8))) {
          return { bytes, contentType: finalCT as "image/png" };
        }
        lastErr = new Error(`Workers AI ${cand.model}: response too small or signature mismatch (len=${bytes.length})`);
      } catch (err) {
        lastErr = err;
      }
    }
  }
  throw lastErr ?? new Error("Workers AI failed on all candidates.");
}

async function fetchSelfieBytes(selfieUrlOrKey: { cdnUrl?: string | null; fileKey?: string | null }): Promise<Uint8Array | null> {
  if (selfieUrlOrKey.fileKey) {
    try {
      const s3 = getS3();
      if (s3 && env.R2_BUCKET) {
        const { GetObjectCommand } = await import("@aws-sdk/client-s3");
        const out = await s3.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: selfieUrlOrKey.fileKey }));
        const arr = await (out.Body as any)?.transformToByteArray?.();
        if (arr && arr.length > 2000) return arr;
      }
    } catch { /* fallthrough */ }
  }
  if (selfieUrlOrKey.cdnUrl) {
    try {
      const r = await fetch(selfieUrlOrKey.cdnUrl, { signal: AbortSignal.timeout(20_000) });
      if (!r.ok) return null;
      const b = await r.arrayBuffer();
      const u = new Uint8Array(b);
      if (u.length > 2000) return u;
    } catch { /* fallthrough */ }
  }
  return null;
}

async function workersAIImageToImage(params: {
  prompt: string;
  referenceImageBytes: Uint8Array;
  strength?: number;
  width?: number;
  height?: number;
  numSteps?: number;
  signal?: AbortSignal;
}): Promise<{ bytes: Uint8Array; contentType: "image/png" }> {
  const accountId = env.CF_ACCOUNT_ID || env.R2_ACCOUNT_ID;
  if (!accountId || !env.CF_API_TOKEN) {
    throw new Error("Workers AI not configured");
  }
  if (!params.referenceImageBytes || params.referenceImageBytes.length === 0) {
    throw new Error("img2img: reference selfie bytes empty");
  }
  if (params.referenceImageBytes.length < 500) {
    throw new Error(
      `img2img: reference selfie too small (${params.referenceImageBytes.length} bytes < 500)`,
    );
  }
  const w = params.width ?? 1080;
  const h = params.height ?? 1920;
  const strength = params.strength ?? 0.62;
  const steps = params.numSteps ?? 24;
  const imgB64 = Buffer.from(params.referenceImageBytes).toString("base64");
  const negative_prompt = "face, faces, head, heads, identity, text, letters, words, logo, watermark, crowd, collage, grid, duplicate, deformed, ugly, blurry, extra fingers, multiple persons, extra limbs, out of frame";
  const img2imgCandidates: Array<{ model: string; width: number; height: number; numSteps: number; strength: number }> = [
    { model: "@cf/runwayml/stable-diffusion-v1-5-img2img", width: 1024, height: 1792, numSteps: Math.max(20, steps), strength },
    { model: "@cf/runwayml/stable-diffusion-v1-5-img2img", width: 1080, height: 1920, numSteps: Math.max(18, steps - 2), strength: Math.max(0.5, strength - 0.1) },
    { model: "@cf/runwayml/stable-diffusion-v1-5-img2img", width: 1024, height: 1792, numSteps: Math.max(22, steps), strength: 0.7 },
  ];

  let lastErr: any = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    for (const cand of img2imgCandidates) {
      try {
        const signal = params.signal ?? AbortSignal.timeout(180_000);
        const resp = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${cand.model}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${env.CF_API_TOKEN}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              prompt: params.prompt,
              image: imgB64,
              strength: cand.strength,
              width: cand.width,
              height: cand.height,
              num_steps: cand.numSteps,
              negative_prompt,
            }),
            signal,
          },
        );
        const contentType = (resp.headers.get("content-type") ?? "image/png").toLowerCase();
        const blob = await resp.arrayBuffer();
        let bytes = new Uint8Array(blob);
        if (!resp.ok) {
          const text = await new Response(bytes).text().catch(() => "");
          const code = /"code"\s*:\s*(\d+)/.exec(text)?.[1];
          lastErr = new Error(`Workers AI img2img ${cand.model} HTTP${resp.status} CF${code}: ${text.slice(0, 220)}`);
          continue;
        }
        if (contentType.includes("json") || (bytes.length > 16 && bytes[0] === 0x7b /* { */)) {
          try {
            const text = new TextDecoder().decode(bytes);
            const parsed = JSON.parse(text);
            if (parsed?.success === false && parsed?.errors?.length) {
              lastErr = new Error(
                `Workers AI img2img ${cand.model} CF${parsed.errors[0].code}: ${String(parsed.errors[0].message ?? "").slice(0, 200)}`,
              );
              continue;
            }
            const b64: string | undefined =
              parsed?.result?.result || parsed?.result || parsed?.result?.image || parsed?.image || undefined;
            if (typeof b64 === "string" && b64.length > 100) {
              const clean = b64.includes(",") ? b64.split(",")[1] ?? b64 : b64;
              const decoded = Buffer.from(clean, "base64");
              if (decoded.length > 2000) {
                return { bytes: new Uint8Array(decoded), contentType: "image/png" };
              }
            }
            lastErr = new Error(`Workers AI img2img ${cand.model}: JSON result but no parseable image`);
            continue;
          } catch {
            /* fall through */
          }
        }
        const finalCT = bytes[1] === 0xd8 ? "image/jpeg" : "image/png";
        if (bytes.length > 2000 && ((bytes[0] === 0x89 && bytes[1] === 0x50) || (bytes[0] === 0xff && bytes[1] === 0xd8))) {
          return { bytes, contentType: finalCT as "image/png" };
        }
        lastErr = new Error(`Workers AI img2img ${cand.model}: response too small or signature mismatch (len=${bytes.length})`);
      } catch (err) {
        lastErr = err;
      }
    }
  }
  throw lastErr ?? new Error("Workers AI img2img failed on all candidates.");
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

function postSanitizeScenePrompt(prompt: string, mode: "t2i" | "i2i"): string {
  const faceStripTuples: Array<[RegExp, string]> = [
    [/\b(?:decisive|confident|curious|creative)[-\s](?:women|men|people|leaders|thinkers)\b/gi, "clothed figure silhouette"],
    [/\b(?:woman|women|man|men|girl|boy|lady|gentleman|guy|crowd|multiple faces|collage|grid)\b/gi, "anonymous clothed silhouette"],
    [/\b(?:subjects?|persons?|people|faces|heads|portrait(?!\s*9:16)|photo of)\b/gi, "clothed figure"],
  ];
  let out = prompt;
  for (const [re, rep] of faceStripTuples) {
    out = out.replace(re, rep);
  }
  const constraint =
    mode === "i2i"
      ? ". HARD CONSTRAINT: NO HUMAN FACES, NO HEADS, NO IDENTITIES, NO TEXT/LETTERS/WORDS/LOGOS in output. Render ONLY scene + clothed figure body with empty head zone area."
      : ". HARD CONSTRAINT: NO HUMAN FACES/HEADS OR TEXT/LOGOS ANYWHERE. This is a scenic environment render with a SINGLE anonymous headless body silhouette; the empty head zone area is left as background/scene continuation for downstream compositing.";
  if (!/HARD CONSTRAINT/.test(out)) {
    out = out.trim().replace(/\.$/, "") + constraint;
  }
  return out.slice(0, 1800);
}

export async function generateAIImage(
  rawPrompt: string,
  config: ImageGenConfig & {
    selfieRef?: { cdnUrl?: string | null; fileKey?: string | null } | null;
    hasSelfieReference?: boolean;
    promptMode?: "burnIn" | "sceneOnly";
  },
  progress?: ImageGenProgressFn,
): Promise<{
  publicUrl: string;
  fileKey: string;
  sizeBytes: number;
  enhancedPrompt: string;
  contentType: "image/png";
  usedImg2Img: boolean;
}> {
  if (!hasImageGen()) {
    throw new Error(
      "Image generation is disabled: create a Cloudflare API token (Workers AI Write) at dash.cloudflare.com and set CF_API_TOKEN.",
    );
  }
  const hasSelfie = Boolean(config.selfieRef && (config.selfieRef.cdnUrl || config.selfieRef.fileKey));
  progress?.("prompt_enrich");
  const { enhanced: rawEnhanced } = await groqEnhancePrompt(rawPrompt);
  let i2iBytes: Uint8Array | null = null;
  if (hasSelfie && config.selfieRef) {
    i2iBytes = await fetchSelfieBytes(config.selfieRef);
  }
  const promptMode: "t2i" | "i2i" = i2iBytes ? "i2i" : "t2i";
  const enhanced = postSanitizeScenePrompt(rawEnhanced, promptMode);
  progress?.("render");
  let bytes: Uint8Array;
  let contentType: "image/png";
  let usedImg2Img = false;
  if (i2iBytes) {
    try {
      const res = await workersAIImageToImage({
        prompt: enhanced,
        referenceImageBytes: i2iBytes,
        width: 1080,
        height: 1920,
      });
      bytes = res.bytes;
      contentType = res.contentType;
      usedImg2Img = true;
    } catch (img2imgErr) {
      // Fallback to full T2I cascade (default numSteps + full candidates list, NOT forced 4 steps)
      const fallback = await workersAIGenerateImage({
        prompt: enhanced,
        width: 1080,
        height: 1920,
      });
      bytes = fallback.bytes;
      contentType = fallback.contentType;
      usedImg2Img = false;
    }
  } else {
    const res = await workersAIGenerateImage({
      prompt: enhanced,
      width: 1080,
      height: 1920,
    });
    bytes = res.bytes;
    contentType = res.contentType;
    usedImg2Img = false;
  }
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
    usedImg2Img,
  };
}
