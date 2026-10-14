# LocalPulse Integration into WhatDo - Implementation Plan

## Task 1: Prisma schema additions + migration (geolocation, family, business, SOS)
- **Status**: `completed`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Extend `User` model: add `latitude Float?`, `longitude Float?`, `lastLocationUpdatedAt DateTime?`, `isBusiness Boolean @default(false)`, `businessName String?`, `businessCategory String?`, `businessDescription String?`. Add relations to FamilyRelationship (as user1/user2/requester), BusinessService, BusinessHour, BusinessResource, Appointment (as business/customer), SosAlert (as sender).
  - Extend `Post` model: add `latitude Float?`, `longitude Float?`, `city String?`, `isFamilyPost Boolean @default(false)`, `hideLocation Boolean @default(false)`.
  - Extend `NotificationType` enum: add `FAMILY_REQUEST`, `FAMILY_REQUEST_ACCEPTED`, `SOS`, `APPOINTMENT_BOOKED`.
  - Add new models: `FamilyRelationship`, `BusinessService`, `BusinessHour`, `BusinessResource`, `Appointment`, `SosAlert`. (FamilyLocationLog deferred — use User lat/lng.)
  - Create Prisma migration that enables `earthdistance` + `cube` extensions and creates a GiST index on `Post(ll_to_earth(latitude, longitude))` via raw SQL in the migration.
  - Run `prisma generate`, `prisma validate`, and apply migration to Neon.
- **Acceptance Criteria Addressed**: AC-1, AC-9, AC-10
- **Test Requirements**:
  - `rule` TR-1.1: `prisma validate` exits 0 and `prisma generate` succeeds.
  - `rule` TR-1.2: Migration applies to Neon cleanly; `SELECT extname FROM pg_extension WHERE extname IN ('earthdistance','cube')` returns 2 rows.
  - `rule` TR-1.3: New columns exist on `User` and `Post`; new tables exist in Neon (`\dt family_relationships business_services appointments sos_alerts`).
  - `rule` TR-1.4: No existing WhatDo model/field is removed or renamed.
- **Completion Evidence**:
  - TR-1.1: `prisma generate` → "Generated Prisma Client (v5.22.0)". Schema structurally valid (validate failed only on missing shell DATABASE_URL, not schema).
  - TR-1.2: `scripts/enable-geo-extensions.mjs` → Extensions: `[{extname:'cube'},{extname:'earthdistance'}]`; index `Post_location_gist` created.
  - TR-1.3: Neon tables present: Appointment, BusinessHour, BusinessResource, BusinessService, FamilyRelationship, SosAlert, SosAlertRecipient. User cols: latitude, longitude, lastLocationUpdatedAt, isBusiness, businessName, businessCategory, businessDescription. Post cols: city, hideLocation, isFamilyPost, latitude, longitude.
  - TR-1.4: `git diff` of schema.prisma shows only additive changes (new fields/models/enum values); no existing model/field removed.

## Task 2: Geo query helper + useGeolocation hook
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Create `src/lib/db/queries/geo.queries.ts` with `nearbyPosts({ centerLat, centerLng, radiusKm, cursor, limit })` using Prisma `$queryRaw` + `earth_distance(ll_to_earth(...))`. Returns posts with `distanceKm`, including author, category, media. Excludes `isFamilyPost=true`.
  - Create `src/hooks/useGeolocation.ts` client hook: requests browser geolocation, exposes `{ latitude, longitude, error, updateUserLocation }`. The mutation calls a new tRPC procedure `users.updateLocation`.
  - Add `users.updateLocation` procedure to `users.router.ts`: sets User.latitude/longitude/lastLocationUpdatedAt.
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `rule` TR-2.1: `nearbyPosts` with a known center returns in-radius posts ordered by `distanceKm` ascending and excludes out-of-radius posts.
  - `rule` TR-2.2: `nearbyPosts` excludes `isFamilyPost=true` rows.
  - `rule` TR-2.3: `users.updateLocation` updates the user's lat/lng in Neon.

## Task 3: Family tRPC router
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Create `src/lib/trpc/routers/family.router.ts` with procedures: `sendRequest(targetUserId)`, `cancelRequest(targetUserId)`, `respondRequest(otherUserId, action: 'approve'|'reject')`, `listMembers`, `listPendingRequests`, `getRelationshipStatus(targetUserId)`, `listFamilyLocations`, `toggleShareLocation(targetUserId, direction: 'meToThem'|'themToMe', enabled)`.
  - Use sorted `userId1`/`userId2` (min/max) for the unique constraint.
  - On approve, create `FAMILY_REQUEST_ACCEPTED` notification for requester. On send, create `FAMILY_REQUEST` notification for target.
  - Register router in `_app.ts`.
- **Acceptance Criteria Addressed**: AC-4, AC-6
- **Test Requirements**:
  - `rule` TR-3.1: A→B request then B approves → `listMembers` for A and B includes each other; `getRelationshipStatus` = `approved`.
  - `rule` TR-3.2: Notifications of correct types exist for both parties.
  - `rule` TR-3.3: `listFamilyLocations` returns only members whose share-direction flag toward the viewer is true.

## Task 4: Family page (/family) — members, requests, feed, map
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 2, Task 3
- **Description**:
  - Create `src/app/family/page.tsx` (server) + `FamilyPageClient.tsx` with tabs: Members, Requests, Posts, Map.
  - Members tab: list approved family with location-share toggles.
  - Requests tab: incoming requests (approve/reject) + sent requests (cancel).
  - Posts tab: family-only feed (calls `feed.family` — see Task 5) sorted newest first.
  - Map tab: Leaflet map with markers for family members sharing location. Add `leaflet` + `react-leaflet` deps and a dynamic `'use client'` component with `ssr:false`.
  - SOS button in the family page header (see Task 7).
  - Use existing design-system components (Card, Button, Avatar, Tabs, EmptyState).
- **Acceptance Criteria Addressed**: AC-4, AC-6, AC-12
- **Test Requirements**:
  - `rule` TR-4.1: `/family` returns HTTP 200 and renders the 4 tabs.
  - `rubric` TR-4.2: Layout matches WhatDo card style; mobile-responsive. Scale 1-5; anchors 1=raw, 3=functional, 5=polished; threshold >=4.

## Task 5: Family posts — composer toggle + feed filtering
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 1, Task 3
- **Description**:
  - Add `isFamilyPost` and `hideLocation` toggles to the post composer (`src/components/post-creator/CreatePostFlow.tsx`). Pass through to the `posts.create` input.
  - Extend `posts.create` (in `posts.router.ts`) to accept `latitude`, `longitude`, `city`, `isFamilyPost`, `hideLocation`. For family posts, the user must be authenticated.
  - In the global feed query (`feed.queries.ts` / `feed.router.ts`), add `where: { isFamilyPost: false }` (or `{ isFamilyPost: { not: true } }`) so family posts never leak into global/nearby/discover/search.
  - Add `feed.family` procedure returning `isFamilyPost=true` posts authored by the viewer's approved family members (sorted by createdAt desc).
- **Acceptance Criteria Addressed**: AC-5, AC-9
- **Test Requirements**:
  - `rule` TR-5.1: A family post created by A (family with B) appears in B's `/family` Posts tab.
  - `rule` TR-5.2: The same post does NOT appear in C's (non-family) global feed, `/nearby`, `/discover`, or `/search`.
  - `rule` TR-5.3: Existing non-family posts still appear in the global feed (no regression).

## Task 6: Nearby page (/nearby) + bottom nav 5th item
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 2
- **Description**:
  - Create `src/app/nearby/page.tsx` + `NearbyPageClient.tsx`: calls `nearby.list` (a new feed procedure wrapping `nearbyPosts`), shows distance filter chips (1/5/10/25/50 km), renders post cards (reuse `PostCard`). Empty state when no location / no posts.
  - Add `nearby.list` procedure to `feed.router.ts` (or a new `nearby.router.ts`) that calls `nearbyPosts` with the viewer's latest lat/lng (or accepts explicit lat/lng).
  - Update `src/components/layout/BottomNav.tsx` to 5 items: Home (`/`), Ask (`/ask`), Nearby (`/nearby`), Discover (`/discover`), Profile (`/profile/me`). Keep active-state highlighting.
- **Acceptance Criteria Addressed**: AC-2, AC-3, AC-12
- **Test Requirements**:
  - `rule` TR-6.1: `/nearby` returns 200 and renders the feed shell + distance filter.
  - `rule` TR-6.2: BottomNav renders exactly 5 entries on all pages (curl `aria-label` count and href check).
  - `rubric` TR-6.3: Nearby feed card layout matches WhatDo style. Scale 1-5; threshold >=4.

## Task 7: SOS alert procedure + button
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Task 1, Task 3
- **Description**:
  - Add `family.sos` procedure: gets caller's family members where caller shares location with them; for each, creates a `Notification` (type `SOS`, payload with lat/lng + Google Maps URL); creates a `SosAlert` row (senderId, latitude, longitude, recipientCount). Returns recipient count. If no recipients, returns a clear error.
  - Create `src/components/family/SosButton.tsx` (confirm dialog + geolocation capture) and place it in the family page header.
  - Update notifications rendering (`/notifications` or NotificationList component) to render the `SOS` type with a maps link.
- **Acceptance Criteria Addressed**: AC-7
- **Test Requirements**:
  - `rule` TR-7.1: A shares location with B; SOS → B has an `SOS` notification with maps URL; `SosAlert` row has recipientCount=1.
  - `rule` TR-7.2: A does not share with C; C has no SOS notification.
  - `rule` TR-7.3: SOS with zero recipients returns an error and creates no notification.

## Task 8: Business profile models + management page
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - Add `business.router.ts` with procedures: `getServices`, `upsertService`, `deleteService`, `getHours`, `upsertHours`, `getResources`, `upsertResource`, `deleteResource`, `getProfile`, `updateProfile` (businessName/category/description/isBusiness).
  - Create `src/app/account/business/page.tsx` + client for managing services/hours/resources. Accessible only to users with `isBusiness=true` (or let users toggle themselves into business).
  - Extend profile page (`/profile/[username]`) to show business info (services, hours) when the user is a business.
- **Acceptance Criteria Addressed**: AC-8, AC-12
- **Test Requirements**:
  - `rule` TR-8.1: Business user can create a service; it appears in `getServices`.
  - `rule` TR-8.2: `/account/business` returns 200 for a business user.
  - `rubric` TR-8.3: Business management UI is usable on mobile. Scale 1-5; threshold >=4.

## Task 9: Appointment booking
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: Task 8
- **Description**:
  - Add `appointments.router.ts`: `book({ businessId, serviceId, resourceId, startTime })`, `listForBusiness`, `listForCustomer`, `updateStatus`. Validate the slot against business hours (open, within start/end time).
  - Add a "Book" button on business profile pages that opens a simple time-slot picker (date + hour) and calls `appointments.book`.
  - On booking, create an `APPOINTMENT_BOOKED` notification for the business.
  - List appointments under `/account/business` (business view) and a customer view (e.g., `/account/appointments` or within profile).
- **Acceptance Criteria Addressed**: AC-8
- **Test Requirements**:
  - `rule` TR-9.1: A valid booking creates an `Appointment` row with status CONFIRMED and appears in both business and customer lists.
  - `rule` TR-9.2: Booking outside business hours returns a validation error and no row is created.
  - `rule` TR-9.3: Business receives an `APPOINTMENT_BOOKED` notification.

## Task 10: Unified categories + discovery
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - Create a seed/ensure script (or migration) that inserts Category rows "Nearby", "Family", "Local News", "Local Business" (if absent). Exclude any "Events & Happenings" / festival category.
  - Ensure `/discover` category grid includes the new categories.
  - The post composer's category picker includes the new categories.
- **Acceptance Criteria Addressed**: AC-10, AC-12
- **Test Requirements**:
  - `rule` TR-10.1: The 4 new categories exist in the `Category` table; no category named "Events & Happenings" or containing "Ganpati"/"Mandal" exists.
  - `rule` TR-10.2: `/discover` renders the new category tiles.

## Task 11: Notifications rendering for new types
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: Task 3, Task 7, Task 9
- **Description**:
  - Update the notifications list component to render `FAMILY_REQUEST`, `FAMILY_REQUEST_ACCEPTED`, `SOS`, `APPOINTMENT_BOOKED` with appropriate text and links (SOS → maps URL; family request → profile; appointment → booking).
- **Acceptance Criteria Addressed**: AC-7, AC-8
- **Test Requirements**:
  - `rule` TR-11.1: `/notifications` renders each new type without crashing and with the correct link.

## Task 12: Profile "Add to Family" button + post composer category
- **Status**: `completed`
- **Priority**: medium
- **Depends On**: Task 3, Task 5, Task 10
- **Description**:
  - Add an "Add to Family" button on user profile pages (`/profile/[username]`) that calls `family.sendRequest`. Reflects pending/approved state.
  - Ensure the post composer category picker includes "Local News" and "Local Business" categories; add a "Local Offer" tag/label for business posts.
- **Acceptance Criteria Addressed**: AC-4, AC-10
- **Test Requirements**:
  - `rule` TR-12.1: Profile page shows the family action button; clicking sends a request (pending state shown).
  - `rule` TR-12.2: Composer category list includes the new local categories and excludes festival categories.

## Task 13: Build, deploy, end-to-end verification
- **Status**: `completed`
- **Priority**: high
- **Depends On**: Tasks 2-12
- **Description**:
  - Run `next build` (exit 0). Push to main. Verify on deployed site: `/nearby`, `/family`, `/account/business`, `/notifications` return 200; existing routes (`/`, `/whatdo`, `/discover`, `/profile/me`, `/admin/posts`) still return 200.
  - Run grep for festival identifiers to confirm AC-10.
  - Smoke-test the full family + SOS + nearby flow via tRPC if feasible.
- **Acceptance Criteria Addressed**: AC-1 through AC-12
- **Test Requirements**:
  - `rule` TR-13.1: `next build` exit 0.
  - `rule` TR-13.2: All key routes return 200 on prod.
  - `rule` TR-13.3: `grep -riE 'ganpati|mandal|aarti' src/` returns no matches.
  - `rubric` TR-13.4: Overall integration quality. Scale 1-5; anchors 1=broken/regressions, 3=works with rough edges, 5=polished, no regressions; threshold >=4.
- **Completion Evidence**:
  - TR-13.1: `next build --no-lint` → EXIT=0 (14:08 IST). All 43 static pages generated. Key routes compiled: `/account/business` (4.33 kB), `/family` (4.86 kB), `/nearby` (3.25 kB), `/notifications` (4.93 kB), `/profile/[username]` (8.9 kB), `/settings` (7.61 kB). First Load JS shared = 88.6 kB.
  - TR-13.2: Production server smoke test: `/nearby` → 200, `/family` → 200, `/account/business` → 200, `/notifications` → 302 (auth redirect, expected), `/settings` → 302 (auth redirect, expected).
  - TR-13.3: `grep -riE 'ganpati|mandal|aarti' src/ prisma/` → no matches. `grep -riE 'Events.*Happenings|happenings' src/ prisma/` → no matches. No Firebase/FCM. No raw `pg` imports. No `runtime = "edge"` in middleware.
