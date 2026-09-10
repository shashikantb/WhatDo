"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/design-system/Tabs";
import { Card, CardContent } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Badge } from "@/components/design-system/Badge";
import { SkeletonCard, Skeleton, SkeletonText } from "@/components/design-system/Skeleton";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { SearchBar } from "@/components/search/SearchBar";
import { PostCard } from "@/components/feed/PostCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { trpc } from "@/lib/trpc/client";
import { Search, User, MessageCircle, Hash, ChevronRight, ArrowUp } from "lucide-react";
import { cn, formatNumber } from "@/lib/utils";
import { useLoginModal } from "@/components/auth/LoginModal";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/design-system/Toaster";

type SearchTab = "all" | "users" | "posts" | "tags";

function SearchSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

function UserCard({
  user,
  onFollow,
  isFollowingPending,
}: {
  user: any;
  onFollow: () => void;
  isFollowingPending: boolean;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <Link href={`/profile/${user.username}`} className="flex-shrink-0">
          <UserAvatar
            user={{
              id: user.id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              isVerified: user.isVerified,
            }}
            size="lg"
          />
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/profile/${user.username}`} className="block hover:opacity-80">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground truncate">
                {user.displayName}
              </p>
              {user.isVerified && (
                <Badge variant="default" size="sm" className="bg-info/15 text-info border-info/30">
                  ✓ Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">
              @{user.username}
            </p>
          </Link>
          {user.bio && (
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1.5">
              {user.bio}
            </p>
          )}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>{formatNumber(user.totalPosts ?? 0)} posts</span>
            <span>·</span>
            <span>{formatNumber(user.totalVotes ?? 0)} votes</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onFollow}
          disabled={isFollowingPending}
        >
          <ArrowUp className="h-3 w-3 rotate-45" />
          Follow
        </Button>
      </CardContent>
    </Card>
  );
}

function TagCard({ tag }: { tag: any }) {
  const count = tag.postCount ?? 0;
  return (
    <Link
      href={`/search?q=%23${encodeURIComponent(tag.name)}`}
      className="block group"
    >
      <Card className="hover:shadow-elevated transition-all duration-200 hover:-translate-y-0.5">
        <CardContent className="p-4 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Hash className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              #{tag.name}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatNumber(count)} posts
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { openLogin } = useLoginModal();
  const { show } = useToast();
  const utils = trpc.useUtils();

  const qParam = searchParams?.get("q") ?? "";
  const typeParam = (searchParams?.get("type") as SearchTab) ?? "all";

  const [query, setQuery] = React.useState(qParam);
  const [activeTab, setActiveTab] = React.useState<SearchTab>(typeParam);
  const [page, setPage] = React.useState(1);
  const PAGE_SIZE = 15;

  React.useEffect(() => {
    setQuery(qParam);
  }, [qParam]);

  React.useEffect(() => {
    setActiveTab(typeParam);
  }, [typeParam]);

  const searchType = activeTab === "all" ? "all" : activeTab;

  const resultQuery = trpc.search.query.useQuery(
    {
      q: query,
      type: searchType,
      limit: PAGE_SIZE * page,
    },
    {
      enabled: query.trim().length >= 1,
      staleTime: 30_000,
    },
  );

  const followMutation = trpc.social.follow.useMutation({
    onSuccess: (data) => {
      void utils.social.suggestedUsers.invalidate();
      show(data?.following ? "Following!" : "Unfollowed", "success");
    },
    onError: (err) => show(err.message ?? "Failed", "danger"),
  });

  const handleSearch = (q: string) => {
    if (!q.trim()) return;
    const params = new URLSearchParams();
    params.set("q", q);
    if (activeTab !== "all") params.set("type", activeTab);
    router.replace(`/search?${params.toString()}`);
    setPage(1);
  };

  const handleTabChange = (tab: string) => {
    const newTab = tab as SearchTab;
    setActiveTab(newTab);
    setPage(1);
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (newTab !== "all") params.set("type", newTab);
    router.replace(`/search?${params.toString()}`);
  };

  const handleFollow = (userId: string) => {
    if (status !== "authenticated") {
      openLogin({ type: "follow", userId });
      return;
    }
    followMutation.mutate({ userId });
  };

  const results = resultQuery.data;
  const users: any[] = (results?.users as any[]) ?? [];
  const posts: any[] = (results?.posts as any[]) ?? [];
  const tags: any[] = (results?.tags as any[]) ?? [];

  const hasMore =
    (activeTab === "all"
      ? users.length + posts.length + tags.length
      : activeTab === "users"
      ? users.length
      : activeTab === "posts"
      ? posts.length
      : tags.length) >=
    PAGE_SIZE * page;

  const isLoading = resultQuery.isLoading;
  const isError = resultQuery.isError;

  const totalShown = PAGE_SIZE * page;

  const hasResultsForTab =
    (activeTab === "all" && (users.length + posts.length + tags.length > 0)) ||
    (activeTab === "users" && users.length > 0) ||
    (activeTab === "posts" && posts.length > 0) ||
    (activeTab === "tags" && tags.length > 0);

  return (
    <AppShell requireAuth={false}>
      <div className="max-w-3xl mx-auto">
        <div className="px-4 pt-4 md:px-6 md:pt-6 pb-4 md:pb-8 space-y-5">
          <div className="py-2 sticky top-16 md:top-16 z-10 bg-background/80 backdrop-blur-xl -mx-4 md:-mx-6 px-4 md:px-6 border-b border-border/50">
            <SearchBar
              size="lg"
              placeholder="Search posts, people, or tags..."
              defaultValue={query}
              onSubmit={handleSearch}
              showSuggestions={true}
            />
          </div>

          {query && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              <span>
                Results for{" "}
                <span className="font-medium text-foreground">&quot;{query}&quot;</span>
              </span>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="w-full grid grid-cols-4 h-auto p-1">
              <TabsTrigger value="all" className="h-9 text-xs md:text-sm">
                All
              </TabsTrigger>
              <TabsTrigger value="users" className="h-9 text-xs md:text-sm">
                <User className="h-3.5 w-3.5 mr-1.5" />
                Users
              </TabsTrigger>
              <TabsTrigger value="posts" className="h-9 text-xs md:text-sm">
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                Posts
              </TabsTrigger>
              <TabsTrigger value="tags" className="h-9 text-xs md:text-sm">
                <Hash className="h-3.5 w-3.5 mr-1.5" />
                Tags
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="space-y-6 mt-6">
              {isLoading && <SearchSkeleton />}
              {!isLoading && !hasResultsForTab && !isError && (
                <EmptyState
                  icon={Search}
                  title="No results found"
                  description="Try different keywords or check your spelling."
                />
              )}
              {isError && (
                <EmptyState
                  title="Something went wrong"
                  description="Failed to load search results. Please try again."
                />
              )}

              {(activeTab === "all") && users.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Users
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleTabChange("users")}
                      className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
                    >
                      See all <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {users.slice(0, 3).map((u) => (
                      <UserCard
                        key={u.id}
                        user={u}
                        onFollow={() => handleFollow(u.id)}
                        isFollowingPending={followMutation.isPending}
                      />
                    ))}
                  </div>
                </section>
              )}

              {(activeTab === "all") && posts.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Posts
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleTabChange("posts")}
                      className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
                    >
                      See all <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="space-y-4">
                    {posts.slice(0, 4).map((p, idx) => (
                      <PostCard
                        key={p.id}
                        post={{
                          ...p,
                          voteCount: p._count?.votes ?? p.voteCount ?? 0,
                          commentCount: p._count?.comments ?? p.commentCount ?? 0,
                          likeCount: p._count?.likes ?? p.likeCount ?? 0,
                          saveCount: p._count?.savedPosts ?? p.saveCount ?? 0,
                        }}
                        index={idx}
                        onClick={(post) => router.push(`/post/${post.id}`)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {(activeTab === "all") && tags.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Tags
                    </h3>
                    <button
                      type="button"
                      onClick={() => handleTabChange("tags")}
                      className="text-xs font-medium text-primary hover:underline flex items-center gap-0.5"
                    >
                      See all <ChevronRight className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {tags.slice(0, 4).map((t) => (
                      <TagCard key={t.id} tag={t} />
                    ))}
                  </div>
                </section>
              )}

              {hasResultsForTab && hasMore && (
                <div className="pt-4 flex justify-center">
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                    Load more results
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="users" className="space-y-3 mt-6">
              {isLoading && (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <Skeleton variant="circle" className="h-12 w-12" />
                        <div className="flex-1 space-y-2">
                          <Skeleton variant="text" className="h-4 w-32" />
                          <Skeleton variant="text" className="h-3 w-24" />
                          <SkeletonText lines={1} />
                        </div>
                        <Skeleton variant="rectangular" className="h-8 w-20 rounded-md" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {!isLoading && users.length === 0 && !isError && (
                <EmptyState
                  icon={User}
                  title="No users found"
                  description="Try searching for a different name or username."
                />
              )}
              {isError && (
                <EmptyState title="Error loading users" description="Please try again." />
              )}
              <div className="space-y-3">
                {users.map((u) => (
                  <UserCard
                    key={u.id}
                    user={u}
                    onFollow={() => handleFollow(u.id)}
                    isFollowingPending={followMutation.isPending}
                  />
                ))}
              </div>
              {users.length > 0 && hasMore && (
                <div className="pt-4 flex justify-center">
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                    Load more users
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="posts" className="space-y-4 mt-6">
              {isLoading && <SearchSkeleton />}
              {!isLoading && posts.length === 0 && !isError && (
                <EmptyState
                  icon={MessageCircle}
                  title="No posts found"
                  description="No questions match your search. Try different keywords!"
                />
              )}
              {isError && (
                <EmptyState title="Error loading posts" description="Please try again." />
              )}
              <div className="space-y-4">
                {posts.map((p, idx) => (
                  <PostCard
                    key={p.id}
                    post={{
                      ...p,
                      voteCount: p._count?.votes ?? p.voteCount ?? 0,
                      commentCount: p._count?.comments ?? p.commentCount ?? 0,
                      likeCount: p._count?.likes ?? p.likeCount ?? 0,
                      saveCount: p._count?.savedPosts ?? p.saveCount ?? 0,
                    }}
                    index={idx}
                    onClick={(post) => router.push(`/post/${post.id}`)}
                  />
                ))}
              </div>
              {posts.length > 0 && hasMore && (
                <div className="pt-4 flex justify-center">
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                    Load more posts
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="tags" className="space-y-3 mt-6">
              {isLoading && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <Skeleton variant="circle" className="h-11 w-11" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton variant="text" className="h-4 w-24" />
                          <Skeleton variant="text" className="h-3 w-16" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {!isLoading && tags.length === 0 && !isError && (
                <EmptyState
                  icon={Hash}
                  title="No tags found"
                  description="Browse the discover page for popular topics and hashtags."
                />
              )}
              {isError && (
                <EmptyState title="Error loading tags" description="Please try again." />
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tags.map((t) => (
                  <TagCard key={t.id} tag={t} />
                ))}
              </div>
              {tags.length > 0 && hasMore && (
                <div className="pt-4 flex justify-center">
                  <Button variant="outline" onClick={() => setPage((p) => p + 1)}>
                    Load more tags
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}
