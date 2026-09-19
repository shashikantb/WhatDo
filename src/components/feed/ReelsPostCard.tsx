"use client";

import * as React from "react";
import {
  MessageSquare,
  Bookmark,
  MoreHorizontal,
  Heart,
  Flag,
  UserX,
  Share2,
  Copy,
  Check,
  UserPlus,
  UserCheck,
  AlertTriangle,
  Flame,
  Lock,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn, formatNumber, formatRelativeTime } from "@/lib/utils";
import { Badge } from "@/components/design-system/Badge";
import { Avatar } from "@/components/design-system/Avatar";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import { useLoginModal } from "@/components/auth/LoginModal";
import { ShareMenu } from "@/components/shared/ShareMenu";
import { ReportDialog, isTargetReported } from "@/components/shared/ReportDialog";
import { Modal } from "@/components/design-system/Modal";
import { Button } from "@/components/design-system/Button";
import { PostMediaViewer, PostMediaItem } from "./PostMediaViewer";
import {
  VoteButtons,
  OptionShape,
  UserVoteShape,
  PostType,
  VoteResultData,
} from "@/components/voting/VoteButtons";
import {
  VoteResults,
  VoteResultOption,
  PostTypeForResults,
} from "@/components/voting/VoteResults";
import { trackEvent } from "@/lib/analytics";

type FeedPost = any;

export interface ReelsPostCardProps {
  post: FeedPost;
  index?: number;
  onClick?: (post: FeedPost, index: number) => void;
  onVoteSuccess?: (postId: string) => void;
  className?: string;
}

interface ActionButtonProps {
  icon: React.ReactNode;
  label?: string | number;
  active?: boolean;
  activeClass?: string;
  onClick?: () => void;
  ariaLabel: string;
  badge?: React.ReactNode;
}

const ActionButton: React.FC<ActionButtonProps> = ({
  icon,
  label,
  active = false,
  activeClass = "text-primary",
  onClick,
  ariaLabel,
  badge,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "group relative flex flex-col items-center justify-center gap-1",
      "transition-all duration-200",
      active ? activeClass : "text-white hover:text-white/90"
    )}
    aria-label={ariaLabel}
  >
    {badge && (
      <div className="absolute -top-1 -right-2 z-10">{badge}</div>
    )}
    <div
      className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center",
        "bg-black/25 backdrop-blur-md border border-white/10",
        "group-active:scale-90 transition-transform"
      )}
    >
      {icon}
    </div>
    {typeof label !== "undefined" && (
      <span className="text-[10px] font-semibold text-white drop-shadow-lg tabular-nums">
        {typeof label === "number" ? formatNumber(label) : label}
      </span>
    )}
  </button>
);

export const ReelsPostCard: React.FC<ReelsPostCardProps> = ({
  post,
  index = 0,
  onClick,
  onVoteSuccess,
  className,
}) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { openLogin } = useLoginModal();
  const { show } = useToast();
  const utils = trpc.useUtils();

  const postIdGuard: string = post?.id ?? "";
  const isPostIdCuidGuard: boolean =
    typeof postIdGuard === "string" && /^c[a-z0-9]{24}$/.test(postIdGuard);

  const [isExpanded, setIsExpanded] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [justVoted, setJustVoted] = React.useState(false);
  const [animateLike, setAnimateLike] = React.useState(false);
  const [animateSave, setAnimateSave] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [reportPostOpen, setReportPostOpen] = React.useState(false);
  const [reportUserOpen, setReportUserOpen] = React.useState(false);
  const [blockConfirmOpen, setBlockConfirmOpen] = React.useState(false);
  const [optimisticFollowing, setOptimisticFollowing] = React.useState<
    boolean | null
  >(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const postId: string = post.id;
  const isPostIdCuid: boolean =
    typeof postId === "string" && /^c[a-z0-9]{24}$/.test(postId);
  const postType: PostType = post.type ?? "YES_NO";
  const question: string = post.question ?? "";
  const isAnonymous: boolean = !!post.isAnonymous;
  const isClosed: boolean = !!post.isClosed || !!post.closed;
  const expiresAt = post.expiresAt ?? null;
  const voteCount: number = post.voteCount ?? 0;
  const commentCount: number = post.commentCount ?? 0;
  const likeCount: number = post.likeCount ?? 0;
  const shareCount: number = post.shareCount ?? 0;
  const saveCount: number = post.saveCount ?? 0;

  const creator = post.creator;
  const category = post.category;
  const options = Array.isArray(post.options) ? (post.options as any[]) : [];
  const media = Array.isArray(post.media)
    ? (post.media as PostMediaItem[])
    : [];

  const userVoteSSR: UserVoteShape | null = post.userVote
    ? ({
        optionId: post.userVote.optionId ?? undefined,
        ratingValue: post.userVote.ratingValue ?? undefined,
        emojiValue: post.userVote.emojiValue ?? undefined,
        priceValue: post.userVote.priceValue ?? undefined,
      } as UserVoteShape)
    : null;

  const userLiked: boolean = !!post.userLiked;
  const userSaved: boolean = !!post.userSaved;

  const resultsQuery = trpc.voting.getResults.useQuery(
    { id: postId },
    {
      enabled: !!(postId && isPostIdCuid && !userVoteSSR),
      staleTime: 10 * 60 * 1000,
      gcTime: 30 * 60 * 1000,
      refetchOnMount: true,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
  );

  const [optimisticVoted, setOptimisticVoted] =
    React.useState<boolean>(false);
  const [optimisticVotePayload, setOptimisticVotePayload] =
    React.useState<UserVoteShape | null>(null);
  const [optimisticOptionCounts, setOptimisticOptionCounts] =
    React.useState<Record<string, number> | null>(null);

  const clientUserVoteRaw = (resultsQuery.data as any)?.userVote ?? null;
  const clientUserVote: UserVoteShape | null = clientUserVoteRaw
    ? ({
        optionId: clientUserVoteRaw.optionId ?? undefined,
        ratingValue: clientUserVoteRaw.ratingValue ?? undefined,
        emojiValue: clientUserVoteRaw.emojiValue ?? undefined,
        priceValue: clientUserVoteRaw.priceValue ?? undefined,
      } as UserVoteShape)
    : null;

  const effectiveUserVote: UserVoteShape | null =
    optimisticVotePayload ?? clientUserVote ?? userVoteSSR;

  const now = React.useMemo(() => new Date(), []);
  const postIsExpired = !!expiresAt && new Date(expiresAt) < now;
  const effectiveClosed = isClosed || postIsExpired;
  const hasVoted = optimisticVoted || !!effectiveUserVote;
  const isGuest = status === "unauthenticated";
  const sessionUserId = (session?.user as any)?.id as string | undefined;
  const isCreator = !!sessionUserId && !!creator?.id && sessionUserId === creator.id;
  const showResults = hasVoted || isGuest || isCreator || effectiveClosed;

  React.useEffect(() => {
    try {
      trackEvent("post_impression", {
        postId,
        postType,
        categorySlug: category?.slug,
        index,
        reels: true,
      });
    } catch {}
  }, [postId, postType, category, index]);

  const prediction = post.prediction as any;
  const creatorScore: number | null | undefined = creator?.opinionScore;
  const predictionStatus:
    | "OPEN"
    | "CLOSED"
    | "RESOLVED"
    | undefined = postType === "PREDICTION"
    ? prediction?.status ?? prediction?.isResolved
      ? "RESOLVED"
      : effectiveClosed
        ? "CLOSED"
        : "OPEN"
    : undefined;
  const userPredictionCorrect =
    predictionStatus === "RESOLVED" &&
    prediction?.correctOptionId &&
    effectiveUserVote?.optionId === prediction.correctOptionId;
  const userPredictionIncorrect =
    predictionStatus === "RESOLVED" &&
    prediction?.correctOptionId &&
    effectiveUserVote?.optionId &&
    effectiveUserVote.optionId !== prediction.correctOptionId;

  const toggleLike = trpc.posts.toggleLike.useMutation({
    onMutate: () => {
      setAnimateLike(true);
      setTimeout(() => setAnimateLike(false), 400);
    },
    onSuccess: (data) => {
      void utils.feed.getForYou.invalidate();
      void utils.feed.getFollowing.invalidate();
      void utils.feed.getTrending.invalidate();
      void utils.feed.getNew.invalidate();
      void utils.posts.getById.invalidate({ id: postId });
      if (data?.liked) show("Added to likes", "success");
    },
    onError: () => {
      show("Action failed", "danger");
    },
  });

  const toggleSave = trpc.posts.toggleSave.useMutation({
    onMutate: () => {
      setAnimateSave(true);
      setTimeout(() => setAnimateSave(false), 500);
    },
    onSuccess: (data) => {
      void utils.feed.getForYou.invalidate();
      void utils.feed.getFollowing.invalidate();
      void utils.feed.getTrending.invalidate();
      void utils.feed.getNew.invalidate();
      void utils.posts.getById.invalidate({ id: postId });
      show(data?.saved ? "Post saved" : "Removed from saved", "success");
    },
    onError: () => {
      show("Action failed", "danger");
    },
  });

  const sharePost = trpc.posts.share.useMutation({
    onSuccess: () => {
      void utils.feed.getForYou.invalidate();
      void utils.feed.getFollowing.invalidate();
      void utils.feed.getTrending.invalidate();
      void utils.feed.getNew.invalidate();
    },
  });

  const creatorId: string | undefined = creator?.id;
  const isSelf =
    !!session?.user?.id && !!creatorId && session.user.id === creatorId;

  const postReported = isTargetReported("POST", postId);
  const userReported = creatorId ? isTargetReported("USER", creatorId) : false;

  const followingFromPost: boolean | undefined =
    typeof post.creatorIsFollowed === "boolean"
      ? post.creatorIsFollowed
      : post.creator?.isFollowed;
  const effectiveFollowing =
    optimisticFollowing !== null
      ? optimisticFollowing
      : !!followingFromPost;

  const followUser = trpc.social.follow.useMutation({
    onMutate: () => {
      setOptimisticFollowing(!effectiveFollowing);
    },
    onSuccess: () => {
      void utils.social.suggestedUsers.invalidate();
    },
    onError: () => {
      setOptimisticFollowing(null);
      show("Action failed", "danger");
    },
  });

  const blockUser = trpc.social.block.useMutation({
    onSuccess: () => {
      setBlockConfirmOpen(false);
      show("User blocked", "success");
      void utils.feed.getForYou.invalidate();
      void utils.feed.getFollowing.invalidate();
    },
    onError: () => {
      show("Failed to block user", "danger");
    },
  });

  const handleFollowClick = () => {
    if (isGuest) {
      openLogin({ type: "follow" });
      return;
    }
    if (!creatorId) return;
    followUser.mutate({ userId: creatorId });
  };

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

  const handleLike = () => {
    if (isGuest) {
      openLogin({ type: "vote", postId });
      return;
    }
    toggleLike.mutate({ postId });
  };

  const handleSave = () => {
    if (isGuest) {
      openLogin({ type: "vote", postId });
      return;
    }
    toggleSave.mutate({ postId });
  };

  const handleShareClick = () => {
    sharePost.mutate({ id: postId });
  };

  const copyLink = async () => {
    try {
      const url = `${window.location.origin}/post/${postId}`;
      await navigator.clipboard.writeText(url);
      setCopied(true);
      show("Link copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      show("Failed to copy", "danger");
    }
  };

  const handleVoteSubmitted = (result: VoteResultData) => {
    setJustVoted(true);
    setOptimisticVoted(true);
    try {
      const lastVotedPayload: Record<string, any> = {};
      if (result?.options && Array.isArray(result.options)) {
        const counts: Record<string, number> = {};
        for (const o of result.options) counts[o.id] = o.voteCount ?? 0;
        setOptimisticOptionCounts(counts);
      }
      void 0;
    } catch {}
    onVoteSuccess?.(postId);
    setTimeout(() => setJustVoted(false), 3000);
  };

  const optionShapes: OptionShape[] = options.map((o) => {
    let vc = o.voteCount ?? 0;
    const rOpts = (resultsQuery?.data as any)?.options as any[] | undefined;
    if (rOpts) {
      for (const ro of rOpts) {
        if (ro.id === o.id && typeof ro.voteCount === "number") {
          vc = ro.voteCount;
          break;
        }
      }
    }
    if (optimisticOptionCounts && typeof optimisticOptionCounts[o.id] === "number") {
      vc = optimisticOptionCounts[o.id] as number;
    }
    return {
      id: o.id,
      label: o.label ?? "",
      value: o.value ?? undefined,
      imageUrl: o.imageUrl ?? null,
      color: o.color ?? null,
      voteCount: vc,
      sortOrder: o.sortOrder ?? undefined,
    };
  });

  const resultOptions: VoteResultOption[] = optionShapes.map((o) => ({
    id: o.id,
    label: o.label ?? "",
    voteCount: o.voteCount ?? 0,
    color: o.color ?? null,
    imageUrl: o.imageUrl ?? null,
  }));

  const displayAuthorName = isAnonymous
    ? "Anonymous"
    : creator?.displayName ?? creator?.username ?? "user";
  const displayUsername = isAnonymous
    ? "anon"
    : creator?.username ?? "user";
  const authorAvatar = isAnonymous
    ? undefined
    : creator?.avatarUrl ?? creator?.image ?? null;

  const currentEffectiveLike = toggleLike.isPending
    ? !userLiked
    : userLiked;
  const currentEffectiveSave = toggleSave.isPending
    ? !userSaved
    : userSaved;
  const currentLikeCount =
    likeCount +
    (currentEffectiveLike && !userLiked ? 1 : 0) +
    (!currentEffectiveLike && userLiked ? -1 : 0);
  const currentSaveCount =
    saveCount +
    (currentEffectiveSave && !userSaved ? 1 : 0) +
    (!currentEffectiveSave && userSaved ? -1 : 0);

  const questionTooLong = question.length > 180;
  const shouldTruncate = questionTooLong && !isExpanded;
  const displayQuestion = shouldTruncate
    ? question.slice(0, 180).trimEnd() + "…"
    : question;

  const postUrl = `/post/${postId}`;

  const categoryColor = category?.color ?? "#8B5CF6";
  const bgGradient =
    media.length > 0
      ? "bg-gradient-to-t from-black/90 via-black/50 to-black/10"
      : `bg-gradient-to-br from-[${categoryColor}]/40 via-background to-background`;

  if (!isPostIdCuidGuard || !isPostIdCuid) {
    return null;
  }

  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!onClick) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, [role='button'], textarea, input, label")) {
      return;
    }
    onClick(post, index);
  };

  return (
    <article
      suppressHydrationWarning
      onClick={handleCardClick}
      className={cn(
        "relative snap-start snap-always w-full h-[100dvh] overflow-hidden",
        "flex flex-col justify-between",
        onClick ? "cursor-pointer" : "",
        className
      )}
      data-post-id={postId}
    >
      {/* Background layer (no more dimmed media) */}
      <div
        className={cn(
          "absolute inset-0 z-0",
          "bg-gradient-to-br from-card via-background to-muted"
        )}
        style={
          {
            background: `linear-gradient(135deg, ${categoryColor}22 0%, hsl(var(--background)) 40%, hsl(var(--background)) 100%)`,
          } as React.CSSProperties
        }
      />

      {/* Content layer */}
      <div className="relative z-10 flex flex-col h-full pt-[3.25rem] pb-[6.5rem]">
        {/* HEADING at TOP: always visible, never pushed above the viewport clip */}
        <div className="px-4 pr-20 shrink-0 pb-2">
          <div className="backdrop-blur-md bg-black/25 rounded-2xl p-3 border border-white/10">
          {/* Prediction badges */}
          {predictionStatus && (
            <div className="flex flex-wrap items-center gap-2 pb-1">
              {predictionStatus === "OPEN" && (
                <Badge
                  variant="default"
                  size="sm"
                  className="bg-info/90 text-white border-info/30 backdrop-blur"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-white mr-1.5 animate-pulse" />
                  PREDICTION · OPEN
                </Badge>
              )}
              {predictionStatus === "CLOSED" && (
                <Badge
                  variant="default"
                  size="sm"
                  className="bg-warning/90 text-white border-warning/30 backdrop-blur"
                >
                  <Lock className="w-3 h-3 mr-1" />
                  AWAITING RESULT
                </Badge>
              )}
              {predictionStatus === "RESOLVED" &&
                userPredictionCorrect && (
                  <Badge
                    variant="default"
                    size="sm"
                    className="bg-success/90 text-white border-success/30 backdrop-blur"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    YOU WON ✅
                  </Badge>
                )}
              {predictionStatus === "RESOLVED" &&
                userPredictionIncorrect && (
                  <Badge
                    variant="default"
                    size="sm"
                    className="bg-danger/90 text-white border-danger/30 backdrop-blur"
                  >
                    ❌ MISSED
                  </Badge>
                )}
              {predictionStatus === "RESOLVED" &&
                !userPredictionCorrect &&
                !userPredictionIncorrect && (
                  <Badge
                    variant="default"
                    size="sm"
                    className="bg-success/90 text-white border-success/30 backdrop-blur"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    FINAL RESULT
                  </Badge>
                )}
            </div>
          )}

          {/* Question */}
          <div>
            <h2 className="text-lg md:text-xl font-black leading-snug text-white drop-shadow-xl line-clamp-[8]">
              {displayQuestion || (
                <span className="text-white/60 italic">
                  Untitled post
                </span>
              )}
            </h2>
            {questionTooLong && (
              <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-white/80 hover:text-white"
              >
                {isExpanded ? (
                  <>
                    Show less{" "}
                    <ChevronDown className="h-3 w-3 rotate-180" />
                  </>
                ) : (
                  <>
                    Show more <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>
          </div>
        </div>

        {/* Foreground Media - clearly visible inline (mirrors PostCard layout) */}
        {media.length > 0 && (
          <div className="px-4 pr-20 shrink-0 py-2 min-h-0 flex justify-center">
            <div className="w-full max-h-[52vh] overflow-hidden rounded-2xl ring-1 ring-white/10 shadow-2xl bg-black/20">
              <PostMediaViewer media={media} />
            </div>
          </div>
        )}

        {/* Spacer pushes the vote+creator block to the bottom */}
        <div className="flex-1 min-h-0" />

        {/* BOTTOM BLOCK: vote UI + tags + creator info (anchored to bottom) */}
        <div className="px-4 pr-20 shrink-0 min-h-0 flex flex-col justify-end space-y-2">
          {/* Vote buttons */}
          <div className="space-y-1.5">
            <VoteButtons
              postId={postId}
              postType={postType}
              options={optionShapes}
              userVote={effectiveUserVote}
              isClosed={effectiveClosed}
              expiresAt={expiresAt}
              onVotePayload={(vp) => {
                setOptimisticVoted(true);
                setOptimisticVotePayload(vp);
              }}
              onVoteSubmitted={handleVoteSubmitted}
              className="bg-black/25 backdrop-blur-md rounded-2xl p-2 border border-white/10"
            />
          </div>

          {/* Vote results */}
          {showResults && resultOptions.length > 0 && (
            <div className="bg-black/20 backdrop-blur-md rounded-2xl p-2 border border-white/10">
              <VoteResults
                options={resultOptions}
                totalVotes={voteCount}
                postType={postType as PostTypeForResults}
                selectedOptionId={effectiveUserVote?.optionId ?? null}
                userRating={effectiveUserVote?.ratingValue ?? null}
                userEmoji={effectiveUserVote?.emojiValue ?? null}
                userPrice={effectiveUserVote?.priceValue ?? null}
                prediction={{
                  isResolved: predictionStatus === "RESOLVED",
                  correctOptionId: prediction?.correctOptionId,
                  userVotedOptionId: effectiveUserVote?.optionId,
                  status: predictionStatus,
                }}
                allVotes={(post.votes as any[]) ?? []}
                isNewVote={justVoted}
                isClosed={effectiveClosed}
              />
            </div>
          )}

          {/* Tags */}
          {Array.isArray(post.tags) && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {post.tags.slice(0, 5).map((t: any) => {
                const tagName =
                  typeof t === "string" ? t : t?.tag?.name ?? t?.name ?? "";
                if (!tagName) return null;
                return (
                  <span
                    key={tagName}
                    className="text-[10px] font-semibold text-white/80 bg-white/10 backdrop-blur px-2 py-0.5 rounded-full"
                  >
                    #{String(tagName).toLowerCase()}
                  </span>
                );
              })}
            </div>
          )}

          {/* Creator meta + follow */}
          <div className="flex items-center gap-3 pt-2 pb-1">
            <Avatar
              avatarUrl={authorAvatar}
              displayName={displayAuthorName}
              username={displayUsername}
              size="sm"
              className="ring-2 ring-white/80 rounded-full"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white truncate drop-shadow">
                  @{displayUsername.replace(/^@/, "")}
                </span>
                {!isAnonymous &&
                  typeof creatorScore === "number" &&
                  creatorScore > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-orange-300 bg-orange-500/20 backdrop-blur px-1.5 py-0.5 rounded-full">
                      <Flame className="w-2.5 h-2.5" />
                      {formatNumber(creatorScore)}
                    </span>
                  )}
                {isAnonymous && (
                  <span className="text-[10px] font-semibold text-white/70 bg-white/10 backdrop-blur px-1.5 py-0.5 rounded-full">
                    Incognito
                  </span>
                )}
                {category && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-semibold backdrop-blur px-1.5 py-0.5 rounded-full"
                    style={
                      category.color
                        ? {
                            backgroundColor: `${category.color}33`,
                            border: `1px solid ${category.color}55`,
                            color: "white",
                          }
                        : undefined
                    }
                  >
                    {category.icon && (
                      <span className="text-[10px]">{category.icon}</span>
                    )}
                    {category.name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-white/70">
                <span className="drop-shadow">
                  {formatRelativeTime(post.createdAt ?? new Date())}
                </span>
                {expiresAt && !effectiveClosed && (
                  <>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      Expires {formatRelativeTime(expiresAt)}
                    </span>
                  </>
                )}
              </div>
            </div>
            {!isSelf && !isAnonymous && creatorId && (
              <button
                type="button"
                onClick={handleFollowClick}
                className={cn(
                  "text-xs font-bold px-3 py-1.5 rounded-full backdrop-blur transition-all duration-200",
                  effectiveFollowing
                    ? "bg-white/10 text-white/90 border border-white/20 hover:bg-white/20"
                    : "bg-white text-black border border-white hover:bg-white/90"
                )}
              >
                {effectiveFollowing ? (
                  <span className="inline-flex items-center gap-1">
                    <UserCheck className="w-3 h-3" /> Following
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1">
                    <UserPlus className="w-3 h-3" /> Follow
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Right-side action stack (IG Reels style) */}
      <div className="absolute right-2 bottom-[9rem] md:bottom-[10rem] z-20 flex flex-col items-center gap-4">
        {/* More options */}
        <div ref={menuRef} className="relative">
          <ActionButton
            ariaLabel="More options"
            icon={
              <MoreHorizontal className="h-5 w-5 text-white" />
            }
            onClick={() => setMenuOpen((o) => !o)}
          />
          {menuOpen && (
            <div className="absolute right-0 bottom-full mb-2 z-30 w-48 rounded-xl border border-white/20 bg-black/90 backdrop-blur-xl shadow-2xl animate-scaleIn overflow-hidden">
              <div className="p-1.5 space-y-0.5 text-white">
                {!isSelf && !isAnonymous && creatorId && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleFollowClick();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                  >
                    {effectiveFollowing ? (
                      <UserCheck className="h-4 w-4 text-primary" />
                    ) : (
                      <UserPlus className="h-4 w-4 text-white/70" />
                    )}
                    {effectiveFollowing ? "Unfollow" : "Follow user"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    handleSave();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                >
                  <Bookmark
                    className={cn(
                      "h-4 w-4 text-white/70",
                      currentEffectiveSave && "fill-primary text-primary"
                    )}
                  />
                  {currentEffectiveSave ? "Unsave" : "Save post"}
                </button>
                {!isSelf && <div className="border-t border-white/10 my-1" />}
                <button
                  type="button"
                  onClick={() => {
                    if (postReported) return;
                    setMenuOpen(false);
                    setReportPostOpen(true);
                  }}
                  disabled={postReported}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    postReported
                      ? "opacity-60 cursor-not-allowed text-success bg-success/10"
                      : "hover:bg-white/10"
                  )}
                >
                  <Flag
                    className={cn(
                      "h-4 w-4",
                      postReported ? "text-success" : "text-white/70"
                    )}
                  />
                  {postReported ? "Reported" : "Report post"}
                </button>
                {!isSelf && !isAnonymous && creatorId && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (userReported) return;
                        setMenuOpen(false);
                        setReportUserOpen(true);
                      }}
                      disabled={userReported}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                        userReported
                          ? "opacity-60 cursor-not-allowed text-success bg-success/10"
                          : "hover:bg-white/10"
                      )}
                    >
                      <Flag
                        className={cn(
                          "h-4 w-4",
                          userReported ? "text-success" : "text-white/70"
                        )}
                      />
                      {userReported ? "Reported" : "Report user"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        setBlockConfirmOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                    >
                      <UserX className="h-4 w-4" />
                      Block user
                    </button>
                  </>
                )}
                <div className="border-t border-white/10 my-1" />
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    copyLink();
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-white/10 transition-colors"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4 text-white/70" />
                  )}
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Comments */}
        <ActionButton
          ariaLabel="Comments"
          icon={<MessageSquare className="h-5 w-5 text-white" />}
          label={commentCount}
          onClick={() => {
            if (isGuest) {
              openLogin({ type: "comment", postId });
              return;
            }
            if (onClick) {
              onClick(post, index);
            } else {
              router.push(`${postUrl}#comments`);
            }
          }}
        />

        {/* Like */}
        <ActionButton
          ariaLabel="Like post"
          icon={
            <Heart
              className={cn(
                "h-5 w-5",
                currentEffectiveLike
                  ? "text-rose-500 fill-rose-500"
                  : "text-white"
              )}
            />
          }
          label={currentLikeCount}
          active={currentEffectiveLike}
          activeClass="text-rose-500"
          onClick={handleLike}
        />

        {/* Save */}
        <ActionButton
          ariaLabel="Save post"
          icon={
            <Bookmark
              className={cn(
                "h-5 w-5",
                currentEffectiveSave
                  ? "text-primary fill-primary"
                  : "text-white"
              )}
            />
          }
          active={currentEffectiveSave}
          onClick={handleSave}
        />

        {/* Share */}
        <ShareMenu
          title={question || "WhatDo post"}
          url={`${typeof window !== "undefined" ? window.location.origin : ""}${postUrl}`}
        >
          <ActionButton
            ariaLabel="Share post"
            icon={<Share2 className="h-5 w-5 text-white" />}
            onClick={handleShareClick}
          />
        </ShareMenu>
      </div>

      {/* Dialogs */}
      <ReportDialog
        open={reportPostOpen}
        onClose={() => {
          setReportPostOpen(false);
        }}
        targetType="POST"
        targetId={postId}
      />

      {creatorId && (
        <ReportDialog
          open={reportUserOpen}
          onClose={() => {
            setReportUserOpen(false);
          }}
          targetType="USER"
          targetId={creatorId}
        />
      )}

      <Modal
        open={blockConfirmOpen}
        onClose={() => setBlockConfirmOpen(false)}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-danger/15 text-danger flex items-center justify-center border border-danger/20 flex-shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">
                Block @{displayUsername}?
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                You won&apos;t see posts or comments from this user
                anymore. They won&apos;t be notified.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="outline"
              onClick={() => setBlockConfirmOpen(false)}
              disabled={blockUser.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={blockUser.isPending}
              onClick={() => {
                if (!creatorId) return;
                blockUser.mutate({ userId: creatorId });
              }}
            >
              <UserX className="h-4 w-4 mr-1.5" />
              Block user
            </Button>
          </div>
        </div>
      </Modal>
    </article>
  );
};
