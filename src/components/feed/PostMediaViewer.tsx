"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { cn } from "@/lib/utils";

export type PostMediaType = "IMAGE" | "VIDEO" | "GIF" | "LINK";

export interface PostMediaItem {
  id?: string;
  type: PostMediaType;
  url: string;
  thumbnailUrl?: string | null;
  posterUrl?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  fileSize?: number | null;
  sortOrder?: number | null;
}

export interface PostMediaViewerProps {
  media: PostMediaItem[];
  className?: string;
}

function useOnScreen<T extends HTMLElement>(
  ref: React.RefObject<T>,
  rootMargin: string = "0px"
): boolean {
  const [isIntersecting, setIntersecting] = React.useState(false);

  React.useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIntersecting(entry.isIntersecting);
      },
      { rootMargin }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, rootMargin]);

  return isIntersecting;
}

export const PostMediaViewer: React.FC<PostMediaViewerProps> = ({
  media,
  className,
}) => {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [activeIdx, setActiveIdx] = React.useState(0);
  const [imgErrored, setImgErrored] = React.useState<Record<number, boolean>>({});
  const onScreen = useOnScreen(containerRef, "200px");

  const safeMedia = Array.isArray(media) ? media : [];
  const hasMultiple = safeMedia.length > 1;
  const current = safeMedia[activeIdx];

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (onScreen && current?.type === "VIDEO") {
      video.play().catch(() => {});
    } else if (current?.type === "VIDEO") {
      try {
        video.pause();
      } catch {
      }
    }
  }, [onScreen, current?.type, activeIdx]);

  if (!current || safeMedia.length === 0) {
    return null;
  }

  const goPrev = () =>
    setActiveIdx((i) => (i === 0 ? safeMedia.length - 1 : i - 1));
  const goNext = () =>
    setActiveIdx((i) => (i === safeMedia.length - 1 ? 0 : i + 1));

  const isImageLike =
    current.type === "IMAGE" || current.type === "GIF" || current.type === "LINK";
  const isVideo = current.type === "VIDEO";

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative rounded-xl overflow-hidden border border-border bg-muted",
        className
      )}
    >
      <div className="relative aspect-video md:aspect-[16/10] w-full">
        {isImageLike && current.url && (
          <>
            {!imgErrored[activeIdx] ? (
              <img
                src={current.thumbnailUrl || current.url}
                alt={`Media ${activeIdx + 1}`}
                className="w-full h-full object-cover"
                loading="lazy"
                fetchPriority="auto"
                decoding="async"
                onError={() =>
                  setImgErrored((prev) => ({ ...prev, [activeIdx]: true }))
                }
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
                <p className="text-xs">Failed to load media</p>
              </div>
            )}
          </>
        )}

        {isVideo && (
          <div className="w-full h-full relative bg-black">
            {!onScreen ? (
              current.posterUrl ? (
                <img
                  src={current.posterUrl}
                  alt="Video thumbnail"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  fetchPriority="auto"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-muted">
                  <div className="text-center space-y-1">
                    <div className="h-14 w-14 mx-auto rounded-full bg-foreground/10 flex items-center justify-center">
                      <Play className="h-7 w-7 ml-0.5 text-foreground/60" />
                    </div>
                    <p className="text-xs">Tap to view video</p>
                  </div>
                </div>
              )
            ) : (
              <video
                ref={videoRef}
                src={current.url}
                poster={current.posterUrl || undefined}
                muted
                loop
                playsInline
                controls
                preload="metadata"
                className="w-full h-full object-cover bg-black"
              />
            )}
          </div>
        )}

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors backdrop-blur-sm"
              aria-label="Previous media"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors backdrop-blur-sm"
              aria-label="Next media"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </div>

      {hasMultiple && (
        <div className="flex items-center justify-center gap-1.5 p-2 bg-card/80 backdrop-blur-sm border-t border-border/50">
          {safeMedia.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIdx(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                idx === activeIdx
                  ? "w-6 bg-primary"
                  : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              )}
              aria-label={`Go to media ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
