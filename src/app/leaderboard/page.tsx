"use client";

import * as React from "react";
import Link from "next/link";
import { Flame, Medal, ChevronLeft, ChevronRight, Crown, Trophy, Award } from "lucide-react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Skeleton } from "@/components/design-system/Skeleton";
import { formatNumber } from "@/lib/utils";

const PAGE_SIZE = 10;

interface LeaderboardUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  opinionScore?: number | null;
  totalVotes?: number | null;
  totalPosts?: number | null;
  predictionsCorrect?: number | null;
  predictionsMade?: number | null;
  rank?: number;
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 text-white shadow-md">
        <Crown className="w-4 h-4" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-sm">
        <Trophy className="w-4 h-4" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center h-9 w-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-700 text-white shadow-sm">
        <Award className="w-4 h-4" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center h-9 w-9 rounded-full bg-muted text-muted-foreground font-bold text-sm tabular-nums">
      #{rank}
    </div>
  );
}

export default function LeaderboardPage() {
  const { data: session } = useSession();
  const [page, setPage] = React.useState(0);

  const { data, isLoading, isError, refetch } = trpc.users.leaderboard.useQuery(
    { limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    { staleTime: 60_000 },
  );

  const users: LeaderboardUser[] = React.useMemo(() => {
    if (!data || !Array.isArray(data)) return [];
    return data.map((u: any, i: number) => ({
      ...u,
      rank: page * PAGE_SIZE + i + 1,
    }));
  }, [data, page]);

  const myUserId = session?.user?.id;

  const canPrev = page > 0;
  const canNext = !isLoading && Array.isArray(data) && data.length >= PAGE_SIZE;

  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-6 md:py-10 space-y-6">
        <header className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mb-3"
          >
            <ChevronLeft className="w-3 h-3" />
            Back to feed
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500 shadow-lg shadow-orange-500/20">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-foreground leading-tight">
                Opinion Leaderboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Top 100 contributors ranked by opinion score. Every vote, post, and correct prediction counts.
              </p>
            </div>
          </div>
        </header>

        <Card>
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Medal className="w-5 h-5 text-primary" />
                <h2 className="font-semibold">Top Users</h2>
              </div>
              <Badge variant="default" size="sm" className="bg-gradient-to-r from-orange-500/10 to-rose-500/10 text-orange-600 border-orange-500/20">
                <Flame className="w-3 h-3 mr-1" />
                Ranked by Opinion Score
              </Badge>
            </div>

            {isLoading && (
              <div className="divide-y divide-border">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <Skeleton variant="circle" className="h-9 w-9" />
                    <Skeleton variant="circle" className="h-11 w-11" />
                    <div className="flex-1 space-y-2">
                      <Skeleton variant="text" className="h-4 w-48" />
                      <Skeleton variant="text" className="h-3 w-32" />
                    </div>
                    <Skeleton variant="text" className="h-5 w-16" />
                  </div>
                ))}
              </div>
            )}

            {!isLoading && isError && (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Failed to load leaderboard
                </p>
                <Button size="sm" onClick={() => refetch()}>
                  Retry
                </Button>
              </div>
            )}

            {!isLoading && !isError && users.length === 0 && (
              <div className="p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No users ranked yet. Be the first to cast votes and post polls!
                </p>
              </div>
            )}

            {!isLoading && !isError && users.length > 0 && (
              <>
                <ul className="divide-y divide-border">
                  {users.map((u) => {
                    const isMe = u.id === myUserId;
                    const score = u.opinionScore ?? 0;
                    return (
                      <li
                        key={u.id}
                        className={
                          "flex items-center gap-4 px-5 py-4 transition-colors " +
                          (isMe
                            ? "bg-primary/5 ring-1 ring-inset ring-primary/10"
                            : "hover:bg-muted/30")
                        }
                        style={
                          mounted
                            ? ({
                                opacity: 1,
                                transform: "translateY(0)",
                                transition: `opacity 300ms ease-out ${u.rank! * 20}ms, transform 300ms ease-out ${u.rank! * 20}ms`,
                              } as React.CSSProperties)
                            : ({ opacity: 0, transform: "translateY(4px)" } as React.CSSProperties)
                        }
                      >
                        <RankBadge rank={u.rank!} />
                        <Link
                          href={`/profile/${u.username}`}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <UserAvatar
                            user={{
                              id: u.id,
                              username: u.username,
                              displayName: u.displayName,
                              avatarUrl: u.avatarUrl,
                              isVerified: u.isVerified,
                            }}
                            size="lg"
                            className={u.rank! <= 3 ? "ring-2 ring-offset-2 ring-offset-background ring-amber-400 rounded-full" : undefined}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {u.displayName || `@${u.username}`}
                              </p>
                              {u.isVerified && (
                                <Badge variant="info" size="sm">
                                  Verified
                                </Badge>
                              )}
                              {isMe && (
                                <Badge variant="default" size="sm" className="bg-primary/10 text-primary border-primary/20">
                                  You
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              @{u.username} · {formatNumber(u.totalPosts ?? 0)} posts · {formatNumber(u.totalVotes ?? 0)} votes
                              {(u.predictionsMade ?? 0) > 0 && (
                                <span className="ml-1">
                                  · {formatNumber(u.predictionsCorrect ?? 0)}/{formatNumber(u.predictionsMade ?? 0)} predictions
                                </span>
                              )}
                            </p>
                          </div>
                        </Link>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Flame className="w-3.5 h-3.5 text-orange-500" />
                              <span className="font-black text-lg tabular-nums text-foreground">
                                {formatNumber(score)}
                              </span>
                            </div>
                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Opinion Score
                            </p>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <div className="flex items-center justify-between px-5 py-4 border-t border-border bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Showing{" "}
                    <span className="font-semibold text-foreground tabular-nums">
                      {page * PAGE_SIZE + 1}-{page * PAGE_SIZE + users.length}
                    </span>{" "}
                    of top 100
                  </p>
                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canPrev}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Prev
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!canNext}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
