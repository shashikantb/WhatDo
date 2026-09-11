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
import {
  Sparkles,
  LogIn,
  ChevronRight,
  Flame,
  LogIn as LoginIcon,
  User as UserIcon,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SAMPLE_POSTS = [
  {
    id: "sample-1",
    type: "YES_NO",
    question: "Should AI-generated content be labeled clearly on social media?",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
    voteCount: 12847,
    commentCount: 342,
    likeCount: 587,
    saveCount: 192,
    shareCount: 84,
    isAnonymous: false,
    isClosed: false,
    category: {
      id: "cat-ai",
      name: "AI",
      slug: "ai",
      icon: "🤖",
      color: "#8B5CF6",
    },
    creator: {
      id: "u-1",
      username: "techthinker",
      displayName: "Tech Thinker",
      avatarUrl: null,
      isVerified: true,
      opinionScore: 2480,
    },
    tags: ["airegulation", "socialmedia"],
    options: [
      { id: "o1", label: "Yes, always", voteCount: 8942, color: "#10B981" },
      { id: "o2", label: "No, too complex", voteCount: 3905, color: "#EF4444" },
    ],
    media: [],
    userVote: null,
    userLiked: false,
    userSaved: false,
  },
  {
    id: "sample-2",
    type: "MULTIPLE_CHOICE",
    question: "Which do you prefer for building apps in 2025?",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8),
    voteCount: 7241,
    commentCount: 189,
    likeCount: 231,
    saveCount: 87,
    shareCount: 34,
    isAnonymous: false,
    isClosed: false,
    category: {
      id: "cat-tech",
      name: "Technology",
      slug: "technology",
      icon: "💻",
      color: "#0EA5E9",
    },
    creator: {
      id: "u-2",
      username: "devlife",
      displayName: "Dev Life",
      avatarUrl: null,
      isVerified: false,
      opinionScore: 942,
    },
    tags: ["webdev", "frameworks"],
    options: [
      { id: "o1", label: "Next.js", voteCount: 3102, color: "#000000" },
      { id: "o2", label: "Remix", voteCount: 1054, color: "#000000" },
      { id: "o3", label: "SvelteKit", voteCount: 1835, color: "#FF3E00" },
      { id: "o4", label: "Astro", voteCount: 1250, color: "#FF5D01" },
    ],
    media: [],
    userVote: null,
    userLiked: false,
    userSaved: false,
  },
  {
    id: "sample-3",
    type: "YES_NO",
    question: "Would you work 4 days a week for 85% pay?",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12),
    voteCount: 24509,
    commentCount: 1203,
    likeCount: 1892,
    saveCount: 643,
    shareCount: 287,
    isAnonymous: false,
    isClosed: false,
    category: {
      id: "cat-biz",
      name: "Business",
      slug: "business",
      icon: "💼",
      color: "#059669",
    },
    creator: {
      id: "u-3",
      username: "careersage",
      displayName: "Career Sage",
      avatarUrl: null,
      isVerified: true,
      opinionScore: 5120,
    },
    tags: ["remotework", "4dayweek"],
    options: [
      { id: "o1", label: "Absolutely yes", voteCount: 19890, color: "#10B981" },
      { id: "o2", label: "Prefer 5 days full pay", voteCount: 4619, color: "#EF4444" },
    ],
    media: [],
    userVote: null,
    userLiked: false,
    userSaved: false,
  },
  {
    id: "sample-4",
    type: "YES_NO",
    question: "Will we achieve true AGI (human-level) within 10 years?",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
    voteCount: 18321,
    commentCount: 902,
    likeCount: 1200,
    saveCount: 450,
    shareCount: 312,
    isAnonymous: false,
    isClosed: false,
    category: {
      id: "cat-future",
      name: "Future",
      slug: "future",
      icon: "🚀",
      color: "#F59E0B",
    },
    creator: {
      id: "u-4",
      username: "futurologist",
      displayName: "Future Mind",
      avatarUrl: null,
      isVerified: true,
      opinionScore: 8100,
    },
    tags: ["ai", "agi", "futuretech"],
    options: [
      { id: "o1", label: "Yes, within 10 years", voteCount: 6200, color: "#10B981" },
      { id: "o2", label: "No, not this decade", voteCount: 12121, color: "#EF4444" },
    ],
    media: [],
    userVote: null,
    userLiked: false,
    userSaved: false,
  },
  {
    id: "sample-5",
    type: "MULTIPLE_CHOICE",
    question: "Which cuisine do you prefer for Friday night dinner?",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36),
    voteCount: 9210,
    commentCount: 612,
    likeCount: 410,
    saveCount: 180,
    shareCount: 102,
    isAnonymous: true,
    isClosed: false,
    category: {
      id: "cat-food",
      name: "Food",
      slug: "food",
      icon: "🍕",
      color: "#EC4899",
    },
    creator: {
      id: "u-5",
      username: "foodieanon",
      displayName: "Hungry Soul",
      avatarUrl: null,
      isVerified: false,
    },
    tags: ["food", "weekend", "dinner"],
    options: [
      { id: "o1", label: "Italian 🍝", voteCount: 2810, color: "#EF4444" },
      { id: "o2", label: "Japanese 🍣", voteCount: 2600, color: "#3B82F6" },
      { id: "o3", label: "Indian 🍛", voteCount: 2300, color: "#F59E0B" },
      { id: "o4", label: "Mexican 🌮", voteCount: 1500, color: "#10B981" },
    ],
    media: [],
    userVote: null,
    userLiked: false,
    userSaved: false,
  },
  {
    id: "sample-6",
    type: "PREDICTION",
    question: "Where will Bitcoin end 2026?",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48),
    voteCount: 4821,
    commentCount: 210,
    likeCount: 290,
    saveCount: 170,
    shareCount: 98,
    isAnonymous: false,
    isClosed: false,
    category: {
      id: "cat-finance",
      name: "Finance",
      slug: "finance",
      icon: "📈",
      color: "#6366F1",
    },
    creator: {
      id: "u-6",
      username: "cryptoking",
      displayName: "Options King",
      avatarUrl: null,
      isVerified: true,
      opinionScore: 3410,
    },
    tags: ["crypto", "btc", "prediction"],
    options: [
      { id: "o1", label: "< $50k", voteCount: 1100, color: "#3B82F6" },
      { id: "o2", label: "$50k–$100k", voteCount: 2100, color: "#10B981" },
      { id: "o3", label: "> $100k", voteCount: 1621, color: "#F59E0B" },
    ],
    media: [],
    prediction: {
      status: "OPEN",
      correctOptionId: null,
    },
    userVote: null,
    userLiked: false,
    userSaved: false,
  },
];

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
      enabled: isAuthenticated,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 10_000,
    },
  );

  const items: any[] = React.useMemo(() => {
    if (isAuthenticated) {
      const pages = (forYouQuery.data as any)?.pages ?? [];
      const flat = pages.flatMap((p: any) => p.items ?? []);
      if (flat.length > 0) return flat;
    }
    const trending = trendingQuery.data ?? [];
    if (Array.isArray(trending) && trending.length > 0) {
      const out: any[] = [];
      out.push(...trending);
      if (out.length < 6) {
        out.push(...SAMPLE_POSTS.slice(0, Math.max(0, 6 - out.length)));
      }
      return out;
    }
    return SAMPLE_POSTS;
  }, [isAuthenticated, forYouQuery.data, trendingQuery.data]);

  const isLoading =
    (isAuthenticated && forYouQuery.isLoading) ||
    (!isAuthenticated && trendingQuery.isLoading);

  const handlePostClick = (post: any, index: number) => {
    router.push(`/post/${post.id}`);
  };

  const handleVoteSuccess = (postId: string) => {
    void utils.feed.getTrending.invalidate();
  };

  const hasNextPage = (forYouQuery as any).hasNextPage ?? false;
  const isFetchingNextPage = (forYouQuery as any).isFetchingNextPage ?? false;
  const rawFetchNextPage = (forYouQuery as any).fetchNextPage;
  const fetchNextPage = React.useCallback(async () => {
    if (typeof rawFetchNextPage === "function") {
      await rawFetchNextPage();
    }
  }, [rawFetchNextPage]);

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
        <div className="pointer-events-auto bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-3 pb-6 px-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                <span className="text-white font-black text-base">W</span>
              </div>
              <span className="font-black text-xl tracking-tight text-white drop-shadow-lg">
                WHATDO
              </span>
            </Link>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => router.push("/trending")}
                className="flex items-center gap-1.5 h-9 px-3 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white text-xs font-semibold hover:bg-white/20 transition-colors"
                aria-label="Trending"
              >
                <Flame className="h-3.5 w-3.5 text-orange-400" />
                <span className="hidden sm:inline">Trending</span>
              </button>
              <button
                type="button"
                onClick={() => router.push("/discover")}
                className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
                aria-label="Search"
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
                <Link
                  href="/profile/me"
                  className="h-9 w-9 rounded-full bg-white/10 backdrop-blur-md border border-white/15 flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label="Profile"
                >
                  <UserIcon className="h-4 w-4 text-white" />
                </Link>
              )}
            </div>
          </div>

          {/* Scroll indicator chip */}
          {!isAuthenticated && status !== "loading" && items.length > 0 && (
            <div className="mt-3 flex justify-center gap-2 overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1 rounded-full bg-white/10 backdrop-blur border border-white/15 px-3 py-1 text-[10px] font-semibold text-white/90">
                <Sparkles className="h-3 w-3 text-amber-300 mr-1" />
                Swipe up for more opinions · {items.length} questions
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Reels snap-scroll container */}
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
        {isLoading && items.length === 0 && (
          <>
            <ReelsSkeleton />
            <ReelsSkeleton />
            <ReelsSkeleton />
          </>
        )}

        {!isLoading && items.length === 0 && (
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

        {items.map((post: any, idx: number) => (
          <div key={post.id || idx} data-reels-index={idx}>
            <ReelsPostCard
              post={post}
              index={idx}
              onClick={handlePostClick}
              onVoteSuccess={handleVoteSuccess}
            />
          </div>
        ))}

        {isFetchingNextPage && <ReelsSkeleton />}

        {/* End card */}
        {!hasNextPage && items.length > 0 && (
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

      {/* Bottom navigation (Instagram style) */}
      <BottomNav />
    </main>
  );
}
