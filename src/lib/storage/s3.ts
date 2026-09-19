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
const R2_PUBLIC_BUCKET_URL_RAW = process.env.R2_PUBLIC_URL;
const R2_PUBLIC_BUCKET_URL = R2_PUBLIC_BUCKET_URL_RAW
  ? R2_PUBLIC_BUCKET_URL_RAW.replace(/\/+$/, "")
  : undefined;

const hasR2Config =
  R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-matroska": "mkv",
  "video/webm": "webm",
  "video/3gpp": "3gp",
};

function getExtension(fileName: string, contentType: string): string {
  const nameDot = fileName.lastIndexOf(".");
  const fromName =
    nameDot >= 0 ? fileName.slice(nameDot + 1).toLowerCase() : "";
  const ct = contentType.toLowerCase().split(";")[0]?.trim() ?? contentType;
  const fromMime = MIME_TO_EXT[ct] ?? "";
  if (fromMime && fromMime.length <= 5) return fromMime;
  if (fromName && fromName.length <= 5) return fromName;
  return fromMime || fromName;
}

function sanitizeBasename(fileName: string): string {
  const nameDot = fileName.lastIndexOf(".");
  const rawBase = nameDot >= 0 ? fileName.slice(0, nameDot) : fileName;
  return rawBase.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 50);
}

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
    });
  }
  return presignS3Client;
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
  return getSignedUrl(client, command, {
    expiresIn: params.expiresIn,
  });
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
  const ext = getExtension(params.fileName, params.contentType);
  const safeName = sanitizeBasename(params.fileName);
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
    : "";

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
