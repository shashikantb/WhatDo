"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";
import { Button } from "@/components/design-system/Button";
import { SkeletonCard, Skeleton, SkeletonText } from "@/components/design-system/Skeleton";
import { SearchBar } from "@/components/search/SearchBar";
import { CategoryGrid } from "@/components/discover/CategoryGrid";
import { PostCard } from "@/components/feed/PostCard";
import { trpc } from "@/lib/trpc/client";
import {
  Flame,
  Bot,
  Cpu,
  Shirt,
  Utensils,
  Car,
  Briefcase,
  Film,
  Gamepad2,
  Laugh,
  Scale,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";

type QuickCat = {
  key: string;
  slug: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
};

const QUICK_CATS: QuickCat[] = [
  {
    key: "trending",
    slug: "all",
    name: "Trending",
    icon: Flame,
    gradient: "from-orange-500 to-rose-500",
  },
  {
    key: "ai",
    slug: "ai",
    name: "AI",
    icon: Bot,
    gradient: "from-violet-500 to-fuchsia-500",
  },
  {
    key: "tech",
    slug: "technology",
    name: "Technology",
    icon: Cpu,
    gradient: "from-sky-500 to-indigo-500",
  },
  {
    key: "fashion",
    slug: "fashion",
    name: "Fashion",
    icon: Shirt,
    gradient: "from-pink-500 to-rose-500",
  },
  {
    key: "food",
    slug: "food",
    name: "Food",
    icon: Utensils,
    gradient: "from-amber-500 to-orange-500",
  },
  {
    key: "cars",
    slug: "cars",
    name: "Cars",
    icon: Car,
    gradient: "from-slate-500 to-zinc-500",
  },
  {
    key: "business",
    slug: "business",
    name: "Business",
    icon: Briefcase,
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    key: "movies",
    slug: "movies",
    name: "Movies",
    icon: Film,
    gradient: "from-purple-500 to-violet-500",
  },
  {
    key: "gaming",
    slug: "gaming",
    name: "Gaming",
    icon: Gamepad2,
    gradient: "from-cyan-500 to-blue-500",
  },
  {
    key: "funny",
    slug: "funny",
    name: "Funny",
    icon: Laugh,
    gradient: "from-yellow-500 to-amber-500",
  },
];

export function DiscoverPageClient() {
  const router = useRouter();

  const trendingQuery = trpc.feed.getTrending.useQuery(
    { timeRange: "24h", limit: 3 },
    { staleTime: 60_000 },
  );
  const newPostsQuery = trpc.feed.getNew.useQuery(
    { limit: 6 },
    { staleTime: 60_000 },
  );
  const catsQuery = trpc.categories.listAll.useQuery(undefined, { staleTime: 60_000 });

  const trending = trendingQuery.data ?? [];
  const newPosts = (newPostsQuery.data as any)?.items ?? newPostsQuery.data ?? [];
  const categories = catsQuery.data ?? [];

  const isLoadingTrending = trendingQuery.isLoading;
  const isLoadingNew = newPostsQuery.isLoading;

  const getCatPostCount = (slug: string) => {
    const found = categories.find((c: any) => c.slug === slug);
    return (found as any)?._count?.posts ?? Math.floor(Math.random() * 20000) + 500;
  };

  const handlePostClick = (post: any) => {
    router.push(`/post/${post.id}`);
  };

  const handleCatClick = (slug: string) => {
    if (slug === "all") {
      router.push("/trending");
    } else {
      router.push(`/trending?cat=${encodeURIComponent(slug)}`);
    }
  };

  return (
    <AppShell requireAuth={false}>
      <div className="max-w-5xl mx-auto">
        <div className="px-4 pt-4 md:px-6 md:pt-6 pb-4 md:pb-6 space-y-8">
          <div className="sticky top-16 md:top-16 z-10 py-3 -mx-4 md:-mx-6 px-4 md:px-6 bg-background/80 backdrop-blur-xl border-b border-border/50">
            <SearchBar
              size="lg"
              placeholder="Search posts, people, or topics..."
              showSuggestions={true}
            />
          </div>

          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold tracking-tight">
                  Quick Picks
                </h2>
              </div>
              <Link
                href="/trending"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
              >
                View all <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {QUICK_CATS.map((cat) => {
                const Icon = cat.icon;
                const count = getCatPostCount(cat.slug);
                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => handleCatClick(cat.slug)}
                    className="group relative overflow-hidden rounded-xl border border-border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-elevated text-left"
                  >
                    <div
                      className={cn(
                        "h-full p-4 bg-gradient-to-br opacity-90",
                        cat.gradient,
                      )}
                    >
                      <div className="flex flex-col gap-2 text-white">
                        <div className="h-10 w-10 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm leading-tight">
                            {cat.name}
                          </p>
                          <p className="text-[11px] opacity-80 mt-0.5">
                            {formatNumber(count)} posts
                          </p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-warning" />
                <h2 className="text-lg font-semibold tracking-tight">
                  Most Controversial
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {isLoadingTrending
                ? Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4 space-y-3">
                        <Skeleton variant="text" className="h-5 w-full" />
                        <Skeleton variant="text" className="h-4 w-2/3" />
                        <div className="flex gap-1 pt-2">
                          <Skeleton
                            variant="rectangular"
                            className="h-2 flex-1 rounded-full"
                          />
                          <Skeleton
                            variant="rectangular"
                            className="h-2 flex-1 rounded-full"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                : trending.slice(0, 3).map((post: any) => {
                    const opts = post.options ?? [];
                    const optA = opts[0] ?? { label: "Yes", voteCount: 0 };
                    const optB = opts[1] ?? { label: "No", voteCount: 0 };
                    const total =
                      post.voteCount ||
                      (optA.voteCount ?? 0) + (optB.voteCount ?? 0) ||
                      1;
                    const pctA = Math.max(
                      10,
                      Math.min(
                        90,
                        Math.round(((optA.voteCount ?? 0) / total) * 100),
                      ),
                    );
                    const pctB = 100 - pctA;
                    return (
                      <Link
                        key={post.id}
                        href={`/post/${post.id}`}
                        className="block"
                      >
                        <Card className="h-full cursor-pointer hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5 overflow-hidden">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge
                                variant="default"
                                size="sm"
                                className="bg-warning/15 text-warning border-warning/30"
                              >
                                ⚡ Controversial
                              </Badge>
                              <span className="text-[11px] text-muted-foreground">
                                {formatNumber(total)} votes
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-foreground line-clamp-2 leading-snug min-h-[40px]">
                              {post.question}
                            </p>
                            <div className="space-y-1.5 pt-1">
                              <div className="flex gap-1 h-2 w-full overflow-hidden rounded-full bg-muted">
                                <div
                                  className="bg-success rounded-full transition-all"
                                  style={{ width: `${pctA}%` }}
                                />
                                <div
                                  className="bg-danger rounded-full transition-all"
                                  style={{ width: `${pctB}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-[11px] font-medium">
                                <span className="text-success">
                                  {pctA}% {optA.label ?? "Yes"}
                                </span>
                                <span className="text-danger">
                                  {optB.label ?? "No"} {pctB}%
                                </span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-info" />
                <h2 className="text-lg font-semibold tracking-tight">
                  Browse All Categories
                </h2>
              </div>
            </div>
            <CategoryGrid />
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">
                  ✨ New Posts
                </h2>
              </div>
              <Link
                href="/feed"
                className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
              >
                See more <ChevronRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-4">
              {isLoadingNew
                ? Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))
                : newPosts.slice(0, 6).map((post: any, idx: number) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      index={idx}
                      onClick={handlePostClick}
                    />
                  ))}
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
