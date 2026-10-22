/**
 * WHATDO native bridge (web-safe).
 *
 * The exact same web bundle runs on the public website AND inside the Android
 * app's Capacitor WebView. Capacitor injects `window.Capacitor` into the loaded
 * page, which exposes every native plugin registered in the Android project.
 * This module is the single place that talks to that bridge, and every helper
 * degrades to plain web APIs when the bridge is absent, so the website behaves
 * exactly as before and gains no new dependencies.
 *
 * IMPORTANT: this file deliberately does NOT import any `@capacitor/*` package.
 * Those packages live only in `android/`. Calling `window.Capacitor.Plugins.*`
 * keeps the website's bundle unchanged and means a missing plugin can never
 * break the web build.
 */

type NativePluginInstance = {
  [method: string]: (...args: any[]) => any;
};

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  getPlatform?: () => string;
  Plugins?: Record<string, NativePluginInstance | undefined>;
}

declare global {
  interface Window {
    Capacitor?: CapacitorGlobal;
  }
}

/* ------------------------------------------------------------------ *
 * Detection
 * ------------------------------------------------------------------ */

export function getCapacitor(): CapacitorGlobal | null {
  if (typeof window === "undefined") return null;
  return window.Capacitor ?? null;
}

/** True only inside the packaged Android/iOS app. Always false on the website. */
export function isNativeApp(): boolean {
  const cap = getCapacitor();
  if (!cap) return false;
  try {
    if (typeof cap.isNativePlatform === "function") return cap.isNativePlatform() === true;
  } catch {
    /* fall through to plugin probing */
  }
  return Boolean(cap.Plugins);
}

export function nativePlatform(): "android" | "ios" | "web" {
  if (typeof window === "undefined") return "web";
  const cap = getCapacitor();
  try {
    const p = cap?.getPlatform?.();
    if (p === "android" || p === "ios") return p;
  } catch {
    /* ignore */
  }
  return "web";
}

export function getPlugin<T extends NativePluginInstance = NativePluginInstance>(
  name: string,
): T | null {
  const cap = getCapacitor();
  const inst = cap?.Plugins?.[name];
  return (inst as T) ?? null;
}

export function hasPlugin(name: string): boolean {
  return getPlugin(name) !== null;
}

/* ------------------------------------------------------------------ *
 * Secure storage
 *
 * On Android this is backed by the SecureStore native plugin
 * (Android Keystore + EncryptedSharedPreferences). On the website it falls
 * back to localStorage, which is the same guarantee the site already has —
 * no regression, just a stronger guarantee inside the app.
 * ------------------------------------------------------------------ */

export const secureStore = {
  async set(key: string, value: string): Promise<void> {
    const store = getPlugin("SecureStore");
    if (store) {
      await store.set({ key, value });
      return;
    }
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage disabled */
    }
  },

  async get(key: string): Promise<string | null> {
    const store = getPlugin("SecureStore");
    if (store) {
      try {
        const res = await store.get({ key });
        return (res?.value as string | null) ?? null;
      } catch {
        return null;
      }
    }
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  async remove(key: string): Promise<void> {
    const store = getPlugin("SecureStore");
    if (store) {
      await store.remove({ key });
      return;
    }
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  },

  /** True when values are encrypted at rest by the platform keystore. */
  isHardwareBacked(): boolean {
    return hasPlugin("SecureStore");
  },
};

/* ------------------------------------------------------------------ *
 * Geolocation
 * ------------------------------------------------------------------ */

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

/**
 * Foreground position. Uses the native Geolocation plugin inside the app
 * (which surfaces the real Android runtime permission dialog and honours
 * "Precise location") and falls back to the browser API on the website.
 */
export async function getCurrentPosition(options?: {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}): Promise<Coordinates> {
  const geo = getPlugin("Geolocation");
  if (geo) {
    const pos = await geo.getCurrentPosition({
      enableHighAccuracy: options?.enableHighAccuracy ?? true,
      timeout: options?.timeout ?? 15000,
      maximumAge: options?.maximumAge ?? 0,
    });
    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: pos.coords.accuracy ?? null,
    };
  }

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    throw new Error("Geolocation is not supported on this device.");
  }

  return new Promise<Coordinates>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy ?? null,
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(new Error("Location access denied. Please enable location services."));
        } else if (err.code === err.TIMEOUT) {
          reject(new Error("Location request timed out. Please try again."));
        } else {
          reject(new Error(err.message || "Could not determine your location."));
        }
      },
      {
        enableHighAccuracy: options?.enableHighAccuracy ?? true,
        timeout: options?.timeout ?? 10000,
        maximumAge: options?.maximumAge ?? 0,
      },
    );
  });
}

/* ------------------------------------------------------------------ *
 * Background location (opt-in only)
 *
 * Backed by a native Android foreground service via
 * @capacitor-community/background-geolocation, so tracking continues with the
 * app backgrounded and always shows an ongoing notification — the behaviour
 * Google Play requires. Never simulated with JS timers.
 * ------------------------------------------------------------------ */

let backgroundWatcherId: string | null = null;

export interface BackgroundLocationUpdate extends Coordinates {
  time: number | null;
}

export function isBackgroundLocationAvailable(): boolean {
  return hasPlugin("BackgroundGeolocation");
}

/**
 * Starts background tracking. Callers MUST have already obtained explicit user
 * consent and the ACCESS_BACKGROUND_LOCATION runtime permission.
 */
export async function startBackgroundLocation(
  onUpdate: (loc: BackgroundLocationUpdate) => void,
): Promise<string> {
  const bg = getPlugin("BackgroundGeolocation");
  if (!bg) throw new Error("Background location is only available in the WHATDO app.");

  await stopBackgroundLocation();

  const watcherId: string = await bg.addWatcher({
    backgroundMessage: "WHATDO keeps your LocalPulse feed up to date while you move.",
    backgroundTitle: "WHATDO location sharing",
    requestPermissions: true,
    stale: false,
    distanceFilter: 50,
  });

  backgroundWatcherId = watcherId;

  await bg.addListener("location", (position: any, error: any) => {
    if (error) return;
    if (!position) return;
    onUpdate({
      latitude: position.latitude,
      longitude: position.longitude,
      accuracy: position.accuracy ?? null,
      time: position.time ?? null,
    });
  });

  return watcherId;
}

export async function stopBackgroundLocation(): Promise<void> {
  const bg = getPlugin("BackgroundGeolocation");
  if (!bg) return;
  const id = backgroundWatcherId;
  backgroundWatcherId = null;
  if (!id) return;
  try {
    await bg.removeWatcher({ id });
  } catch {
    /* watcher already gone */
  }
}

/* ------------------------------------------------------------------ *
 * Push notifications
 * ------------------------------------------------------------------ */

export type PushTokenHandler = (token: string, platform: "android" | "ios") => void;
export type PushPayloadHandler = (data: Record<string, any>) => void;

export function isPushAvailable(): boolean {
  return hasPlugin("PushNotifications");
}

export async function requestPushPermission(): Promise<boolean> {
  const push = getPlugin("PushNotifications");
  if (!push) return false;

  const check = await push.checkPermissions();
  let receive = check?.receive;
  if (receive === "prompt" || receive === "prompt-with-rationale") {
    const req = await push.requestPermissions();
    receive = req?.receive;
  }
  return receive === "granted";
}

/**
 * Registers for FCM and wires token / notification listeners.
 * Returns an unsubscribe function.
 */
export async function registerPush(opts: {
  onToken: PushTokenHandler;
  onNotification?: PushPayloadHandler;
  onAction?: PushPayloadHandler;
}): Promise<() => void> {
  const push = getPlugin("PushNotifications");
  if (!push) return () => {};

  const granted = await requestPushPermission();
  if (!granted) return () => {};

  const off: Array<() => void> = [];

  const registrationHandle = await push.addListener("registration", (token: string) => {
    if (typeof token === "string" && token.length > 0) {
      opts.onToken(token, nativePlatform() === "ios" ? "ios" : "android");
    }
  });
  off.push(() => registrationHandle?.remove?.());

  const errorHandle = await push.addListener("registrationError", (err: any) => {
    console.warn("[native] push registrationError", err);
  });
  off.push(() => errorHandle?.remove?.());

  if (opts.onNotification) {
    const handle = await push.addListener(
      "pushNotificationReceived",
      (notification: any) => opts.onNotification?.(notification ?? {}),
    );
    off.push(() => handle?.remove?.());
  }

  if (opts.onAction) {
    const handle = await push.addListener(
      "pushNotificationActionPerformed",
      (action: any) => opts.onAction?.(action ?? {}),
    );
    off.push(() => handle?.remove?.());
  }

  await push.register();

  return () => {
    for (const fn of off) {
      try {
        fn();
      } catch {
        /* ignore */
      }
    }
  };
}

/* ------------------------------------------------------------------ *
 * App lifecycle: back button, deep links, splash, status bar, share
 * ------------------------------------------------------------------ */

export async function hideSplashScreen(): Promise<void> {
  const splash = getPlugin("SplashScreen");
  if (!splash) return;
  try {
    await splash.hide();
  } catch {
    /* already hidden */
  }
}

export async function setStatusBarDark(): Promise<void> {
  const bar = getPlugin("StatusBar");
  if (!bar) return;
  try {
    await bar.setStyle({ style: "DARK" });
    await bar.setBackgroundColor({ color: "#0b0b12" });
  } catch {
    /* ignore */
  }
}

/**
 * Hooks the Android hardware back button. Return `true` from the handler to
 * indicate you consumed the press (e.g. closing a modal or navigating back
 * inside the SPA); returning `false` lets the default behaviour run.
 */
export async function onBackButton(
  handler: () => boolean | Promise<boolean>,
): Promise<() => void> {
  const app = getPlugin("App");
  if (!app) return () => {};

  const handle = await app.addListener("backButton", async () => {
    let consumed = false;
    try {
      consumed = await handler();
    } catch {
      consumed = false;
    }
    if (!consumed) {
      try {
        await app.exitApp();
      } catch {
        /* ignore */
      }
    }
  });

  return () => handle?.remove?.();
}

/** Fires when the app is opened through a deep link (universal or custom scheme). */
export async function onDeepLink(
  handler: (url: string) => void,
): Promise<() => void> {
  const app = getPlugin("App");
  if (!app) return () => {};

  const handle = await app.addListener("appUrlOpen", (event: { url?: string }) => {
    if (event?.url) handler(event.url);
  });

  return () => handle?.remove?.();
}

/** The deep-link URL that launched the app, if any. */
export async function getLaunchUrl(): Promise<string | null> {
  const app = getPlugin("App");
  if (!app) return null;
  try {
    const res = await app.getLaunchUrl();
    return (res?.url as string | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Opens turn-by-turn directions in the user's installed maps app.
 * Uses an Android `geo:` intent inside the app; falls back to Google Maps
 * web URLs on the website.
 */
export async function openDirections(
  latitude: number,
  longitude: number,
  label?: string,
): Promise<void> {
  const encodedLabel = label ? encodeURIComponent(label) : "";

  if (isNativeApp()) {
    const geoUrl = `geo:${latitude},${longitude}?q=${latitude},${longitude}${
      encodedLabel ? `(${encodedLabel})` : ""
    }`;
    try {
      const app = getPlugin("App");
      // Capacitor's App plugin exposes openUrl on some versions; otherwise fall
      // back to a plain navigation which the WebView hands to the OS.
      if (app && typeof app.openUrl === "function") {
        await app.openUrl({ url: geoUrl });
        return;
      }
      window.location.href = geoUrl;
      return;
    } catch {
      /* fall through to web URL */
    }
  }

  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  window.open(webUrl, "_blank", "noopener,noreferrer");
}

/** Native share sheet inside the app, Web Share API (or no-op) on the website. */
export async function shareContent(payload: {
  title?: string;
  text?: string;
  url?: string;
}): Promise<boolean> {
  const share = getPlugin("Share");
  if (share) {
    try {
      await share.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
        dialogTitle: payload.title,
      });
      return true;
    } catch {
      return false;
    }
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share(payload);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/* ------------------------------------------------------------------ *
 * Camera / gallery
 * ------------------------------------------------------------------ */

export type ImagePickSource = "camera" | "gallery" | "prompt";

/**
 * Picks a single image. Inside the app this uses the native Camera plugin
 * (real camera intent or system gallery picker, with runtime permission
 * handling); on the website it falls back to a hidden `<input type="file">`
 * so the existing upload UI keeps working byte-for-byte.
 *
 * Video capture intentionally continues to use the WebView's native file
 * chooser, which streams straight from the OS and avoids buffering large
 * files through JavaScript.
 */
export async function pickImage(options?: {
  source?: ImagePickSource;
  quality?: number;
  maxWidth?: number;
}): Promise<File | null> {
  const camera = getPlugin("Camera");
  if (!camera) return null;

  const source = options?.source ?? "prompt";
  const sourceEnum =
    source === "camera" ? "CAMERA" : source === "gallery" ? "PHOTOS" : "PROMPT";

  // Camera.getPhoto returns a dataUrl when resultType === 'dataUrl', which is
  // the most portable way to turn the native result into a File for upload.
  const photo = await camera.getPhoto({
    quality: options?.quality ?? 88,
    allowEditing: false,
    resultType: "dataUrl",
    source: sourceEnum,
    width: options?.maxWidth,
  });

  const dataUrl: string | undefined = photo?.dataUrl ?? undefined;
  if (!dataUrl) return null;

  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const format = (photo?.format as string) || "jpeg";
  const ext = format === "png" ? "png" : "jpg";
  return new File([blob], `whatdo-${Date.now()}.${ext}`, {
    type: blob.type || `image/${format}`,
  });
}

export const native = {
  isNativeApp,
  nativePlatform,
  hasPlugin,
  secureStore,
  getCurrentPosition,
  isBackgroundLocationAvailable,
  startBackgroundLocation,
  stopBackgroundLocation,
  isPushAvailable,
  requestPushPermission,
  registerPush,
  hideSplashScreen,
  setStatusBarDark,
  onBackButton,
  onDeepLink,
  getLaunchUrl,
  openDirections,
  shareContent,
  pickImage,
};
