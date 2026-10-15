"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  MapPin,
  Navigation,
  AlertCircle,
  RefreshCw,
  Map,
  Film,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { ReelsPostCard } from "@/components/feed/ReelsPostCard";
import { ReelsViewerModal } from "@/components/feed/ReelsViewerModal";
import { PullToRefresh } from "@/components/feed/PullToRefresh";
import { Button } from "@/components/design-system/Button";

const RADII = [5, 10, 25, 50, 100];

// Leaflet map must be client-only.
const LocalPulseMap = dynamic(() => import("@/components/maps/LocalPulseMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[calc(100vh-220px)] min-h-[400px] w-full rounded-xl bg-muted animate-pulse flex items-center justify-center text-sm text-muted-foreground">
      Loading map...
    </div>
  ),
});

function ReelsSkeleton() {
  return (
    <div className="snap-start snap-always w-full h-[100dvh] flex items-center justify-center bg-gradient-to-br from-muted/60 via-background to-card">
      <div className="w-full max-w-sm space-y-4 px-4">
        <div className="h-[80vh] w-full rounded-3xl bg-muted animate-pulse" />
      </div>
    </div>
  );
}

type ViewMode = "list" | "map";

export const NearbyPageClient: React.FC = () => {
  const { status } = useSession();
  const isAuthed = status === "authenticated";
  const utils = trpc.useUtils();
  const geo = useGeolocation({ immediate: true, persistToServer: true });
  const [radiusKm, setRadiusKm] = React.useState(25);
  const [cursor, setCursor] = React.useState<string | undefined>(undefined);
  const [view, setView] = React.useState<ViewMode>("list");

  const [viewerOpen, setViewerOpen] = React.useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = React.useState(0);

  const reelsRef = React.useRef<HTMLDivElement | null>(null);

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

  const familyLocations = trpc.family.listFamilyLocations.useQuery(undefined, {
    enabled: isAuthed && enabled,
  });

  const items = React.useMemo(() => {
    if (!data) return [];
    return data.pages.flatMap((p) => p.items);
  }, [data]);

  const onRadiusChange = (r: number) => {
    setRadiusKm(r);
    setCursor(undefined);
  };

  const handlePostClick = (post: any, index: number) => {
    setViewerInitialIndex(index);
    setViewerOpen(true);
  };

  const handleVoteSuccess = () => {
    void utils.feed.nearby.invalidate();
  };

  const handleRefresh = React.useCallback(async () => {
    void utils.feed.nearby.invalidate();
  }, [utils]);

  const isRefreshing = isFetching && items.length > 0;

  return (
    <main className="relative w-full h-[100dvh] overflow-hidden bg-[#0a0a0f]">
      {/* Header overlay */}
      <header className="absolute top-0 inset-x-0 z-40 pointer-events-none">
        <div className="bg-gradient-to-b from-black/80 via-black/40 to-transparent pt-3 pb-8 px-4">
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 drop-shadow">
              <MapPin className="h-5 w-5 text-primary" />
              LocalPulse
            </h1>
            {enabled && (
              <div className="flex gap-1 rounded-full bg-white/10 backdrop-blur-md border border-white/15 p-1 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    view === "list"
                      ? "bg-white text-black shadow-sm"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  <Film className="h-3.5 w-3.5" />
                  Reels
                </button>
                <button
                  type="button"
                  onClick={() => setView("map")}
                  className={cn(
                    "flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    view === "map"
                      ? "bg-white text-black shadow-sm"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  <Map className="h-3.5 w-3.5" />
                  Map
                </button>
              </div>
            )}
          </div>

          {/* Location status */}
          <div className="mt-2">
            {geo.loading && (
              <div className="flex items-center gap-2 text-xs text-white/70">
                <Navigation className="h-3.5 w-3.5 animate-pulse" />
                Getting your location...
              </div>
            )}
            {geo.error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-xs text-red-300">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Location unavailable</p>
                  <p className="opacity-80">{geo.error}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => geo.request()}>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Retry
                </Button>
              </div>
            )}
            {enabled && (
              <div className="flex items-center gap-2 text-[11px] text-white/60">
                <Navigation className="h-3 w-3" />
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
            <div className="flex flex-wrap gap-1.5 mt-2">
              {RADII.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => onRadiusChange(r)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors pointer-events-auto",
                    radiusKm === r
                      ? "bg-primary text-primary-foreground"
                      : "bg-white/10 text-white/70 hover:bg-white/20"
                  )}
                >
                  {r} km
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Map view */}
      {view === "map" && enabled && (
        <div className="absolute inset-0 pt-32">
          <LocalPulseMap
            posts={items}
            familyLocations={familyLocations.data ?? []}
            centerLat={geo.latitude!}
            centerLng={geo.longitude!}
            radiusKm={radiusKm}
          />
        </div>
      )}

      {/* Reels view */}
      {view === "list" && (
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
              "scroll-smooth scrollbar-hide"
            )}
            style={
              {
                scrollbarWidth: "none",
                msOverflowStyle: "none",
                WebkitOverflowScrolling: "touch",
              } as React.CSSProperties
            }
          >
            {!enabled ? (
              <div className="snap-start snap-always w-full h-[100dvh] flex items-center justify-center px-6">
                <div className="text-center max-w-sm space-y-4 p-8 rounded-3xl bg-card/90 backdrop-blur border border-border/50">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <MapPin className="h-7 w-7 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    Enable location to see LocalPulse
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll show reels and posts from people around you.
                  </p>
                  <Button onClick={() => geo.request()}>
                    <Navigation className="h-4 w-4 mr-1.5" />
                    Share my location
                  </Button>
                </div>
              </div>
            ) : isLoading ? (
              <>
                <ReelsSkeleton />
                <ReelsSkeleton />
                <ReelsSkeleton />
              </>
            ) : items.length === 0 ? (
              <div className="snap-start snap-always w-full h-[100dvh] flex items-center justify-center px-6">
                <div className="text-center max-w-sm space-y-4 p-8 rounded-3xl bg-card/90 backdrop-blur border border-border/50">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-fuchsia-500/20 flex items-center justify-center">
                    <Film className="h-7 w-7 text-fuchsia-400" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">
                    No nearby reels yet
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Be the first to share what&apos;s happening in your area. We&apos;re
                    generating local content for you — check back soon!
                  </p>
                </div>
              </div>
            ) : (
              <>
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
                {!hasNextPage && items.length > 0 && (
                  <div className="snap-start snap-always w-full h-[100dvh] flex items-center justify-center px-6">
                    <div className="text-center max-w-sm space-y-4 p-8 rounded-3xl bg-card/90 backdrop-blur border border-border/50">
                      <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                        <Film className="h-7 w-7 text-emerald-400" />
                      </div>
                      <h2 className="text-xl font-bold text-foreground">
                        That&apos;s all nearby for now
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Try increasing the radius or check back later for more
                        local reels.
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </PullToRefresh>
      )}

      {/* Full-screen reels viewer modal */}
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

      {/* Bottom navigation is rendered globally by AppProviders */}
    </main>
  );
};
