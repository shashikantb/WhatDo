"use client";

import * as React from "react";
import {
  MessageSquare,
  Bookmark,
  MoreHorizontal,
  Heart,
  ChevronDown,
  ArrowDown,
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
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn, formatNumber, formatRelativeTime } from "@/lib/utils";
import { Card } from "@/components/design-system/Card";
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

export interface PostCardProps {
  post: FeedPost;
  index?: number;
  onClick?: (post: FeedPost, index: number) => void;
  onVoteSuccess?: (postId: string) => void;
  className?: string;
}

export const PostCard: React.FC<PostCardProps> = ({
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
  const [optimisticFollowing, setOptimisticFollowing] = React.useState<boolean | null>(null);
  const [reportTick, setReportTick] = React.useState(0);
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
  const media = Array.isArray(post.media) ? (post.media as PostMediaItem[]) : [];

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
      });
    } catch {
    }
  }, [postId, postType, category, index]);

  const prediction = post.prediction as any;
  const creatorScore: number | null | undefined = creator?.opinionScore;
  const predictionStatus: "OPEN" | "CLOSED" | "RESOLVED" | undefined =
    postType === "PREDICTION"
      ? prediction?.status ??
        prediction?.isResolved
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
  const isSelf = !!session?.user?.id && !!creatorId && session.user.id === creatorId;

  const postReported = isTargetReported("POST", postId);
  const userReported = creatorId ? isTargetReported("USER", creatorId) : false;

  const followingFromPost: boolean | undefined =
    typeof post.creatorIsFollowed === "boolean" ? post.creatorIsFollowed : post.creator?.isFollowed;
  const effectiveFollowing =
    optimisticFollowing !== null ? optimisticFollowing : !!followingFromPost;

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
      if (result?.options && Array.isArray(result.options)) {
        const counts: Record<string, number> = {};
        for (const o of result.options) counts[o.id] = o.voteCount ?? 0;
        setOptimisticOptionCounts(counts);
      }
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
  const authorAvatar = isAnonymous ? undefined : creator?.avatarUrl ?? creator?.image ?? null;

  const currentEffectiveLike = toggleLike.isPending
    ? !userLiked
    : userLiked;
  const currentEffectiveSave = toggleSave.isPending
    ? !userSaved
    : userSaved;
  const currentLikeCount = likeCount + (currentEffectiveLike && !userLiked ? 1 : 0) + (!currentEffectiveLike && userLiked ? -1 : 0);
  const currentSaveCount = saveCount + (currentEffectiveSave && !userSaved ? 1 : 0) + (!currentEffectiveSave && userSaved ? -1 : 0);

  const questionTooLong = question.length > 160;
  const shouldTruncate = questionTooLong && !isExpanded;
  const displayQuestion = shouldTruncate
    ? question.slice(0, 160).trimEnd() + "…"
    : question;

  if (!isPostIdCuidGuard || !isPostIdCuid) {
    return null;
  }

  return (
    <Card suppressHydrationWarning className={cn("overflow-hidden", className)}>
      <article suppressHydrationWarning className="p-4 md:p-5 space-y-4">
        <header className="flex items-start gap-3">
          <Avatar
            avatarUrl={authorAvatar}
            displayName={displayAuthorName}
            username={displayUsername}
            size="md"
          />
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-foreground truncate">
                @{displayUsername.replace(/^@/, "")}
              </span>
              {!isAnonymous && typeof creatorScore === "number" && creatorScore > 0 && (
                <Badge
                  variant="default"
                  size="sm"
                  className="bg-gradient-to-r from-orange-500/10 to-rose-500/10 border-orange-500/20 text-orange-600"
                >
                  <Flame className="w-3 h-3 mr-0.5" />
                  {formatNumber(creatorScore)}
                </Badge>
              )}
              {isAnonymous && (
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
                  {category.icon && (
                    <span className="mr-1">{category.icon}</span>
                  )}
                  {category.name}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{formatRelativeTime(post.createdAt ?? new Date())}</span>
              {expiresAt && !effectiveClosed && (
                <>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1 text-amber-500/80">
                    Expires {formatRelativeTime(expiresAt)}
                  </span>
                </>
              )}
            </div>
          </div>
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 z-30 w-52 rounded-lg border border-border bg-card shadow-popover animate-scaleIn">
                <div className="p-1.5 space-y-0.5">
                  {!isSelf && !isAnonymous && creatorId && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        handleFollowClick();
                      }}
                      className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                    >
                      {effectiveFollowing ? (
                        <UserCheck className="h-4 w-4 text-primary" />
                      ) : (
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                      )}
                      {effectiveFollowing ? "Unfollow user" : "Follow user"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      handleSave();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    <Bookmark
                      className={cn(
                        "h-4 w-4 text-muted-foreground",
                        currentEffectiveSave && "fill-primary text-primary"
                      )}
                    />
                    {currentEffectiveSave ? "Unsave post" : "Save post"}
                  </button>
                  {!isSelf && (
                    <div className="border-t border-border my-1" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (postReported) return;
                      setMenuOpen(false);
                      setReportPostOpen(true);
                    }}
                    disabled={postReported}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                      postReported
                        ? "opacity-60 cursor-not-allowed text-success bg-success/5"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Flag className={cn("h-4 w-4", postReported ? "text-success" : "text-muted-foreground")} />
                    {postReported ? "Thanks. Report submitted." : "Report post"}
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
                          "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                          userReported
                            ? "opacity-60 cursor-not-allowed text-success bg-success/5"
                            : "text-foreground hover:bg-muted"
                        )}
                      >
                        <Flag className={cn("h-4 w-4", userReported ? "text-success" : "text-muted-foreground")} />
                        {userReported ? "Thanks. Report submitted." : "Report user"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setBlockConfirmOpen(true);
                        }}
                        className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                      >
                        <UserX className="h-4 w-4" />
                        Block user
                      </button>
                    </>
                  )}
                  <div className="border-t border-border my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      copyLink();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-success" />
                    ) : (
                      <Copy className="h-4 w-4 text-muted-foreground" />
                    )}
                    {copied ? "Copied!" : "Copy link"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        <section>
          {predictionStatus && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {predictionStatus === "OPEN" && (
                <Badge variant="default" size="sm" className="bg-info/10 text-info border-info/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-info mr-1.5 animate-pulse" />
                  PREDICTION · OPEN
                </Badge>
              )}
              {predictionStatus === "CLOSED" && (
                <Badge variant="default" size="sm" className="bg-warning/10 text-warning border-warning/20">
                  <Lock className="w-3 h-3 mr-1" />
                  PREDICTION · AWAITING RESULT
                </Badge>
              )}
              {predictionStatus === "RESOLVED" &&
                userPredictionCorrect && (
                  <Badge variant="default" size="sm" className="bg-success/10 text-success border-success/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    YOUR PREDICTION: CORRECT ✅
                  </Badge>
                )}
              {predictionStatus === "RESOLVED" &&
                userPredictionIncorrect && (
                  <Badge variant="default" size="sm" className="bg-danger/10 text-danger border-danger/20">
                    YOUR PREDICTION: INCORRECT ❌
                  </Badge>
                )}
              {predictionStatus === "RESOLVED" &&
                !userPredictionCorrect &&
                !userPredictionIncorrect && (
                  <Badge variant="default" size="sm" className="bg-success/10 text-success border-success/20">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    PREDICTION · RESOLVED
                  </Badge>
                )}
            </div>
          )}
          <h2 className="text-lg md:text-xl font-bold leading-tight text-foreground">
            {displayQuestion || (
              <span className="text-muted-foreground/60 italic">Untitled post</span>
            )}
          </h2>
          {questionTooLong && (
            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              {isExpanded ? (
                <>Show less <ChevronDown className="h-3 w-3 rotate-180" /></>
              ) : (
                <>Show more <ChevronDown className="h-3 w-3" /></>
              )}
            </button>
          )}
        </section>

        {media.length > 0 && (
          <PostMediaViewer media={media} />
        )}

        <section className="space-y-4">
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
          />

          {showResults && resultOptions.length > 0 && (
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
          )}
        </section>

        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 8).map((t: any) => {
              const tagName = typeof t === "string" ? t : t?.tag?.name ?? t?.name ?? "";
              if (!tagName) return null;
              return (
                <Badge key={tagName} variant="default" size="sm">
                  #{String(tagName).toLowerCase()}
                </Badge>
              );
            })}
          </div>
        )}

        <footer className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                if (onClick) {
                  onClick(post, index);
                } else {
                  router.push(`/post/${postId}#comments`);
                }
              }}
              className="flex items-center gap-1 h-9 px-3 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="text-xs font-medium tabular-nums">
                {formatNumber(Math.max(0, commentCount))}
              </span>
            </button>

            <button
              type="button"
              onClick={handleLike}
              className={cn(
                "flex items-center gap-1 h-9 px-3 rounded-lg transition-all duration-200",
                currentEffectiveLike
                  ? "text-rose-500 bg-rose-500/10"
                  : "text-muted-foreground hover:text-rose-500 hover:bg-muted",
                animateLike && "animate-[pop_0.4s_ease-out]"
              )}
            >
              <Heart
                className={cn(
                  "h-4 w-4",
                  currentEffectiveLike && "fill-current"
                )}
              />
              <span className="text-xs font-medium tabular-nums">
                {formatNumber(Math.max(0, currentLikeCount))}
              </span>
            </button>
          </div>

          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={handleSave}
              className={cn(
                "flex items-center justify-center h-9 w-9 rounded-lg transition-all duration-200",
                currentEffectiveSave
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted",
                animateSave && "animate-[heartbeat_0.6s_ease-in-out]"
              )}
              aria-label={currentEffectiveSave ? "Unsave post" : "Save post"}
            >
              <Bookmark
                className={cn("h-4 w-4", currentEffectiveSave && "fill-current")}
              />
            </button>

            <ShareMenu
              title={question || "WhatDo post"}
              url={`${typeof window !== "undefined" ? window.location.origin : ""}/post/${postId}`}
            >
              <button
                type="button"
                onClick={handleShareClick}
                className="flex items-center justify-center h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Share post"
              >
                <Share2 className="h-4 w-4" />
              </button>
            </ShareMenu>

            <button
              type="button"
              onClick={copyLink}
              className={cn(
                "flex items-center justify-center h-9 w-9 rounded-lg transition-colors",
                copied
                  ? "text-success bg-success/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
              aria-label="Copy link"
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </footer>

        {!hasVoted && !effectiveClosed && (
          <div className="pointer-events-none absolute bottom-3 right-4 opacity-60">
            <div className="flex flex-col items-center gap-1 animate-[pulse_2s_ease-in-out_infinite]">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Swipe ↓
              </span>
            </div>
          </div>
        )}
      </article>

      <ReportDialog
        open={reportPostOpen}
        onClose={() => {
          setReportPostOpen(false);
          setReportTick((t) => t + 1);
        }}
        targetType="POST"
        targetId={postId}
      />

      {creatorId && (
        <ReportDialog
          open={reportUserOpen}
          onClose={() => {
            setReportUserOpen(false);
            setReportTick((t) => t + 1);
          }}
          targetType="USER"
          targetId={creatorId}
        />
      )}

      <Modal open={blockConfirmOpen} onClose={() => setBlockConfirmOpen(false)}>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-danger/15 text-danger flex items-center justify-center border border-danger/20 flex-shrink-0">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Block @{displayUsername}?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                You won&apos;t see posts or comments from this user anymore. They won&apos;t be notified.
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
    </Card>
  );
};
