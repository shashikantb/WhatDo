"use client";

import * as React from "react";
import {
  MoreHorizontal,
  Bookmark,
  Share2,
  Flag,
  UserX,
  Copy,
  Check,
  BadgeCheck,
} from "lucide-react";
import { Avatar } from "@/components/design-system/Avatar";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { ReportDialog } from "@/components/shared/ReportDialog";
import { ShareMenu } from "@/components/shared/ShareMenu";
import { useToast } from "@/components/design-system/Toaster";
import { cn, formatRelativeTime } from "@/lib/utils";
import { APP_URL } from "@/lib/constants";

export interface PostHeaderCreator {
  id: string;
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
}

export interface PostHeaderCategory {
  id: string;
  name: string;
  icon?: string | null;
}

export interface PostHeaderProps {
  creator: PostHeaderCreator;
  isAnonymous?: boolean;
  category?: PostHeaderCategory | null;
  createdAt?: Date | string;
  postId: string;
  onSaveToggle?: () => void;
  isSaved?: boolean;
  isFollowing?: boolean;
  onFollowToggle?: () => void;
  canFollow?: boolean;
  className?: string;
}

type MenuState =
  | { type: "closed" }
  | { type: "open" }
  | { type: "report_open" };

export const PostHeader: React.FC<PostHeaderProps> = ({
  creator,
  isAnonymous = false,
  category,
  createdAt,
  postId,
  onSaveToggle,
  isSaved = false,
  isFollowing = false,
  onFollowToggle,
  canFollow = false,
  className,
}) => {
  const [menu, setMenu] = React.useState<MenuState>({ type: "closed" });
  const [copied, setCopied] = React.useState(false);
  const [followingState, setFollowingState] = React.useState(isFollowing);
  const [followLoading, setFollowLoading] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const { show } = useToast();

  React.useEffect(() => {
    setFollowingState(isFollowing);
  }, [isFollowing]);

  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        menu.type === "open" &&
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setMenu({ type: "closed" });
      }
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu({ type: "closed" });
    };
    if (menu.type === "open") {
      document.addEventListener("mousedown", handler);
      document.addEventListener("keydown", esc);
    }
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const displayName = isAnonymous ? "Anonymous" : creator.displayName || creator.username || "User";
  const handlePart = isAnonymous
    ? null
    : creator.username
    ? `@${creator.username}`
    : null;

  const copyLink = async () => {
    try {
      const url = `${APP_URL}/post/${postId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      show("Post link copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      show("Failed to copy link", "danger");
    }
    setMenu({ type: "closed" });
  };

  const handleSave = () => {
    onSaveToggle?.();
    show(isSaved ? "Removed from saved" : "Saved to bookmarks", "info");
    setMenu({ type: "closed" });
  };

  const handleBlock = () => {
    show("User blocked", "info");
    setMenu({ type: "closed" });
  };

  const handleFollow = async () => {
    if (!canFollow) return;
    setFollowLoading(true);
    setFollowingState((prev) => !prev);
    setTimeout(() => {
      onFollowToggle?.();
      setFollowLoading(false);
      show(followingState ? "Unfollowed user" : "Following user", "success");
    }, 400);
  };

  const postUrl = `${APP_URL}/post/${postId}`;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <Avatar
        avatarUrl={isAnonymous ? null : creator.avatarUrl}
        displayName={isAnonymous ? "Anonymous" : displayName}
        username={isAnonymous ? "anon" : creator.username ?? undefined}
        size="md"
        fallbackClassName={isAnonymous ? "bg-muted text-muted-foreground" : undefined}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <div className="min-w-0 flex items-center gap-1.5">
            <span className="font-semibold text-sm truncate">{displayName}</span>
            {!isAnonymous && creator.isVerified && (
              <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0" />
            )}
          </div>
          {handlePart && (
            <>
              <span className="text-muted-foreground text-xs">•</span>
              <span className="text-xs text-muted-foreground truncate">
                {handlePart}
              </span>
            </>
          )}
          {category && (
            <>
              <span className="text-muted-foreground text-xs hidden sm:inline">•</span>
              <Badge variant="category" size="sm" className="hidden sm:inline-flex">
                {category.name}
              </Badge>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          {createdAt && (
            <span className="text-xs text-muted-foreground">
              {formatRelativeTime(createdAt)}
            </span>
          )}
          {category && (
            <Badge variant="category" size="sm" className="sm:hidden">
              {category.name}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {canFollow && !isAnonymous && (
          <Button
            size="sm"
            variant={followingState ? "outline" : "primary"}
            onClick={handleFollow}
            loading={followLoading}
            className={cn("h-8 px-3 text-xs", followingState && "bg-transparent")}
          >
            {followingState ? "Following" : "Follow"}
          </Button>
        )}

        <ShareMenu title="Check this out!" url={postUrl}>
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Share"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </ShareMenu>

        <button
          type="button"
          onClick={onSaveToggle}
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
            isSaved
              ? "text-primary bg-primary/10"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          aria-label={isSaved ? "Unsave" : "Save"}
        >
          <Bookmark
            className={cn(
              "w-4 h-4 transition-all",
              isSaved ? "fill-current animate-[bounce_0.4s_ease-in-out]" : ""
            )}
          />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() =>
              setMenu((m) => (m.type === "open" ? { type: "closed" } : { type: "open" }))
            }
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="More options"
            aria-expanded={menu.type === "open"}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menu.type === "open" && (
            <div
              role="menu"
              className="absolute right-0 top-full mt-1.5 z-50 min-w-[180px] rounded-xl border border-border bg-card shadow-popover py-1 animate-[scale-in_0.15s_ease-out]"
            >
              <button
                role="menuitem"
                onClick={handleSave}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                <Bookmark className={cn("w-4 h-4", isSaved && "fill-primary text-primary")} />
                {isSaved ? "Unsave post" : "Save post"}
              </button>
              <button
                role="menuitem"
                onClick={copyLink}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-foreground hover:bg-muted transition-colors"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copied ? "Copied!" : "Copy post link"}
              </button>
              <div className="h-px bg-border my-1" />
              {!isAnonymous && (
                <button
                  role="menuitem"
                  onClick={handleBlock}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <UserX className="w-4 h-4" />
                  Block user
                </button>
              )}
              <button
                role="menuitem"
                onClick={() => setMenu({ type: "report_open" })}
                className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-danger hover:bg-danger/5 transition-colors"
              >
                <Flag className="w-4 h-4" />
                Report post
              </button>
            </div>
          )}
        </div>
      </div>

      <ReportDialog
        open={menu.type === "report_open"}
        onClose={() => setMenu({ type: "closed" })}
        targetType="POST"
        targetId={postId}
      />
    </div>
  );
};
