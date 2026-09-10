"use client";

import * as React from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/analytics";

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

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
