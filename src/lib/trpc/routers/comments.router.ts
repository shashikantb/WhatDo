import { z } from "zod";
import {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  rateLimitCommentMiddleware,
} from "../trpc";
import { USER_SELECT_PUBLIC } from "../../constants";
import { containsProfanity } from "../../utils/profanity-filter";
import { getAIProvider } from "../../ai";
import { getSystemSetting, GLOBAL_CONFIG_KEYS } from "../../config";
import { trackEvent } from "../../analytics";

const CommentSort = z.enum(["Top", "New", "Controversial"]);

function commentInclude(depth: number = 2) {
  if (depth <= 1) {
    return {
      creator: { select: USER_SELECT_PUBLIC },
      _count: { select: { likes: true } },
    };
  }
  return {
    creator: { select: USER_SELECT_PUBLIC },
    _count: { select: { likes: true } },
    replies: {
      where: { isDeleted: false, isHidden: false },
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        creator: { select: USER_SELECT_PUBLIC },
        _count: { select: { likes: true } },
      },
    },
  };
}

export const commentsRouter = createTRPCRouter({
  listByPost: publicProcedure
    .input(
      z.object({
        postId: z.string().cuid(),
        sort: CommentSort.default("Top"),
        cursor: z.string().cuid().optional(),
        limit: z.number().int().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const baseWhere = {
        postId: input.postId,
        parentId: null,
        isDeleted: false,
        isHidden: false,
      };

      const orderBy: Record<string, unknown>[] = [];
      if (input.sort === "New") {
        orderBy.push({ createdAt: "desc" });
      } else if (input.sort === "Top") {
        orderBy.push({ likeCount: "desc" }, { createdAt: "desc" });
      } else {
        orderBy.push({ createdAt: "desc" });
      }

      const items = await ctx.prisma.comment.findMany({
        where: baseWhere,
        orderBy,
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        skip: input.cursor ? 1 : 0,
        include: commentInclude(2) as any,
      });

      const itemsWithLikeCount = (items as any[]).map((c: any) => ({
        ...c,
        likeCount: c._count?.likes ?? 0,
        replies: (c.replies ?? [])?.map((r: any) => ({
          ...r,
          likeCount: r._count?.likes ?? 0,
        })),
      }));

      let nextCursor: string | undefined = undefined;
      let hasMore = false;
      if (itemsWithLikeCount.length > input.limit) {
        hasMore = true;
        itemsWithLikeCount.pop();
        nextCursor = itemsWithLikeCount[itemsWithLikeCount.length - 1]?.id;
      }
      return { items: itemsWithLikeCount, nextCursor, hasMore };
    }),

  create: protectedProcedure
    .use(rateLimitCommentMiddleware)
    .input(
      z.object({
        postId: z.string().cuid(),
        parentId: z.string().cuid().optional(),
        text: z.string().min(1).max(2000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session!;
      const post = await ctx.prisma.post.findUnique({
        where: { id: input.postId },
        select: { allowComments: true, creatorId: true, status: true },
      });
      if (!post) {
        throw new Error("Post not found");
      }
      if (!post.allowComments) {
        throw new Error("Comments are disabled for this post");
      }

      const hasProfane = containsProfanity(input.text);
      let isApproved = !hasProfane;
      let commentReason: "SPAM" | "HATE" | "NUDITY" | "VIOLENCE" | "SCAM" | "MISINFORMATION" | "COPYRIGHT" | "OTHER" | null = null;
      let commentDetails: string | undefined = undefined;

      try {
        const aiEnabled = await getSystemSetting<boolean>(
          GLOBAL_CONFIG_KEYS.AI_MODERATION_ENABLED,
          true,
        );
        if (aiEnabled) {
          const aiProvider = getAIProvider();
          const result = await aiProvider.moderateText(input.text);
          const badFlags = result.flags.filter((f) =>
            ["NSFW", "HATE", "VIOLENCE", "PII", "MISINFORMATION", "COPYRIGHT", "SPAM", "MALICIOUS_URL", "HARASSMENT"].includes(f),
          );

          if (badFlags.length > 0 || result.score >= 0.6 || hasProfane) {
            isApproved = false;
            const firstFlag = badFlags[0] ?? "OTHER";
            if (firstFlag === "HATE") commentReason = "HATE";
            else if (firstFlag === "SPAM" || firstFlag === "MALICIOUS_URL") commentReason = "SPAM";
            else if (firstFlag === "NSFW") commentReason = "NUDITY";
            else if (firstFlag === "VIOLENCE") commentReason = "VIOLENCE";
            else if (firstFlag === "MISINFORMATION") commentReason = "MISINFORMATION";
            else if (firstFlag === "COPYRIGHT") commentReason = "COPYRIGHT";
            else commentReason = "OTHER";
            commentDetails = `AI flags: ${badFlags.join(", ") || hasProfane ? "PROFANITY" : "OTHER"} (score ${result.score ?? 0})`;
          }
        }
      } catch {
      }

      const comment = await ctx.prisma.comment.create({
        data: {
          postId: input.postId,
          creatorId: session.user.id,
          parentId: input.parentId ?? null,
          text: input.text,
          isApproved,
        },
        include: commentInclude(1) as any,
      });

      if (!isApproved && commentReason) {
        try {
          await ctx.prisma.report.create({
            data: {
              reporterId: session.user.id,
              type: "COMMENT",
              reportedCommentId: comment.id,
              reason: commentReason,
              details: commentDetails,
              status: "OPEN",
            },
          });
        } catch {
        }
      }

      await ctx.prisma.post.update({
        where: { id: input.postId },
        data: { commentCount: { increment: 1 } },
      });

      if (input.parentId) {
        await ctx.prisma.comment.update({
          where: { id: input.parentId },
          data: { replyCount: { increment: 1 } },
        });
        const parent = await ctx.prisma.comment.findUnique({
          where: { id: input.parentId },
          select: { creatorId: true },
        });
        if (parent && parent.creatorId !== session.user.id) {
          await ctx.prisma.notification.create({
            data: {
              recipientId: parent.creatorId,
              actorId: session.user.id,
              postId: input.postId,
              commentId: comment.id,
              type: "REPLY",
            },
          });
        }
      } else if (post.creatorId !== session.user.id) {
        await ctx.prisma.notification.create({
          data: {
            recipientId: post.creatorId,
            actorId: session.user.id,
            postId: input.postId,
            commentId: comment.id,
            type: "COMMENT",
          },
        });
      }

      try {
        await trackEvent(
          "comment_created",
          {
            userId: session.user.id,
            postId: input.postId,
            parentId: input.parentId ?? null,
            isReply: !!input.parentId,
            length: (input.text ?? "").length,
            flagged: !isApproved,
          },
          { skipThrottle: true },
        );
      } catch {
      }

      return {
        ...comment,
        likeCount: 0,
      };
    }),

  toggleLike: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const existing = await ctx.prisma.commentLike.findUnique({
        where: { userId_commentId: { userId, commentId: input.id } },
      });

      if (existing) {
        await ctx.prisma.commentLike.delete({
          where: { userId_commentId: { userId, commentId: input.id } },
        });
        await ctx.prisma.comment.update({
          where: { id: input.id },
          data: { likeCount: { decrement: 1 } },
        });
        return { liked: false };
      }

      await ctx.prisma.commentLike.create({
        data: { userId, commentId: input.id },
      });
      const comment = await ctx.prisma.comment.update({
        where: { id: input.id },
        data: { likeCount: { increment: 1 } },
        select: { creatorId: true },
      });

      if (comment.creatorId !== userId) {
        await ctx.prisma.notification.create({
          data: {
            recipientId: comment.creatorId,
            actorId: userId,
            commentId: input.id,
            type: "LIKE",
          },
        });
      }

      return { liked: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      const comment = await ctx.prisma.comment.findUnique({
        where: { id: input.id },
        select: { creatorId: true, postId: true },
      });
      if (!comment) throw new Error("Comment not found");

      const isOwner = comment.creatorId === userId;
      const isAdmin = userRole === "ADMIN";
      if (!isOwner && !isAdmin) {
        throw new Error("Not authorized to delete this comment");
      }

      await ctx.prisma.comment.update({
        where: { id: input.id },
        data: { isDeleted: true, text: "[deleted]" },
      });

      await ctx.prisma.post.update({
        where: { id: comment.postId },
        data: { commentCount: { decrement: 1 } },
      });

      return { success: true };
    }),
});
