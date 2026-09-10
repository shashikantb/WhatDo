import { z } from "zod";
import {
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
  adminProcedure,
} from "../trpc";
import { MODERATION } from "../../constants";
import { trackEvent } from "../../analytics";

const ReportType = z.enum(["POST", "COMMENT", "USER"]);
const ReportReason = z.enum([
  "SPAM",
  "HARASSMENT",
  "HATE",
  "NUDITY",
  "VIOLENCE",
  "SCAM",
  "MISINFORMATION",
  "COPYRIGHT",
  "OTHER",
]);
const ReportStatus = z.enum(["OPEN", "UNDER_REVIEW", "RESOLVED", "DISMISSED"]);

export const reportsRouter = createTRPCRouter({
  createReport: protectedProcedure
    .input(
      z.union([
        z.object({
          type: z.literal("POST"),
          reportedPostId: z.string().cuid(),
          reason: ReportReason,
          details: z.string().max(2000).optional(),
        }),
        z.object({
          type: z.literal("COMMENT"),
          reportedCommentId: z.string().cuid(),
          reason: ReportReason,
          details: z.string().max(2000).optional(),
        }),
        z.object({
          type: z.literal("USER"),
          reportedUserId: z.string().cuid(),
          reason: ReportReason,
          details: z.string().max(2000).optional(),
        }),
      ]),
    )
    .mutation(async ({ ctx, input }) => {
      const base = {
        reporterId: ctx.session.user.id,
        type: input.type,
        reason: input.reason,
        details: input.details,
        status: "OPEN" as const,
      };

      let report;
      if (input.type === "POST") {
        report = await ctx.prisma.report.create({
          data: { ...base, reportedPostId: input.reportedPostId },
        });
        const count = await ctx.prisma.report.count({
          where: { reportedPostId: input.reportedPostId, NOT: { status: "DISMISSED" } },
        });
        if (count >= MODERATION.AUTO_MODERATION_REPORT_THRESHOLD) {
          await ctx.prisma.report.updateMany({
            where: { reportedPostId: input.reportedPostId, status: "OPEN" },
            data: { status: "UNDER_REVIEW" },
          });
        }
      } else if (input.type === "COMMENT") {
        report = await ctx.prisma.report.create({
          data: { ...base, reportedCommentId: input.reportedCommentId },
        });
        const count = await ctx.prisma.report.count({
          where: { reportedCommentId: input.reportedCommentId, NOT: { status: "DISMISSED" } },
        });
        if (count >= MODERATION.AUTO_MODERATION_REPORT_THRESHOLD) {
          await ctx.prisma.report.updateMany({
            where: { reportedCommentId: input.reportedCommentId, status: "OPEN" },
            data: { status: "UNDER_REVIEW" },
          });
        }
      } else {
        report = await ctx.prisma.report.create({
          data: { ...base, reportedUserId: input.reportedUserId },
        });
        const count = await ctx.prisma.report.count({
          where: { reportedUserId: input.reportedUserId, NOT: { status: "DISMISSED" } },
        });
        if (count >= MODERATION.AUTO_MODERATION_REPORT_THRESHOLD) {
          await ctx.prisma.report.updateMany({
            where: { reportedUserId: input.reportedUserId, status: "OPEN" },
            data: { status: "UNDER_REVIEW" },
          });
        }
      }

      try {
        await trackEvent(
          "report_created",
          {
            reporterId: ctx.session.user.id,
            type: input.type,
            reason: input.reason,
            reportedPostId: (input as any).reportedPostId ?? null,
            reportedCommentId: (input as any).reportedCommentId ?? null,
            reportedUserId: (input as any).reportedUserId ?? null,
          },
          { skipThrottle: true },
        );
      } catch {
      }

      return report;
    }),

  list: adminProcedure
    .input(
      z.object({
        status: ReportStatus.optional(),
        type: ReportType.optional(),
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      if (input.status) where.status = input.status;
      if (input.type) where.type = input.type;

      const items = await ctx.prisma.report.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: {
          reporter: { select: { id: true, username: true, avatarUrl: true } },
          reportedPost: { select: { id: true, question: true, slug: true } },
          reportedComment: { select: { id: true, text: true } },
          reportedUser: { select: { id: true, username: true, avatarUrl: true } },
          assignedModerator: { select: { id: true, username: true } },
        },
      });

      let nextCursor: string | undefined = undefined;
      let hasMore = false;
      if (items.length > input.limit) {
        hasMore = true;
        items.pop();
        nextCursor = items[items.length - 1]?.id;
      }
      return { items, nextCursor, hasMore };
    }),

  resolve: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        action: z.enum(["RESOLVE", "DISMISS", "ASSIGN"]),
        note: z.string().max(2000).optional(),
        assignedModeratorId: z.string().cuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const data: Record<string, unknown> = {};
      if (input.action === "RESOLVE") {
        data.status = "RESOLVED";
        data.resolvedAt = new Date();
        data.resolution = input.note;
      } else if (input.action === "DISMISS") {
        data.status = "DISMISSED";
        data.resolvedAt = new Date();
        data.resolution = input.note;
      } else if (input.action === "ASSIGN") {
        data.status = "UNDER_REVIEW";
        if (input.assignedModeratorId) {
          data.assignedModeratorId = input.assignedModeratorId;
        }
      }
      if (input.note) data.moderatorNote = input.note;

      return ctx.prisma.report.update({
        where: { id: input.id },
        data,
      });
    }),
});
