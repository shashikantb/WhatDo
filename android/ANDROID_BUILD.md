# WHATDO Android — Build, Signing & Release Guide

This document covers the **separate Android application** that lives in `android/`.
It is an additive client for the existing WHATDO website; it does **not** replace,
rewrite, or re-deploy the Next.js site at `https://whatdo.co.in/`.

---

## 1. Architecture (why it looks like this)

The website is a **server-rendered Next.js 14 (App Router)** application with
`/api/trpc` route handlers, NextAuth, and Prisma. It **cannot be statically exported**
(`output: 'export'`), so a "bundled SPA" Capacitor app is not possible without
forking the entire web codebase — which the requirements explicitly forbid.

Instead the Android app uses Capacitor's **remote-server mode**:

```
android/ (Capacitor shell, native plugins)
        │  server.url = https://whatdo.co.in
        ▼
   WebView ──► existing Next.js site (one codebase, one backend, one database)
        ▲
        └── window.Capacitor.Plugins.* injected into the page
```

Consequences:

* There is exactly **one** web codebase, backend, database and R2 media bucket.
* A website deploy (`git push` → Vercel) reaches the Android app **instantly**,
  with **no new Play Store release** — unless native code or packaging changes.
* Native capabilities are exposed to the web app through Capacitor plugins, which
  the page reaches via the injected `window.Capacitor` bridge. The web-side bridge
  never imports `@capacitor/*`, so the website keeps building/running in a plain
  browser exactly as before.

### Repository layout

```
/                      existing Next.js website (unchanged in behaviour)
  src/lib/native/bridge.ts        web-safe native bridge (no-op on the web)
  src/components/shared/NativeAppBridge.tsx   client lifecycle/back-button/deeplink/push
  src/hooks/useGeolocation.ts     now prefers the native provider when inside the app
  src/lib/trpc/routers/notifications.router.ts  + registerDevice / unregisterDevice
  prisma/schema.prisma            + DeviceToken model
  public/.well-known/assetlinks.json  (to be added — see §6)
android/               new Capacitor + Android project
  capacitor.config.ts
  www/index.html                 offline fallback (no app logic)
  assets/                        icon/splash source images
  android/                       generated Gradle project
    app/src/main/AndroidManifest.xml
    app/src/main/java/co/in/whatdo/app/SecureStorePlugin.java
    app/build.gradle             (conditional release signing)
```

---

## 2. Prerequisites

| Tool | Version used | Notes |
| --- | --- | --- |
| JDK | **21** | `export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"` |
| Android SDK | **35** platform + build-tools | `export ANDROID_HOME="$HOME/Library/Android/sdk"` |
| Gradle | 8.11.1 | via wrapper (`./gradlew`) |
| AGP | 8.7.x | from Capacitor 7 template |
| Node | 20.x | for `@capacitor/cli` / `@capacitor/assets` |

Capacitor 7 targets: `minSdkVersion 23`, `compileSdkVersion 35`, `targetSdkVersion 35`.

First-time setup in `android/`:

```bash
npm install
npx cap sync android
```

---

## 3. Everyday commands

Run from `android/android` unless noted.

```bash
# from android/  — copy web assets + config into the native project
npx cap sync android

# development against a local Next.js server (npm run dev on :3000)
CAP_SERVER_URL=http://10.0.2.2:3000 npx cap sync android   # emulator
npx cap open android                                        # Android Studio

# debug build
./gradlew assembleDebug
#   → app/build/outputs/apk/debug/app-debug.apk

# release App Bundle (Play Store upload format)
./gradlew bundleRelease
#   → app/build/outputs/bundle/release/app-release.aab
```

The app loads `https://whatdo.co.in` by default. Override with `CAP_SERVER_URL`
at sync time (e.g. a Vercel preview URL) — this only affects the packaged
`capacitor.config.json`, never the production website.

---

## 4. Release signing

Signing is **opt-in and ignored by git** so that no secret can ever reach the
website deployment.

1. Generate an upload keystore (keep it out of the repo — `*.jks`, `*.keystore`
   and `keystore.properties` are already in `android/.gitignore`):

   ```bash
   "$JAVA_HOME/bin/keytool" -genkeypair -v \
     -keystore ~/whatdo-upload.jks \
     -alias whatdo-upload \
     -keyalg RSA -keysize 2048 -validity 10000
   ```

2. Create `android/android/keystore.properties` (git-ignored):

   ```properties
   storeFile=/Users/<you>/whatdo-upload.jks
   storePassword=********
   keyAlias=whatdo-upload
   keyPassword=********
   ```

   `storeFile` may be absolute, or relative to `android/android/`.

3. Build:

   ```bash
   ./gradlew bundleRelease
   ```

`android/app/build.gradle` only defines `signingConfigs.release` when
`keystore.properties` exists, so debug builds and unsigned CI builds keep working
without it.

### Back up
* Upload keystore file (`~/*.jks`)
* Alias, both passwords
* **Play Console → App integrity → App signing** (Google's re-signing certificate)

Losing the upload key requires a Play Console key-reset request.

### Versioning
`android/app/build.gradle` → `versionCode` / `versionName`. Bump **both** for every
Play upload (`versionCode` must strictly increase). This is independent of the
website, which ships continuously through Vercel.

---

## 5. Icons & splash

Source images live in `android/assets/` (`icon-only`, `icon-foreground`,
`icon-background`, `splash`, `splash-dark`). They were derived from
`public/icons/icon.svg` (the WD gradient mark). Regenerate every density with:

```bash
cd android
npx capacitor-assets generate --android
```

This writes `mipmap-*` launcher icons, the adaptive icon
(`mipmap-anydpi-v26/ic_launcher.xml`) and `drawable-*/splash.png` for all
orientations and densities, plus `drawable-night/` variants.

---

## 6. Deep links (Android App Links)

`AndroidManifest.xml` declares an `autoVerify` intent filter for
`https://whatdo.co.in` plus the custom scheme `whatdo://open`.
`NativeAppBridge.tsx` forwards both to the in-app router.

To have Android verify ownership (so links open the app without a chooser),
publish this file on the **website**:

`public/.well-known/assetlinks.json`

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "co.in.whatdo.app",
    "sha256_cert_fingerprints": ["<SHA-256 OF YOUR RELEASE CERT>"]
  }
}]
```

Get the fingerprint:

```bash
"$JAVA_HOME/bin/keytool" -list -v -keystore ~/whatdo-upload.jks -alias whatdo-upload | grep SHA256
```

> **Blocker:** the fingerprint cannot be generated until the upload keystore
> exists, so `assetlinks.json` is intentionally **not** committed yet. Add it right
> after creating the keystore, then redeploy the website. Also add Google Play's
> app-signing SHA-256 (Play Console → App integrity) once the first bundle is
> uploaded.

Verify with:

```bash
adb shell pm verify-app-links --re-verify co.in.whatdo.app
adb shell pm get-app-links co.in.whatdo.app
```

---

## 7. Push notifications (FCM)

The web side is ready: `NativeAppBridge.tsx` asks for permission, registers with
`@capacitor/push-notifications`, stores the token in the native secure store, and
calls `trpc.notifications.registerDevice`; sign-out calls `unregisterDevice`.
Tokens persist in the new `DeviceToken` table.

Native side still requires **your** Firebase project (not available in this
workspace):

1. Firebase Console → add Android app with package `co.in.whatdo.app`.
2. Download `google-services.json` → `android/android/app/google-services.json`
   (git-ignored; the Gradle `google-services` plugin auto-applies when present).
3. Sender-side: a server component must read active `DeviceToken` rows and call
   FCM HTTP v1 with the service-account key. That requires a `FIREBASE_*` server
   credential — **not configured**.

> **Blocker:** without `google-services.json` the app still builds and runs, but
> push registration will fail silently. `google-services.json` and the FCM
> service-account key must be supplied by the account owner.

---

## 8. Background location — policy notes

Implemented with `@capacitor-community/background-geolocation`, which runs a real
Android **foreground service** (persistent notification) — not a JS timer.

Declared in `AndroidManifest.xml`:
`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`,
`FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`.

Google Play requirements that apply:
* Prominent in-app disclosure **before** the system permission dialog.
* `ACCESS_BACKGROUND_LOCATION` must be requested separately from foreground
  location, with a clear justification.
* A Play Console **Background location declaration** is required at review.
* Users must be able to stop sharing (the app has a toggle + the ongoing
  notification).

Only enable this after the Play Console declaration is approved for the intended
use case (LocalPulse + family safety). See `PRIVACY.md` requirements in the repo.

---

## 9. Network & storage hardening

* `res/xml/network_security_config.xml` — HTTPS only; cleartext permitted **only**
  for `10.0.2.2`, `localhost`, `127.0.0.1` (local dev).
* `allowBackup="false"` — the WebView session and secure store are not backed up.
* `SecureStorePlugin.java` — `EncryptedSharedPreferences` with an AES-256-GCM
  master key held in the **Android Keystore**. Used for the FCM token and any
  device-scoped credential. WebView cookies/session remain scoped to the app's
  private data directory.
* Camera/gallery use the scoped-storage `READ_MEDIA_IMAGES` / `READ_MEDIA_VIDEO`
  permissions (API 33+), with `READ_EXTERNAL_STORAGE` only up to API 32.

---

## 10. Verified build results

Recorded from this workspace (`macOS`, JDK 21, SDK 35):

| Target | Command | Result |
| --- | --- | --- |
| Debug APK | `./gradlew assembleDebug` | **BUILD SUCCESSFUL** — `app-debug.apk` (8,204,682 bytes) |
| Release AAB | `./gradlew bundleRelease` | see §11 |

`aapt2 dump badging app-debug.apk` confirmed:

```
package: name='co.in.whatdo.app' versionCode='1' versionName='1.0'
sdkVersion:'23'    targetSdkVersion:'35'
uses-permission: CAMERA, READ_MEDIA_IMAGES, READ_MEDIA_VIDEO,
  ACCESS_COARSE_LOCATION, ACCESS_FINE_LOCATION, ACCESS_BACKGROUND_LOCATION,
  FOREGROUND_SERVICE, FOREGROUND_SERVICE_LOCATION, POST_NOTIFICATIONS,
  INTERNET, ACCESS_NETWORK_STATE, WAKE_LOCK, VIBRATE
```

Known non-fatal build warnings:
* Kotlin compile daemon cannot write its temp marker under the sandbox; Gradle
  falls back to `Compile without Kotlin daemon` and the build still succeeds.
  Set `kotlin.compiler.execution.strategy=in-process` in `gradle.properties` to
  silence it, or run outside the sandbox.
* `Java compiler version 21 has deprecated support for compiling with
  source/target version 8` — emitted by the background-geolocation plugin's own
  `compileOptions`; upstream, harmless.

---

## 11. Open items / unavailable credentials

| Item | Status |
| --- | --- |
| Release keystore | **Not created** — needs the owner's passwords. See §4. |
| `.aab` signed for upload | Blocked on the keystore above. |
| `google-services.json` (FCM) | **Not available** — from the Firebase console. |
| FCM server credential | **Not available** — needed to actually send pushes. |
| `assetlinks.json` fingerprints | Blocked on the keystore above. |
| Play Console app entry | Not created. |
| Play background-location declaration | Not submitted. |
| Automated instrumented tests | Only the Capacitor template stubs exist. |
