"use client";

import * as React from "react";
import Link from "next/link";
import {
  Bell,
  LogOut,
  Settings,
  User as UserIcon,
  Bookmark,
  ChevronDown,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { UserAvatar } from "@/components/shared/UserAvatar";
import { Badge } from "@/components/design-system/Badge";
import { SearchBar } from "@/components/search/SearchBar";
import { trpc } from "@/lib/trpc/client";
import type { Role } from "@/lib/types";

export interface TopBarProps {
  user?: {
    id?: string;
    avatarUrl?: string | null;
    displayName?: string | null;
    username?: string | null;
    role?: Role;
    isVerified?: boolean;
  } | null;
  notificationCount?: number;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  onLogout?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  user,
  notificationCount = 0,
  searchPlaceholder = "Search what people think",
  onSearch,
  onLogout,
}) => {
  const router = useRouter();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const { data: liveUnread } = trpc.notifications.unreadCount.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    staleTime: 5000,
  });
  const effectiveCount = typeof liveUnread === "number" ? liveUnread : notificationCount;

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (q: string) => {
    if (onSearch) {
      onSearch(q);
    } else {
      router.push(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <header className="hidden md:flex sticky top-0 z-30 h-16 items-center gap-4 px-4 lg:px-6 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="flex items-center xl:hidden">
        <Link href="/feed" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-sm">
            <span className="text-white font-bold">W</span>
          </div>
          <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            WHATDO
          </span>
        </Link>
      </div>

      <div className="flex-1 max-w-xl mx-auto w-full">
        <SearchBar
          size="md"
          placeholder={searchPlaceholder}
          onSubmit={handleSearchSubmit}
          showSuggestions={true}
        />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <Link
          href="/notifications"
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {effectiveCount > 0 && (
            <Badge
              variant="danger"
              size="sm"
              className="absolute -top-0.5 -right-0.5 min-w-[18px] justify-center"
            >
              {effectiveCount > 99 ? "99+" : effectiveCount}
            </Badge>
          )}
        </Link>

        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="flex items-center gap-2 h-10 pl-1 pr-2 rounded-lg hover:bg-muted transition-colors"
          >
            <UserAvatar user={user} size="sm" />
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-200",
                menuOpen && "rotate-180",
              )}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 z-50 w-56 rounded-lg border border-border bg-card shadow-popover animate-scaleIn">
              <div className="p-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <UserAvatar user={user} size="md" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">
                      {user?.displayName ?? "Guest User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{user?.username ?? "guest"}
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-1.5">
                <Link
                  href="/profile/me"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span>Profile</span>
                </Link>
                <Link
                  href="/saved"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Bookmark className="h-4 w-4 text-muted-foreground" />
                  <span>Saved Posts</span>
                </Link>
                <Link
                  href="/settings"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  <span>Settings</span>
                </Link>
              </div>
              <div className="p-1.5 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onLogout?.();
                  }}
                  className="flex items-center gap-2.5 w-full rounded-md px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Log out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
