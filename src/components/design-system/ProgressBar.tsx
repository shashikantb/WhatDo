"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ProgressColor = "primary" | "success" | "danger" | "warning" | "blue";
type ProgressSize = "sm" | "md" | "lg";
type LabelPosition = "inside" | "outside";

export interface ProgressBarProps {
  value: number;
  color?: ProgressColor;
  size?: ProgressSize;
  showLabel?: boolean;
  labelFormat?: (value: number) => string;
  labelPosition?: LabelPosition;
  className?: string;
}

const colorClasses: Record<ProgressColor, string> = {
  primary: "bg-primary",
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  blue: "bg-blue-500",
};

const sizeClasses: Record<ProgressSize, string> = {
  sm: "h-1.5",
  md: "h-2.5",
  lg: "h-4",
};

const labelSizeClasses: Record<ProgressSize, string> = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
};

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = "primary",
  size = "md",
  showLabel = false,
  labelFormat = (v) => `${v}%`,
  labelPosition = "outside",
  className,
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const [prefersReducedMotion, setPrefersReducedMotion] = React.useState(false);

  React.useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  const label = labelFormat(clampedValue);

  return (
    <div className={cn("w-full space-y-1", className)}>
      {showLabel && labelPosition === "outside" && (
        <div className="flex justify-between text-sm">
          <span
            className={cn("font-medium text-foreground", labelSizeClasses[size])}
          >
            {label}
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-muted relative",
          sizeClasses[size]
        )}
      >
        <div
          className={cn(
            "h-full rounded-full",
            colorClasses[color],
            !prefersReducedMotion && "transition-all duration-300 ease-out"
          )}
          style={{ width: `${clampedValue}%` }}
        />
        {showLabel && labelPosition === "inside" && size !== "sm" && (
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center font-medium text-white drop-shadow-sm",
              labelSizeClasses[size]
            )}
          >
            {label}
          </div>
        )}
      </div>
    </div>
  );
};
