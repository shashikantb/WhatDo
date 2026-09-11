"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, MessageCircle, Send } from "lucide-react";
import { useSession } from "next-auth/react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Textarea } from "@/components/design-system/Textarea";
import { SkeletonCard, Skeleton, SkeletonText } from "@/components/design-system/Skeleton";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Badge } from "@/components/design-system/Badge";
import { PostCard } from "@/components/feed/PostCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { trpc } from "@/lib/trpc/client";
import { cn, formatNumber, formatRelativeTime } from "@/lib/utils";
import { useLoginModal } from "@/components/auth/LoginModal";
import { CommentSection } from "@/components/comments/CommentSection";

interface PostPageClientProps {
  params: { id: string };
}

function CommentsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4 flex items-start gap-3">
            <Skeleton variant="circle" className="h-8 w-8 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton variant="text" className="h-3 w-24" />
                <Skeleton variant="text" className="h-2 w-12" />
              </div>
              <SkeletonText lines={2} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function PostPageClient({ params }: PostPageClientProps) {
  const router = useRouter();
  const { id } = params;
  const { data: session, status } = useSession();
  const { openLogin } = useLoginModal();
  const isAuthenticated = status === "authenticated";
  const [commentText, setCommentText] = React.useState("");

  const postQuery = trpc.posts.getById.useQuery(
    { id },
    { staleTime: 30_000 },
  );

  const incrementView = trpc.posts.incrementView.useMutation();

  React.useEffect(() => {
    if (postQuery.isSuccess) {
      void incrementView.mutateAsync({ id });
    }
  }, [postQuery.isSuccess, id, incrementView]);

  const post = postQuery.data;
  const isLoading = postQuery.isLoading;
  const isError = postQuery.isError;

  const relatedQuery = trpc.feed.getByCategory.useQuery(
    {
      categoryId: post?.categoryId ?? undefined,
      limit: 5,
    },
    {
      enabled: !!post?.categoryId,
      staleTime: 60_000,
    },
  );

  const relatedItems = (relatedQuery.data as any)?.items ?? [];
  const relatedPosts = relatedItems.filter((p: any) => p.id !== id).slice(0, 4);

  const commentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openLogin({ type: "comment", postId: id });
      return;
    }
    if (!commentText.trim()) return;
    setCommentText("");
  };

  return (
    <AppShell requireAuth={false}>
      <div className="max-w-[680px] mx-auto">
        <div className="px-4 pt-4 md:px-6 md:pt-6 pb-4 md:pb-8 space-y-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <Link
              href="/feed"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back to feed
            </Link>
          </div>

          {isLoading && (
            <div className="space-y-6">
              <SkeletonCard className="p-5">
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <Skeleton variant="circle" className="h-11 w-11" />
                    <div className="space-y-2">
                      <Skeleton variant="text" className="h-4 w-40" />
                      <Skeleton variant="text" className="h-3 w-24" />
                    </div>
                  </div>
                  <SkeletonText lines={3} />
                  <Skeleton
                    variant="rectangular"
                    className="aspect-video w-full rounded-xl"
                  />
                  <div className="h-16 w-full rounded-xl bg-muted" />
                </div>
              </SkeletonCard>
              <CommentsSkeleton />
            </div>
          )}

          {isError && (
            <EmptyState
              title="Post not found"
              description="This post may have been removed or doesn't exist."
              actionButton={{
                label: "Go to Feed",
                onClick: () => router.push("/feed"),
                variant: "primary",
              }}
            />
          )}

          {!isLoading && !isError && post && (
            <>
              <PostCard
                post={{
                  ...post,
                  voteCount: post._count?.votes ?? post.voteCount ?? 0,
                  commentCount: post._count?.comments ?? post.commentCount ?? 0,
                  likeCount: post._count?.likes ?? post.likeCount ?? 0,
                  saveCount: post._count?.savedPosts ?? post.saveCount ?? 0,
                }}
                index={0}
                className="!p-5 md:!p-6"
                onVoteSuccess={() => {}}
              />

              <CommentSection postId={id} initialSort="Top" />

              {relatedPosts.length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="category" size="sm">
                      {post.category?.name}
                    </Badge>
                    <h3 className="font-semibold text-base">
                      Related questions you might like
                    </h3>
                  </div>
                  <div className="space-y-4">
                    {relatedPosts.map((rel: any, idx: number) => (
                      <PostCard
                        key={rel.id}
                        post={{
                          ...rel,
                          voteCount: rel.voteCount ?? rel._count?.votes ?? 0,
                          commentCount:
                            rel.commentCount ?? rel._count?.comments ?? 0,
                          likeCount: rel.likeCount ?? rel._count?.likes ?? 0,
                          saveCount:
                            rel.saveCount ?? rel._count?.savedPosts ?? 0,
                        }}
                        index={idx}
                        onClick={(p) => router.push(`/post/${p.id}`)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
