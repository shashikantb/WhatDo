"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const DEFAULT_EMOJIS = ["❤️", "😂", "😐", "😡"];

export interface EmojiPickerProps {
  emojis?: string[];
  selected?: string | null;
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({
  emojis = DEFAULT_EMOJIS,
  selected = null,
  onSelect,
  disabled,
  className,
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className={cn("flex flex-wrap gap-3 justify-center", className)}>
      {emojis.map((emoji) => {
        const isSelected = selected === emoji;
        return (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(emoji)}
            className={cn(
              "relative flex items-center justify-center",
              "w-16 h-16 sm:w-20 sm:h-20 rounded-2xl text-4xl sm:text-5xl",
              "transition-all duration-200 border-2",
              disabled && "opacity-50 cursor-not-allowed",
              !disabled && "hover:scale-110 hover:shadow-md active:scale-100",
              isSelected
                ? [
                    "bg-gradient-to-br from-primary/20 to-accent/20",
                    "border-primary shadow-lg",
                    !prefersReducedMotion && "scale-110",
                  ]
                : "bg-muted/50 border-border hover:border-primary/40"
            )}
            aria-label={`React with ${emoji}`}
            aria-pressed={isSelected}
          >
            <span
              className={cn(
                "transition-transform duration-200",
                !prefersReducedMotion && isSelected && "animate-[bounce_0.5s_ease-in-out]"
              )}
            >
              {emoji}
            </span>
            {isSelected && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-success flex items-center justify-center shadow-md">
                <svg
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="w-3 h-3 text-white"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};
