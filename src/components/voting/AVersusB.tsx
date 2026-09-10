"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface AVersusBOption {
  id: string;
  label: string;
  imageUrl?: string | null;
}

export interface AVersusBProps {
  optionA: AVersusBOption;
  optionB: AVersusBOption;
  selectedId?: string | null;
  onSelect: (optionId: string) => void;
  disabled?: boolean;
  className?: string;
}

export const AVersusB: React.FC<AVersusBProps> = ({
  optionA,
  optionB,
  selectedId,
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

  const isASelected = selectedId === optionA.id;
  const isBSelected = selectedId === optionB.id;

  return (
    <div
      className={cn(
        "relative grid grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-border",
        className
      )}
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(optionA.id)}
        className={cn(
          "relative group aspect-[4/5] overflow-hidden",
          "transition-all duration-200",
          "border-r border-border",
          disabled && "opacity-60 cursor-not-allowed",
          !disabled && "hover:brightness-105 active:scale-[0.99]"
        )}
        aria-label={`Vote for ${optionA.label}`}
      >
        {optionA.imageUrl ? (
          <img
            src={optionA.imageUrl}
            alt={optionA.label}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {isASelected && (
          <div
            className={cn(
              "absolute inset-0 ring-4 ring-inset ring-success",
              !prefersReducedMotion && "animate-pulse"
            )}
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
          <p className="text-xl font-bold">
            <span className="text-xs uppercase tracking-wider font-semibold text-white/70 mr-2">A:</span>
            {optionA.label}
          </p>
        </div>
      </button>

      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-popover">
          <span className="text-white font-black text-sm italic">VS</span>
        </div>
      </div>

      <button
        type="button"
        disabled={disabled}
        onClick={() => onSelect(optionB.id)}
        className={cn(
          "relative group aspect-[4/5] overflow-hidden",
          "transition-all duration-200",
          disabled && "opacity-60 cursor-not-allowed",
          !disabled && "hover:brightness-105 active:scale-[0.99]"
        )}
        aria-label={`Vote for ${optionB.label}`}
      >
        {optionB.imageUrl ? (
          <img
            src={optionB.imageUrl}
            alt={optionB.label}
            className="absolute inset-0 w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-bl from-accent/20 to-accent/5" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {isBSelected && (
          <div
            className={cn(
              "absolute inset-0 ring-4 ring-inset ring-success",
              !prefersReducedMotion && "animate-pulse"
            )}
          />
        )}
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white text-right">
          <p className="text-xl font-bold">
            <span className="text-xs uppercase tracking-wider font-semibold text-white/70 mr-2">B:</span>
            {optionB.label}
          </p>
        </div>
      </button>
    </div>
  );
};
