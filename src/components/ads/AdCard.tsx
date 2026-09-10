"use client";

import * as React from "react";
import { ExternalLink, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/design-system/Card";
import { Badge } from "@/components/design-system/Badge";

export type AdPlacement =
  | "FEED_EVERY_N"
  | "BANNER"
  | "SPONSORED_NATIVE"
  | "DESKTOP_SIDEBAR";

export interface AdCardProps {
  placement: AdPlacement;
  className?: string;
  onLoaded?: () => void;
}

interface AdContentShape {
  headline?: string;
  body?: string;
  cta?: string;
  imageUrl?: string;
  logoUrl?: string;
  color?: string;
  advertiser?: string;
}

function useImpressionRegister(adId: string | undefined) {
  const registerMut = trpc.ads.registerImpression.useMutation();
  const registeredRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    if (!adId) return;
    if (registeredRef.current.has(adId)) return;
    registeredRef.current.add(adId);
    try {
      void registerMut.mutateAsync({ adId }).catch(() => {});
    } catch {
    }
  }, [adId]);
}

export function AdCard({ placement, className, onLoaded }: AdCardProps) {
  const query = trpc.ads.getActiveForPlacement.useQuery(
    { placement, limit: 3 },
    {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    },
  );

  React.useEffect(() => {
    if (query.data && query.data.length > 0) {
      onLoaded?.();
    }
  }, [query.data, onLoaded]);

  const ads = query.data ?? [];
  if (ads.length === 0) return null;

  const selectedIdx = React.useMemo(() => {
    return Math.floor(Math.random() * Math.max(1, ads.length));
  }, [ads.length]);

  const ad = ads[Math.min(selectedIdx, ads.length - 1)];
  if (!ad) return null;
  const content = (ad.contentJson ?? {}) as AdContentShape;

  useImpressionRegister(ad.id);

  const registerClick = trpc.ads.registerClick.useMutation();

  const handleClick = () => {
    if (!ad.id) return;
    try {
      void registerClick.mutateAsync({ adId: ad.id }).catch(() => {});
    } catch {
    }
  };

  const isBanner = placement === "BANNER";
  const isSidebar = placement === "DESKTOP_SIDEBAR";
  const isFeed = placement === "FEED_EVERY_N";

  if (isBanner) {
    const bgColor = content.color ?? "linear-gradient(90deg,#6366f1 0%,#8b5cf6 50%,#ec4899 100%)";
    return (
      <Card
        className={cn(
          "overflow-hidden my-4",
          className,
        )}
      >
        <a
          href={ad.linkUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleClick}
          className="block"
        >
          <div
            className="flex flex-col md:flex-row md:items-center gap-4 p-4 md:p-5"
            style={{ background: bgColor }}
          >
            <div className="flex-1 min-w-0 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  variant="default"
                  size="sm"
                  className="bg-white/15 border-white/20 text-white"
                >
                  <Sparkles className="w-3 h-3 mr-1" /> Sponsored
                </Badge>
                {content.advertiser && (
                  <span className="text-xs text-white/80">{content.advertiser}</span>
                )}
              </div>
              <h3 className="font-bold text-white text-lg md:text-xl leading-tight">
                {content.headline ?? "Check out this featured offer"}
              </h3>
              {content.body && (
                <p className="text-sm text-white/85 mt-1 line-clamp-2">
                  {content.body}
                </p>
              )}
              <div className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white underline underline-offset-2">
                {content.cta ?? "Learn more"}
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </div>
            {content.imageUrl && (
              <div className="md:w-64 md:h-28 rounded-xl overflow-hidden flex-shrink-0 bg-white/10">
                <img
                  src={content.imageUrl}
                  alt={content.headline ?? "Sponsored"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
          </div>
        </a>
      </Card>
    );
  }

  if (isSidebar) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <a
          href={ad.linkUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer sponsored"
          onClick={handleClick}
          className="block"
        >
          <div className="p-4 space-y-3 hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <Badge variant="default" size="sm">
                <Sparkles className="w-3 h-3 mr-1" /> Sponsored
              </Badge>
            </div>
            {content.imageUrl && (
              <div className="rounded-lg overflow-hidden bg-muted aspect-[4/3]">
                <img
                  src={content.imageUrl}
                  alt={content.headline ?? "Sponsored"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
            )}
            {content.headline && (
              <h4 className="font-semibold leading-snug text-foreground line-clamp-2">
                {content.headline}
              </h4>
            )}
            {content.body && (
              <p className="text-xs text-muted-foreground line-clamp-3">
                {content.body}
              </p>
            )}
            <div className="text-xs font-semibold text-primary inline-flex items-center gap-1">
              {content.cta ?? "Visit site"}
              <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        </a>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "my-4 overflow-hidden bg-gradient-to-br from-background to-muted/30 border-primary/10",
        className,
      )}
    >
      <a
        href={ad.linkUrl ?? "#"}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={handleClick}
        className="block"
      >
        <div className="p-4 md:p-5 space-y-3 hover:bg-muted/20 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="default" size="sm" className="gap-1">
                <Sparkles className="w-3 h-3" /> Sponsored
              </Badge>
              {content.advertiser && (
                <span className="text-xs font-medium text-muted-foreground">
                  {content.advertiser}
                </span>
              )}
            </div>
            <ExternalLink className="w-4 h-4 text-muted-foreground" />
          </div>

          {content.imageUrl && (
            <div className="rounded-xl overflow-hidden bg-muted aspect-[16/9] border border-border">
              <img
                src={content.imageUrl}
                alt={content.headline ?? "Sponsored"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div className="space-y-1">
            {content.headline && (
              <h3 className="font-semibold text-foreground leading-snug">
                {content.headline}
              </h3>
            )}
            {content.body && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {content.body}
              </p>
            )}
          </div>

          {content.cta && (
            <div className="pt-1 text-sm font-semibold text-primary inline-flex items-center gap-1.5">
              {content.cta}
              <ExternalLink className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </a>
    </Card>
  );
}
