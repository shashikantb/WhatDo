import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET;
const R2_PUBLIC_BUCKET_URL = process.env.R2_PUBLIC_URL;

const hasR2Config =
  R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME;

let s3Client: S3Client | null = null;
let presignS3Client: S3Client | null = null;

function getS3Client(): S3Client | null {
  if (!hasR2Config) return null;
  if (!s3Client) {
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

function getPresignS3Client(): S3Client | null {
  if (!hasR2Config) return null;
  if (!presignS3Client) {
    presignS3Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    presignS3Client.middlewareStack.add(
      (next) => async (args: any) => {
        if (args?.input && typeof args.input === "object") {
          delete (args.input as any).ChecksumAlgorithm;
          delete (args.input as any).ChecksumCRC32;
          delete (args.input as any).ChecksumCRC32C;
          delete (args.input as any).ChecksumSHA1;
          delete (args.input as any).ChecksumSHA256;
          delete (args.input as any).ContentLength;
        }
        return next(args);
      },
      {
        step: "initialize",
        priority: "high",
        name: "StripChecksumAndContentLengthBeforeSigning",
      }
    );
  }
  return presignS3Client;
}

function scrubPresignedR2Url(urlStr: string): string {
  try {
    const u = new URL(urlStr);
    const badKeys = Array.from(u.searchParams.keys()).filter(
      (k) =>
        k.toLowerCase().startsWith("x-amz-checksum-") ||
        k.toLowerCase() === "x-amz-sdk-checksum-algorithm" ||
        k.toLowerCase() === "x-id"
    );
    for (const k of badKeys) u.searchParams.delete(k);
    const signedHdrs = u.searchParams.get("X-Amz-SignedHeaders");
    if (signedHdrs) {
      const filtered = signedHdrs
        .split(";")
        .filter(
          (h) =>
            h.toLowerCase() !== "content-length" &&
            !h.toLowerCase().startsWith("x-amz-checksum-") &&
            h.toLowerCase() !== "x-amz-sdk-checksum-algorithm"
        );
      if (filtered.length) {
        u.searchParams.set("X-Amz-SignedHeaders", filtered.join(";"));
      }
    }
    return u.toString();
  } catch {
    return urlStr;
  }
}

async function getR2PresignedPutUrl(params: {
  bucket: string;
  key: string;
  contentType: string;
  expiresIn: number;
}): Promise<string> {
  const client = getPresignS3Client();
  if (!client) throw new Error("Storage not configured");
  const command = new PutObjectCommand({
    Bucket: params.bucket,
    Key: params.key,
    ContentType: params.contentType,
  });
  const raw = await getSignedUrl(client, command, {
    expiresIn: params.expiresIn,
    signableHeaders: new Set(["content-type", "host"]),
    unhoistableHeaders: new Set([
      "x-amz-checksum-crc32",
      "x-amz-checksum-crc32c",
      "x-amz-checksum-sha1",
      "x-amz-checksum-sha256",
      "x-amz-sdk-checksum-algorithm",
      "authorization",
      "x-amz-user-agent",
      "x-amz-security-token",
      "x-id",
      "x-amz-sdk-invocation-id",
      "x-amz-sdk-request",
      "x-amz-request-payer",
      "content-length",
    ]),
  });
  return scrubPresignedR2Url(raw);
}

export type UploadMediaType = "image" | "video" | "gif";

export type PresignedUploadResult = {
  uploadUrl: string;
  publicUrl: string;
  fileKey: string;
};

export async function getSignedUploadUrl(params: {
  type: UploadMediaType;
  contentType: string;
  fileSize: number;
  fileName: string;
  userId?: string;
}): Promise<PresignedUploadResult> {
  if (!hasR2Config || !R2_BUCKET_NAME || !R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID) {
    throw new Error("Storage not configured");
  }

  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).slice(2, 10);
  const ext = params.fileName.split(".").pop()?.toLowerCase() ?? "";
  const safeName = params.fileName
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 50);
  const prefix = params.userId
    ? `uploads/user_${params.userId}/${params.type}`
    : `uploads/${params.type}`;
  const fileKey = `${prefix}/${timestamp}_${randomSuffix}_${safeName}${ext ? `.${ext}` : ""}`;

  const uploadUrl = await getR2PresignedPutUrl({
    bucket: R2_BUCKET_NAME,
    key: fileKey,
    contentType: params.contentType,
    expiresIn: 15 * 60,
  });

  const publicUrl = R2_PUBLIC_BUCKET_URL
    ? `${R2_PUBLIC_BUCKET_URL}/${fileKey}`
    : uploadUrl.split("?").shift() ?? uploadUrl;

  return {
    uploadUrl,
    publicUrl,
    fileKey,
  };
}

export async function deleteObject(fileKey: string): Promise<void> {
  const s3 = getS3Client();
  if (!s3 || !R2_BUCKET_NAME) return;
  const command = new DeleteObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileKey,
  });
  await s3.send(command);
}

export function isStorageConfigured(): boolean {
  return Boolean(hasR2Config);
}
