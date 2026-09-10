"use client";

import * as React from "react";
import {
  MessageSquare,
  Share2,
  Bookmark,
  ThumbsUp,
  ChevronLeft,
  ChevronRight,
  User,
  Eye,
  Clock,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Card } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Avatar } from "@/components/design-system/Avatar";
import type { MediaFile } from "./MediaUploader";
import type { PostOptionInput } from "./OptionsEditor";
import type { OpinionTypeValue } from "./OpinionTypePicker";

export interface PreviewDraftPost {
  question: string;
  type: OpinionTypeValue;
  categoryName?: string;
  categoryColor?: string;
  isAnonymous: boolean;
  allowComments: boolean;
  tags: string[];
  options: PostOptionInput[];
  media: MediaFile[];
  expiresAt?: Date;
  authorName?: string;
  authorAvatar?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  Technology: "Cpu",
  Entertainment: "Film",
  Sports: "Trophy",
  News: "Newspaper",
  Gaming: "Gamepad2",
  Food: "UtensilsCrossed",
  Travel: "Plane",
  Fitness: "Dumbbell",
  Education: "GraduationCap",
  Finance: "DollarSign",
  Art: "Palette",
  Science: "FlaskConical",
};

export interface PostPreviewCardProps {
  post: PreviewDraftPost;
  className?: string;
}

export const PostPreviewCard: React.FC<PostPreviewCardProps> = ({
  post,
  className,
}) => {
  const [activeMediaIdx, setActiveMediaIdx] = React.useState(0);

  const hasMedia = post.media.length > 0;
  const now = new Date();

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="p-4 md:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {post.isAnonymous ? (
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white">
              <Eye className="h-5 w-5" strokeWidth={1.5} />
            </div>
          ) : (
            <Avatar
              src={post.authorAvatar}
              alt={post.authorName || "User"}
              fallback={
                <div className="h-full w-full rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <User className="h-5 w-5" />
                </div>
              }
              size="md"
            />
          )}

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {post.isAnonymous ? (
                <span className="text-sm font-semibold text-foreground">
                  Anonymous
                </span>
              ) : (
                <span className="text-sm font-semibold text-foreground truncate">
                  {post.authorName || "You"}
                </span>
              )}
              {post.isAnonymous && (
                <Badge variant="default" size="sm">
                  Incognito
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatRelativeTime(now)}</span>
              {post.expiresAt && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expires {formatRelativeTime(post.expiresAt)}
                  </span>
                </>
              )}
            </div>
          </div>

          {post.categoryName && (
            <Badge
              variant="category"
              className="flex-shrink-0 gap-1"
              style={
                post.categoryColor
                  ? { backgroundColor: `${post.categoryColor}15`, borderColor: `${post.categoryColor}30`, color: post.categoryColor }
                  : undefined
              }
            >
              {post.categoryName}
            </Badge>
          )}
        </div>

        {/* Question */}
        <div>
          <h2 className="text-base md:text-lg font-semibold leading-snug text-foreground">
            {post.question || "Your question will appear here..."}
          </h2>
        </div>

        {/* Media Carousel */}
        {hasMedia && (
          <div className="relative rounded-xl overflow-hidden border border-border bg-muted">
            <div className="relative aspect-video md:aspect-[16/10]">
              {post.media[activeMediaIdx]?.previewUrl ? (
                <img
                  src={post.media[activeMediaIdx].previewUrl}
                  alt={`Media ${activeMediaIdx + 1}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center space-y-1">
                    <Eye className="h-10 w-10 mx-auto opacity-50" />
                    <p className="text-xs">Media preview</p>
                  </div>
                </div>
              )}

              {post.media.length > 1 && (
                <>
                  <button
                    type="button"
                    disabled
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-60"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    disabled
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/40 text-white flex items-center justify-center disabled:opacity-60"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>

            {post.media.length > 1 && (
              <div className="flex items-center justify-center gap-1.5 p-2 bg-card/80 backdrop-blur-sm">
                {post.media.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled
                    className={cn(
                      "h-1.5 rounded-full transition-all disabled:cursor-default",
                      idx === activeMediaIdx
                        ? "w-6 bg-primary"
                        : "w-1.5 bg-muted-foreground/30"
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Voting UI based on type */}
        <div className="space-y-2">
          {(post.type === "YES_NO" || post.type === "PREDICTION") && (
            <div className="grid grid-cols-2 gap-2">
              {post.options.slice(0, 2).map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled
                  className={cn(
                    "h-12 md:h-14 rounded-xl font-semibold text-sm md:text-base transition-all border-2",
                    idx === 0
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400",
                    "disabled:cursor-not-allowed disabled:opacity-80"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {post.type === "A_VS_B" && (
            <div className="grid grid-cols-2 gap-3">
              {post.options.slice(0, 2).map((opt, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "rounded-xl border-2 p-3 space-y-2 disabled:opacity-80",
                    idx === 0
                      ? "border-blue-500/40 bg-blue-500/5"
                      : "border-orange-500/40 bg-orange-500/5"
                  )}
                >
                  <div className="aspect-video rounded-lg bg-muted overflow-hidden flex items-center justify-center">
                    {opt.imageUrl ? (
                      <img src={opt.imageUrl} alt={opt.label} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl font-black text-muted-foreground/30">
                        {idx === 0 ? "A" : "B"}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled
                    className="w-full h-10 rounded-lg border border-foreground/10 bg-card font-semibold text-sm text-foreground disabled:cursor-not-allowed"
                  >
                    {opt.label}
                  </button>
                </div>
              ))}
            </div>
          )}

          {post.type === "RATING" && (
            <div className="flex items-center justify-center gap-1.5 md:gap-2 py-1">
              {post.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled
                  className="aspect-square min-w-[2.25rem] md:min-w-[2.75rem] rounded-lg border border-border bg-card text-sm md:text-base font-semibold text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-80"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {post.type === "EMOJI" && (
            <div className="grid grid-cols-4 gap-2">
              {post.options.slice(0, 4).map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled
                  className="aspect-square rounded-xl border border-border bg-card flex flex-col items-center justify-center gap-1 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-80"
                >
                  <span className="text-2xl md:text-3xl leading-none">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {(post.type === "MULTIPLE_CHOICE" || post.type === "POLL" || post.type === "PRICE" || post.type === "DECISION") && (
            <div className="space-y-2">
              {post.options.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled
                  className="w-full h-11 md:h-12 px-4 rounded-xl border-2 border-border bg-card text-left flex items-center justify-between hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-80 transition-colors"
                >
                  <span className="text-sm md:text-base font-medium text-foreground flex items-center gap-3">
                    <span className="flex-shrink-0 h-5 w-5 rounded-md border-2 border-muted-foreground/30" />
                    {opt.label}
                  </span>
                  <span className="text-xs text-muted-foreground font-medium">
                    0%
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="default" size="sm">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              <ThumbsUp className="h-4 w-4" />
              <span className="text-xs font-medium">0</span>
            </button>
            <button
              type="button"
              disabled
              className={cn(
                "flex items-center gap-1.5 h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 transition-colors",
                !post.allowComments && "opacity-30 pointer-events-none"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs font-medium">0</span>
            </button>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              disabled
              className="flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              <Bookmark className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled
              className="flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60 transition-colors"
            >
              <Share2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
};
