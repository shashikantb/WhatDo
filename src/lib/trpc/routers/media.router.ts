import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  protectedProcedure,
  rateLimitUploadMiddleware,
} from "../trpc";
import { getSignedUploadUrl } from "../../storage/s3";

const MediaTypeEnum = z.enum(["image", "video", "gif"]);

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
