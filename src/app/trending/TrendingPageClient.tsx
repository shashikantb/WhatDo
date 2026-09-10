"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Badge } from "@/components/design-system/Badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/design-system/Tabs";
import { Card, CardContent } from "@/components/design-system/Card";
import { Skeleton } from "@/components/design-system/Skeleton";
import { Feed, FeedType, TrendingTimeRange } from "@/components/feed/Feed";
import { trpc } from "@/lib/trpc/client";
import { Flame, TrendingUp, ChevronRight } from "lucide-react";
import { formatNumber, cn } from "@/lib/utils";

type TimeTab = "24h" | "7d";

export function TrendingPageClient() {
  const router = useRouter();
  const [activeCategorySlug, setActiveCategorySlug] = React.useState<string | null>(null);
  const [activeTime, setActiveTime] = React.useState<TimeTab>("24h");

  const categoriesQuery = trpc.categories.listAll.useQuery();
  const trendingTopQuery = trpc.feed.getTrending.useQuery(
    { timeRange: activeTime, limit: 10 },
    { staleTime: 60_000 },
  );

  const categories = categoriesQuery.data ?? [];
  const trendingTop = trendingTopQuery.data ?? [];
  const isLoadingCats = categoriesQuery.isLoading;
  const isLoadingTop = trendingTopQuery.isLoading;

  const handlePostClick = (post: any) => {
    router.push(`/post/${post.id}`);
  };

  const currentFeedType: FeedType = activeCategorySlug ? "category" : "trending";

  return (
    <AppShell requireAuth={false}>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] xl:gap-6 max-w-7xl mx-auto">
        <div className="min-w-0">
          <div className="px-4 pt-4 md:px-6 md:pt-6 pb-4 space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-warning/15 border border-warning/20 flex items-center justify-center">
                <Flame className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Trending Now</h1>
                <p className="text-sm text-muted-foreground">
                  What people are talking about right now
                </p>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin">
              <button
                onClick={() => setActiveCategorySlug(null)}
                type="button"
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border",
                  activeCategorySlug === null
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted text-foreground hover:bg-muted/80 border-border",
                )}
              >
                All
              </button>
              {isLoadingCats
                ? Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 w-24 rounded-full bg-muted/50 animate-pulse"
                    />
                  ))
                : categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setActiveCategorySlug(cat.slug)}
                      type="button"
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors border",
                        activeCategorySlug === cat.slug
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted text-foreground hover:bg-muted/80 border-border",
                      )}
                    >
                      {cat.icon && <span className="mr-1">{cat.icon}</span>}
                      {cat.name}
                    </button>
                  ))}
            </div>

            <Tabs value={activeTime} onValueChange={(v) => setActiveTime(v as TimeTab)}>
              <TabsList className="w-auto inline-flex">
                <TabsTrigger value="24h">Today</TabsTrigger>
                <TabsTrigger value="7d">This Week</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Feed
            feedType={currentFeedType}
            categorySlug={activeCategorySlug ?? undefined}
            timeRange={activeTime as TrendingTimeRange}
            onPostClick={handlePostClick}
            showEndCard={false}
          />
        </div>

        <div className="hidden xl:block pt-6 pr-6 space-y-6">
          <div className="sticky top-24 space-y-6">
            <Card className="overflow-hidden">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold text-sm">Top 10 Right Now</h3>
                </div>
                <div className="divide-y divide-border">
                  {isLoadingTop
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="p-3">
                          <div className="flex items-start gap-3">
                            <div className="w-5 pt-0.5">
                              <Skeleton variant="text" className="h-3 w-4" />
                            </div>
                            <div className="flex-1">
                              <Skeleton variant="text" className="h-4 w-full mb-2" />
                              <Skeleton variant="text" className="h-3 w-20" />
                            </div>
                          </div>
                        </div>
                      ))
                    : trendingTop.slice(0, 10).map((post: any, index) => (
                        <Link
                          key={post.id}
                          href={`/post/${post.id}`}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors group"
                        >
                          <span className="flex-shrink-0 w-5 text-center text-xs font-bold text-muted-foreground pt-0.5">
                            {index + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start gap-2">
                              <p className="text-sm font-medium text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                                {post.question}
                              </p>
                              {index < 3 && (
                                <Badge
                                  variant="default"
                                  size="sm"
                                  className="flex-shrink-0 bg-warning/15 text-warning border-warning/30"
                                >
                                  🔥 Hot
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {post.category && (
                                <span className="text-xs text-muted-foreground">
                                  {post.category.name}
                                </span>
                              )}
                              <span className="flex items-center gap-1 text-xs text-success">
                                <TrendingUp className="h-3 w-3" />
                                {formatNumber(post.voteCount ?? 0)} votes
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </Link>
                      ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
