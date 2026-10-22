import type { CapacitorConfig } from "@capacitor/cli";

/**
 * WHATDO Android app configuration.
 *
 * ARCHITECTURE NOTE — why `server.url` is used:
 * The WhatDo website is a server-rendered Next.js application (SSR, tRPC route
 * handlers, NextAuth, Prisma). It cannot be statically exported, so the Android
 * app cannot bundle a pre-built copy of it. Instead the native shell loads the
 * LIVE production site inside a Capacitor WebView and injects the native bridge,
 * which is the same mechanism Capacitor uses for `--livereload` against a dev
 * server. This means:
 *   - the website stays exactly as-is and keeps deploying on its own pipeline,
 *   - there is only ONE web codebase, ONE backend, ONE database,
 *   - native plugins (camera, geolocation, push, secure storage) remain callable
 *     from the page because the Capacitor bridge is injected by the native layer.
 *
 * Cookies/session: because the WebView origin IS the remote origin, NextAuth's
 * session cookie stays first-party and is not affected by third-party cookie
 * restrictions.
 */

const PRODUCTION_URL = "https://whatdo.co.in";

// Point the shell at a local/dev server when explicitly requested:
//   CAP_SERVER_URL="http://10.0.2.2:3000" npm run sync
// (10.0.2.2 is the host machine as seen from the Android emulator.)
const serverUrl = process.env.CAP_SERVER_URL?.trim() || PRODUCTION_URL;
const isLocalDev = /^http:\/\//i.test(serverUrl);

const config: CapacitorConfig = {
  appId: "co.in.whatdo.app",
  appName: "WHATDO",
  webDir: "www",
  server: {
    url: serverUrl,
    // Cleartext is only permitted for local development servers.
    cleartext: isLocalDev,
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: isLocalDev,
    // The WhatDo site sets a strict CSP; do not inject anything unexpected.
    backgroundColor: "#0b0b12",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      launchAutoHide: false,
      backgroundColor: "#0b0b12ff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    Keyboard: {
      resize: "body",
      style: "dark",
      resizeOnFullScreen: true,
    },
    BackgroundGeolocation: {
      // Notification shown while the foreground service is tracking.
      // Required by Android for background location to be policy-compliant.
      notificationTitle: "WHATDO is sharing your location",
      notificationText: "Keeping your LocalPulse feed up to date.",
      notificationIconColor: "#6366f1",
    },
  },
};

export default config;
