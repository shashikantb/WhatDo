"use client";

import * as React from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export type RatingMode = "stars" | "numbers";

export interface RatingSliderProps {
  mode?: RatingMode;
  max?: number;
  value?: number | null;
  onChange: (value: number) => void;
  disabled?: boolean;
  className?: string;
}

export const RatingSlider: React.FC<RatingSliderProps> = ({
  mode = "stars",
  max = 5,
  value = null,
  onChange,
  disabled,
  className,
}) => {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const displayValue = hoverValue ?? value;
  const safeMax = Math.max(1, Math.min(10, max));

  if (mode === "stars") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {Array.from({ length: safeMax }).map((_, idx) => {
          const rating = idx + 1;
          const isFilled = displayValue != null && rating <= displayValue;
          const isHovered = hoverValue === rating;
          return (
            <button
              key={rating}
              type="button"
              disabled={disabled}
              onClick={() => onChange(rating)}
              onMouseEnter={() => !disabled && setHoverValue(rating)}
              onMouseLeave={() => setHoverValue(null)}
              className={cn(
                "p-1 transition-transform duration-150",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                !disabled && !prefersReducedMotion && isHovered && "scale-125",
                !disabled && !prefersReducedMotion && "hover:scale-110"
              )}
              aria-label={`Rate ${rating} out of ${safeMax}`}
            >
              <Star
                className={cn(
                  "w-8 h-8 transition-colors duration-150",
                  isFilled
                    ? "fill-warning text-warning drop-shadow-sm"
                    : "fill-muted text-muted-foreground/40"
                )}
              />
            </button>
          );
        })}
        {value != null && (
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            {value} / {safeMax}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2 justify-center">
        {Array.from({ length: safeMax }).map((_, idx) => {
          const rating = idx + 1;
          const isSelected = value === rating;
          const isHovered = hoverValue === rating;
          const inRange = displayValue != null && rating <= displayValue;
          return (
            <button
              key={rating}
              type="button"
              disabled={disabled}
              onClick={() => onChange(rating)}
              onMouseEnter={() => !disabled && setHoverValue(rating)}
              onMouseLeave={() => setHoverValue(null)}
              className={cn(
                "w-11 h-11 rounded-full font-bold text-base transition-all duration-150",
                "border-2",
                disabled && "opacity-50 cursor-not-allowed",
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-md scale-110"
                  : inRange
                  ? "bg-primary/10 text-primary border-primary/40"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-primary/50 hover:bg-primary/5"
              )}
              aria-label={`Rate ${rating} out of ${safeMax}`}
            >
              {rating}
            </button>
          );
        })}
      </div>
      {value != null && (
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
            Your rating: <strong>{value}</strong> / {safeMax}
          </span>
        </div>
      )}
    </div>
  );
};
