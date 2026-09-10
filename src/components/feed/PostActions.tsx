"use client";

import * as React from "react";
import {
  Heart,
  MessageCircle,
  Bookmark,
  Share2,
} from "lucide-react";
import { ShareMenu } from "@/components/shared/ShareMenu";
import { cn, formatNumber } from "@/lib/utils";
import { APP_URL } from "@/lib/constants";

export interface PostActionsProps {
  postId: string;
  likeCount: number;
  commentCount: number;
  shareCount?: number;
  isLiked?: boolean;
  isSaved?: boolean;
  onLikeToggle?: () => void;
  onSaveToggle?: () => void;
  onCommentsClick?: () => void;
  onShare?: () => void;
  likeLoading?: boolean;
  saveLoading?: boolean;
  className?: string;
}

export const PostActions: React.FC<PostActionsProps> = ({
  postId,
  likeCount,
  commentCount,
  shareCount,
  isLiked = false,
  isSaved = false,
  onLikeToggle,
  onSaveToggle,
  onCommentsClick,
  onShare,
  likeLoading,
  saveLoading,
  className,
}) => {
  const [localLiked, setLocalLiked] = React.useState(isLiked);
  const [localSaved, setLocalSaved] = React.useState(isSaved);
  const [bounceLike, setBounceLike] = React.useState(false);
  const [bounceSave, setBounceSave] = React.useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    setLocalLiked(isLiked);
  }, [isLiked]);

  React.useEffect(() => {
    setLocalSaved(isSaved);
  }, [isSaved]);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const handleLike = () => {
    if (likeLoading) return;
    setLocalLiked((p) => !p);
    if (!prefersReducedMotion) {
      setBounceLike(true);
      setTimeout(() => setBounceLike(false), 400);
    }
    onLikeToggle?.();
  };

  const handleSave = () => {
    if (saveLoading) return;
    setLocalSaved((p) => !p);
    if (!prefersReducedMotion) {
      setBounceSave(true);
      setTimeout(() => setBounceSave(false), 400);
    }
    onSaveToggle?.();
  };

  const postUrl = `${APP_URL}/post/${postId}`;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-1 pt-3 border-t border-border",
        className
      )}
    >
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          onClick={handleLike}
          disabled={likeLoading}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors",
            likeLoading && "opacity-60 cursor-wait",
            localLiked
              ? "text-danger hover:bg-danger/5"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          aria-label={localLiked ? "Unlike" : "Like"}
          aria-pressed={localLiked}
        >
          <Heart
            className={cn(
              "w-5 h-5 transition-transform",
              !prefersReducedMotion && bounceLike && "animate-[bounce_0.4s_ease-in-out]",
              localLiked && "fill-current"
            )}
          />
          {likeCount > 0 && (
            <span
              className={cn(
                "text-sm font-semibold tabular-nums",
                localLiked ? "text-danger" : ""
              )}
            >
              {formatNumber(likeCount)}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onCommentsClick}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="View comments"
        >
          <MessageCircle className="w-5 h-5" />
          {commentCount > 0 && (
            <span className="text-sm font-semibold tabular-nums">
              {formatNumber(commentCount)}
            </span>
          )}
        </button>
      </div>

      <div className="flex items-center gap-0.5">
        <ShareMenu title="Check out this post!" url={postUrl}>
          <button
            type="button"
            onClick={() => {
              onShare?.();
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Share"
          >
            <Share2 className="w-5 h-5" />
            {shareCount !== undefined && shareCount > 0 && (
              <span className="text-sm font-semibold tabular-nums">
                {formatNumber(shareCount)}
              </span>
            )}
          </button>
        </ShareMenu>

        <button
          type="button"
          onClick={handleSave}
          disabled={saveLoading}
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-lg transition-all",
            saveLoading && "opacity-60 cursor-wait",
            localSaved
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          aria-label={localSaved ? "Unsave" : "Save"}
          aria-pressed={localSaved}
        >
          <Bookmark
            className={cn(
              "w-5 h-5 transition-all",
              !prefersReducedMotion && bounceSave && "animate-[bounce_0.4s_ease-in-out]",
              localSaved && "fill-current"
            )}
          />
        </button>
      </div>
    </div>
  );
};
