"use client";

import * as React from "react";
import { Trending2, Sparkles, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export type FeedTabId = "foryou" | "following" | "trending" | "new";

export interface FeedTab {
  id: FeedTabId;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export const FEED_TABS: FeedTab[] = [
  { id: "foryou", label: "For You", icon: Sparkles },
  { id: "following", label: "Following", icon: Users },
  { id: "trending", label: "Trending", icon: Trending2 },
  { id: "new", label: "New", icon: Clock },
];

export interface FeedTabsProps {
  active: FeedTabId;
  onChange: (tab: FeedTabId) => void;
  tabs?: FeedTab[];
  className?: string;
}

export const FeedTabs: React.FC<FeedTabsProps> = ({
  active,
  onChange,
  tabs = FEED_TABS,
  className,
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);
  const navRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div
      ref={navRef}
      className={cn(
        "sticky top-0 z-20 bg-background/85 backdrop-blur-md border-b border-border",
        className
      )}
    >
      <nav
        className="flex items-center overflow-x-auto scrollbar-thin"
        role="tablist"
        aria-label="Feed categories"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.id === active;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex-shrink-0 flex items-center gap-2 px-4 md:px-5 h-12 text-sm font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {Icon && <Icon className="w-4 h-4" />}
              <span>{tab.label}</span>
              {isActive && (
                <span
                  className={cn(
                    "absolute left-3 right-3 bottom-0 h-0.5 rounded-full bg-primary",
                    !prefersReducedMotion && "transition-all duration-300 ease-out"
                  )}
                />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
};
