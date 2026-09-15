"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/design-system/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/design-system/Card";
import { AlertTriangle } from "lucide-react";

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: Array<string>;
  userRole?: string | null;
  isAuthenticated?: boolean;
  isLoading?: boolean;
  loginUrl?: string;
}

function useNextAuthSession(): {
  status: "loading" | "authenticated" | "unauthenticated";
  data: {
    user?: {
      role?: string;
    };
  } | null;
} {
  const { status, data } = useSession();
  return {
    status: status ?? "loading",
    data: (data ?? null) as any,
  };
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  allowedRoles,
  userRole: propUserRole,
  isAuthenticated: propIsAuthenticated,
  isLoading: propIsLoading,
  loginUrl = "/login",
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const nextAuthSession = useNextAuthSession();

  const status = propIsLoading !== undefined
    ? propIsLoading ? "loading" : propIsAuthenticated ? "authenticated" : "unauthenticated"
    : nextAuthSession.status;

  const userRole = propUserRole ?? nextAuthSession.data?.user?.role ?? null;

  const effectiveAuthenticated =
    propIsAuthenticated !== undefined
      ? propIsAuthenticated
      : nextAuthSession.status === "authenticated";

  React.useEffect(() => {
    if (status !== "loading" && requireAuth && !effectiveAuthenticated) {
      const redirect = `${loginUrl}?callbackUrl=${encodeURIComponent(pathname ?? "/")}`;
      router.push(redirect);
    }
  }, [status, requireAuth, effectiveAuthenticated, loginUrl, pathname, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <LoadingSpinner size="xl" label="Loading..." />
      </div>
    );
  }

  if (requireAuth && !effectiveAuthenticated) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0 && userRole) {
    if (!allowedRoles.includes(userRole)) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <Card className="max-w-md w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 p-4 rounded-2xl bg-warning/10 border border-warning/20 w-fit">
                <AlertTriangle className="h-10 w-10 text-warning" />
              </div>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>
                You do not have the required permissions to view this page.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-3">
              <Button variant="primary" onClick={() => router.push("/feed")}>
                Back to Feed
              </Button>
              <Button variant="ghost" onClick={() => router.back()}>
                Go Back
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  return <>{children}</>;
};
