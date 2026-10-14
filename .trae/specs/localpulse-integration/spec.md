# LocalPulse Integration into WhatDo - Product Requirements Document

## Overview
- **Summary**: Integrate LocalPulse's location-based community features (nearby feed, family connections, family posts, business profiles, location sharing, SOS) into the existing WhatDo platform. The combined WhatDo becomes a single platform for opinion-based social networking AND location-based community services, sharing one account, one profile, one database, and one notification center.
- **Purpose**: Avoid running two separate applications. Evolve WhatDo into a unified platform by reusing LocalPulse's working features, adapted to WhatDo's Next.js 14 + Prisma + PostgreSQL (Neon) + tRPC + NextAuth v5 architecture.
- **Target Users**: WhatDo users (existing and new) who want local/neighborhood content, family connections, and business discovery alongside opinion polls.

## Goals
- Add geolocation infrastructure (lat/lng on users and posts, geo-index, nearby query helpers) to WhatDo's Prisma schema.
- Provide a **Nearby / Local feed** that surfaces geo-tagged posts sorted by distance from the user's current location, with distance filters.
- Add **family connections**: send/accept/reject family requests, list family members, and make **family-only posts** visible only to approved family members.
- Add **location sharing between family members** (opt-in per relationship direction) with a family map view.
- Add an **SOS emergency alert** that sends the user's location to all family members with whom location is shared (via in-app notifications + chat-style message).
- Add **business profiles**: business users can list services, hours, resources, and accept appointment bookings; posts can be tagged as local offers/business announcements.
- Reuse WhatDo's existing Post, Comment, Like, Follow, Notification, Category, Tag, and User models — extend rather than replace.
- Add new content categories ("Nearby", "Family", "Local Business", "Local News") to WhatDo's Category model for unified discovery.

## Non-Goals
- **Do NOT include any festival/Ganpati features**: no Ganpati mandal directory, mandal registration, mandal photos/videos, mandal likes, aarti notifications, or "Events & Happenings" / festival hashtag categories.
- Do NOT migrate or import LocalPulse's existing user/post data into WhatDo.
- Do NOT use LocalPulse's raw `pg` queries, Firebase auth, Firebase Cloud Messaging, or SQLite. All data access goes through Prisma against WhatDo's Neon PostgreSQL.
- Do NOT introduce a separate auth system. Everything reuses NextAuth v5 (`./auth.ts`).
- Do NOT break any existing WhatDo feature (feed, voting, WhatDo quiz, comments, follows, admin, reports).
- Push notifications (Firebase/FCM) are out of scope for this phase; all notifications use WhatDo's existing in-app `Notification` model. Web-push registration may be added as a DeviceToken table for future use but sending FCM is not required.
- The LocalPulse codebase remains in `localpulse-main.zip` as reference only; its source files are NOT copied into WhatDo. Features are re-implemented against WhatDo's architecture.

## Background & Context
- WhatDo (current repo): Next.js 14.2.35, Prisma (PostgreSQL on Neon), tRPC, NextAuth v5, S3 media storage. Has Post (9 opinion types), Comment, Like, Follow, Notification, Category, Tag, User, WhatDo quiz. Posts have no geolocation. User has city/region/country text fields but no lat/lng.
- LocalPulse (reference, extracted at `/tmp/localpulse-inspect/localnews-main`): Next.js 14.2.3, raw `pg`, Firebase auth + FCM. Tables of interest (excluding festival): `posts` (lat/lng, is_family_post, hide_location, hashtags, city), `family_relationships` (user_id_1, user_id_2, status, share_location_from_1_to_2, share_location_from_2_to_1), `device_tokens`, `business_services`, `business_hours`, `business_resources`, `appointments`, `conversations`/`messages` (used by SOS to send a chat message), `polls`/`poll_options`/`poll_votes`. Uses Postgres `earthdistance` + `cube` extensions for geo indexing (`ll_to_earth`).
- LocalPulse post hashtag categories: General Purpose, News & Alerts, Information & Updates, Community & Culture, Local Business. (Events & Happenings is excluded.)
- WhatDo already has a `Category` model and post categories — the new local categories will be seeded into it.
- WhatDo already has an in-app `Notification` model with types VOTE, COMMENT, REPLY, FOLLOW, LIKE, PREDICTION_RESOLVED, TRENDING, MODERATION — new types (FAMILY_REQUEST, SOS, etc.) will be added to the enum.

## Functional Requirements

### Geolocation Infrastructure
- **FR-1**: User model gains `latitude`, `longitude`, `lastLocationUpdatedAt`, and `isBusiness` fields.
- **FR-2**: Post model gains `latitude`, `longitude`, `city`, `isFamilyPost`, and `hideLocation` fields (nullable; existing posts remain unaffected).
- **FR-3**: A Prisma migration enables Postgres `earthdistance` and `cube` extensions and creates a GiST index on `Post(ll_to_earth(latitude, longitude))` (raw SQL in the migration).
- **FR-4**: A reusable `nearbyPosts` Prisma helper (`src/lib/db/queries/geo.queries.ts`) accepts a center lat/lng, radius in km, and pagination, returning posts ordered by distance. Uses raw `$queryRaw` with `earth_distance`.
- **FR-5**: A client-side `useGeolocation` hook prompts for browser location, stores lat/lng, and provides a `updateUserLocation` mutation to persist to the User table.

### Nearby / Local Feed
- **FR-6**: A new `/nearby` page renders a feed of geo-tagged posts sorted by distance from the user's location, with a distance filter (1/5/10/25/50 km).
- **FR-7**: Posts without lat/lng are excluded from the nearby feed.
- **FR-8**: The existing global BottomNav gains a "Nearby" entry (5th item) that links to `/nearby`.

### Family Connections
- **FR-9**: `FamilyRelationship` Prisma model with `userId1`, `userId2`, `requesterId`, `status` (PENDING/APPROVED/REJECTED), `shareLocation1to2`, `shareLocation2to1`, `createdAt`. Unique on (userId1, userId2) with sorted order.
- **FR-10**: tRPC `family` router: `sendRequest`, `cancelRequest`, `respondRequest` (approve/reject), `listMembers`, `listPendingRequests`, `getRelationshipStatus`.
- **FR-11**: A `/family` page shows pending requests (approve/reject), the family member list, and the family-only post feed.
- **FR-12**: User profile pages show an "Add to Family" button (next to Follow) that sends a family request; status reflects pending/approved.
- **FR-13**: When a family request is sent/approved, an in-app Notification is created for the recipient.

### Family Posts
- **FR-14**: The post composer gains an "Only family" toggle. When on, `Post.isFamilyPost = true`.
- **FR-15**: Family posts are only visible in the `/family` feed to approved family members; they must NOT appear in the global feed, nearby feed, discover, or search.
- **FR-16**: Family post visibility is enforced in the DB query layer (feed query filters out `isFamilyPost = true` for the global/nearby feeds).

### Location Sharing & Family Map
- **FR-17**: Each family relationship has two direction flags (`shareLocation1to2`, `shareLocation2to1`). Each user controls whether they share their location with the other.
- **FR-18**: A `/family` tab/section "Map" shows the last known location of family members who share their location with the viewer, rendered on a Leaflet map (reusing `react-leaflet` if already installed, otherwise adding it).
- **FR-19**: A `FamilyLocationLog` model records each location update for historical breadcrumbs (optional; latest location read from User.latitude/longitude).

### SOS Emergency Alert
- **FR-20**: An SOS button (in the family page / bottom nav area) opens a confirm dialog, captures current GPS, and creates: (a) an in-app Notification of type `SOS` to every family member with whom the sender shares location, (b) a `SosAlert` row logging sender, lat/lng, time, and recipient count.
- **FR-21**: SOS recipients see the alert in their notifications center with a Google Maps link to the sender's location.
- **FR-22**: If the user shares location with no family members, SOS returns a clear error ("You are not sharing your location with any family members").

### Business Profiles & Appointments
- **FR-23**: User gains `isBusiness` (bool), `businessName`, `businessCategory`, `businessDescription` fields. The post composer gains a "Local Business / Offer" category.
- **FR-24**: `BusinessService`, `BusinessHour`, `BusinessResource`, `Appointment` Prisma models mirror LocalPulse's schema (adapted to String IDs + Prisma relations).
- **FR-25**: A business management page (`/account/business`) lets business users add/edit services, hours, and resources.
- **FR-26**: Business profile page (`/profile/[username]`) shows services, hours, and a "Book" flow that creates an `Appointment`.

### Unified Discovery & Categories
- **FR-27**: Seed new Category rows: "Nearby", "Family", "Local News", "Local Business" (if not present). Posts can be assigned these categories.
- **FR-28**: `/discover` includes the new categories in its category grid.

### Notifications
- **FR-29**: Extend `NotificationType` enum with `FAMILY_REQUEST`, `FAMILY_REQUEST_ACCEPTED`, `SOS`, `APPOINTMENT_BOOKED`.
- **FR-30**: Existing notifications center (`/notifications`) renders the new types correctly.

## Non-Functional Requirements
- **NFR-1**: All existing WhatDo routes, pages, and tRPC procedures must continue to work unchanged (no regressions in feed, voting, quiz, comments, follows, admin).
- **NFR-2**: All new data access uses Prisma; no raw `pg` pool. Geo queries use Prisma `$queryRaw` with parameterized SQL.
- **NFR-3**: Build (`next build`) and TypeScript compile with zero errors after each slice.
- **NFR-4**: Prisma migration applies cleanly to Neon; `prisma generate` succeeds.
- **NFR-5**: New pages are responsive (mobile-first, matching WhatDo's existing card-based design) and use the existing design-system components.
- **NFR-6**: No new `export const runtime = "edge"` is added to middleware.
- **NFR-7**: No cookie `domain=.co.in` or `SameSite=None` without `Secure`.

## Constraints
- **Technical**: Next.js 14.2.35 App Router, Prisma, tRPC v10, NextAuth v5 (`./auth.ts` single source), Neon PostgreSQL, S3 for media. Reuse `src/lib/db.ts`, `src/lib/trpc`, `src/components/design-system`, `src/components/shared/AppProviders.tsx`.
- **Database**: Existing Neon DB (`DATABASE_URL`). New tables via Prisma migration. Must enable `earthdistance` + `cube` extensions.
- **Dependencies**: WhatDo currently does not have `react-leaflet`/`leaflet`. Adding them is acceptable for the map. Do NOT add Firebase.
- **Non-negotiable (from prior sessions)**: Never add `runtime = "edge"` to middleware; never set `domain=.co.in`; `SameSite=None` requires `Secure=true`; root `./auth.ts` is the single auth source.

## Assumptions
- The user wants the integration implemented in the current WhatDo repo (not a new repo).
- WhatDo users will opt in to location sharing; location is never collected without explicit geolocation permission.
- In-app notifications are an acceptable substitute for FCM push in this phase.
- Business appointment booking is a basic create/list flow; no calendar UI beyond time-slot selection is required.
- `ngeohash` from LocalPulse is not needed; `earthdistance` suffices for distance queries.

## Acceptance Criteria

### AC-1: Geolocation schema and migration
- **Type**: `rule`
- **Given**: The Prisma schema has been updated and migration run
- **When**: Inspecting `prisma/schema.prisma` and the generated migration
- **Then**: User model has `latitude`, `longitude`, `lastLocationUpdatedAt`, `isBusiness`; Post model has `latitude`, `longitude`, `city`, `isFamilyPost`, `hideLocation`; migration runs `CREATE EXTENSION earthdistance` and `CREATE EXTENSION cube`; a GiST index exists on `Post` geo
- **Pass Condition**: `prisma migrate dev` (or `db push`) succeeds and `prisma validate` passes; `SELECT * FROM pg_extension WHERE extname IN ('earthdistance','cube')` returns 2 rows on Neon
- **Evidence**: Migration file under `prisma/migrations/`, `prisma validate` output, Neon extension check

### AC-2: Nearby feed returns posts within radius ordered by distance
- **Type**: `rule`
- **Given**: 3 geo-tagged posts exist at known distances from a center point
- **When**: `nearbyPosts(center, radiusKm=10)` is called
- **Then**: Posts within 10 km are returned, ordered ascending by distance; posts outside the radius are excluded; each result includes a computed `distanceKm`
- **Pass Condition**: Integration check against Neon returns the correct ordered subset and distance values
- **Evidence**: tRPC `nearby.list` call output or a script query result

### AC-3: BottomNav has 5 items and /nearby renders
- **Type**: `rule`
- **Given**: A deployed/local build with the new nav
- **When**: Loading `/` and clicking "Nearby"
- **Then**: BottomNav shows Home, Ask(+), Nearby, Discover, Profile (5 items); `/nearby` loads a feed (empty state if no geo posts)
- **Pass Condition**: Screenshot/curl of `/nearby` shows the feed shell; nav has 5 `<a>`/button entries
- **Evidence**: Curl count of bottom-nav items + `/nearby` HTTP 200

### AC-4: Family request lifecycle
- **Type**: `rule`
- **Given**: Two users A and B
- **When**: A sends a family request to B, then B approves it
- **Then**: `family.listMembers` for A and B includes each other; `getRelationshipStatus` returns `approved`; a Notification of type `FAMILY_REQUEST` exists for B and `FAMILY_REQUEST_ACCEPTED` for A
- **Pass Condition**: tRPC mutation sequence returns expected states and notification rows exist
- **Evidence**: tRPC call sequence output

### AC-5: Family posts are private to family members
- **Type**: `rule`
- **Given**: A and B are family; C is not. A creates a post with `isFamilyPost=true`.
- **When**: B views `/family` feed and C views the global feed
- **Then**: B sees the post in `/family`; C does NOT see the post in global feed, `/nearby`, `/discover`, or `/search`
- **Pass Condition**: Query layer excludes `isFamilyPost=true` from non-family feeds; family feed filters `isFamilyPost=true` where viewer is family
- **Evidence**: tRPC feed outputs for B and C

### AC-6: Location sharing and family map
- **Type**: `rule`
- **Given**: A and B are family; A sets `shareLocation1to2=true` and has lat/lng set
- **When**: B opens the family map
- **Then**: B sees A's marker on the map; if `shareLocation1to2=false`, A's marker is hidden from B
- **Pass Condition**: Map query returns only family members whose direction flag toward viewer is true
- **Evidence**: tRPC `family.locations` output + map screenshot

### AC-7: SOS notifies location-sharing family members
- **Type**: `rule`
- **Given**: A shares location with B (family); A does NOT share with C
- **When**: A triggers SOS with GPS lat/lng
- **Then**: B receives an `SOS` notification with a maps link; C does NOT; a `SosAlert` row is created with A's lat/lng and recipientCount=1
- **Pass Condition**: Notification rows and SosAlert row match expected state
- **Evidence**: tRPC `family.sos` output + DB rows

### AC-8: Business profile and appointment booking
- **Type**: `rule`
- **Given**: User U is a business (`isBusiness=true`) with a service "Haircut" (price, duration) and hours set
- **When**: A customer books an appointment for that service at an open time slot
- **Then**: An `Appointment` row is created with status CONFIRMED; the business sees it in `/account/business`; the customer sees it in their appointments
- **Pass Condition**: Appointment row exists with correct foreign keys; business and customer lists include it
- **Evidence**: tRPC `appointments.book` output + list output

### AC-9: No regression to existing WhatDo features
- **Type**: `rule`
- **Given**: The full integration is merged
- **When**: Running the existing core flows (home feed, vote on a poll, take WhatDo quiz, comment, follow, admin posts list)
- **Then**: All flows behave as before; no console errors; build passes
- **Pass Condition**: `next build` exit 0; smoke tests of existing pages return 200 and expected content
- **Evidence**: Build log + curl checks of `/`, `/whatdo`, `/discover`, `/profile/me`, `/admin/posts`

### AC-10: No festival/Ganpati code is introduced
- **Type**: `rule`
- **Given**: The integration is complete
- **When**: Searching the WhatDo codebase for festival/mandal identifiers
- **Then**: No references to `ganpati`, `mandal`, `aarti`, or "Events & Happenings" category exist in any source file
- **Pass Condition**: `grep -riE 'ganpati|mandal|aarti' src/` returns no matches; hashtag categories exclude the festival set
- **Evidence**: Grep output (empty)

### AC-11: Architecture consistency
- **Type**: `rubric`
- **Dimension**: New code follows WhatDo patterns (Prisma models, tRPC routers, design-system components, AppProviders)
- **Scale**: 1-5
- **Anchors**: 1 = copies LocalPulse raw pg/Firebase patterns; 3 = mixed patterns; 5 = fully Prisma/tRPC/design-system consistent
- **Pass Threshold**: >= 4
- **Evidence**: Code review of new routers/components

### AC-12: Responsive and on-brand UI
- **Type**: `rubric`
- **Dimension**: New pages (/nearby, /family, /account/business) match WhatDo's visual language and are mobile-friendly
- **Scale**: 1-5
- **Anchors**: 1 = unstyled/raw; 3 = functional but inconsistent; 5 = polished, consistent with existing cards/nav
- **Pass Threshold**: >= 4
- **Evidence**: Screenshots of new pages at mobile width

## Open Questions
- [ ] Should the bottom nav be 5 items (Home, Ask, Nearby, Discover, Profile) or keep 4 and put Nearby inside Discover? (Assuming 5-item nav unless user objects.)
- [ ] Is a Leaflet map acceptable as a new dependency, or should the family map use a simpler inline approach? (Assuming Leaflet is fine.)
- [ ] Should business appointments include a calendar UI or just a time-slot picker? (Assuming time-slot picker for v1.)
- [ ] Should location history (`FamilyLocationLog`) be implemented now or deferred? (Assuming deferred; only latest location on User.)
