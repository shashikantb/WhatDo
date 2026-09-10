"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw, MessageCircleQuestion, Bookmark } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { SkeletonCard } from "@/components/design-system/Skeleton";
import { Button } from "@/components/design-system/Button";
import { cn } from "@/lib/utils";
import { PostCard } from "./PostCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { useLoginModal } from "@/components/auth/LoginModal";
import { AdCard } from "@/components/ads/AdCard";
import { trackEvent } from "@/lib/analytics";

export type FeedType =
  | "forYou"
  | "following"
  | "trending"
  | "new"
  | "category"
  | "saved"
  | "listByUser";

export type TrendingTimeRange = "1h" | "24h" | "7d";

export interface FeedProps {
  feedType: FeedType;
  categorySlug?: string;
  userId?: string;
  timeRange?: TrendingTimeRange;
  className?: string;
  postCardClassName?: string;
  onPostClick?: (post: any, index: number) => void;
  onVoteSuccess?: (postId: string) => void;
  adEveryNPosts?: number;
  showEndCard?: boolean;
}

const PAGE_SIZE = 20;
const DEFAULT_AD_EVERY = 10;
const SKELETON_COUNT = 5;

function TabSkeleton() {
  return (
    <div className="space-y-4 py-4">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <SkeletonCard key={i} className="mb-4" />
      ))}
    </div>
  );
}

function FeedErrorCard({
  onRetry,
  message,
}: {
  onRetry: () => void;
  message?: string;
}) {
  return (
    <div className="border border-danger/20 bg-danger/5 rounded-card p-6 text-center space-y-4">
      <div className="flex justify-center">
        <div className="h-12 w-12 rounded-full bg-danger/10 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-danger" />
        </div>
      </div>
      <div>
        <p className="font-semibold text-foreground">Trouble loading feed</p>
        <p className="text-sm text-muted-foreground mt-1">
          {message ||
            "Something went wrong while loading posts. Please try again."}
        </p>
      </div>
      <Button
        variant="primary"
        onClick={onRetry}
        leftIcon={<RefreshCw className="w-4 h-4" />}
      >
        Try again
      </Button>
    </div>
  );
}

function AdSlot({ index }: { index: number }) {
  return (
    <React.Suspense fallback={null}>
      <AdCard placement="FEED_EVERY_N" key={`ad-${index}`} />
    </React.Suspense>
  );
}

function EndCard({ onAskClick }: { onAskClick: () => void }) {
  return (
    <div className="my-6 rounded-lg border border-border bg-muted/30 p-6 text-center space-y-3">
      <p className="text-sm font-medium text-foreground">
        You&apos;ve reached the end. 🎉
      </p>
      <p className="text-xs text-muted-foreground">
        Be the spark — ask a question people want to weigh in on.
      </p>
      <Button
        variant="primary"
        size="sm"
        onClick={onAskClick}
        leftIcon={<MessageCircleQuestion className="w-4 h-4" />}
      >
        Create your own question
      </Button>
    </div>
  );
}

export const Feed: React.FC<FeedProps> = ({
  feedType,
  categorySlug,
  userId,
  timeRange = "24h",
  className,
  postCardClassName,
  onPostClick,
  onVoteSuccess,
  adEveryNPosts = DEFAULT_AD_EVERY,
  showEndCard = true,
}) => {
  const { data: session, status } = useSession();
  const { openLogin } = useLoginModal();
  const router = useRouter();
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const feedRef = React.useRef<HTMLDivElement | null>(null);
  const isAuthenticated = status === "authenticated";

  const forYouQuery = trpc.feed.getForYou.useInfiniteQuery(
    { limit: PAGE_SIZE },
    {
      enabled: feedType === "forYou",
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 5_000,
    },
  );

  const followingQuery = trpc.feed.getFollowing.useInfiniteQuery(
    { limit: PAGE_SIZE },
    {
      enabled: feedType === "following" && isAuthenticated,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 5_000,
    },
  );

  const trendingRaw = trpc.feed.getTrending.useQuery(
    { timeRange, limit: PAGE_SIZE },
    {
      enabled: feedType === "trending",
      staleTime: 5_000,
    },
  );

  const trendingQuery = React.useMemo(() => {
    const pages = trendingRaw.data ? [trendingRaw.data] : [];
    return {
      ...trendingRaw,
      data: { pages, pageParams: [undefined] },
      hasNextPage: false,
      isFetchingNextPage: false,
      fetchNextPage: async () => {},
    };
  }, [trendingRaw]);

  const newQuery = trpc.feed.getNew.useInfiniteQuery(
    { limit: PAGE_SIZE },
    {
      enabled: feedType === "new",
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 5_000,
    },
  );

  const categoryQuery = trpc.feed.getByCategory.useInfiniteQuery(
    { slug: categorySlug ?? "", limit: PAGE_SIZE },
    {
      enabled: feedType === "category" && !!categorySlug,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 5_000,
    },
  );

  const listByUserQuery = trpc.posts.listByUser.useInfiniteQuery(
    { userId: userId ?? "", limit: PAGE_SIZE },
    {
      enabled: feedType === "listByUser" && !!userId,
      getNextPageParam: (lastPage: any) => lastPage.nextCursor,
      staleTime: 5_000,
    },
  );

  const savedQuery = trpc.users.getSaved.useInfiniteQuery(
    { limit: PAGE_SIZE },
    {
      enabled: feedType === "saved" && isAuthenticated,
      getNextPageParam: (lastPage: any) => lastPage.nextCursor,
      staleTime: 5_000,
    },
  );

  const activeQuery = (() => {
    switch (feedType) {
      case "forYou":
        return forYouQuery;
      case "following":
        return followingQuery;
      case "trending":
        return trendingQuery as any;
      case "new":
        return newQuery;
      case "category":
        return categoryQuery;
      case "listByUser":
        return listByUserQuery;
      case "saved":
        return savedQuery;
      default:
        return {
          data: undefined,
          isLoading: false,
          isError: false,
          error: null,
          hasNextPage: false,
          isFetchingNextPage: false,
          fetchNextPage: async () => {},
          refetch: async () => {},
        } as any;
    }
  })();

  const items: any[] = React.useMemo(() => {
    const pages = (activeQuery.data as any)?.pages ?? [];
    if (feedType === "trending") {
      return pages.flatMap((p: any) => (Array.isArray(p) ? p : p.items ?? []));
    }
    if (feedType === "saved") {
      return pages.flatMap((p: any) =>
        (p.items ?? []).map((sp: any) => sp.post)
      );
    }
    return pages.flatMap((p: any) => p.items ?? []);
  }, [feedType, activeQuery.data]);

  const hasNextPage = (activeQuery as any).hasNextPage ?? false;
  const isFetchingNextPage =
    (activeQuery as any).isFetchingNextPage ?? false;
  const isLoading = activeQuery.isLoading ?? false;
  const isError = activeQuery.isError ?? false;
  const error = activeQuery.error ?? null;
  const fetchNextPage =
    (activeQuery as any).fetchNextPage ?? (async () => {});
  const refetch = activeQuery.refetch ?? (async () => {});

  const prefetchIndex = items.length > 3 ? items.length - 3 : 0;

  const lastSentRef = React.useRef(0);
  React.useEffect(() => {
    if (items.length === 0) return;
    const now = Date.now();
    if (now - lastSentRef.current < 5000) return;
    lastSentRef.current = now;
    try {
      trackEvent("feed_impression", {
        feedType,
        categorySlug: categorySlug ?? null,
        userId: userId ?? null,
        itemCount: items.length,
      });
    } catch {
    }
  }, [items.length, feedType, categorySlug, userId]);

  const triggerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage || isLoading) return;
      sentinelRef.current = node;
    },
    [isFetchingNextPage, isLoading],
  );

  React.useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (
            entry.isIntersecting &&
            hasNextPage &&
            !isFetchingNextPage &&
            !isLoading
          ) {
            void fetchNextPage();
          }
        });
      },
      { threshold: 0.1, rootMargin: "400px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage, items.length]);

  const retry = React.useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleAskClick = () => {
    if (!isAuthenticated) {
      openLogin({ type: "create_post" });
      return;
    }
    router.push("/ask");
  };

  const isFollowingEmpty =
    feedType === "following" && !isAuthenticated;

  return (
    <div
      className={cn(
        "w-full mx-auto",
        "max-w-[640px] lg:max-w-[720px] xl:max-w-[760px]",
        className,
      )}
      ref={feedRef}
    >
      <div className="px-4 sm:px-5 md:px-6 py-4 md:py-5 space-y-4">
        {isLoading && items.length === 0 && <TabSkeleton />}

        {isError && items.length === 0 && (
          <FeedErrorCard
            onRetry={retry}
            message={(error as any)?.message || undefined}
          />
        )}

        {isFollowingEmpty && items.length === 0 && (
          <EmptyState
            title="Follow people to see posts"
            description="Sign in and follow creators to fill your Following feed with questions you care about."
            actionButton={{
              label: "Sign in",
              onClick: () => openLogin({ type: "follow" }),
              variant: "primary",
            }}
            secondaryButton={{
              label: "Explore For You",
              onClick: () => router.push("/feed"),
            }}
          />
        )}

        {!isLoading &&
          !isError &&
          !isFollowingEmpty &&
          items.length === 0 &&
          feedType === "saved" && (
            <EmptyState
              icon={Bookmark}
              title="No saved posts yet"
              description="Save opinions you want to revisit by tapping the bookmark icon. They'll appear here."
              actionButton={{
                label: "Browse Feed",
                onClick: () => router.push("/feed"),
                variant: "primary",
              }}
              secondaryButton={{
                label: "Discover Posts",
                onClick: () => router.push("/discover"),
              }}
            />
          )}

        {!isLoading &&
          !isError &&
          !isFollowingEmpty &&
          items.length === 0 &&
          feedType !== "saved" && (
            <EmptyState
              icon={MessageCircleQuestion}
              title="Nothing here yet."
              description="Be the first to ask a question and get the conversation started."
              actionButton={{
                label: "Ask People",
                onClick: handleAskClick,
                variant: "primary",
              }}
            />
          )}

        {items.map((post, idx) => {
          const showAd =
            adEveryNPosts > 0 && idx > 0 && (idx + 1) % adEveryNPosts === 0;
          return (
            <React.Fragment key={post.id || idx}>
              {showAd && <AdSlot index={idx} />}
              <React.Suspense fallback={<SkeletonCard className="mb-2" />}>
                <PostCard
                  post={post}
                  index={idx}
                  onClick={onPostClick}
                  onVoteSuccess={onVoteSuccess}
                  className={postCardClassName}
                />
              </React.Suspense>
              {idx < items.length - 1 && <div className="h-2" />}
              {idx === prefetchIndex && hasNextPage && (
                <div
                  ref={triggerRef}
                  aria-hidden="true"
                  className="h-1"
                />
              )}
            </React.Fragment>
          );
        })}

        {isFetchingNextPage && <TabSkeleton />}

        {hasNextPage && !isFetchingNextPage && (
          <div
            ref={(node) => {
              if (items.length <= prefetchIndex) {
                triggerRef(node);
              }
            }}
            aria-hidden="true"
            className="h-10 flex items-center justify-center"
          >
            <span className="text-xs text-muted-foreground">Loading more...</span>
          </div>
        )}

        {!hasNextPage && items.length > 0 && !isLoading && showEndCard && (
          <EndCard onAskClick={handleAskClick} />
        )}
      </div>
    </div>
  );
};
