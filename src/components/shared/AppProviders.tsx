import * as React from "react";
import { headers } from "next/headers";
import { SessionProviderWrapper } from "@/components/shared/SessionProviderWrapper";
import TRPCProvider from "@/lib/trpc/Provider";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import { ToastProvider } from "@/components/design-system/Toaster";
import { LoginModalProvider } from "@/components/auth/LoginModal";
import { CookieConsent } from "@/components/shared/CookieConsent";
import { PageViewTracker } from "@/components/shared/PageViewTracker";
import { auth } from "@/auth";

function buildRequestBaseUrl(): string {
  try {
    const h = headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (host) return `${proto}://${host}`;
  } catch {
  }
  const env =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  if (env) {
    try {
      if (/^https?:\/\//i.test(env)) return new URL(env).origin;
      return new URL(`https://${env}`).origin;
    } catch {
    }
  }
  return "http://localhost:3000";
}

export async function AppProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const ssrBaseUrl = buildRequestBaseUrl();
  const session = await auth().catch(() => null);

  return (
    <SessionProviderWrapper
      session={session ?? undefined}
      refetchOnWindowFocus={false}
      refetchInterval={0}
      staleTime={5 * 60 * 1000}
    >
      <TRPCProvider ssrBaseUrl={ssrBaseUrl}>
        <ThemeProvider>
          <ToastProvider>
            <LoginModalProvider>
              {children}
              <CookieConsent />
              <PageViewTracker />
            </LoginModalProvider>
          </ToastProvider>
        </ThemeProvider>
      </TRPCProvider>
    </SessionProviderWrapper>
  );
}
