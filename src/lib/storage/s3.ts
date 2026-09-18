import {
  S3Client,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { SignatureV4 } from "@smithy/signature-v4";
import { HttpRequest } from "@smithy/protocol-http";
import { Sha256 } from "@aws-crypto/sha256-js";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET;
const R2_PUBLIC_BUCKET_URL = process.env.R2_PUBLIC_URL;

const hasR2Config =
  R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME;

let s3Client: S3Client | null = null;
let r2Signer: SignatureV4 | null = null;

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

function getR2Signer(): SignatureV4 | null {
  if (!hasR2Config) return null;
  if (!r2Signer) {
    r2Signer = new SignatureV4({
      region: "auto",
      service: "s3",
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
      sha256: Sha256,
    });
  }
  return r2Signer;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function amzDate(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}

function datestamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

async function getR2PresignedPutUrl(params: {
  bucket: string;
  key: string;
  contentType: string;
  contentLength: number;
  expiresIn: number;
  accountId: string;
  accessKeyId: string;
}): Promise<string> {
  const signer = getR2Signer();
  if (!signer) throw new Error("Storage not configured");

  const now = new Date();
  const endpointHost = `${params.accountId}.r2.cloudflarestorage.com`;
  const escapedKey = params.key
    .split("/")
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  const expiresIn = params.expiresIn;

  const request = new HttpRequest({
    method: "PUT",
    protocol: "https:",
    hostname: endpointHost,
    path: `/${params.bucket}/${escapedKey}`,
    headers: {
      host: endpointHost,
      "content-type": params.contentType,
      "content-length": `${params.contentLength}`,
    },
    query: {
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
      "X-Amz-Content-Sha256": "UNSIGNED-PAYLOAD",
      "X-Amz-Credential": `${params.accessKeyId}/${datestamp(now)}/auto/s3/aws4_request`,
      "X-Amz-Date": amzDate(now),
      "X-Amz-Expires": `${expiresIn}`,
      "X-Amz-SignedHeaders": "content-length;content-type;host",
    },
  });

  const presigned = await signer.presign(request, {
    expiresIn,
    signingDate: now,
    signableHeaders: new Set(["content-length", "content-type", "host"]),
    unsignableHeaders: new Set([
      "x-amz-checksum-crc32",
      "x-amz-checksum-crc32c",
      "x-amz-checksum-sha1",
      "x-amz-checksum-sha256",
      "x-amz-sdk-checksum-algorithm",
      "authorization",
      "x-amz-user-agent",
      "x-amz-content-sha256",
      "x-amz-security-token",
      "x-id",
      "x-amz-sdk-invocation-id",
      "x-amz-sdk-request",
      "x-amz-request-payer",
    ]),
  });

  const search = new URLSearchParams(presigned.query as Record<string, string>);
  return `${presigned.protocol}//${presigned.hostname}${presigned.path}?${search.toString()}`;
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
    contentLength: params.fileSize,
    expiresIn: 15 * 60,
    accountId: R2_ACCOUNT_ID,
    accessKeyId: R2_ACCESS_KEY_ID,
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
  return Boolean(hasR2Config);
}
