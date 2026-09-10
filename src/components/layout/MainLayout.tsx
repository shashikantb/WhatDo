"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { SidebarNav } from "./SidebarNav";
import { TopBar } from "./TopBar";
import { BottomNav } from "./BottomNav";
import { RightRail } from "./RightRail";
import { ToastProvider } from "@/components/design-system/Toaster";
import type { Role } from "@/lib/types";

export interface MainLayoutProps {
  children: React.ReactNode;
  user?: {
    id?: string;
    avatarUrl?: string | null;
    displayName?: string | null;
    username?: string | null;
    role?: Role;
    isVerified?: boolean;
  } | null;
  notificationCount?: number;
  className?: string;
  onLogout?: () => void;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  children,
  user,
  notificationCount = 0,
  className,
  onLogout,
}) => {
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background">
        <SidebarNav user={user} notificationCount={notificationCount} />

        <main
          className={cn(
            "md:pl-64 lg:pl-72 xl:pr-80 xl:pr-96 min-h-screen",
            className
          )}
        >
          <TopBar
            user={user}
            notificationCount={notificationCount}
            onLogout={onLogout}
          />

          <div
            className={cn(
              "pb-20 md:pb-0",
              "md:min-h-[calc(100vh-4rem)]"
            )}
          >
            {children}
          </div>
        </main>

        <RightRail />
        <BottomNav />
      </div>
    </ToastProvider>
  );
};
