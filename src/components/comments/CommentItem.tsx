"use client";

import * as React from "react";
import {
  Heart,
  MessageSquare,
  MoreHorizontal,
  Flag,
  Trash2,
  Ban,
  Send,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn, formatNumber, formatRelativeTime } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/design-system/Button";
import { Textarea } from "@/components/design-system/Textarea";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import { useLoginModal } from "@/components/auth/LoginModal";
import { ReportDialog, ReportTargetType, isTargetReported } from "@/components/shared/ReportDialog";

export interface CommentCreator {
  id: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  role?: string;
  isVerified?: boolean;
}

export interface CommentShape {
  id: string;
  creator: CommentCreator;
  text: string;
  likeCount: number;
  replyCount: number;
  createdAt: Date | string;
  isDeleted: boolean;
  userLiked?: boolean;
  replies?: CommentShape[];
  postId: string;
}

export interface CommentItemProps {
  comment: CommentShape;
  depth?: number;
  maxDepth?: number;
  onNewComment?: (text: string, parentId: string) => void;
  onDelete?: (commentId: string) => void;
}

export const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  depth = 0,
  maxDepth = 2,
  onNewComment,
  onDelete,
}) => {
  const { data: session, status } = useSession();
  const { openLogin } = useLoginModal();
  const { show } = useToast();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [showReplyInput, setShowReplyInput] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [animateLike, setAnimateLike] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportTarget, setReportTarget] =
    React.useState<ReportTargetType>("COMMENT");
  const [blockConfirm, setBlockConfirm] = React.useState(false);
  const [deleteConfirm, setDeleteConfirm] = React.useState(false);
  const [reportTick, setReportTick] = React.useState(0);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const replyInputRef = React.useRef<HTMLTextAreaElement>(null);

  const isAuthenticated = status === "authenticated";
  const currentUserId = session?.user?.id;
  const isOwner = currentUserId === comment.creator.id;

  const commentReported = isTargetReported("COMMENT", comment.id);
  const commentUserReported = isTargetReported("USER", comment.creator.id);

  const [localLiked, setLocalLiked] = React.useState(!!comment.userLiked);
  const [localLikeCount, setLocalLikeCount] = React.useState(comment.likeCount);

  React.useEffect(() => {
    setLocalLiked(!!comment.userLiked);
    setLocalLikeCount(comment.likeCount);
  }, [comment.userLiked, comment.likeCount]);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  React.useEffect(() => {
    if (showReplyInput && replyInputRef.current) {
      replyInputRef.current.focus();
    }
  }, [showReplyInput]);

  const toggleLikeMutation = trpc.comments.toggleLike.useMutation({
    onMutate: () => {
      setAnimateLike(true);
      setTimeout(() => setAnimateLike(false), 400);
    },
    onSuccess: (data) => {
      if (data?.liked) {
        setLocalLiked(true);
        setLocalLikeCount((c) => c + 1);
      } else {
        setLocalLiked(false);
        setLocalLikeCount((c) => Math.max(0, c - 1));
      }
    },
    onError: () => {
      show("Failed to like comment", "danger");
    },
  });

  const deleteMutation = trpc.comments.delete.useMutation({
    onSuccess: () => {
      show("Comment deleted", "success");
      onDelete?.(comment.id);
      void utils.comments.listByPost.invalidate({ postId: comment.postId });
    },
    onError: () => {
      show("Failed to delete comment", "danger");
    },
  });

  const blockMutation = trpc.social.block.useMutation({
    onSuccess: () => {
      show(`Blocked @${comment.creator.username ?? "user"}`, "success");
      router.refresh();
    },
    onError: () => {
      show("Failed to block user", "danger");
    },
  });

  const handleLike = () => {
    if (!isAuthenticated) {
      openLogin({ type: "comment", postId: comment.postId });
      return;
    }
    toggleLikeMutation.mutate({ id: comment.id });
  };

  const handleReplyClick = () => {
    if (!isAuthenticated) {
      openLogin({ type: "comment", postId: comment.postId });
      return;
    }
    setShowReplyInput((v) => !v);
  };

  const handleSubmitReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !isAuthenticated) return;
    onNewComment?.(replyText.trim(), comment.id);
    setReplyText("");
    setShowReplyInput(false);
  };

  const handleClickProfile = () => {
    const username = comment.creator.username;
    if (username) {
      router.push(`/profile/${username}`);
    }
  };

  if (comment.isDeleted) {
    return (
      <div
        className={cn(
          "pl-3 py-3",
          depth > 0 && "ml-6 border-l border-border pl-4"
        )}
      >
        <p className="text-sm text-muted-foreground italic">
          This comment has been deleted.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group",
        depth > 0 && "ml-6 md:ml-8 border-l border-border pl-4"
      )}
    >
      <div className="flex items-start gap-3 py-3">
        <button
          type="button"
          onClick={handleClickProfile}
          className="flex-shrink-0 transition-opacity hover:opacity-80"
        >
          <UserAvatar
            user={comment.creator as any}
            size="sm"
            showVerifiedBadge
          />
        </button>

        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleClickProfile}
              className="text-sm font-semibold text-foreground hover:underline truncate"
            >
              @{(comment.creator.username ?? "user").replace(/^@/, "")}
            </button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatRelativeTime(comment.createdAt)}
            </span>
          </div>

          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
            {comment.text}
          </p>

          <div className="flex items-center gap-0.5 -ml-2">
            <button
              type="button"
              onClick={handleLike}
              className={cn(
                "inline-flex items-center gap-1 h-8 px-2 rounded-lg text-xs transition-all duration-200",
                localLiked
                  ? "text-rose-500 bg-rose-500/10"
                  : "text-muted-foreground hover:text-rose-500 hover:bg-muted",
                animateLike && "animate-[heartbeat_0.5s_ease-in-out]"
              )}
              aria-label={localLiked ? "Unlike comment" : "Like comment"}
            >
              <Heart
                className={cn("h-3.5 w-3.5", localLiked && "fill-current")}
              />
              <span className="font-medium tabular-nums">
                {formatNumber(Math.max(0, localLikeCount))}
              </span>
            </button>

            {depth < maxDepth - 1 && (
              <button
                type="button"
                onClick={handleReplyClick}
                className="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="font-medium">Reply</span>
                {comment.replyCount > 0 && (
                  <span className="tabular-nums text-muted-foreground/70">
                    ({formatNumber(comment.replyCount)})
                  </span>
                )}
              </button>
            )}

            <div ref={menuRef} className="relative ml-auto">
              <button
                type="button"
                onClick={() => setMenuOpen((o) => !o)}
                className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Comment options"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-lg border border-border bg-card shadow-popover animate-scaleIn">
                  <div className="p-1.5 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (commentReported) return;
                        setReportTarget("COMMENT");
                        setReportOpen(true);
                        setMenuOpen(false);
                      }}
                      disabled={commentReported}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                        commentReported
                          ? "opacity-60 cursor-not-allowed text-success bg-success/5"
                          : "text-foreground hover:bg-muted"
                      )}
                    >
                      <Flag className={cn("h-4 w-4", commentReported ? "text-success" : "text-muted-foreground")} />
                      {commentReported ? "Thanks. Report submitted." : "Report comment"}
                    </button>
                    {!isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          if (commentUserReported) return;
                          setReportTarget("USER");
                          setReportOpen(true);
                          setMenuOpen(false);
                        }}
                        disabled={commentUserReported}
                        className={cn(
                          "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                          commentUserReported
                            ? "opacity-60 cursor-not-allowed text-success bg-success/5"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <Flag className={cn("h-4 w-4", commentUserReported ? "text-success" : "text-muted-foreground")} />
                        {commentUserReported ? "Thanks. Report submitted." : "Report user"}
                      </button>
                    )}
                    {!isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setBlockConfirm(true);
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        <Ban className="h-4 w-4 text-muted-foreground" />
                        Block user
                      </button>
                    )}
                    {isOwner && (
                      <div className="border-t border-border my-1" />
                    )}
                    {isOwner && (
                      <button
                        type="button"
                        onClick={() => {
                          setDeleteConfirm(true);
                          setMenuOpen(false);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete comment
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {showReplyInput && (
            <form onSubmit={handleSubmitReply} className="pt-2 space-y-2">
              <Textarea
                ref={replyInputRef as any}
                placeholder={`Reply to @${
                  comment.creator.username ?? "user"
                }...`}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={2}
                className="min-h-[60px]"
              />
              <div className="flex items-center gap-2 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => {
                    setShowReplyInput(false);
                    setReplyText("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  type="submit"
                  disabled={!replyText.trim()}
                  rightIcon={<Send className="h-3.5 w-3.5" />}
                >
                  Reply
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && depth < maxDepth - 1 && (
        <div className="space-y-0">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              depth={depth + 1}
              maxDepth={maxDepth}
              onNewComment={onNewComment}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}

      <ReportDialog
        open={reportOpen}
        onClose={() => {
          setReportOpen(false);
          setReportTick((t) => t + 1);
        }}
        targetType={reportTarget}
        targetId={reportTarget === "USER" ? comment.creator.id : comment.id}
      />

      {blockConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn p-4">
          <div className="bg-card border border-border rounded-2xl shadow-popover max-w-md w-full animate-scaleIn p-6 space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Block @{comment.creator.username ?? "user"}?
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                They won&apos;t be able to interact with your posts or follow
                you. You won&apos;t see their posts or comments.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setBlockConfirm(false)}
                disabled={blockMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() =>
                  blockMutation.mutate({ userId: comment.creator.id })
                }
                loading={blockMutation.isPending}
              >
                Block
              </Button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn p-4">
          <div className="bg-card border border-border rounded-2xl shadow-popover max-w-md w-full animate-scaleIn p-6 space-y-5">
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Delete your comment?
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                This action is permanent and cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setDeleteConfirm(false)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => deleteMutation.mutate({ id: comment.id })}
                loading={deleteMutation.isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
