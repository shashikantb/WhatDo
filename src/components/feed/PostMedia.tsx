"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Play, Pause } from "lucide-react";
import { cn } from "@/lib/utils";

type PostMediaType = "IMAGE" | "VIDEO" | "GIF" | "LINK";

export interface PostMediaItem {
  id?: string;
  type: PostMediaType;
  url: string;
  thumbnailUrl?: string | null;
  posterUrl?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  mimeType?: string | null;
}

export interface PostMediaProps {
  media: PostMediaItem[];
  className?: string;
  aspectRatio?: "auto" | "video" | "square" | "tall";
  autoplayVideos?: boolean;
  inViewThreshold?: number;
}

export const PostMedia: React.FC<PostMediaProps> = ({
  media,
  className,
  aspectRatio = "auto",
  autoplayVideos = true,
  inViewThreshold = 0.5,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const videoRefs = React.useRef<Map<string, HTMLVideoElement>>(new Map());
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isInView, setIsInView] = React.useState(false);
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);
  const [playingMap, setPlayingMap] = React.useState<Record<string, boolean>>({});
  const [loadedImages, setLoadedImages] = React.useState<Record<string, boolean>>({});

  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  React.useEffect(() => {
    if (!containerRef.current) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          setIsInView(e.intersectionRatio >= inViewThreshold);
        });
      },
      { threshold: [0, inViewThreshold, 1] }
    );
    io.observe(containerRef.current);
    return () => io.disconnect();
  }, [inViewThreshold]);

  React.useEffect(() => {
    videoRefs.current.forEach((video, key) => {
      if (!autoplayVideos) return;
      if (video.muted && video.getAttribute("muted") !== null) {
        try {
          if (isInView) {
            const p = video.play();
            if (p && typeof p.catch === "function") {
              p.then(() =>
                setPlayingMap((m) => ({ ...m, [key]: true }))
              ).catch(() => {
                setPlayingMap((m) => ({ ...m, [key]: false }));
              });
            } else {
              setPlayingMap((m) => ({ ...m, [key]: true }));
            }
          } else {
            video.pause();
            setPlayingMap((m) => ({ ...m, [key]: false }));
          }
        } catch {
          setPlayingMap((m) => ({ ...m, [key]: false }));
        }
      }
    });
  }, [isInView, autoplayVideos, activeIndex]);

  const items = media ?? [];
  if (items.length === 0) return null;

  const active = items[activeIndex];

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || touchEnd == null) return;
    const dist = touchStart - touchEnd;
    if (dist > minSwipeDistance) goNext();
    else if (dist < -minSwipeDistance) goPrev();
  };

  const goNext = () => {
    setActiveIndex((i) => (items.length > 0 ? (i + 1) % items.length : 0));
  };
  const goPrev = () => {
    setActiveIndex((i) => (items.length > 0 ? (i - 1 + items.length) % items.length : 0));
  };

  const aspectClass =
    aspectRatio === "video"
      ? "aspect-video"
      : aspectRatio === "square"
      ? "aspect-square"
      : aspectRatio === "tall"
      ? "aspect-[3/4]"
      : "";

  const togglePlay = (key: string, video: HTMLVideoElement) => {
    if (video.paused) {
      const p = video.play();
      if (p && typeof p.catch === "function") {
        p.then(() => setPlayingMap((m) => ({ ...m, [key]: true }))).catch(() => {});
      } else {
        setPlayingMap((m) => ({ ...m, [key]: true }));
      }
    } else {
      video.pause();
      setPlayingMap((m) => ({ ...m, [key]: false }));
    }
  };

  const renderItem = (item: PostMediaItem, idx: number) => {
    const key = item.id || `${idx}-${item.type}`;
    const isActive = idx === activeIndex;

    if (item.type === "VIDEO") {
      return (
        <div
          key={key}
          className={cn(
            "relative w-full bg-black/5",
            aspectClass || (item.width && item.height ? "" : "aspect-video")
          )}
        >
          <video
            ref={(el) => {
              if (el) videoRefs.current.set(key, el);
            }}
            src={item.url}
            poster={item.posterUrl || item.thumbnailUrl || undefined}
            muted
            playsInline
            loop
            controls={false}
            preload="metadata"
            className="w-full h-full object-cover"
            onClick={() => {
              const v = videoRefs.current.get(key);
              if (v) togglePlay(key, v);
            }}
          />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const v = videoRefs.current.get(key);
              if (v) togglePlay(key, v);
            }}
            className="absolute bottom-3 right-3 h-9 w-9 rounded-full bg-black/60 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/80 transition-colors shadow-lg"
            aria-label={playingMap[key] ? "Pause" : "Play"}
          >
            {playingMap[key] ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4 ml-0.5" />
            )}
          </button>
        </div>
      );
    }

    const imgLoaded = loadedImages[key];
    return (
      <div
        key={key}
        className={cn(
          "relative w-full overflow-hidden bg-muted",
          aspectClass || (item.width && item.height ? "" : "aspect-[4/3]")
        )}
        style={
          item.width && item.height
            ? { aspectRatio: `${item.width} / ${item.height}` }
            : undefined
        }
      >
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-muted via-muted/70 to-muted animate-shimmer bg-[length:200%_100%]" />
        )}
        <img
          src={item.url}
          alt={`Post media ${idx + 1}`}
          loading="lazy"
          decoding="async"
          onLoad={() => setLoadedImages((prev) => ({ ...prev, [key]: true }))}
          className={cn(
            "w-full h-full object-cover transition-opacity duration-300",
            imgLoaded ? "opacity-100" : "opacity-0"
          )}
        />
      </div>
    );
  };

  const showNav = items.length > 1;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full rounded-xl overflow-hidden border border-border",
        className
      )}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div
        className={cn(
          "flex transition-transform duration-300 ease-out",
          prefersReducedMotion && "transition-none"
        )}
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {items.map((it, i) => (
          <div key={it.id || i} className="w-full flex-shrink-0">
            {renderItem(it, i)}
          </div>
        ))}
      </div>

      {showNav && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors shadow-lg"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 items-center justify-center rounded-full bg-black/50 backdrop-blur-sm text-white hover:bg-black/70 transition-colors shadow-lg"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-200",
                  i === activeIndex
                    ? "w-6 bg-white shadow-md"
                    : "w-1.5 bg-white/50 hover:bg-white/70"
                )}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
