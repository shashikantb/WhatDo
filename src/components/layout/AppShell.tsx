"use client";

import * as React from "react";
import { MainLayout } from "./MainLayout";
import { ProtectedRoute } from "./ProtectedRoute";
import type { Role } from "@/lib/types";

export interface AppShellProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: Array<Role>;
  user?: {
    id?: string;
    avatarUrl?: string | null;
    displayName?: string | null;
    username?: string | null;
    role?: Role;
    isVerified?: boolean;
  } | null;
  notificationCount?: number;
  onLogout?: () => void;
  isLoading?: boolean;
  isAuthenticated?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  requireAuth = true,
  allowedRoles,
  user,
  notificationCount,
  onLogout,
  isLoading,
  isAuthenticated,
}) => {
  return (
    <ProtectedRoute
      requireAuth={requireAuth}
      allowedRoles={allowedRoles as string[] | undefined}
      userRole={user?.role ?? null}
      isLoading={isLoading}
      isAuthenticated={isAuthenticated}
    >
      <MainLayout
        user={user}
        notificationCount={notificationCount}
        onLogout={onLogout}
      >
        {children}
      </MainLayout>
    </ProtectedRoute>
  );
};
