"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface PriceTier {
  id: string;
  value: number;
  label?: string;
}

export interface PriceTiersProps {
  tiers?: PriceTier[];
  selectedValue?: number | null;
  onSelect: (tier: PriceTier) => void;
  disabled?: boolean;
  className?: string;
  locale?: string;
  currency?: string;
}

const DEFAULT_TIERS: PriceTier[] = [
  { id: "cheap", value: 500, label: "Cheap" },
  { id: "mid", value: 2000, label: "Mid-range" },
  { id: "expensive", value: 10000, label: "Expensive" },
  { id: "luxury", value: 50000, label: "Luxury" },
];

function formatPriceINR(value: number): string {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `₹${value.toLocaleString("en-IN")}`;
  }
}

export const PriceTiers: React.FC<PriceTiersProps> = ({
  tiers = DEFAULT_TIERS,
  selectedValue = null,
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
    <div className={cn("grid grid-cols-2 sm:grid-cols-4 gap-3", className)}>
      {tiers.map((tier) => {
        const isSelected = selectedValue === tier.value;
        return (
          <button
            key={tier.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(tier)}
            className={cn(
              "group relative flex flex-col items-center justify-center gap-1",
              "py-5 px-3 rounded-2xl border-2 transition-all duration-200",
              disabled && "opacity-50 cursor-not-allowed",
              !disabled &&
                !prefersReducedMotion &&
                "hover:scale-[1.03] hover:shadow-md active:scale-[0.98]",
              isSelected
                ? [
                    "bg-gradient-to-br from-primary/15 to-accent/10",
                    "border-primary shadow-md",
                  ]
                : "bg-muted/40 border-border hover:border-primary/40"
            )}
            aria-label={`Select ${tier.label || formatPriceINR(tier.value)}`}
            aria-pressed={isSelected}
          >
            <span
              className={cn(
                "text-xl sm:text-2xl font-black tracking-tight",
                isSelected ? "text-primary" : "text-foreground"
              )}
            >
              {formatPriceINR(tier.value)}
            </span>
            {tier.label && (
              <span
                className={cn(
                  "text-[11px] sm:text-xs uppercase tracking-wider font-medium",
                  isSelected ? "text-primary/80" : "text-muted-foreground"
                )}
              >
                {tier.label}
              </span>
            )}
            {isSelected && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-success flex items-center justify-center">
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
