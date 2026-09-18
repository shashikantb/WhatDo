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
let s3ClientForPresign: S3Client | null = null;

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

function getPresignClient(): S3Client | null {
  if (!hasR2Config) return null;
  if (s3ClientForPresign) return s3ClientForPresign;

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID!}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });

  try {
    const step = client.middlewareStack
      .identify()
      .find((entry: any) => entry.name === "getChecksumAlgorithmPlugin");
    if (step) {
      client.middlewareStack.remove("getChecksumAlgorithmPlugin", step.step);
    }
  } catch {
    // ignore: stack already clean
  }

  try {
    client.middlewareStack.add(
      (next, _context) => async (args: any) => {
        if (args?.input) {
          delete args.input.ChecksumCRC32;
          delete args.input.ChecksumCRC32C;
          delete args.input.ChecksumSHA1;
          delete args.input.ChecksumSHA256;
          delete args.input.ChecksumAlgorithm;
          delete args.input.CRC32;
          delete args.input.CRC32C;
          delete args.input.SHA1;
          delete args.input.SHA256;
        }
        const result = await next(args);
        if (
          result &&
          typeof result === "object" &&
          (result as any).response &&
          (result as any).response?.headers
        ) {
          const headers = (result as any).response.headers as Record<string, any>;
          for (const k of Object.keys(headers)) {
            if (k.toLowerCase().startsWith("x-amz-checksum")) delete headers[k];
          }
        }
        return result;
      },
      {
        name: "StripChecksumFromPutPresignInput",
        step: "initialize",
        priority: "high",
        override: true,
      },
    );
  } catch {
    // ignore
  }

  s3ClientForPresign = client;
  return s3ClientForPresign;
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
  const client = getPresignClient();
  if (!client || !R2_BUCKET_NAME) {
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
  } as any);

  (command as any).input.ChecksumCRC32 = undefined;
  (command as any).input.ChecksumCRC32C = undefined;
  (command as any).input.ChecksumSHA1 = undefined;
  (command as any).input.ChecksumSHA256 = undefined;
  (command as any).input.ChecksumAlgorithm = undefined;

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: 15 * 60,
    signableHeaders: new Set(["content-type", "content-length", "host"]),
    unhoistableHeaders: new Set([
      "x-amz-checksum-crc32",
      "x-amz-checksum-crc32c",
      "x-amz-checksum-sha1",
      "x-amz-checksum-sha256",
      "x-amz-sdk-checksum-algorithm",
    ]),
  } as any);

  const cleanedUrl = uploadUrl.replace(/[&?]x-amz-checksum[^=&]*=[^&]*/g, "").replace(/[&?]x-amz-sdk-checksum-algorithm=[^&]*/g, "");

  const publicUrl = R2_PUBLIC_BUCKET_URL
    ? `${R2_PUBLIC_BUCKET_URL}/${fileKey}`
    : cleanedUrl.split("?")[0];

  return {
    uploadUrl: cleanedUrl,
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
