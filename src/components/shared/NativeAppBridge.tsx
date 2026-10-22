"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import {
  isNativeApp,
  nativePlatform,
  onBackButton,
  onDeepLink,
  getLaunchUrl,
  registerPush,
  hideSplashScreen,
  setStatusBarDark,
  secureStore,
} from "@/lib/native/bridge";
import { trpc } from "@/lib/trpc/client";

const PUSH_TOKEN_STORAGE_KEY = "whatdo.native.pushToken";

/**
 * Bridges the website into the Android app.
 *
 * This component is rendered by every page build, but it does nothing at all
 * unless `isNativeApp()` is true — i.e. unless the page is running inside the
 * packaged Capacitor WebView. On the public website it mounts, returns null, and
 * attaches no listeners, so web behaviour is untouched.
 *
 * Responsibilities:
 *   - hide the native splash screen and match the status bar once the app is up
 *   - map the Android hardware back button onto SPA history
 *   - route deep links (whatdo.co.in / whatdo://) into the app
 *   - register for FCM push and persist the device token via tRPC
 */
export function NativeAppBridge() {
  const { status } = useSession();
  const registerDevice = trpc.notifications.registerDevice.useMutation();
  const unregisterDevice = trpc.notifications.unregisterDevice.useMutation();
  const [enabled, setEnabled] = React.useState(false);
  const registeredTokenRef = React.useRef<string | null>(null);

  // Decide once, on the client, whether we are inside the native shell.
  React.useEffect(() => {
    setEnabled(isNativeApp());
  }, []);

  /* ---------------- Shell polish ---------------- */
  React.useEffect(() => {
    if (!enabled) return;
    void setStatusBarDark();
    void hideSplashScreen();
  }, [enabled]);

  /* ---------------- Hardware back button ---------------- */
  React.useEffect(() => {
    if (!enabled) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const off = await onBackButton(() => {
        // Let the SPA handle in-app history first; only exit at the root.
        const canGoBack =
          typeof window !== "undefined" &&
          window.history.length > 1 &&
          window.location.pathname !== "/";
        if (canGoBack) {
          window.history.back();
          return true;
        }
        return false;
      });
      if (cancelled) off();
      else dispose = off;
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [enabled]);

  /* ---------------- Deep links ---------------- */
  React.useEffect(() => {
    if (!enabled) return;
    let dispose: (() => void) | undefined;
    let cancelled = false;

    const navigate = (rawUrl: string) => {
      try {
        const url = new URL(rawUrl);
        // Custom scheme: whatdo://open/<path>
        let path = url.pathname || "/";
        if (url.protocol === "whatdo:") {
          path = url.pathname && url.pathname !== "/" ? url.pathname : `/${url.host}${url.pathname}`;
        }
        if (!path.startsWith("/")) path = `/${path}`;
        const target = `${path}${url.search || ""}`;
        // Full navigation keeps SSR/auth redirects correct inside the WebView.
        window.location.assign(target);
      } catch {
        /* malformed link — ignore */
      }
    };

    void (async () => {
      const off = await onDeepLink(navigate);
      if (cancelled) off();
      else dispose = off;

      // Cold start: if the app was launched from a link, honour it too.
      const launchUrl = await getLaunchUrl();
      if (launchUrl) navigate(launchUrl);
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [enabled]);

  /* ---------------- Push notifications ---------------- */
  React.useEffect(() => {
    if (!enabled) return;
    if (status !== "authenticated") return;

    let dispose: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const off = await registerPush({
        onToken: async (token, platform) => {
          if (registeredTokenRef.current === token) return;
          registeredTokenRef.current = token;
          // Token lives in the Android Keystore-backed store, not localStorage.
          await secureStore.set(PUSH_TOKEN_STORAGE_KEY, token);
          try {
            await registerDevice.mutateAsync({ token, platform });
          } catch {
            // Non-fatal: notifications still work locally; we simply cannot
            // target this device from the server yet.
          }
        },
        onNotification: () => {
          // Foreground receipt. The OS already shows the tray notification;
          // this hook exists so screens can react if they want to.
        },
        onAction: (action) => {
          const data = (action?.notification?.data ?? {}) as Record<string, unknown>;
          const url = typeof data.url === "string" ? data.url : null;
          if (url) window.location.assign(url);
        },
      });
      if (cancelled) off();
      else dispose = off;
    })();

    return () => {
      cancelled = true;
      dispose?.();
    };
    // `registerDevice` is a stable tRPC mutation proxy; re-running on its
    // identity change would re-register the token unnecessarily.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, status]);

  /* ---------------- Sign-out cleanup ---------------- */
  React.useEffect(() => {
    if (!enabled) return;
    if (status !== "unauthenticated") return;
    const token = registeredTokenRef.current;
    if (!token) return;
    registeredTokenRef.current = null;
    void secureStore.remove(PUSH_TOKEN_STORAGE_KEY);
    void unregisterDevice.mutateAsync({ token }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, status]);

  // Diagnostics only; never rendered.
  React.useEffect(() => {
    if (!enabled) return;
    if (process.env.NODE_ENV !== "production") {
      console.info("[native] WHATDO running inside the Android app", nativePlatform());
    }
  }, [enabled]);

  return null;
}
