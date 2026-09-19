"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, Flame, Plus, Search, User, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/design-system/Modal";
import { CreatePostFlow } from "@/components/post-creator/CreatePostFlow";
import { MessageCircleQuestion } from "lucide-react";
import { useLoginModal } from "@/components/auth/LoginModal";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isCenterButton?: boolean;
}

const navItems: NavItem[] = [
  { label: "Home", href: "/", icon: Home },
  { label: "Ask", href: "/ask", icon: Plus, isCenterButton: true },
  { label: "Discover", href: "/discover", icon: Search },
  { label: "Profile", href: "/profile/me", icon: User },
];

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { openLogin } = useLoginModal();
  const isAuthenticated = status === "authenticated";
  const [askModalOpen, setAskModalOpen] = React.useState(false);

  const isActive = (href: string) => {
    if (href === "/profile/me") {
      return pathname?.startsWith("/profile");
    }
    return pathname === href || pathname?.startsWith(href + "/");
  };

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Bottom navigation"
      >
        <div className="relative flex items-end justify-around px-2 pt-1.5 pb-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);

            if (item.isCenterButton) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => setAskModalOpen(true)}
                  className={cn(
                    "relative -mt-6 flex flex-col items-center justify-center",
                    "h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25",
                    "hover:bg-primary/90 transition-all duration-200 active:scale-95"
                  )}
                  aria-label={item.label}
                >
                  <Icon className="h-7 w-7" />
                </button>
              );
            }

            if (item.label === "Profile" && !isAuthenticated) {
              return (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => openLogin()}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-lg min-w-[60px]",
                    "transition-colors duration-200",
                    "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                  aria-label={item.label}
                >
                  <LogIn className="h-5 w-5" />
                  <span className="text-[10px] font-medium leading-tight">
                    Login
                  </span>
                </button>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-1.5 px-3 rounded-lg min-w-[60px]",
                  "transition-colors duration-200",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
                aria-label={item.label}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    active && "stroke-[2.5px]"
                  )}
                />
                <span
                  className={cn(
                    "text-[10px] font-medium leading-tight",
                    active && "font-semibold"
                  )}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <Modal
        open={askModalOpen}
        onClose={() => setAskModalOpen(false)}
        title="Create New Post"
        description="Ask a question, share a poll, or get opinions from the community."
        size="full"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <MessageCircleQuestion className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs text-muted-foreground">
              Your draft will auto-save locally as you type.
            </p>
          </div>
          <CreatePostFlow
            onPublished={() => {
              setAskModalOpen(false);
            }}
          />
        </div>
      </Modal>
    </>
  );
};
