"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Edit,
  Share2,
  Flame,
  CheckCircle2,
  Loader2,
  MessageCircleQuestion,
  Check as CheckIcon,
  X as XIcon,
  Award,
} from "lucide-react";
import { cn, formatNumber, formatRelativeTime } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { Card } from "@/components/design-system/Card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/design-system/Tabs";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import { useLoginModal } from "@/components/auth/LoginModal";
import { Feed } from "@/components/feed/Feed";
import { EmptyState } from "@/components/shared/EmptyState";
import { CATEGORIES } from "@/lib/constants";

export interface PublicUserWithStats {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  role: string;
  isVerified: boolean;
  opinionScore: number;
  totalVotes: number;
  totalPosts: number;
  predictionsCorrect: number;
  predictionsMade: number;
  createdAt: Date | string;
  bio: string | null;
  postsCount: number;
  votesCount: number;
  followersCount: number;
  followingCount: number;
  following: boolean;
  isSelf: boolean;
}

export interface ProfilePageClientProps {
  user: PublicUserWithStats;
}

const BANNER_COLORS: Record<string, string> = {
  technology: "from-indigo-500 via-blue-500 to-cyan-400",
  entertainment: "from-pink-500 via-rose-500 to-orange-400",
  sports: "from-emerald-500 via-teal-500 to-cyan-500",
  news: "from-slate-500 via-gray-500 to-zinc-500",
  gaming: "from-violet-500 via-purple-500 to-fuchsia-500",
  food: "from-amber-500 via-orange-500 to-red-400",
  travel: "from-sky-500 via-blue-500 to-indigo-400",
  fitness: "from-green-500 via-emerald-500 to-teal-400",
  education: "from-blue-500 via-indigo-500 to-violet-400",
  finance: "from-emerald-500 via-green-500 to-lime-400",
  art: "from-fuchsia-500 via-pink-500 to-rose-400",
  science: "from-cyan-500 via-sky-500 to-blue-400",
};

function CountUp({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    if (typeof window === "undefined") {
      setDisplay(value);
      return;
    }
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      setDisplay(value);
      return;
    }
    const duration = Math.min(900, 400 + value * 3);
    const start = performance.now();
    const from = 0;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <span className={cn("tabular-nums", className)}>
      {formatNumber(display)}
    </span>
  );
}

function ScoreDisplay({
  score,
  totalPosts,
  totalVotes,
  predictionsCorrect,
  predictionsMade,
}: {
  score: number;
  totalPosts: number;
  totalVotes: number;
  predictionsCorrect: number;
  predictionsMade: number;
}) {
  const finalScore = Math.round(score);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);
  const voteScore = totalVotes * 1;
  const postScore = totalPosts * 5;
  const predScore = predictionsCorrect * 10;
  const remaining = Math.max(0, finalScore - (voteScore + postScore + predScore));
  return (
    <div ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/15 via-rose-500/15 to-pink-500/15 border border-orange-500/25 shadow-sm shadow-orange-500/5 transition-all hover:shadow-md hover:shadow-orange-500/10 hover:scale-[1.02]"
        aria-label="Opinion Score breakdown"
      >
        <Flame className="h-4 w-4 text-orange-500 animate-[pulse_2s_ease-in-out_infinite]" />
        <span className="text-sm font-black bg-gradient-to-r from-orange-500 via-rose-500 to-pink-500 bg-clip-text text-transparent tabular-nums">
          <CountUp value={finalScore} />
        </span>
        <span className="hidden sm:inline text-[11px] font-semibold text-orange-500/90 uppercase tracking-wide">
          Score
        </span>
      </button>
      {open && (
        <div className="absolute z-40 top-full mt-2 left-0 w-72 origin-top-left animate-[scale-in_0.15s_ease-out] rounded-2xl border border-border bg-card shadow-elevated overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-gradient-to-r from-orange-500/10 via-rose-500/10 to-pink-500/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <p className="text-sm font-bold text-foreground">Opinion Score Breakdown</p>
            </div>
            <Badge variant="default" size="sm" className="bg-gradient-to-r from-orange-500 to-rose-500 text-white border-0">
              {formatNumber(finalScore)} total
            </Badge>
          </div>
          <div className="p-3 space-y-2">
            <ScoreRow
              icon="🗳️"
              label="Votes cast"
              count={totalVotes}
              weight="+1 each"
              total={voteScore}
            />
            <ScoreRow
              icon="📝"
              label="Posts created"
              count={totalPosts}
              weight="+5 each"
              total={postScore}
            />
            <ScoreRow
              icon="🔮"
              label="Correct predictions"
              count={predictionsCorrect}
              weight="+10 each"
              total={predScore}
              countExtra={
                predictionsMade > 0
                  ? `(${predictionsCorrect}/${predictionsMade})`
                  : undefined
              }
            />
            {remaining > 0 && (
              <ScoreRow
                icon="✨"
                label="Engagement bonuses"
                count=""
                weight="from others"
                total={remaining}
              />
            )}
          </div>
          <div className="px-4 py-2.5 border-t border-border bg-muted/30">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Score grows as people vote and engage with your content. Correct
              predictions are the fastest way to rise on the leaderboard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function ScoreRow({
  icon,
  label,
  count,
  weight,
  total,
  countExtra,
}: {
  icon: string;
  label: string;
  count: number | string;
  weight: string;
  total: number;
  countExtra?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/40 transition-colors">
      <div className="text-lg w-6 text-center flex-shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-xs font-semibold text-foreground truncate">{label}</p>
          {(typeof count === "number" || (typeof count === "string" && count.length > 0)) && (
            <span className="text-[10px] text-muted-foreground tabular-nums">
              {typeof count === "number" ? formatNumber(count) : count}
              {countExtra ? ` ${countExtra}` : ""}
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">{weight}</p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className="text-sm font-black tabular-nums text-foreground">+{formatNumber(total)}</p>
      </div>
    </div>
  );
}

function PredictionBadge({ correct }: { correct: boolean }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
        correct
          ? "bg-success/15 text-success border border-success/20"
          : "bg-danger/15 text-danger border border-danger/20"
      )}
    >
      {correct ? (
        <>
          <CheckIcon className="h-3 w-3" /> Correct
        </>
      ) : (
        <>
          <XIcon className="h-3 w-3" /> Incorrect
        </>
      )}
    </div>
  );
}

export const ProfilePageClient: React.FC<ProfilePageClientProps> = ({
  user,
}) => {
  const { data: session, status } = useSession();
  const { openLogin } = useLoginModal();
  const router = useRouter();
  const { show } = useToast();
  const utils = trpc.useUtils();

  const [activeTab, setActiveTab] = React.useState("posts");
  const [following, setFollowing] = React.useState(user.following);
  const [followersVisible, setFollowersVisible] = React.useState(false);
  const [followingVisible, setFollowingVisible] = React.useState(false);

  const isAuthenticated = status === "authenticated";
  const isSelf = user.isSelf;

  const predictionAccuracy =
    user.predictionsMade > 0
      ? Math.round((user.predictionsCorrect / user.predictionsMade) * 100)
      : null;

  const topCategoryId = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
  const bannerGradient =
    BANNER_COLORS[topCategoryId.id] ??
    "from-primary via-primary/80 to-accent";

  const displayName = user.displayName ?? user.username ?? "User";
  const username = user.username ?? "user";

  const followMutation = trpc.social.follow.useMutation({
    onSuccess: (data) => {
      setFollowing(!!data?.following);
      void utils.users.getByUsername.invalidate({ username: username ?? "" });
      show(
        data?.following
          ? `Following @${username}`
          : `Unfollowed @${username}`,
        "success"
      );
    },
    onError: () => {
      show("Action failed", "danger");
    },
  });

  const opinionsQuery = trpc.users.getOpinions.useInfiniteQuery(
    { userId: user.id, limit: 20 },
    {
      enabled: activeTab === "opinions",
      getNextPageParam: (lastPage: any) => lastPage.nextCursor,
      staleTime: 60_000,
    }
  );

  const predictionsQuery = trpc.users.getPredictions.useInfiniteQuery(
    { userId: user.id, limit: 20 },
    {
      enabled: activeTab === "predictions",
      getNextPageParam: (lastPage: any) => lastPage.nextCursor,
      staleTime: 60_000,
    }
  );

  const opinionItems = React.useMemo(
    () => (opinionsQuery.data?.pages ?? []).flatMap((p: any) => p.items ?? []),
    [opinionsQuery.data]
  );
  const predictionItems = React.useMemo(
    () => (predictionsQuery.data?.pages ?? []).flatMap((p: any) => p.items ?? []),
    [predictionsQuery.data]
  );

  const handleFollow = () => {
    if (!isAuthenticated) {
      openLogin({ type: "follow", userId: user.id });
      return;
    }
    if (isSelf) {
      router.push("/settings");
      return;
    }
    followMutation.mutate({ userId: user.id });
  };

  const handleShare = async () => {
    try {
      const url = `${window.location.origin}/profile/${username}`;
      await navigator.clipboard.writeText(url);
      show("Profile link copied!", "success");
    } catch {
      show("Failed to copy link", "danger");
    }
  };

  return (
    <AppShell requireAuth={false}>
      <div className="max-w-3xl mx-auto pb-8">
        <div className="relative">
          <div
            className={cn(
              "h-28 md:h-40 w-full bg-gradient-to-br bg-primary",
              bannerGradient
            )}
          />
          <div className="absolute inset-0 opacity-30 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))]" />
        </div>

        <div className="px-4 md:px-6 -mt-12 md:-mt-14 space-y-4">
          <div className="flex items-end justify-between gap-3">
            <div className="flex-shrink-0">
              <div className="p-1 rounded-2xl bg-card border-4 border-card shadow-elevated">
                <UserAvatar
                  size="2xl"
                  user={{
                    id: user.id,
                    displayName,
                    username,
                    avatarUrl: user.avatarUrl,
                    isVerified: user.isVerified,
                    role: user.role as any,
                  }}
                  showRoleBadge
                  showVerifiedBadge
                />
              </div>
            </div>
            <div className="flex items-center gap-2 pb-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                leftIcon={<Share2 className="h-4 w-4" />}
              >
                Share
              </Button>
              {isSelf ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => router.push("/settings")}
                  leftIcon={<Edit className="h-4 w-4" />}
                >
                  Edit Profile
                </Button>
              ) : (
                <Button
                  variant={following ? "outline" : "primary"}
                  size="sm"
                  onClick={handleFollow}
                  loading={followMutation.isPending}
                >
                  {following ? "Following" : "Follow"}
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {displayName}
                </h1>
                {user.isVerified && (
                  <Badge variant="info" size="md" className="gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified
                  </Badge>
                )}
                {typeof user.opinionScore === "number" && (
                  <ScoreDisplay
                    score={user.opinionScore}
                    totalPosts={user.totalPosts ?? 0}
                    totalVotes={user.totalVotes ?? 0}
                    predictionsCorrect={user.predictionsCorrect ?? 0}
                    predictionsMade={user.predictionsMade ?? 0}
                  />
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                @{username.replace(/^@/, "")}
              </p>
            </div>

            {user.bio && (
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {user.bio}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <span>
                Joined {formatRelativeTime(user.createdAt).replace(" ago", "")}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
              <button
                type="button"
                className="rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors p-3 text-left"
                onClick={() => setActiveTab("posts")}
              >
                <div className="text-lg font-bold text-foreground tabular-nums">
                  {formatNumber(user.postsCount)}
                </div>
                <div className="text-xs text-muted-foreground">Posts</div>
              </button>
              <button
                type="button"
                className="rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors p-3 text-left"
                onClick={() => setActiveTab("opinions")}
              >
                <div className="text-lg font-bold text-foreground tabular-nums">
                  {formatNumber(user.totalVotes ?? user.votesCount ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">Votes Given</div>
              </button>
              <button
                type="button"
                className="rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors p-3 text-left"
                onClick={() => setFollowersVisible(true)}
              >
                <div className="text-lg font-bold text-foreground tabular-nums">
                  {formatNumber(user.followersCount)}
                </div>
                <div className="text-xs text-muted-foreground">Followers</div>
              </button>
              <button
                type="button"
                className="rounded-xl border border-border bg-card hover:bg-muted/50 transition-colors p-3 text-left"
                onClick={() => setFollowingVisible(true)}
              >
                <div className="text-lg font-bold text-foreground tabular-nums">
                  {formatNumber(user.followingCount)}
                </div>
                <div className="text-xs text-muted-foreground">Following</div>
              </button>
              <div className="rounded-xl border border-border bg-card p-3 text-left">
                <div className="text-lg font-bold text-foreground tabular-nums">
                  {predictionAccuracy !== null ? `${predictionAccuracy}%` : "—"}
                </div>
                <div className="text-xs text-muted-foreground">
                  Prediction Accuracy
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full">
              <TabsTrigger value="posts" className="flex-1">
                Posts
              </TabsTrigger>
              <TabsTrigger value="opinions" className="flex-1">
                Opinions
              </TabsTrigger>
              {isSelf && (
                <TabsTrigger value="saved" className="flex-1">
                  Saved
                </TabsTrigger>
              )}
              <TabsTrigger value="predictions" className="flex-1">
                Predictions
              </TabsTrigger>
            </TabsList>

            <TabsContent value="posts" className="pt-2">
              <Feed
                feedType="listByUser"
                userId={user.id}
                className="!max-w-none"
                postCardClassName="!p-4 md:!p-5"
                onPostClick={(p) => router.push(`/post/${p.id}`)}
                showEndCard={false}
              />
            </TabsContent>

            <TabsContent value="opinions" className="pt-4 space-y-3">
              {opinionsQuery.isLoading && opinionItems.length === 0 && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="p-4">
                      <div className="h-4 w-full bg-muted animate-pulse rounded mb-2" />
                      <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                    </Card>
                  ))}
                </div>
              )}
              {!opinionsQuery.isLoading && opinionItems.length === 0 && (
                <EmptyState
                  icon={MessageCircleQuestion}
                  title="No opinions yet"
                  description={`@${username} hasn't voted on any questions yet.`}
                />
              )}
              {opinionItems.map((vote: any) => {
                const post = vote.post;
                if (!post) return null;
                return (
                  <Card key={vote.id} className="overflow-hidden">
                    <button
                      type="button"
                      onClick={() => router.push(`/post/${post.id}`)}
                      className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          <p className="text-sm font-semibold text-foreground line-clamp-2">
                            {post.question}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {vote.option?.label && (
                              <Badge variant="primary" size="sm">
                                {vote.option.label}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {formatNumber(post.voteCount ?? post._count?.votes ?? 0)} votes
                            </span>
                            <span className="text-xs text-muted-foreground">
                              · {formatRelativeTime(vote.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </Card>
                );
              })}
              {opinionsQuery.hasNextPage && (
                <div className="py-3 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void opinionsQuery.fetchNextPage()}
                    disabled={opinionsQuery.isFetchingNextPage}
                  >
                    {opinionsQuery.isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>

            {isSelf && (
              <TabsContent value="saved" className="pt-2">
                <Feed
                  feedType="saved"
                  className="!max-w-none"
                  postCardClassName="!p-4 md:!p-5"
                  onPostClick={(p) => router.push(`/post/${p.id}`)}
                />
              </TabsContent>
            )}

            <TabsContent value="predictions" className="pt-4 space-y-3">
              {predictionsQuery.isLoading && predictionItems.length === 0 && (
                <div className="space-y-3">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i} className="p-4">
                      <div className="h-4 w-full bg-muted animate-pulse rounded mb-2" />
                      <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                    </Card>
                  ))}
                </div>
              )}
              {!predictionsQuery.isLoading && predictionItems.length === 0 && (
                <EmptyState
                  icon={Award}
                  title="No predictions yet"
                  description={`@${username} hasn't made any predictions yet.`}
                />
              )}
              {predictionItems.map((result: any) => {
                const prediction = result.prediction;
                const post = prediction?.post;
                const votedCorrect = result.votedOptionId === prediction?.correctOptionId;
                if (!post) return null;
                return (
                  <Card key={result.id} className="overflow-hidden">
                    <button
                      type="button"
                      onClick={() => router.push(`/post/${post.id}`)}
                      className="w-full text-left p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0 space-y-2">
                          <p className="text-sm font-semibold text-foreground line-clamp-2">
                            {post.question}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap">
                            {result.votedOption?.label && (
                              <Badge variant="default" size="sm">
                                Your pick: {result.votedOption.label}
                              </Badge>
                            )}
                            {prediction?.correctOption?.label && (
                              <Badge variant="success" size="sm">
                                Answer: {prediction.correctOption.label}
                              </Badge>
                            )}
                            <PredictionBadge correct={votedCorrect} />
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {typeof result.score === "number" && result.score !== 0 && (
                              <span
                                className={cn(
                                  "font-semibold tabular-nums",
                                  result.score > 0 ? "text-success" : "text-danger"
                                )}
                              >
                                {result.score > 0 ? "+" : ""}
                                {result.score} pts
                              </span>
                            )}
                            <span>· {formatRelativeTime(result.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </Card>
                );
              })}
              {predictionsQuery.hasNextPage && (
                <div className="py-3 text-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void predictionsQuery.fetchNextPage()}
                    disabled={predictionsQuery.isFetchingNextPage}
                  >
                    {predictionsQuery.isFetchingNextPage ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load more"
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {followersVisible && (
        <FollowListModal
          title={`Followers of @${username}`}
          userId={user.id}
          type="followers"
          onClose={() => setFollowersVisible(false)}
        />
      )}
      {followingVisible && (
        <FollowListModal
          title={`@${username} is following`}
          userId={user.id}
          type="following"
          onClose={() => setFollowingVisible(false)}
        />
      )}
    </AppShell>
  );
};

function HiddenFeed({ userId }: { userId: string }) {
  const query = trpc.posts.listByUser.useQuery(
    { userId, limit: 1 },
    { enabled: false }
  );
  void query;
  return null;
}

function FollowListModal({
  title,
  userId,
  type,
  onClose,
}: {
  title: string;
  userId: string;
  type: "followers" | "following";
  onClose: () => void;
}) {
  const router = useRouter();
  const queryFn =
    type === "followers"
      ? trpc.social.followers.useInfiniteQuery
      : trpc.social.following.useInfiniteQuery;

  const query = queryFn(
    { userId, limit: 30 },
    {
      getNextPageParam: (lastPage: any) => lastPage.nextCursor,
      staleTime: 30_000,
    }
  ) as any;

  const items = React.useMemo(
    () =>
      (query.data?.pages ?? []).flatMap((p: any) => {
        const arr = p.items ?? [];
        return arr.map((f: any) => f.follower ?? f.following);
      }),
    [query.data]
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 animate-fadeIn flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-t-2xl sm:rounded-2xl shadow-popover max-w-lg w-full max-h-[80vh] flex flex-col animate-slideUp sm:animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-9 w-9 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center justify-center"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {query.isLoading && items.length === 0 && (
            <div className="space-y-2 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-2 rounded-xl"
                >
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-2 w-24 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {items.length === 0 && !query.isLoading && (
            <div className="py-12 text-center px-6">
              <p className="text-muted-foreground text-sm">
                {type === "followers"
                  ? "No followers yet."
                  : "Not following anyone yet."}
              </p>
            </div>
          )}
          {items.map((u: any) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                onClose();
                router.push(`/profile/${u.username}`);
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
            >
              <UserAvatar
                user={u}
                size="md"
                showVerifiedBadge
                showRoleBadge
              />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-semibold text-foreground truncate">
                  {u.displayName ?? u.username}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  @{u.username}
                </p>
              </div>
            </button>
          ))}
          {query.hasNextPage && (
            <div className="p-3 text-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => void query.fetchNextPage()}
                disabled={query.isFetchingNextPage}
              >
                {query.isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Load more"
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
