# WHATDO Android — Google Play Publishing Checklist

Package: `co.in.whatdo.app` · App name: **WHATDO** · Release format: **Android App Bundle (.aab)**

Legend: `[x]` done in this repo · `[ ]` still to do (owner action or blocked)

---

## 1. Account & app record
- [ ] Google Play Developer account active (one-time $25 fee)
- [ ] Play Console → **Create app**: name `WHATDO`, default language, App / Free
- [ ] Accept the Developer Program Policies + US export laws declaration
- [ ] Set the app's category (Social / Entertainment) and contact email

## 2. Build artifacts
- [x] `android/` Capacitor project separated from the website
- [x] Release signing wired conditionally via `android/android/keystore.properties`
      (see `ANDROID_BUILD.md` §4)
- [x] `./gradlew assembleDebug` → **BUILD SUCCESSFUL** (verified)
- [x] `./gradlew bundleRelease` → `app-release.aab` produced and inspected (verified)
- [ ] **Create the upload keystore** (owner + passwords required)
- [ ] **Sign the bundle** — rebuild `bundleRelease` once `keystore.properties` exists;
      confirm with `jarsigner -verify` that it is no longer "jar is unsigned"
- [ ] Upload the signed `.aab` to **Internal testing** first
- [ ] Enrol in **Play App Signing** (default for new apps) and save Google's
      app-signing SHA-256

## 3. Store listing
- [ ] App name (≤30 chars): `WHATDO`
- [ ] Short description (≤80 chars)
- [ ] Full description (≤4000 chars)
- [ ] App icon 512×512 PNG (`android/assets/icon-only.png` can be resized)
- [ ] Feature graphic 1024×500 PNG
- [ ] At least 2 phone screenshots (min 320px, 16:9 or 9:16)
- [ ] Optional: 7"/10" tablet screenshots, promo video
- [ ] Privacy policy URL (public, non-editable, reachable) — **required**

## 4. App content declarations (Play Console → App content)
- [ ] **Privacy policy** URL
- [ ] **Data safety** form: declare collected data
      - Account identifiers (email, username) — collected, for account management
      - Location: coarse + fine + **background** — declare purpose
      - Photos/videos — user-initiated upload
      - Device IDs (FCM token)
      - Data encrypted in transit (yes, HTTPS-only)
      - Account deletion path — required if accounts can be created
- [ ] **Ads** declaration (yes/no)
- [ ] **Content rating** questionnaire (IARC)
- [ ] **Target audience** — if under-13 is included, Families policy applies
      (the app targets 10–30, so verify the age-rating implications)
- [ ] **News app** declaration (no)
- [ ] **COVID-19 contact tracing** (no)
- [ ] **Data deletion** URL / in-app path
- [ ] **Government apps** (no)
- [ ] **Financial features** (no)
- [ ] **Health** declaration (no)

## 5. Permissions justification
Each sensitive permission shown in the manifest must be justified:
- [ ] **Camera** — capturing photos/videos for posts (user-initiated)
- [ ] **READ_MEDIA_IMAGES / READ_MEDIA_VIDEO** — picking a gallery item to upload
- [ ] **ACCESS_FINE/COARSE_LOCATION** — LocalPulse nearby feed + family safety
- [ ] **ACCESS_BACKGROUND_LOCATION** — *requires a separate Play Console
      declaration and review*; only submit once the use case is documented
      (see below)
- [ ] **POST_NOTIFICATIONS** — push notifications (runtime prompt)
- [ ] **FOREGROUND_SERVICE_LOCATION** — the ongoing "sharing your location"
      notification while LocalPulse tracking is on

### Background location declaration (hard requirement)
- [ ] Prominent in-app disclosure shown **before** the system dialog
- [ ] Explain: "LocalPulse shows posts near you and keeps your family's
      location current while sharing is enabled."
- [ ] Confirm the user can turn sharing off at any time
- [ ] Provide a short demo video if the reviewer requests it
- [ ] If this is not approved, ship **without** `ACCESS_BACKGROUND_LOCATION`
      (foreground-only location still satisfies the map/nearby features)

## 6. Policy & compliance
- [ ] HTTPS everywhere — `network_security_config.xml` allows cleartext only for
      emulator/loopback (`10.0.2.2`, `localhost`, `127.0.0.1`)
- [ ] No `allowBackup` of session/secure storage (`allowBackup="false"`)
- [ ] Credentials stored in Android Keystore–backed `EncryptedSharedPreferences`
- [ ] User-generated content: reporting + moderation exist in the website backend
      (report reasons: spam, harassment, hate, nudity, violence, scam,
      misinformation, copyright, other) — document the in-app path
- [ ] Account deletion available (Play requires an in-app or web deletion route)
- [ ] No deceptive behaviour / no misleading "simulated" background tracking —
      the implementation is a real foreground service

## 7. Release tracks
- [ ] **Internal testing** — upload signed AAB, add internal testers, verify install
- [ ] **Closed testing** — wider beta, gather crash reports
- [ ] **Production** — staged rollout (e.g. 10% → 50% → 100%)
- [ ] Release notes per track
- [ ] Monitor **Android vitals** (ANRs, crashes) after launch

## 8. Post-launch operations
- [ ] Decide the FCM sender service account and configure it server-side
- [ ] Add `google-services.json` to `android/android/app/` (git-ignored) once
      Firebase is set up
- [ ] Publish `/.well-known/assetlinks.json` on `whatdo.co.in` with the release
      certificate SHA-256 (see `ANDROID_BUILD.md` §6) so App Links verify
- [ ] Establish the versioning ritual: bump `versionCode` + `versionName` in
      `android/android/app/build.gradle` for every Play upload
- [ ] Keep website deploys free of Android artifacts/secrets
      (`android/.gitignore` already excludes `*.jks`, `*.keystore`,
      `keystore.properties`, `google-services.json`, `android/*/build/`)

---

## Versioning policy

| | Website | Android |
| --- | --- | --- |
| Trigger | `git push` → Vercel | manual `bundleRelease` + Play upload |
| Artifact | Vercel deployment | signed `.aab` |
| Version | Vercel build id | `versionCode` (int, +1 each upload) / `versionName` |
| Secrets | Vercel env vars | local `keystore.properties` (never committed) |

A website-only change (UI, copy, tRPC route, DB) is visible in the Android app
**immediately** with no Play release, because the app loads the live site.
A new Play release is only required when **native** code, plugins, the manifest,
icons/splash, or `capacitor.config.ts` change.
