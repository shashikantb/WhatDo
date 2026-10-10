import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  rateLimitUploadMiddleware,
} from "../trpc";
import { getSignedUploadUrl, putObjectFromBase64, isStorageConfigured } from "../../storage/s3";

const MediaTypeEnum = z.enum(["image", "video", "gif"]);
const MAX_BASE64_BYTES = 1024 * 1024; // 1 MB safety cap

function base64ByteLength(b64: string): number {
  const b = b64.endsWith("==") ? (b64.length * 3) / 4 - 2 : b64.endsWith("=") ? (b64.length * 3) / 4 - 1 : (b64.length * 3) / 4;
  return Math.max(0, Math.round(b));
}

export const mediaRouter = createTRPCRouter({
  requestPresignedUpload: protectedProcedure
    .use(rateLimitUploadMiddleware)
    .input(
      z.object({
        type: MediaTypeEnum,
        contentType: z.string(),
        fileSize: z.number().int().positive(),
        fileName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      const result = await getSignedUploadUrl({
        type: input.type,
        contentType: input.contentType,
        fileSize: input.fileSize,
        fileName: input.fileName,
        userId: ctx.session.user.id,
      });
      return result;
    }),

  uploadFromBase64: protectedProcedure
    .use(rateLimitUploadMiddleware)
    .input(
      z.object({
        type: MediaTypeEnum,
        contentType: z.string().min(4).max(120),
        base64Body: z.string().min(100).max(Math.ceil((MAX_BASE64_BYTES * 4) / 3) + 4),
        fileName: z.string().min(1).max(240),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session?.user?.id) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      if (!isStorageConfigured()) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Storage not configured" });
      }
      const mime = (input.contentType.split(";")[0] ?? "").trim().toLowerCase();
      if (!mime.startsWith("image/") && input.type === "image") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Expected image/* content type" });
      }
      const estimated = base64ByteLength(input.base64Body);
      if (estimated > MAX_BASE64_BYTES) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: `Base64 body is ~${Math.round(estimated / 1024)}KB, limit is ${MAX_BASE64_BYTES / 1024}KB`,
        });
      }
      const result = await putObjectFromBase64({
        type: input.type,
        contentType: mime,
        base64Body: input.base64Body,
        fileName: input.fileName,
        userId: ctx.session.user.id,
      });
      return result;
    }),

  confirmUpload: protectedProcedure
    .input(z.object({ fileKey: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return {
        success: true,
        fileKey: input.fileKey,
        processedAt: new Date(),
      };
    }),
});
