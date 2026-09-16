import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
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
  const s3 = getS3Client();
  if (!s3 || !R2_BUCKET_NAME) {
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

  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: fileKey,
    ContentType: params.contentType,
    ContentLength: params.fileSize,
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: 15 * 60,
  });

  const publicUrl = R2_PUBLIC_BUCKET_URL
    ? `${R2_PUBLIC_BUCKET_URL}/${fileKey}`
    : uploadUrl.split("?")[0];

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
  return hasR2Config ?? false;
}
