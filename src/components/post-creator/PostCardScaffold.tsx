"use client";

import * as React from "react";
import {
  MessageSquare,
  Share2,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Clock,
  MoreHorizontal,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Card } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Avatar } from "@/components/design-system/Avatar";
import type { PostMediaType } from "./MediaUploader";
import type { PostOptionInput } from "./OptionsEditor";
import type { OpinionTypeValue } from "./OpinionTypePicker";
import { VoteButtons, OptionShape, UserVoteShape, PostType } from "@/components/voting/VoteButtons";

export interface ScaffoldMediaItem {
  type: PostMediaType;
  url: string;
  thumbnailUrl?: string;
  posterUrl?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface ScaffoldOption extends PostOptionInput {
  id?: string;
  voteCount?: number;
  imageUrl?: string;
}

export interface PostCardScaffoldProps {
  author?: {
    name: string;
    username?: string;
    avatarUrl?: string | null;
    isAnonymous?: boolean;
  };
  category?: {
    id?: string;
    name: string;
    color?: string;
  } | null;
  question: string;
  postType: OpinionTypeValue;
  options: ScaffoldOption[];
  media?: ScaffoldMediaItem[];
  tags?: string[];
  createdAt?: Date;
  expiresAt?: Date;
  allowComments?: boolean;
  voteCount?: number;
  commentCount?: number;
  saveCount?: number;
  shareCount?: number;
  isSaved?: boolean;
  userVote?: UserVoteShape | null;
  onVote?: (vote: UserVoteShape) => void;
  onSave?: () => void;
  onShare?: () => void;
  showExamplePercentages?: boolean;
  className?: string;
}

export const PostCardScaffold: React.FC<PostCardScaffoldProps> = ({
  author,
  category,
  question,
  postType,
  options,
  media = [],
  tags = [],
  createdAt,
  expiresAt,
  allowComments = true,
  voteCount = 0,
  commentCount = 0,
  saveCount = 0,
  shareCount = 0,
  isSaved = false,
  userVote = null,
  onVote,
  onSave,
  onShare,
  showExamplePercentages = false,
  className,
}) => {
  const [activeMediaIdx, setActiveMediaIdx] = React.useState(0);
  const displayAuthorName = author?.isAnonymous
    ? "Anonymous"
    : author?.name ?? "@user";
  const now = new Date();
  const displayCreated = createdAt ?? now;

  const optionsWithIds: OptionShape[] = React.useMemo(() => {
    return options.map((o, idx) => {
      let voteDemo = 0;
      if (showExamplePercentages) {
        const total = options.length;
        const base = Math.round(100 / total);
        const remainder = 100 - base * total;
        voteDemo = base + (idx === 0 ? remainder : 0);
      }
      return {
        id: o.id ?? `opt-${idx}`,
        label: o.label,
        value: o.value,
        imageUrl: o.imageUrl ?? null,
        voteCount: o.voteCount ?? voteDemo,
      };
    });
  }, [options, showExamplePercentages]);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="p-4 md:p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Avatar
            avatarUrl={author?.isAnonymous ? undefined : author?.avatarUrl}
            displayName={author?.isAnonymous ? "Anonymous" : author?.name}
            username={author?.isAnonymous ? "anon" : author?.username}
            size="md"
          />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">
                @{displayAuthorName.replace(/^@/, "")}
              </span>
              {author?.isAnonymous && (
                <Badge variant="default" size="sm">
                  Incognito
                </Badge>
              )}
              {category && (
                <Badge
                  variant="category"
                  size="sm"
                  style={
                    category.color
                      ? {
                          backgroundColor: `${category.color}15`,
                          borderColor: `${category.color}30`,
                          color: category.color,
                        }
                      : undefined
                  }
                >
                  {category.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatRelativeTime(displayCreated)}</span>
              {expiresAt && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires {formatRelativeTime(expiresAt)}
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            type="button"
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        <div>
          <h2 className="text-base md:text-lg font-semibold leading-snug text-foreground">
            {question || <span className="text-muted-foreground/60 italic">Your question will appear here...</span>}
          </h2>
        </div>

        {media.length > 0 && (
          <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
            <div className="relative aspect-video md:aspect-[16/10]">
              {(media[activeMediaIdx]?.type === "IMAGE" ||
                media[activeMediaIdx]?.type === "GIF") &&
              media[activeMediaIdx]?.url ? (
                <img
                  src={
                    media[activeMediaIdx]?.thumbnailUrl ??
                    media[activeMediaIdx]?.url
                  }
                  alt={`Media ${activeMediaIdx + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : media[activeMediaIdx]?.type === "VIDEO" ? (
                media[activeMediaIdx]?.posterUrl ? (
                  <img
                    src={media[activeMediaIdx].posterUrl}
                    alt={`Video ${activeMediaIdx + 1}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-1">
                      <div className="h-12 w-12 mx-auto rounded-full bg-muted-foreground/10 flex items-center justify-center">
                        <svg viewBox="0 0 24 24" fill="currentColor" className="h-6 w-6">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                      <p className="text-xs">Video preview</p>
                    </div>
                  </div>
                )
              ) : null}

              {media.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMediaIdx((i) =>
                        i === 0 ? media.length - 1 : i - 1
                      )
                    }
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                    aria-label="Previous media"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMediaIdx((i) =>
                        i === media.length - 1 ? 0 : i + 1
                      )
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                    aria-label="Next media"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            {media.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 p-2 bg-card/80 backdrop-blur-sm">
                {media.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveMediaIdx(idx)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      idx === activeMediaIdx
                        ? "w-6 bg-primary"
                        : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                    aria-label={`Go to media ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div>
          <VoteButtons
            postType={postType as PostType}
            options={optionsWithIds}
            userVote={userVote}
            onVote={(v) => onVote?.(v)}
            disabled={!onVote}
            isClosed={expiresAt ? expiresAt < now : false}
            expiresAt={expiresAt}
          />
        </div>

        {showExamplePercentages && options.length >= 2 && (
          <div className="space-y-1.5 px-0.5">
            {optionsWithIds.map((o, idx) => {
              const pct = o.voteCount ?? 0;
              return (
                <div
                  key={o.id}
                  className="relative overflow-hidden h-2 rounded-full bg-muted"
                >
                  <div
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full transition-all duration-500",
                      idx % 2 === 0 ? "bg-primary" : "bg-primary/50"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              );
            })}
            <div className="flex items-center justify-between pt-1">
              <p className="text-[11px] text-muted-foreground">
                Example: {optionsWithIds[0]?.voteCount}% /{" "}
                {optionsWithIds[1]?.voteCount ?? 100 - (optionsWithIds[0]?.voteCount ?? 0)}%
              </p>
            </div>
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <Badge key={tag} variant="default" size="sm">
                #{tag.toLowerCase()}
              </Badge>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-0.5">
            <div className="flex items-center gap-1 h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="h-4 w-4"
              >
                <path d="M7 10v12" />
                <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
              </svg>
              <span className="text-xs font-medium">
                {voteCount.toLocaleString("en-IN")}
              </span>
            </div>
            <div
              className={cn(
                "flex items-center gap-1 h-9 px-3 rounded-lg transition-colors cursor-pointer",
                allowComments
                  ? "text-muted-foreground hover:text-foreground hover:bg-muted"
                  : "opacity-30 pointer-events-none text-muted-foreground"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs font-medium">
                {commentCount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={onSave}
              className={cn(
                "flex items-center justify-center h-9 w-9 rounded-lg transition-colors",
                isSaved
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              aria-label={isSaved ? "Unsave post" : "Save post"}
            >
              <Bookmark
                className={cn("h-4 w-4", isSaved && "fill-current")}
              />
            </button>
            <button
              type="button"
              onClick={onShare}
              className="flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Share post"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};
