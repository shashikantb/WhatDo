"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export interface AvatarProps {
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  size?: AvatarSize;
  online?: boolean;
  onClick?: () => void;
  className?: string;
  fallbackClassName?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
  "2xl": "h-24 w-24 text-2xl",
};

const onlineDotSizeClasses: Record<AvatarSize, string> = {
  xs: "h-1.5 w-1.5",
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
  xl: "h-3.5 w-3.5",
  "2xl": "h-5 w-5",
};

const onlineDotPositionClasses: Record<AvatarSize, string> = {
  xs: "bottom-0 right-0",
  sm: "bottom-0 right-0",
  md: "bottom-0.5 right-0.5",
  lg: "bottom-0.5 right-0.5",
  xl: "bottom-1 right-1",
  "2xl": "bottom-1.5 right-1.5",
};

function getInitials(displayName: string | null | undefined, username: string | null | undefined): string {
  const name = displayName || username || "U";
  const cleaned = name.trim();
  if (!cleaned) return "U";
  const parts = cleaned.split(/\s+/).slice(0, 2);
  const initials = parts.map((p) => p[0]?.toUpperCase() || "").join("");
  return initials || "U";
}

export const Avatar: React.FC<AvatarProps> = ({
  avatarUrl,
  displayName,
  username,
  size = "md",
  online,
  onClick,
  className,
  fallbackClassName,
}) => {
  const [imgError, setImgError] = React.useState(false);
  const showFallback = !avatarUrl || imgError;

  return (
    <div
      className={cn(
        "relative inline-flex flex-shrink-0",
        onClick && "cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
      onClick={onClick}
    >
      {showFallback ? (
        <div
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-accent/20 text-primary font-semibold border border-border",
            sizeClasses[size],
            fallbackClassName
          )}
        >
          {getInitials(displayName, username)}
        </div>
      ) : (
        <img
          src={avatarUrl}
          alt={displayName || username || "User avatar"}
          onError={() => setImgError(true)}
          className={cn(
            "rounded-full object-cover border border-border",
            sizeClasses[size]
          )}
        />
      )}
      {typeof online === "boolean" && (
        <span
          className={cn(
            "absolute rounded-full ring-2 ring-card",
            onlineDotSizeClasses[size],
            onlineDotPositionClasses[size],
            online ? "bg-success" : "bg-muted-foreground"
          )}
        />
      )}
    </div>
  );
};
