"use client";

import * as React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  Flame,
  TrendingUp,
  UserPlus,
  ArrowUp,
  ChevronRight,
} from "lucide-react";
import { useToast } from "@/components/design-system/Toaster";
import { useLoginModal } from "@/components/auth/LoginModal";
import { cn, formatNumber } from "@/lib/utils";
import { Card, CardContent } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Skeleton } from "@/components/design-system/Skeleton";
import { trpc } from "@/lib/trpc/client";
import { AdCard } from "@/components/ads/AdCard";

export interface RightRailProps {
  className?: string;
}

export const RightRail: React.FC<RightRailProps> = ({ className }) => {
  const { data: session, status } = useSession();
  const { openLogin } = useLoginModal();
  const { show } = useToast();
  const isAuthenticated = status === "authenticated";
  const utils = trpc.useUtils();

  const trendingQuery = trpc.feed.getTrending.useQuery(
    { timeRange: "24h", limit: 5 },
    { staleTime: 60_000 },
  );

  const suggestedQuery = trpc.social.suggestedUsers.useQuery(
    { limit: 4 },
    { staleTime: 60_000 },
  );

  const followMutation = trpc.social.follow.useMutation({
    onSuccess: async (data, vars) => {
      void utils.social.suggestedUsers.invalidate();
      void utils.social.following.invalidate();
      show(data?.following ? "Following user!" : "Unfollowed user", "success");
    },
    onError: (err) => {
      show(err.message ?? "Action failed", "danger");
    },
  });

  const trendingItems = trendingQuery.data ?? [];
  const suggestedItems = suggestedQuery.data ?? [];

  const isLoadingTrending = trendingQuery.isLoading;
  const isLoadingSuggested = suggestedQuery.isLoading;

  const handleFollow = (userId: string) => {
    if (!isAuthenticated) {
      openLogin({ type: "follow", userId });
      return;
    }
    followMutation.mutate({ userId });
  };

  return (
    <aside
      className={cn(
        "hidden xl:block fixed right-0 top-0 bottom-0 lg:w-80 xl:w-96 z-20 border-l border-border bg-background",
        className,
      )}
    >
      <div className="h-full overflow-y-auto scrollbar-thin">
        <div className="p-4 lg:p-6 space-y-6">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <Flame className="h-5 w-5 text-warning" />
                <h3 className="font-semibold">Trending Now</h3>
              </div>
              <div className="divide-y divide-border">
                {isLoadingTrending
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="p-4">
                        <Skeleton
                          variant="text"
                          className="h-4 w-full mb-2"
                        />
                        <div className="flex items-center gap-2">
                          <Skeleton variant="text" className="h-3 w-16" />
                          <Skeleton variant="text" className="h-3 w-12" />
                        </div>
                      </div>
                    ))
                  : trendingItems.map((post: any, index) => (
                      <Link
                        key={post.id}
                        href={`/post/${post.id}`}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
                      >
                        <span className="flex-shrink-0 w-6 text-center text-xs font-bold text-muted-foreground pt-0.5">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                            {post.question}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {post.category && (
                              <span className="text-xs text-muted-foreground">
                                {post.category.name}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-xs text-success">
                              <TrendingUp className="h-3 w-3" />
                              {formatNumber(post.voteCount ?? post._count?.votes ?? 0)}{" "}
                              votes
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </Link>
                    ))}
              </div>
              <Link
                href="/discover"
                className="flex items-center justify-center gap-1 px-4 py-3 text-sm text-primary hover:bg-muted/50 transition-colors border-t border-border font-medium"
              >
                View all trending
                <ChevronRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          <React.Suspense fallback={null}>
            <AdCard placement="DESKTOP_SIDEBAR" />
          </React.Suspense>

          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <UserPlus className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Who to Follow</h3>
              </div>
              <div className="divide-y divide-border">
                {isLoadingSuggested
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <Skeleton variant="circle" className="h-10 w-10" />
                        <div className="flex-1">
                          <Skeleton variant="text" className="h-4 w-24 mb-1" />
                          <Skeleton variant="text" className="h-3 w-16" />
                        </div>
                        <Skeleton
                          variant="rectangular"
                          className="h-8 w-20 rounded-md"
                        />
                      </div>
                    ))
                  : suggestedItems.length === 0
                  ? (
                      <div className="p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          Check back later for suggestions
                        </p>
                      </div>
                    )
                  : suggestedItems.map((u: any) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <Link
                          href={`/profile/${u.username}`}
                          className="flex-shrink-0"
                        >
                          <UserAvatar
                            user={{
                              id: u.id,
                              username: u.username,
                              displayName: u.displayName,
                              avatarUrl: u.avatarUrl,
                              isVerified: u.isVerified,
                            }}
                            size="md"
                          />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/profile/${u.username}`}
                            className="block hover:opacity-80"
                          >
                            <p className="text-sm font-semibold text-foreground truncate">
                              {u.displayName}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              @{u.username} ·{" "}
                              {formatNumber(u.totalPosts ?? u.totalVotes ?? 0)}{" "}
                              posts
                            </p>
                          </Link>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleFollow(u.id)}
                          disabled={followMutation.isPending}
                        >
                          <ArrowUp className="h-3 w-3 rotate-45" />
                          Follow
                        </Button>
                      </div>
                    ))}
              </div>
            </CardContent>
          </Card>

          <footer className="px-2 text-xs text-muted-foreground space-y-2 pb-4">
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              <Link
                href="/terms"
                className="hover:text-foreground hover:underline transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/privacy"
                className="hover:text-foreground hover:underline transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/about"
                className="hover:text-foreground hover:underline transition-colors"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="hover:text-foreground hover:underline transition-colors"
              >
                Contact
              </Link>
              <Link
                href="/help"
                className="hover:text-foreground hover:underline transition-colors"
              >
                Help Center
              </Link>
            </div>
            <p className="pt-1">© {new Date().getFullYear()} WHATDO. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </aside>
  );
};
