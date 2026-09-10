"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Home,
  Flame,
  Search,
  MessageCircleQuestion,
  Bell,
  User,
  Settings,
  Shield,
  Bookmark,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/design-system/Badge";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { trpc } from "@/lib/trpc/client";
import type { Role } from "@/lib/types";

interface NavItemConfig {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  adminOnly?: boolean;
}

export interface SidebarNavProps {
  user?: {
    id?: string;
    avatarUrl?: string | null;
    displayName?: string | null;
    username?: string | null;
    role?: Role;
    isVerified?: boolean;
  } | null;
  notificationCount?: number;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  user,
  notificationCount = 0,
}) => {
  const pathname = usePathname();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";

  const { data: liveUnread } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });
  const effectiveCount = typeof liveUnread === "number" ? liveUnread : notificationCount;

  const isAdmin =
    user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  const navItems: NavItemConfig[] = [
    { label: "Home", href: "/feed", icon: Home },
    { label: "Trending", href: "/trending", icon: Flame },
    { label: "Discover", href: "/discover", icon: Search },
    { label: "Ask People", href: "/ask", icon: MessageCircleQuestion },
    {
      label: "Notifications",
      href: "/notifications",
      icon: Bell,
      badge: effectiveCount,
    },
    { label: "Saved", href: "/saved", icon: Bookmark },
    { label: "Profile", href: "/profile/me", icon: User },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/profile/me") {
      return pathname?.startsWith("/profile");
    }
    if (href === "/feed") {
      return pathname === "/feed" || pathname === "/";
    }
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 lg:w-72 flex-col border-r border-border bg-card z-30">
      <div className="flex items-center gap-2 h-16 px-5 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
            <span className="text-white font-bold text-lg">W</span>
          </div>
          <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            WHATDO
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-foreground hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("h-5 w-5 flex-shrink-0", active && "stroke-[2.25px]")} />
              <span className="flex-1">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <Badge variant="danger" size="sm">
                  {item.badge > 99 ? "99+" : item.badge}
                </Badge>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            <div className="pt-4 mt-4 border-t border-border">
              <p className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Admin
              </p>
              <Link
                href="/admin"
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  pathname?.startsWith("/admin")
                    ? "bg-danger/10 text-danger"
                    : "text-foreground hover:bg-muted text-muted-foreground hover:text-foreground"
                )}
              >
                <Shield className="h-5 w-5 flex-shrink-0" />
                <span>Admin Dashboard</span>
              </Link>
            </div>
          </>
        )}
      </nav>

      <div className="p-3 border-t border-border flex-shrink-0">
        <Link
          href="/profile/me"
          className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors"
        >
          <UserAvatar user={user} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {user?.displayName ?? "Guest User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              @{user?.username ?? "guest"}
            </p>
          </div>
        </Link>
      </div>
    </aside>
  );
};
