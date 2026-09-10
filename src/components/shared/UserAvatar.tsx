"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/design-system/Avatar";
import { Badge } from "@/components/design-system/Badge";
import { Shield, ShieldCheck, BadgeCheck, Crown } from "lucide-react";
import type { Role } from "@/lib/types";

export interface UserAvatarUser {
  id?: string;
  avatarUrl?: string | null;
  displayName?: string | null;
  username?: string | null;
  role?: Role;
  isVerified?: boolean;
}

export interface UserAvatarProps {
  user?: UserAvatarUser | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  online?: boolean;
  onClick?: () => void;
  showRoleBadge?: boolean;
  showVerifiedBadge?: boolean;
  className?: string;
  fallbackClassName?: string;
}

function RoleIcon({ role, className }: { role: Role; className?: string }) {
  switch (role) {
    case "SUPER_ADMIN":
      return <Crown className={cn("h-3 w-3", className)} />;
    case "ADMIN":
      return <ShieldCheck className={cn("h-3 w-3", className)} />;
    case "MODERATOR":
      return <Shield className={cn("h-3 w-3", className)} />;
    default:
      return null;
  }
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = "md",
  online,
  onClick,
  showRoleBadge = false,
  showVerifiedBadge = true,
  className,
  fallbackClassName,
}) => {
  const isStaff =
    user?.role === "ADMIN" ||
    user?.role === "MODERATOR" ||
    user?.role === "SUPER_ADMIN";

  const showVerified = showVerifiedBadge && user?.isVerified;
  const showRole = showRoleBadge && isStaff;

  return (
    <div className={cn("relative inline-flex", className)}>
      <Avatar
        avatarUrl={user?.avatarUrl}
        displayName={user?.displayName}
        username={user?.username}
        size={size}
        online={online}
        onClick={onClick}
        fallbackClassName={fallbackClassName}
      />
      {(showVerified || showRole) && (
        <div className="absolute -bottom-0.5 -right-0.5 flex items-center gap-0.5">
          {showRole && user?.role && (
            <Badge
              variant={
                user.role === "SUPER_ADMIN"
                  ? "warning"
                  : user.role === "ADMIN"
                    ? "danger"
                    : "info"
              }
              size="sm"
              className="!p-0.5 !px-1"
            >
              <RoleIcon role={user.role} />
            </Badge>
          )}
          {showVerified && !showRole && (
            <Badge variant="info" size="sm" className="!p-0.5 !px-1">
              <BadgeCheck className="h-3 w-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};
