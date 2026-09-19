"use client";

import * as React from "react";
import { RefreshCw, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown> | void;
  isRefreshing?: boolean;
  /** Threshold in px after which a release will trigger refresh. Default 60px. */
  threshold?: number;
  /** Max visual pull distance in px. Default 80. */
  maxPull?: number;
  /** Only scrollable children (direct child) is tracked as the scroll container. Pass a ref explicitly if > 1 child. */
  scrollRef?: React.RefObject<HTMLElement>;
  children: React.ReactNode;
  className?: string;
}

type PullState = "idle" | "pulling" | "ready" | "refreshing";

export function PullToRefresh({
  onRefresh,
  isRefreshing: externalRefreshing = false,
  threshold = 60,
  maxPull = 80,
  scrollRef,
  children,
  className,
}: PullToRefreshProps) {
  const wrapperRef = React.useRef<HTMLDivElement | null>(null);
  const internalScrollRef = React.useRef<HTMLElement | null>(null);

  const [pullDistance, setPullDistance] = React.useState(0);
  const [internalRefreshing, setInternalRefreshing] = React.useState(false);
  const pullStartY = React.useRef<number | null>(null);
  const pullingRef = React.useRef(false);
  const pullIdRef = React.useRef(0);
  const onRefreshRef = React.useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const isRefreshing = externalRefreshing || internalRefreshing;

  const pullState: PullState = isRefreshing
    ? "refreshing"
    : pullDistance >= threshold
      ? "ready"
      : pullDistance > 0
        ? "pulling"
        : "idle";

  const resolveScrollEl = (): HTMLElement | null => {
    if (scrollRef?.current) return scrollRef.current;
    if (internalScrollRef.current) return internalScrollRef.current;
    const first = wrapperRef.current?.firstElementChild as HTMLElement | null;
    return first ?? null;
  };

  const handleStart = (clientY: number) => {
    const el = resolveScrollEl();
    if (!el) return;
    if (el.scrollTop > 0) return;
    if (isRefreshing) return;
    pullStartY.current = clientY;
    pullingRef.current = false;
    pullIdRef.current += 1;
  };

  const handleMove = (clientY: number) => {
    if (pullStartY.current == null) return;
    const deltaRaw = clientY - pullStartY.current;
    if (deltaRaw <= 0) {
      if (pullingRef.current) {
        setPullDistance(0);
        pullingRef.current = false;
      }
      pullStartY.current = null;
      return;
    }
    const el = resolveScrollEl();
    if (el && el.scrollTop > 0) {
      pullStartY.current = null;
      setPullDistance(0);
      pullingRef.current = false;
      return;
    }
    pullingRef.current = true;
    const damped = Math.min(maxPull, deltaRaw * 0.5);
    setPullDistance(damped);
  };

  const runRefresh = async (id: number) => {
    setInternalRefreshing(true);
    try {
      const result = onRefreshRef.current?.();
      if (result && typeof (result as Promise<unknown>).then === "function") {
        await result;
      }
    } finally {
      if (id === pullIdRef.current) {
        setInternalRefreshing(false);
        setPullDistance(0);
      }
    }
  };

  const handleEnd = () => {
    if (pullStartY.current == null) {
      pullStartY.current = null;
      return;
    }
    const startPull = pullStartY.current;
    pullStartY.current = null;
    const triggered = pullingRef.current && pullDistance >= threshold;
    pullingRef.current = false;
    if (triggered && !isRefreshing) {
      pullIdRef.current += 1;
      void runRefresh(pullIdRef.current);
    } else if (!isRefreshing) {
      setPullDistance(0);
    }
    void startPull;
  };

  React.useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      handleStart(touch.clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (!touch) return;
      handleMove(touch.clientY);
    };
    const onTouchEnd = () => handleEnd();

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      handleStart(e.clientY);
    };
    const onMouseMove = (e: MouseEvent) => handleMove(e.clientY);
    const onMouseUp = () => handleEnd();

    const target = wrapperRef.current;
    if (!target) return;

    target.addEventListener("touchstart", onTouchStart, { passive: true });
    target.addEventListener("touchmove", onTouchMove, { passive: true });
    target.addEventListener("touchend", onTouchEnd, { passive: true });
    target.addEventListener("touchcancel", onTouchEnd, { passive: true });
    target.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      target.removeEventListener("touchstart", onTouchStart);
      target.removeEventListener("touchmove", onTouchMove);
      target.removeEventListener("touchend", onTouchEnd);
      target.removeEventListener("touchcancel", onTouchEnd);
      target.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRefreshing, threshold, maxPull]);

  const visualDistance =
    isRefreshing && pullDistance < threshold ? threshold : pullDistance;

  const labelText =
    pullState === "refreshing"
      ? "Refreshing..."
      : pullState === "ready"
        ? "Release to refresh"
        : pullState === "pulling"
          ? "Pull to refresh"
          : "";

  return (
    <div
      ref={wrapperRef}
      className={cn("relative w-full h-full", className)}
      style={{
        WebkitOverflowScrolling: "touch",
      }}
      aria-live={isRefreshing ? "polite" : undefined}
    >
      {/* Pull indicator slot — overlays top of children */}
      <div
        aria-hidden={pullState === "idle"}
        className={cn(
          "pointer-events-none absolute left-0 right-0 z-40 flex items-center justify-center transition-opacity duration-200",
          pullState === "idle" ? "opacity-0" : "opacity-100"
        )}
        style={{
          height: visualDistance,
          transform: `translateY(${visualDistance - visualDistance}px)`,
        }}
      >
        <div className="flex items-center gap-2 text-white/80 text-sm font-semibold drop-shadow">
          {pullState === "refreshing" ? (
            <RefreshCw className="h-4 w-4 animate-spin text-white" />
          ) : (
            <ArrowDown
              className={cn(
                "h-4 w-4 transition-transform duration-150",
                pullState === "ready" ? "rotate-180 text-emerald-400" : ""
              )}
            />
          )}
          {labelText && <span>{labelText}</span>}
        </div>
      </div>

      {/* Children content, translated down when pulling */}
      <div
        className="w-full h-full transition-transform ease-out"
        style={{
          transform: `translateY(${visualDistance}px)`,
          transitionDuration:
            pullState === "idle" || pullState === "refreshing"
              ? "300ms"
              : "0ms",
        }}
        ref={
          internalScrollRef as unknown as React.RefObject<HTMLDivElement>
        }
      >
        {children}
      </div>
    </div>
  );
}

export default PullToRefresh;
