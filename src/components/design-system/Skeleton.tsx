"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type SkeletonVariant = "text" | "circle" | "rectangular";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = "text",
  className,
  ...props
}) => {
  const baseClasses =
    "bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%] animate-shimmer";

  const variantClasses: Record<SkeletonVariant, string> = {
    text: "h-4 rounded-md w-full",
    circle: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      aria-hidden="true"
      {...props}
    />
  );
};

export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
  lastLineWidth?: string;
}> = ({ lines = 3, className, lastLineWidth = "w-2/3" }) => {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={cn(i === lines - 1 && lastLineWidth)}
        />
      ))}
    </div>
  );
};

export const SkeletonCard: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <div className={cn("rounded-card border border-border p-6", className)}>
      <div className="flex items-center gap-3 mb-4">
        <Skeleton variant="circle" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="h-4 w-1/3" />
          <Skeleton variant="text" className="h-3 w-1/4" />
        </div>
      </div>
      <Skeleton variant="rectangular" className="h-32 w-full mb-4" />
      <SkeletonText lines={2} />
    </div>
  );
};
