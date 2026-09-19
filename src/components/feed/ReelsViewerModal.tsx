"use client";

import * as React from "react";
import { X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReelsPostCard } from "./ReelsPostCard";
import { SkeletonCard } from "@/components/design-system/Skeleton";

interface ReelsViewerModalProps {
  open: boolean;
  onClose: () => void;
  items: Array<{ id: string; [key: string]: unknown }>;
  initialIndex: number;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
  fetchNextPage?: () => Promise<unknown> | void;
  onClickPost?: (post: any, index: number) => void;
  onVoteSuccess?: (postId: string) => void;
}

function ReelsSkeleton() {
  return (
    <div className="snap-start snap-always w-full h-[100dvh] flex items-center justify-center bg-gradient-to-br from-muted/60 via-background to-card">
      <div className="w-full max-w-sm space-y-4 px-4">
        <SkeletonCard className="h-[80vh] w-full rounded-3xl" />
      </div>
    </div>
  );
}

export function ReelsViewerModal({
  open,
  onClose,
  items,
  initialIndex,
  hasNextPage = false,
  isFetchingNextPage = false,
  fetchNextPage,
  onVoteSuccess,
}: ReelsViewerModalProps) {
  const viewerRef = React.useRef<HTMLDivElement | null>(null);
  const hasScrolledInitialRef = React.useRef(false);
  const [activeIndex, setActiveIndex] = React.useState(initialIndex);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (!open) {
      hasScrolledInitialRef.current = false;
      return;
    }
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current?.();
    };
    document.addEventListener("keydown", handleKey);
    const t = window.setTimeout(() => {
      const el = viewerRef.current;
      if (!el) return;
      const target = el.querySelector<HTMLElement>(
        `[data-reels-index="${initialIndex}"]`,
      );
      if (target) {
        target.scrollIntoView({ block: "start", inline: "start" });
      } else {
        el.scrollTop = initialIndex * Math.max(1, el.clientHeight);
      }
      hasScrolledInitialRef.current = true;
    }, 16);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [open, initialIndex]);

  React.useEffect(() => {
    const el = viewerRef.current;
    if (!el || !open) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(
              (entry.target as HTMLElement).dataset.reelsIndex,
            );
            if (!Number.isNaN(idx)) {
              setActiveIndex(idx);
              if (
                hasNextPage &&
                !isFetchingNextPage &&
                idx >= items.length - 3 &&
                typeof fetchNextPage === "function"
              ) {
                void fetchNextPage();
              }
            }
          }
        });
      },
      { threshold: 0.6, root: el },
    );
    el.querySelectorAll<HTMLElement>("[data-reels-index]").forEach((c) =>
      io.observe(c),
    );
    return () => io.disconnect();
  }, [open, items.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (!open) return null;

  const displayItems = items.filter((p) => {
    const id = (p as any)?.id;
    return typeof id === "string" && /^c[a-z0-9]{24}$/.test(id);
  });

  return (
    <div
      className="fixed inset-0 z-[100] bg-black flex flex-col animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label="Post viewer"
    >
      {/* Close button top-left */}
      <div className="absolute top-0 inset-x-0 z-50 flex items-center justify-between px-3 pt-[env(safe-area-inset-top)] h-[3.25rem] pointer-events-none">
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/40 backdrop-blur-md border border-white/15 text-white hover:bg-black/60 transition-colors"
          aria-label="Close viewer"
        >
          <XIcon className="h-5 w-5" />
        </button>
        <div className="pointer-events-none text-[11px] font-semibold text-white/70 drop-shadow px-3">
          {displayItems.length > 0 ? `${activeIndex + 1} / ${displayItems.length}` : ""}
        </div>
        <div className="w-9" aria-hidden />
      </div>

      {/* Reels snap scroll container */}
      <div
        ref={viewerRef}
        className={cn(
          "w-full h-[100dvh] overflow-y-scroll snap-y snap-mandatory",
          "scroll-smooth scrollbar-hide",
        )}
        style={
          {
            scrollbarWidth: "none",
            msOverflowStyle: "none",
            WebkitOverflowScrolling: "touch",
          } as React.CSSProperties
        }
      >
        {displayItems.length === 0 && (
          <div className="snap-start snap-always w-full h-[100dvh] flex items-center justify-center text-white/70 text-sm">
            No posts available
          </div>
        )}
        {displayItems.map((post: any, idx: number) => (
          <div
            key={post.id || idx}
            data-reels-index={idx}
          >
            <ReelsPostCard
              post={post}
              index={idx}
              onVoteSuccess={onVoteSuccess}
            />
          </div>
        ))}
        {isFetchingNextPage && <ReelsSkeleton />}
      </div>
    </div>
  );
}

export default ReelsViewerModal;
