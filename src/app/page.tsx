"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLoginModal } from "@/components/auth/LoginModal";
import { Button } from "@/components/design-system/Button";
import { SkeletonCard } from "@/components/design-system/Skeleton";
import { ReelsPostCard } from "@/components/feed/ReelsPostCard";
import { BottomNav } from "@/components/layout/BottomNav";
import { trpc } from "@/lib/trpc/client";
import { Sparkles,
  LogIn,
  ChevronRight,
  Flame,
  LogIn as LoginIcon,
  User as UserIcon,
  Search,
  LogOut,
  Settings as SettingsIcon,
  Bookmark,
  ChevronDown,
  Clock,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { cn } from "@/lib/utils";
import { PullToRefresh } from "@/components/feed/PullToRefresh";
import { ReelsViewerModal } from "@/components/feed/ReelsViewerModal";

function ReelsSkeleton() {
  return (
    <div className="snap-start snap-always w-full h-[100dvh] flex items-center justify-center bg-gradient-to-br from-muted/60 via-background to-card">
      <div className="w-full max-w-sm space-y-4 px-4">
        <SkeletonCard className="h-[80vh] w-full rounded-3xl" />
      </div>
    </div>
  );
}

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { openLogin } = useLoginModal();
  const utils = trpc.useUtils();
  const isAuthenticated = status === "authenticated";
  const reelsRef = React.useRef<HTMLDivElement | null>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [sortMode, setSortMode] = React.useState<"foryou" | "latest">("foryou");
  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = React.useState(0);
  const user = session?.user as any;

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = React.useCallback(async () => {
    try {
      await signOut({ redirect: false, callbackUrl: "/" });
    } catch {}
    router.push("/feed");
    router.refresh();
  }, [router]);

  const trendingQuery = trpc.feed.getTrending.useQuery(
    { timeRange: "7d", limit: 30 },
    {
      staleTime: 60_000,
      refetchOnMount: true,
    },
  );

  const forYouQuery = trpc.feed.getForYou.useInfiniteQuery(
    { limit: 20 },
    {
      enabled: isAuthenticated && sortMode === "foryou",
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 10_000,
    },
  );

  const latestQuery = trpc.feed.getNew.useInfiniteQuery(
    { limit: 20 },
    {
      enabled: sortMode === "latest",
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 10_000,
    },
  );

  const items: any[] = React.useMemo(() => {
    const rawItems: any[] = [];
    if (sortMode === "latest") {
      const pages = (latestQuery.data as any)?.pages ?? [];
      const flat = pages.flatMap((p: any) => p.items ?? []);
      rawItems.push(...flat);
    } else if (isAuthenticated) {
      const pages = (forYouQuery.data as any)?.pages ?? [];
      const flat = pages.flatMap((p: any) => p.items ?? []);
      rawItems.push(...flat);
    }
    if (rawItems.length === 0) {
      const trending = trendingQuery.data ?? [];
      if (Array.isArray(trending) && trending.length > 0) {
        rawItems.push(...trending);
      }
    }
    const isCuid = (id: unknown) =>
      typeof id === "string" && /^c[a-z0-9]{24}$/.test(id);
    return rawItems.filter((p) => isCuid(p?.id));
  }, [sortMode, isAuthenticated, forYouQuery.data, latestQuery.data, trendingQuery.data]);

  const activeQuery = sortMode === "latest" ? latestQuery : forYouQuery;

  const isLoading =
    (sortMode === "latest" && latestQuery.isLoading) ||
    (sortMode === "foryou" && isAuthenticated && forYouQuery.isLoading) ||
    (!isAuthenticated && sortMode === "foryou" && trendingQuery.isLoading);
  const showSkeleton = isLoading || !isHydrated;

  const handlePostClick = (post: any, index: number) => {
    setViewerInitialIndex(index);
    setViewerOpen(true);
  };

  const handleVoteSuccess = (postId: string) => {
    void utils.feed.getTrending.invalidate();
  };

  const isRefreshing =
    trendingQuery.isFetching ||
    (sortMode === "latest" ? latestQuery.isRefetching : forYouQuery.isRefetching);

  const handleRefresh = React.useCallback(async () => {
    void utils.feed.getTrending.invalidate();
    const promises: Promise<unknown>[] = [];
    if (sortMode === "latest") {
      if (typeof (latestQuery as any).refetch === "function") {
        promises.push((latestQuery as any).refetch() as Promise<unknown>);
      }
    } else {
      if (typeof (forYouQuery as any).refetch === "function") {
        promises.push((forYouQuery as any).refetch() as Promise<unknown>);
      }
    }
    await Promise.all(promises);
  }, [sortMode, latestQuery, forYouQuery, utils]);

  const hasNextPage = (activeQuery as any).hasNextPage ?? false;
  const isFetchingNextPage = (activeQuery as any).isFetchingNextPage ?? false;
  const rawFetchNextPage = (activeQuery as any).fetchNextPage;
  const fetchNextPage = React.useCallback(async () => {
    if (typeof rawFetchNextPage === "function") {
      await rawFetchNextPage();
    }
  }, [rawFetchNextPage]);

  const handleSortChange = (next: "foryou" | "latest") => {
    if (next === sortMode) return;
    setSortMode(next);
    const el = reelsRef.current;
    if (el) {
      el.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  React.useEffect(() => {
    const el = reelsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(
              (entry.target as HTMLElement).dataset.reelsIndex,
            );
            if (!Number.isNaN(idx)) {
              setActiveIndex(idx);
            }
            if (
              isAuthenticated &&
              hasNextPage &&
              !isFetchingNextPage &&
              idx >= items.length - 3
            ) {
              void fetchNextPage();
            }
          }
        });
      },
      {
        threshold: 0.6,
      },
    );
    el.querySelectorAll("[data-reels-index]").forEach((child) => {
      io.observe(child);
    });
    return () => io.disconnect();
  }, [
    items.length,
    isAuthenticated,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ]);

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-black md:bg-background">
      {/* Top brand bar (over reels) */}
      <header className="fixed top-0 inset-x-0 z-50 pointer-events-none">
        <div className="pointer-events-auto bg-gradient-to-b from-black/90 via-black/55 to-transparent pt-3 pb-7 px-4">
          {/* ROW 1: Brand + Search + Profile (clean, no clutter, Trending button removed — already in bottom tab bar) */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0 shrink-0">
              <Link href="/" className="flex items-center gap-2 shrink-0">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                  <span className="text-white font-black text-base">W</span>
                </div>
                <span className="font-black text-lg tracking-tight text-white drop-shadow-lg">
                  WHATDO
                </span>
              </Link>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => router.push("/discover")}
                className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Search / Discover"
              >
                <Search className="h-4 w-4" />
              </button>
              {!isAuthenticated ? (
                <Button
                  size="sm"
                  onClick={() => openLogin()}
                  className="h-9 px-4 rounded-full bg-white text-black border-0 shadow-lg shadow-black/20 hover:bg-white/90 gap-1.5"
                  leftIcon={<LogIn className="h-4 w-4" />}
                >
                  Login
                </Button>
              ) : (
                <div ref={menuRef} className="relative">
                  <button
                    type="button"
                    onClick={() => setMenuOpen((prev) => !prev)}
                    className="flex items-center gap-1.5 h-9 pl-1 pr-2 rounded-full bg-white/10 backdrop-blur-md border border-white/15 hover:bg-white/20 transition-colors"
                    aria-label="Profile menu"
                  >
                    <UserAvatar user={user} size="xs" />
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 text-white/80 transition-transform duration-200",
                        menuOpen && "rotate-180",
                      )}
                    />
                  </button>

                  {menuOpen && (
                    <div className="absolute right-0 top-full mt-2 z-50 w-52 rounded-xl border border-white/15 bg-neutral-900/95 backdrop-blur-2xl shadow-2xl animate-scaleIn">
                      <div className="p-3 border-b border-white/10">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={user} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              {user?.displayName ?? user?.name ?? "User"}
                            </p>
                            <p className="text-xs text-white/60 truncate">
                              @{user?.username ?? "guest"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-1">
                        <Link
                          href="/profile/me"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                        >
                          <UserIcon className="h-4 w-4 text-white/60" />
                          <span>Profile</span>
                        </Link>
                        <Link
                          href="/saved"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                        >
                          <Bookmark className="h-4 w-4 text-white/60" />
                          <span>Saved Posts</span>
                        </Link>
                        <Link
                          href="/settings"
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-white hover:bg-white/10 transition-colors"
                        >
                          <SettingsIcon className="h-4 w-4 text-white/60" />
                          <span>Settings</span>
                        </Link>
                      </div>
                      <div className="p-1 border-t border-white/10">
                        <button
                          type="button"
                          onClick={() => {
                            setMenuOpen(false);
                            handleLogout();
                          }}
                          className="flex items-center gap-2.5 w-full rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Log out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ROW 2: Feed sort (For You / Latest) LEFT-ALIGNED — no overlap with question heading below; pt-[4.6rem] in ReelsPostCard covers it */}
          <div className="mt-2 flex items-center gap-1.5">
            <div className="inline-flex items-center rounded-full bg-white/12 backdrop-blur-md border border-white/18 p-0.5 shadow-lg shadow-black/20">
              <button
                type="button"
                onClick={() => handleSortChange("foryou")}
                className={cn(
                  "inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-bold transition-all whitespace-nowrap",
                  sortMode === "foryou"
                    ? "bg-white text-black shadow"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                )}
                aria-pressed={sortMode === "foryou"}
              >
                <Sparkles className="h-3 w-3 shrink-0" />
                <span className="leading-none">For You</span>
              </button>
              <button
                type="button"
                onClick={() => handleSortChange("latest")}
                className={cn(
                  "inline-flex items-center gap-1.5 h-7 px-3 rounded-full text-[11px] font-bold transition-all whitespace-nowrap",
                  sortMode === "latest"
                    ? "bg-white text-black shadow"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                )}
                aria-pressed={sortMode === "latest"}
              >
                <Clock className="h-3 w-3 shrink-0" />
                <span className="leading-none">Latest</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Reels snap-scroll container (wrapped with PullToRefresh) */}
      <PullToRefresh
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        scrollRef={reelsRef as unknown as React.RefObject<HTMLElement>}
        className="w-full h-[100dvh] relative"
      >
      <div
        ref={reelsRef}
        className={cn(
          "w-full h-[100dvh] overflow-y-scroll snap-y snap-mandatory",
          "scroll-smooth scrollbar-hide",
        )}
        style={
          {
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties
        }
      >
        {showSkeleton && (
          <>
            <ReelsSkeleton />
            <ReelsSkeleton />
            <ReelsSkeleton />
          </>
        )}

        {!showSkeleton && items.length === 0 && (
          <div className="snap-start snap-always w-full h-[100dvh] flex items-center justify-center px-6">
            <div className="text-center max-w-sm space-y-5 p-8 rounded-3xl bg-card border border-border/50 backdrop-blur">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">
                Welcome to WHATDO
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ask questions, vote on thousands of opinions, and see
                real-time results on what the world actually thinks.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                <Button
                  size="lg"
                  onClick={() => openLogin()}
                  rightIcon={<ChevronRight className="h-5 w-5" />}
                  className="px-7 shadow-xl shadow-primary/20"
                >
                  Create your questions
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => router.push("/trending")}
                >
                  Browse trending
                </Button>
              </div>
            </div>
          </div>
        )}

        {!showSkeleton &&
          items.map((post: any, idx: number) => (
            <div key={post.id || idx} data-reels-index={idx}>
              <ReelsPostCard
                post={post}
                index={idx}
                onClick={handlePostClick}
                onVoteSuccess={handleVoteSuccess}
              />
            </div>
          ))}

        {!showSkeleton && isFetchingNextPage && <ReelsSkeleton />}

        {/* End card */}
        {!showSkeleton && !hasNextPage && items.length > 0 && (
          <div className="snap-start snap-always w-full h-[100dvh] flex items-center justify-center px-6">
            <div className="text-center max-w-sm space-y-5 p-8 rounded-3xl bg-card/90 backdrop-blur border border-border/50">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center">
                <Flame className="h-8 w-8 text-emerald-400" />
              </div>
              <h3 className="text-2xl font-black tracking-tight">
                You&apos;ve scrolled to the end 🎉
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {isAuthenticated
                  ? "More content coming — try asking your own questions to spark conversation!"
                  : "Create a free account to unlock a personalized feed and thousands more questions."}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
                {isAuthenticated ? (
                  <Button
                    size="lg"
                    onClick={() => router.push("/ask")}
                    rightIcon={<ChevronRight className="h-5 w-5" />}
                  >
                    Ask a question
                  </Button>
                ) : (
                  <>
                    <Button
                      size="lg"
                      onClick={() => openLogin({ type: "create_post" })}
                      leftIcon={<LoginIcon className="h-5 w-5" />}
                      rightIcon={<ChevronRight className="h-5 w-5" />}
                      className="shadow-xl shadow-primary/20"
                    >
                      Sign up free
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => {
                        if (reelsRef.current) {
                          reelsRef.current.scrollTo({
                            top: 0,
                            behavior: "smooth",
                          });
                        }
                      }}
                    >
                      Back to top
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      </PullToRefresh>

      {/* Full-screen reels viewer modal: opens on post click, swipe up/down between posts */}
      <ReelsViewerModal
        open={viewerOpen}
        onClose={() => setViewerOpen(false)}
        items={items}
        initialIndex={viewerInitialIndex}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
        onVoteSuccess={handleVoteSuccess}
      />

      {/* Bottom navigation (Instagram style) */}
      <BottomNav />
    </main>
  );
}
