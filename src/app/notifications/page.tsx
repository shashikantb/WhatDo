"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Bell,
  Heart,
  MessageSquare,
  UserPlus,
  AtSign,
  CheckCheck,
  Loader2,
  Vote,
  Trophy,
} from "lucide-react";
import { cn, formatRelativeTime } from "@/lib/utils";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/design-system/Card";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/design-system/Tabs";
import { Button } from "@/components/design-system/Button";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { EmptyState } from "@/components/shared/EmptyState";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/design-system/Toaster";

type NotificationTab = "all" | "mentions" | "follows" | "votes";

interface NotificationShape {
  id: string;
  type: string;
  isRead: boolean;
  createdAt: Date | string;
  actor?: {
    id: string;
    username?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
  post?: {
    id: string;
    slug?: string;
    question?: string;
  } | null;
  comment?: {
    id: string;
    text?: string;
  } | null;
}

function getNotificationIcon(type: string) {
  switch (type) {
    case "LIKE":
      return { Icon: Heart, cls: "text-danger bg-danger/10 border-danger/15" };
    case "COMMENT":
      return {
        Icon: MessageSquare,
        cls: "text-primary bg-primary/10 border-primary/15",
      };
    case "REPLY":
      return {
        Icon: MessageSquare,
        cls: "text-accent bg-accent/10 border-accent/15",
      };
    case "FOLLOW":
      return {
        Icon: UserPlus,
        cls: "text-success bg-success/10 border-success/15",
      };
    case "MENTION":
      return {
        Icon: AtSign,
        cls: "text-violet-500 bg-violet-500/10 border-violet-500/15",
      };
    case "VOTE":
      return {
        Icon: Vote,
        cls: "text-blue-500 bg-blue-500/10 border-blue-500/15",
      };
    case "PREDICTION":
      return {
        Icon: Trophy,
        cls: "text-warning bg-warning/10 border-warning/15",
      };
    default:
      return {
        Icon: Bell,
        cls: "text-muted-foreground bg-muted border-border",
      };
  }
}

function getNotificationDescription(
  type: string,
  actorDisplay: string,
  postQuestion?: string
) {
  const boldActor = (
    <span className="font-semibold text-foreground">{actorDisplay}</span>
  );
  const truncPost = postQuestion ? (
    <span className="text-muted-foreground line-clamp-1">
      : “{postQuestion.length > 80 ? postQuestion.slice(0, 80) + "…" : postQuestion}”
    </span>
  ) : null;

  switch (type) {
    case "LIKE":
      return (
        <>
          {boldActor} liked your post{truncPost}
        </>
      );
    case "COMMENT":
      return (
        <>
          {boldActor} commented on your post{truncPost}
        </>
      );
    case "REPLY":
      return (
        <>
          {boldActor} replied to your comment
        </>
      );
    case "FOLLOW":
      return (
        <>
          {boldActor} started following you
        </>
      );
    case "MENTION":
      return (
        <>
          {boldActor} mentioned you{truncPost ?? " in a post"}
        </>
      );
    case "VOTE":
      return (
        <>
          {boldActor} voted on your post{truncPost}
        </>
      );
    case "PREDICTION":
      return (
        <>
          A prediction you made has resolved!{truncPost}
        </>
      );
    default:
      return (
        <>
          {boldActor} interacted with you
        </>
      );
  }
}

function NotificationItem({
  notification,
  onClick,
  onMarkRead,
}: {
  notification: NotificationShape;
  onClick: () => void;
  onMarkRead: (id: string) => void;
}) {
  const router = useRouter();
  const isRead = !!notification.isRead;
  const { Icon, cls } = getNotificationIcon(notification.type);
  const actorDisplay = notification.actor
    ? notification.actor.displayName ??
      `@${notification.actor.username ?? "user"}`
    : "WHATDO";
  const markReadCalled = React.useRef(false);

  React.useEffect(() => {
    if (!isRead && !markReadCalled.current) {
      markReadCalled.current = true;
      const timer = setTimeout(() => {
        onMarkRead(notification.id);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [notification.id, isRead, onMarkRead]);

  const handleClick = () => {
    if (notification.post?.id) {
      router.push(`/post/${notification.post.id}`);
    } else if (notification.actor?.username) {
      router.push(`/profile/${notification.actor.username}`);
    }
    onClick();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "w-full flex items-start gap-3 p-4 text-left hover:bg-muted/30 transition-colors",
        !isRead && "bg-primary/[0.02]"
      )}
    >
      <div className="relative flex-shrink-0">
        {notification.actor ? (
          <UserAvatar
            user={notification.actor as any}
            size="md"
            showVerifiedBadge
          />
        ) : (
          <div
            className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center border",
              cls
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
        {!isRead && (
          <span className="absolute -left-1 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
        )}
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm text-foreground leading-snug">
          {getNotificationDescription(
            notification.type,
            actorDisplay,
            notification.post?.question
          )}
        </p>
        <p className="text-xs text-muted-foreground tabular-nums">
          {formatRelativeTime(notification.createdAt)}
        </p>
        {notification.comment?.text && (
          <p className="text-xs text-muted-foreground line-clamp-2 pt-0.5 italic">
            “{notification.comment.text}”
          </p>
        )}
      </div>
    </button>
  );
}

export default function NotificationsPage() {
  const { status } = useSession();
  const { show } = useToast();
  const [activeTab, setActiveTab] = React.useState<NotificationTab>("all");
  const utils = trpc.useUtils();

  const isAuthenticated = status === "authenticated";

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
  } = trpc.notifications.list.useInfiniteQuery(
    { limit: 30 },
    {
      enabled: isAuthenticated,
      getNextPageParam: (lastPage: any) => lastPage.nextCursor,
      staleTime: 15_000,
      refetchOnMount: true,
    }
  );

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      show("All notifications marked as read", "success");
      void utils.notifications.unreadCount.invalidate();
      void utils.notifications.list.invalidate();
    },
    onError: () => {
      show("Failed to mark notifications as read", "danger");
    },
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onError: () => {},
  });

  const handleMarkRead = React.useCallback(
    (id: string) => {
      void markRead.mutateAsync({ id }).then(() => {
        void utils.notifications.unreadCount.invalidate();
      });
    },
    [markRead, utils]
  );

  const allItems: NotificationShape[] = React.useMemo(() => {
    const pages = data?.pages ?? [];
    return pages.flatMap((p: any) => p.items ?? []);
  }, [data]);

  const filteredItems = React.useMemo(() => {
    switch (activeTab) {
      case "mentions":
        return allItems.filter((n) => n.type === "MENTION");
      case "follows":
        return allItems.filter((n) => n.type === "FOLLOW");
      case "votes":
        return allItems.filter((n) => n.type === "VOTE" || n.type === "LIKE");
      default:
        return allItems;
    }
  }, [allItems, activeTab]);

  const unreadCount = allItems.filter((n) => !n.isRead).length;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="px-4 pt-4 md:px-6 md:pt-6 pb-4 md:pb-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Notifications
                </h1>
                <p className="text-sm text-muted-foreground">
                  {unreadCount > 0
                    ? `${unreadCount} new notification${unreadCount === 1 ? "" : "s"}`
                    : "You're all caught up."}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending || unreadCount === 0}
              className="gap-1 text-primary hover:text-primary/80"
            >
              <CheckCheck className="h-4 w-4" />
              Mark all read
            </Button>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as NotificationTab)}
          >
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1">
                All
              </TabsTrigger>
              <TabsTrigger value="mentions" className="flex-1">
                Mentions
              </TabsTrigger>
              <TabsTrigger value="follows" className="flex-1">
                Follows
              </TabsTrigger>
              <TabsTrigger value="votes" className="flex-1">
                Votes
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {isLoading && filteredItems.length === 0 && (
                <Card>
                  <CardContent className="p-0 divide-y divide-border">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 p-4"
                      >
                        <div className="h-10 w-10 rounded-full bg-muted animate-pulse flex-shrink-0" />
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="h-4 w-full bg-muted animate-pulse rounded" />
                          <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
                          <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {!isLoading && filteredItems.length === 0 && (
                <EmptyState
                  icon={Bell}
                  title={
                    activeTab === "all"
                      ? "You're all caught up."
                      : "No notifications yet."
                  }
                  description={
                    activeTab === "all"
                      ? "When people interact with your posts and profile, you'll see them here."
                      : `No ${activeTab} notifications yet.`
                  }
                  className="py-10"
                />
              )}

              {filteredItems.length > 0 && (
                <>
                  <Card>
                    <CardContent className="p-0 divide-y divide-border">
                      {filteredItems.map((notification) => (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          onClick={() => void refetch()}
                          onMarkRead={handleMarkRead}
                        />
                      ))}
                    </CardContent>
                  </Card>

                  {(hasNextPage || isFetchingNextPage) && (
                    <div className="py-6 text-center">
                      {isFetchingNextPage ? (
                        <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Loading more...</span>
                        </div>
                      ) : hasNextPage ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void fetchNextPage()}
                        >
                          Load more
                        </Button>
                      ) : null}
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}
