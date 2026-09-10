"use client";

import * as React from "react";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn, formatNumber } from "@/lib/utils";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Button } from "@/components/design-system/Button";
import { Textarea } from "@/components/design-system/Textarea";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/design-system/Tabs";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";
import { useLoginModal } from "@/components/auth/LoginModal";
import { EmptyState } from "@/components/shared/EmptyState";
import { CommentItem, CommentShape } from "./CommentItem";

export type CommentSort = "Top" | "New" | "Controversial";

export interface CommentSectionProps {
  postId: string;
  initialSort?: CommentSort;
}

export const CommentSection: React.FC<CommentSectionProps> = ({
  postId,
  initialSort = "Top",
}) => {
  const { data: session, status } = useSession();
  const { openLogin } = useLoginModal();
  const { show } = useToast();
  const router = useRouter();
  const utils = trpc.useUtils();

  const [sort, setSort] = React.useState<CommentSort>(initialSort);
  const [commentText, setCommentText] = React.useState("");
  const [optimisticComments, setOptimisticComments] = React.useState<
    CommentShape[]
  >([]);
  const [deletedIds, setDeletedIds] = React.useState<Set<string>>(new Set());
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const sentinelRef = React.useRef<HTMLDivElement>(null);

  const isAuthenticated = status === "authenticated";

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = trpc.comments.listByPost.useInfiniteQuery(
    { postId, sort, limit: 25 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      staleTime: 30_000,
      enabled: !!postId,
    }
  );

  React.useEffect(() => {
    setOptimisticComments([]);
    setDeletedIds(new Set());
  }, [sort, postId]);

  const createComment = trpc.comments.create.useMutation({
    onSuccess: (newComment: any) => {
      show("Comment posted", "success");
      void utils.posts.getById.invalidate({ id: postId });
      void utils.comments.listByPost.invalidate({ postId });
    },
    onError: (err) => {
      show(err.message || "Failed to post comment", "danger");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      openLogin({ type: "comment", postId });
      return;
    }
    const trimmed = commentText.trim();
    if (!trimmed) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic: CommentShape = {
      id: tempId,
      postId,
      creator: {
        id: session!.user.id,
        username: session!.user.username,
        displayName: session!.user.displayName,
        avatarUrl: session!.user.image ?? null,
        role: session!.user.role,
        isVerified: false,
      },
      text: trimmed,
      likeCount: 0,
      replyCount: 0,
      createdAt: new Date(),
      isDeleted: false,
      userLiked: false,
      replies: [],
    };

    setOptimisticComments((prev) => [optimistic, ...prev]);
    setCommentText("");

    createComment.mutate(
      { postId, text: trimmed },
      {
        onSettled: () => {
          setOptimisticComments((prev) =>
            prev.filter((c) => c.id !== tempId)
          );
        },
      }
    );
  };

  const handleNewReply = async (text: string, parentId: string) => {
    if (!isAuthenticated) return;
    await createComment.mutateAsync({
      postId,
      parentId,
      text,
    });
    show("Reply posted", "success");
    void refetch();
  };

  const handleDelete = (commentId: string) => {
    setDeletedIds((prev) => new Set(prev).add(commentId));
  };

  const allItems: CommentShape[] = React.useMemo(() => {
    const pages = data?.pages ?? [];
    const items = pages.flatMap((p: any) => p.items ?? []);
    const combined = [...optimisticComments, ...items];
    return combined.filter((c) => !deletedIds.has(c.id));
  }, [data, optimisticComments, deletedIds]);

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
      { threshold: 0.1, rootMargin: "300px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, isLoading, fetchNextPage, allItems.length]);

  const visibleCount = allItems.length;

  return (
    <section id="comments" className="space-y-5 scroll-mt-20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <h3 className="font-semibold text-lg">
            Comments
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({formatNumber(visibleCount)})
            </span>
          </h3>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card shadow-sm p-4 md:p-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-start gap-3">
            <UserAvatar
              user={
                isAuthenticated && session?.user
                  ? {
                      id: session.user.id,
                      avatarUrl: session.user.image ?? null,
                      displayName: session.user.displayName,
                      username: session.user.username,
                      role: session.user.role,
                    }
                  : undefined
              }
              size="md"
            />
            <div className="flex-1 space-y-3">
              <Textarea
                ref={textareaRef as any}
                placeholder={
                  isAuthenticated
                    ? "Share your thoughts on this question..."
                    : "Sign in to join the conversation..."
                }
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
                className={cn(!isAuthenticated && "opacity-70 cursor-pointer")}
                onFocus={() => {
                  if (!isAuthenticated)
                    openLogin({ type: "comment", postId });
                }}
                disabled={!isAuthenticated}
              />
              <div className="flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  disabled={!commentText.trim() || !isAuthenticated}
                  loading={createComment.isPending}
                  rightIcon={<Send className="h-3.5 w-3.5" />}
                >
                  Comment
                </Button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <Tabs
        value={sort}
        onValueChange={(v) => setSort(v as CommentSort)}
      >
        <TabsList>
          <TabsTrigger value="Top">Top</TabsTrigger>
          <TabsTrigger value="New">New</TabsTrigger>
          <TabsTrigger value="Controversial">Controversial</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="space-y-0">
        {isLoading && allItems.length === 0 && (
          <div className="space-y-4 py-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card"
              >
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                    <div className="h-2 w-12 bg-muted animate-pulse rounded" />
                  </div>
                  <div className="h-3 w-full bg-muted animate-pulse rounded" />
                  <div className="h-3 w-3/4 bg-muted animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!isLoading && allItems.length === 0 && (
          <EmptyState
            title="Be the first to comment"
            description="What's your take on this question? Start the conversation below."
            className="py-8"
          />
        )}

        {allItems.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={{ ...comment, postId }}
            onNewComment={handleNewReply}
            onDelete={handleDelete}
          />
        ))}

        {(isFetchingNextPage || (hasNextPage && allItems.length > 0)) && (
          <div className="py-4 text-center" ref={sentinelRef}>
            {isFetchingNextPage ? (
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Loading more comments...</span>
              </div>
            ) : hasNextPage ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => void fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                Load more replies
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
};
