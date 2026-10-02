"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { purgeStaleAuthCookies } from "@/lib/utils";

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { status: sessionStatus } = useSession();
  const didPurge = React.useRef(false);

  React.useEffect(() => {
    if (didPurge.current) return;
    if (sessionStatus === "authenticated" || sessionStatus === "unauthenticated") {
      try { purgeStaleAuthCookies(); } catch {}
      didPurge.current = true;
    }
  }, [sessionStatus]);

  React.useEffect(() => {
    if (!pathname) return;
    const params = Object.fromEntries(searchParams.entries());
    try {
      trackEvent("page_view", {
        path: pathname,
        query: params,
        referrer: typeof document !== "undefined" ? document.referrer : undefined,
        title: typeof document !== "undefined" ? document.title : undefined,
      });
    } catch {
    }
  }, [pathname, searchParams]);

  return null;
}
