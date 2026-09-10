"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "category";
type BadgeSize = "sm" | "md";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-muted text-foreground border border-border",
  success: "bg-success/15 text-success border border-success/20",
  warning: "bg-warning/15 text-warning border border-warning/20",
  danger: "bg-danger/15 text-danger border border-danger/20",
  info: "bg-primary/15 text-primary border border-primary/20",
  category:
    "bg-gradient-to-r from-primary/10 to-accent/10 text-foreground border border-primary/20",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[10px] rounded-pill",
  md: "px-2.5 py-0.5 text-xs rounded-pill",
};

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          "inline-flex items-center font-medium",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";
