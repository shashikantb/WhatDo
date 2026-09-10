export type AnalyticsEventType =
  | "page_view"
  | "feed_impression"
  | "post_impression"
  | "vote_started"
  | "vote_completed"
  | "post_created"
  | "post_shared"
  | "post_saved"
  | "comment_created"
  | "follow_created"
  | "search"
  | "report_created"
  | "ad_impression"
  | "ad_click";

export interface AnalyticsEventProperties {
  [key: string]: unknown;
}

interface ThrottleKey {
  userId: string;
  eventType: string;
}

const THROTTLE_WINDOW_MS = 5000;
const lastSent = new Map<string, number>();

function throttleKey(k: ThrottleKey): string {
  return `${k.userId}::${k.eventType}`;
}

function shouldSend(k: ThrottleKey, now: number): boolean {
  const key = throttleKey(k);
  const last = lastSent.get(key) ?? 0;
  if (now - last < THROTTLE_WINDOW_MS) return false;
  lastSent.set(key, now);
  return true;
}

function pruneThrottleCache(now: number) {
  for (const [k, t] of lastSent.entries()) {
    if (now - t > THROTTLE_WINDOW_MS * 2) {
      lastSent.delete(k);
    }
  }
}

function isServerSide(): boolean {
  return typeof window === "undefined";
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  try {
    let sid = window.sessionStorage.getItem("wd:analytics_sid");
    if (!sid) {
      const rnd =
        Math.random().toString(36).slice(2) + Date.now().toString(36);
      sid = `s_${rnd}`;
      window.sessionStorage.setItem("wd:analytics_sid", sid);
    }
    return sid;
  } catch {
    return "";
  }
}

export interface TrackEventOptions {
  skipThrottle?: boolean;
}

export async function trackEvent(
  eventType: AnalyticsEventType | (string & {}),
  properties: AnalyticsEventProperties = {},
  opts: TrackEventOptions = {},
): Promise<void> {
  const now = Date.now();
  pruneThrottleCache(now);

  if (isServerSide()) {
    void (async () => {
      try {
        const { prisma } = await import("../db");
        const userId = (properties.userId as string) ?? undefined;
        if (userId && !opts.skipThrottle) {
          if (!shouldSend({ userId, eventType }, now)) return;
        }
        await prisma.analyticsEvent.create({
          data: {
            userId: userId || undefined,
            sessionId: (properties.sessionId as string) ?? undefined,
            eventType,
            properties: (properties as any) ?? undefined,
            pageUrl: (properties.pageUrl as string) ?? undefined,
            referrer: (properties.referrer as string) ?? undefined,
          },
        });
      } catch {
      }
    })();
    return;
  }

  const sessionId = getSessionId();
  const pageUrl = typeof window !== "undefined" ? window.location.href : undefined;
  const referrer = typeof document !== "undefined" ? document.referrer : undefined;

  const payload = {
    eventType,
    properties,
    sessionId,
    pageUrl,
    referrer,
  };

  try {
    const res = await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      credentials: "same-origin",
      keepalive: true,
    });
    void res;
  } catch {
  }
}

export function useAnalytics() {
  return { trackEvent };
}
