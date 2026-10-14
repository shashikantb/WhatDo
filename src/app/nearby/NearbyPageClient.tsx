"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/design-system/Card";
import { Button } from "@/components/design-system/Button";
import { Badge } from "@/components/design-system/Badge";
import { Avatar } from "@/components/design-system/Avatar";
import { trpc } from "@/lib/trpc/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import {
  MapPin,
  Navigation,
  AlertCircle,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const RADII = [5, 10, 25, 50, 100];

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}

export const NearbyPageClient: React.FC = () => {
  const router = useRouter();
  const geo = useGeolocation({ immediate: true, persistToServer: true });
  const [radiusKm, setRadiusKm] = React.useState(25);
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);

  const enabled = geo.latitude != null && geo.longitude != null;

  const { data, isLoading, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } =
    trpc.feed.nearby.useInfiniteQuery(
      {
        centerLat: geo.latitude ?? 0,
        centerLng: geo.longitude ?? 0,
        radiusKm,
        limit: 20,
      },
      {
        enabled,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        initialCursor: cursor,
      },
    );

  const items = React.useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((p) => p.items);
  }, [data]);

  const onRadiusChange = (r: number) => {
    setRadiusKm(r);
    setCursor(undefined);
  };

  return (
    <AppShell requireAuth={false}>
      <div className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4">
        <header className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            Nearby
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Posts from people around you, ordered by distance.
          </p>
        </header>

        {/* Location status */}
        <div className="mb-4">
          {geo.loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Navigation className="h-4 w-4 animate-pulse" />
              Getting your location...
            </div>
          )}
          {geo.error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium">Location unavailable</p>
                <p className="text-xs opacity-80">{geo.error}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => geo.request()}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Retry
              </Button>
            </div>
          )}
          {enabled && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Navigation className="h-3.5 w-3.5" />
              <span>
                {geo.latitude?.toFixed(4)}, {geo.longitude?.toFixed(4)}
              </span>
              {geo.accuracy != null && (
                <span className="opacity-70">±{Math.round(geo.accuracy)}m</span>
              )}
            </div>
          )}
        </div>

        {/* Radius selector */}
        {enabled && (
          <div className="flex flex-wrap gap-2 mb-4">
            {RADII.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onRadiusChange(r)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  radiusKm === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                )}
              >
                {r} km
              </button>
            ))}
          </div>
        )}

        {/* Feed */}
        {!enabled ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-card border border-border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-24 rounded-md bg-muted animate-pulse" />
                    <div className="h-3 w-16 rounded-md bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="h-4 w-full rounded-md bg-muted animate-pulse mb-2" />
                <div className="h-4 w-2/3 rounded-md bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-card border border-border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3 w-24 rounded-md bg-muted animate-pulse" />
                    <div className="h-3 w-16 rounded-md bg-muted animate-pulse" />
                  </div>
                </div>
                <div className="h-4 w-full rounded-md bg-muted animate-pulse mb-2" />
                <div className="h-4 w-2/3 rounded-md bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
              <p className="text-sm font-medium">No nearby posts yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Be the first to share what's happening in your area.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((post) => (
              <Link key={post.id} href={`/post/${post.slug}`}>
                <Card className="hover:bg-accent/40 transition-colors cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Avatar
                        avatarUrl={post.creator?.avatarUrl ?? undefined}
                        displayName={post.creator?.displayName ?? "User"}
                        username={post.creator?.username ?? undefined}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                          <span className="font-medium text-foreground truncate">
                            {post.creator?.displayName ?? post.creator?.username ?? "Anonymous"}
                          </span>
                          {post.city && (
                            <span className="truncate">· {post.city}</span>
                          )}
                          <Badge
                            variant="info"
                            size="sm"
                            className="ml-auto shrink-0"
                          >
                            {formatDistance(post.distanceKm)}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium line-clamp-3">{post.question}</p>
                        {post.category && (
                          <div className="mt-2">
                            <Badge variant="default" size="sm">
                              {post.category.name}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}

            {hasNextPage && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading..." : "Load more"}
                </Button>
              </div>
            )}
          </div>
        )}

        {isFetching && !isLoading && items.length > 0 && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50">
            <div className="rounded-full bg-background/80 backdrop-blur px-3 py-1.5 text-xs text-muted-foreground shadow">
              Updating nearby feed...
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
