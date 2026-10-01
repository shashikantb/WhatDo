# WHATDO — "My WhatDo" Viral Identity Loop Product Requirements Document

## Overview
- **Summary**: End-to-end viral social loop "My WhatDo" — a 10–15 question opinion identity assessment → WhatDo Type result → 1080×1920 Instagram Story share card → referral share tracking → admin question-review dashboard → trend-based question generation pipeline.
- **Purpose**: Move WhatDo beyond a polling app into the social-comparison identity share niche; generate organic installs via Instagram/WhatsApp referrals.
- **Target Users**: 18–30 everyday WhatDo users, creators/influencers sharing their result, admins managing the question pipeline.

## Goals
1. New users land via `/whatdo` referral link → answer a few questions → register → reveal a WhatDo Type → share → drive friend referrals (viral loop, §29).
2. Questions answered → real % comparisons (agreement / rarity / city alignment) → calculated from DB aggregates, never fabricated.
3. 12 WhatDo archetype types calculated from answer patterns + 5 signal scores (Curiosity / Risk-Taking / Creativity / Social / Independence).
4. 6 visual PNG share-card templates rendered locally; share text auto-populates + referral token appended.
5. Admin question review pipeline: Draft / AI review / Pending Approval / Approved / Scheduled / Published / Expired — no question reaches users without admin approval.
6. "Daily WhatDo" single question card pinned on Home top every 24h for repeat engagement.
7. Referral funnel analytics events logged end-to-end 22 predefined event names; admin dashboard shows funnel conversion.

## Non-Goals
1. Do NOT implement native AI image generation in this MVP. AI image prompt text is generated & copyable by user — no paid API calls.
2. Do NOT implement Google Trends / News API calls in MVP if API keys missing. Seed trend-inspired drafts manually; keep API scaffold & generate endpoint so feature turns on seamlessly later.
3. No scientifically validated personality claims — clearly labelled "WhatDo Signals", entertainment value only.
4. No exact GPS / address collection / display; approximate city/region/country selection only.
5. No changes to existing create-post / voting / comment flows; preserve all existing WhatDo features fully, only new routes / new tables added.

## Background & Context
Full requirements authored by product at `/modification` (lines 1–1206, 30 sections). MVP prioritizes §30 list: WhatDo assessment, 10-15 questions, location/city comparison, real percentages, WhatDo Type, rare answer, share card PNG, AI prompt generation, admin approval, trend generation scaffold, referrals & tracking.

Existing project state: Next.js 14 App Router + Prisma 5 on Neon Postgres, tRPC 11 routers including `admin.router.ts` / `feed.router.ts` / `voting.router.ts`. Role enum `Role { USER, MODERATOR }` — no ADMIN; existing admin sections use `MODERATOR` role + route guard. User & Post models already exist; no city/region/age fields on User yet; no separate assessment question table (assessment questions = separate table, distinct from `Post` user posts).

## Functional Requirements
**FR-1**: Assessment Question Engine with lifecycle DRAFT → AI_REVIEW → PENDING_APPROVAL → APPROVED → SCHEDULED → PUBLISHED → CLOSED → REJECTED → ARCHIVED (§3). Separate DB table `AssessmentQuestion`; distinct from user-posted `Post`. 13 taxonomy categories: Opinion / Lifestyle / Personality / Money / Career / Relationship / Technology / Social Media / Entertainment / Food / Travel / Local City / Internet Trend.

**FR-2**: Weighted question selection algorithm (§23) — scoring mix: 30% engagement potential, 20% relevance, 15% freshness, 15% category diversity, 10% locality match, 10% historical performance. Avoid duplicates & recently answered questions; enforce a configurable 12-question mix e.g. Personality(2) + Lifestyle(2) + Money(1) + Career(1) + Tech(1) + Relationship(1) + Entertainment(1) + Food/Travel(1) + Trend(1) + Local(1).

**FR-3**: Anonymous pre-registration answers allowed up to N=10 (§13) under sessionId cookie; merged into real `userId` after sign-up so answers aren't lost on reveal-gate.

**FR-4**: WhatDo Score Engine (§10–12): Agreement %, Rarity %, Majority matches count, Contrarian count, City % (sample thresholded), Strongest Trait, Rarest Answer, 5-signal 0–100 bars. All percentages derived from actual aggregations; empty state falls back to "Not enough WhatDo data yet" instead of fabricated numbers.

**FR-5**: WhatDo Type classifier (§11) — one of 12 labels: THE BOLD DECISION MAKER / THE DEEP THINKER / THE UNPREDICTABLE ONE / THE REALIST / THE OPTIMIST / THE EXPLORER / THE CREATIVE MIND / THE SOCIAL CONNECTOR / THE FUTURE BUILDER / THE BALANCED ONE / THE CONTRARIAN / THE CURIOUS MIND. Selected from weighted combination of signal vectors & rarity/contrarian flags.

**FR-6**: Location data — user selects City / Region / Country profile fields; exact coords never public; city stats shown only when `response count >= minCitySampleSize` (SystemSetting, default 50). Aggregations only, never "Person X from Building Y chose…".

**FR-7**: Rare Answer UI banner (§15). When user answer's chosen % ≤ `rareAnswerThreshold` (SystemSetting default 20), banner "⚡ YOUR ANSWER IS RARE Only N% agree — SHARE result". Thresholds configurable.

**FR-8**: Daily WhatDo (§14) — pinned hero card on Home `/` top: 1 featured question per 24h window, rotating; after answer → You chose X; agree %; "See what your city thinks".

**FR-9**: Share Card PNG (§16) — 6 visual templates (Minimal / Neon-GenZ / Premium Dark / Colorful / Futuristic AI / Local-City), 1080 × 1920 Instagram Story PNG rendered from real identity data. Download button; share intent API; text prefilled with referral `?ref=shareToken`.

**FR-10**: WhatDo "Create My AI" prompt (§17-§19): generate an AI-image prompt string, copyable, grounded in real type + signals + city; never fabricate career/wealth claims; skill signals labelled explicitly "WhatDo Signals".

**FR-11**: Referral tracking (§20-21): every share gets unique share-token (cuid); `?ref=TOKEN` on inbound link → cookie written → funnel attribution for new signup, completion, reveal. 14 event names emitted: WHATDO_VIEW, QUESTION_STARTED, QUESTION_ANSWERED, QUESTION_COMPLETED, REGISTRATION_STARTED, REGISTRATION_COMPLETED, RESULT_GENERATED, RESULT_REVEALED, CARD_GENERATED, CARD_SHARED, SHARE_LINK_CLICKED, REFERRAL_SIGNUP, FRIEND_COMPLETED_WHATDO, DAILY_WHATDO_ANSWERED.

**FR-12**: Admin Question Review (§5-6): dashboard with status tabs; preview card shows preview / category / target-age / target-location / source-ref / suggested options / performance blurb / controversy / sensitivity / AI quality / actions Edit, Approve, Reject, Generate Similar. Generate Trending Questions endpoint accepts optional trend seed → creates DRAFT rows.

**FR-13**: Admin Content Controls (§22-§15 config): `SystemSetting` keys `whatdo.numQuestions (default 12)`, `whatdo.rareAnswerThreshold (20)`, `whatdo.veryRareThreshold (10)`, `whatdo.minCitySampleSize (50)`, `whatdo.questionLifetimeHours (168)` — modifiable in Settings admin.

**FR-14**: Admin WhatDo analytics funnel (§22) — table/daily chart for visitors, started, completed, registrations, reveals, cards generated, shares, clicks, referral registrations, conversion %; city stats; most-shared types; most-viral questions.

## Non-Functional Requirements
- **NFR-1** (Performance §25): Assessment question list cached 10s; vote aggregates memo-aggregated per 5-minute materialized tSV or fast indexed grouping; answer submit optimistic UI; share card PNG client-side render not server unless downloadable.
- **NFR-2** (Security/Privacy §24): SessionId & shareToken both cuid; never userId in URLs; city stats minimum cohort guard; referral cookie maxAge 30d httpOnly on same domain; CSP allows canvas export.
- **NFR-3** (UI §26): Mobile-first; Instagram/TikTok-like card stack; minimal text; full-height questions; big tap buttons; swipeable next/back optional; no survey aesthetic.
- **NFR-4** (Data Integrity §27): Never fabricate percentages. Display "Not enough WhatDo data yet." iff count < min thresholds. % values reproducible directly from SQL GROUP BY.
- **NFR-5** (Zero regression): Existing create-post flow / voting flow / Home reels / Discover / Profile / Admin (users, reports, posts) 100% working unchanged. Existing tRPC routers no breaking signature changes; no `DROP COLUMN`; all changes `ADD COLUMN` + new models + new enums only.

## Constraints
- **Technical**: Neon Postgres (no extensions); Prisma `db push`; Auth.js NextAuth v5 JWT; tRPC strict; Cloudflare R2 allowed for upload of generated card if user picks reupload; no paid AI APIs in MVP.
- **Business**: Indian market first; default country India; city examples Mumbai / Delhi / Bangalore / Hyderabad / Pune / Chennai.
- **Dependencies**: Existing `SystemSetting`, `Role`, `User`; no new OAuth providers.

## Assumptions
1. `MODERATOR` role continues to gate admin (settings/questions/analytics pages) — no new ADMIN role added in MVP.
2. WhatDo identity results persisted per-user, regenerateable (user re-takes overwrites newest; history optional keep).
3. Daily WhatDo question selection: system picks highest-engagement published AssessmentQuestion with today flag; rotated daily via cron or next-run lazy selector by date-bucket.
4. `UPSTASH_REDIS_REST_URL` / `OPENAI_API_KEY` keys may stay empty; trend generation degrades gracefully to manual input-only.

## Acceptance Criteria

### AC-1: Assessment question schema + lifecycle status
- **Type**: `rule`
- **Given**: Fresh Prisma migration applied against Neon test DB
- **When**: Run `prisma migrate deploy` + `prisma db pull`
- **Then**: New enums `QuestionStatus` and `QuestionTaxonomy` exist. New tables `AssessmentQuestion` (fields per §8: questionText, category/subcategory, answerType, options Json, targetAgeGroup, targetCity/Region/Country, sourceType/Ref, trendContext, aiGenerated, quality/share/sensitivity scores, duplicateGroupId, status, createdBy/approvedBy + timestamps, engagementScore, voteCount, minSampleSize), `AssessmentQuestionOption` (FK + order + label), `QuestionResponse` (userId nullable, sessionId, answer id FK, citySnapshot, anonAggId), `WhatDoIdentityResult` (type, agree/rarity/majority/contrarian %, city%, signals 5 cols, referrerId), `ReferralShareEvent` (userId, shareToken unique, shareType/channel, clicks/signups/completions/reveals) `AnalyticsFunnelEvent` (22 events, event name, sessionId, userId, data JSON) all present. User model gains city/region/country/ageGroup/lastAssessmentSessionId cols — all nullable.
- **Pass Condition**: `prisma validate` clean, `npx prisma db push` exit 0.
- **Evidence**: Terminal output of `prisma validate` + `prisma generate`.

### AC-2: Question selection algorithm — weighted mix + de-duplication
- **Type**: `rule`
- **Given**: 100+ seeded assessment questions across 13 taxonomy categories with locality Mumbai tag + engagement scores
- **When**: Invoke `whatdo.nextQuestion` 12 consecutive times for sessionId `s1` with `city=Mumbai`
- **Then**: Returned array contains ≤3 repeats; category distribution roughly matches 2P/2L/1Mny/1C/1T/1R/1E/1FT/1Tr/1L (permitted ±1 per slot); at least 1 local-city tagged question returned; user-answered question ids never repeated in subsequent calls for same session.
- **Pass Condition**: Scripted invocation against local DB — count categories per bucket; assert dedupe & locality.
- **Evidence**: Test script output JSON list of question ids + categories.

### AC-3: Anonymous pre-registration answers, merge after login
- **Type**: `rule`
- **Given**: Guest session `c=sess_anon1`, user not logged in
- **When**: Submit 10 answers via `whatdo.submitAnswer(session=sess_anon1)`, then register new account via NextAuth, login callback called; identity merge triggered via session cookie.
- **Then**: SQL `QuestionResponse rows for sess_anon1` now `userId IS NOT NULL` set to the newly registered user's id exactly 10 rows. sessionId `sess_anon1` cleared from responses (or retained but not orphaned). User now eligible whatdo.calculateResult returns fully computed profile (not "answer more").
- **Pass Condition**: Post-login SQL `SELECT COUNT(*) FROM "QuestionResponse" WHERE "userId"=X` returns 10; `whatdo.calculateResult(userId=X)` returns non-error result with whatdoType.
- **Evidence**: Dev server test curl + DB rows count.

### AC-4: WhatDo Score Engine — percentages real, never fabricated
- **Type**: `rule`
- **Given**: User U has answered 12 questions. Each question has N≥100 aggregated responses.
- **When**: Call `whatdo.calculateResult(userId=U)`.
- **Then**: Every agreement / rarity / city % is computed from `QuestionResponse.groupBy()` SQL counts; `agreementScorePct` equals average (for each question user answer, count (# of users picking same option) / total) × 100 — within ±0.1 of independently computed SQL SUM. Empty small-cohort result field `cityAlignmentPct` remains `NULL` when city response count < minSampleSize, UI shows "Not enough WhatDo data yet." string literal instead of %.
- **Pass Condition**: Spot-check 3 independent questions: `whatdo.calculateResult` numbers vs raw SQL aggregations match ±0.5 pct. Small-sample city never displays fabricated %.
- **Evidence**: Hand-executed SQL GROUP BY query outputs + engine result JSON side-by-side.

### AC-5: 12 WhatDo Type classifier deterministically produces one label based on signals
- **Type**: `rule`
- **Given**: 5 synthetic identity signal patterns each driving a distinct extreme archetype score matrix input.
- **When**: Run classifier on each of 5 fixtures.
- **Then**: 5 outputs in set {THE BOLD DECISION MAKER, THE DEEP THINKER, THE UNPREDICTABLE ONE, THE EXPLORER, THE CONTRARIAN} exactly 5 distinct labels; every row `whatdoType` one of 12-allowed enum strings.
- **Pass Condition**: Classifier function unit tests on fixtures → assert label ∈ allowed set & 5 distinct.
- **Evidence**: Unit test script pass output.

### AC-6: Rare answer banner only when answer is genuinely rare
- **Type**: `rule`
- **Given**: (A) Option with 14% real votes, rareThreshold=20. (B) Option with 32% votes.
- **When**: User chooses A then B sequentially.
- **Then**: Case A toast + banner `⚡ YOUR ANSWER IS RARE Only 14% agree...Share` shown. Case B → no rare banner shown.
- **Pass Condition**: Screenshot + console logs, banner component renders iff `answerPct ≤ rareAnswerThreshold` AND `totalVotes ≥ minSampleSize`.
- **Evidence**: Browser screenshots for A/B.

### AC-7: Daily WhatDo pinned hero on Home `/`
- **Type**: `rule`
- **Given**: 1 published daily question scheduled today via SystemSetting `whatdo.dailyQuestionId`.
- **When**: Visit `/` on home mobile.
- **Then**: First card at very top of reels stack (before question reel, after brand top-bar): "🔥 WhatDo Today — [Question text]" YES / NO (or MCQ options) visible → answerable. Optimistic % + "See what your city thinks" after.
- **Pass Condition**: DOM order `[brand top-bar]` immediately followed by `[DailyWhatDoHero]` then `[PullToRefresh + feed]`.
- **Evidence**: Home page screenshot.

### AC-8: Share card PNG renders 1080×1920 with live user data, 6 templates
- **Type**: `rule`
- **Given**: User has a result (type="THE BOLD DECISION MAKER", agreement=78%, rare=14%, city=Pune, curiosity=86, risk=74, creativity=68, social=62, independence=91). Session with canvas supported.
- **When**: Click `[Download Card]` for templates "Minimal", "Neon", "PremiumDark", "Colorful", "FuturisticAI", "LocalCity"
- **Then**: Each download produces PNG file with dimensions exactly W=1080 H=1920. Contains visible substrings: WHATDO logo, "MY WHATDO TYPE", the type label, 78%, 14%, "📍 Pune" (except minimal hide city), at least 2 WhatDo Signal bars. No generic placeholder text ("John Doe", "TYPE HERE") — every card uses real data. Share text copy includes "whatdo.co.in/whatdo?ref=" + cuid share token.
- **Pass Condition**: 6 PNG downloads from browser; `file` command OR `sharp identify` confirms 1080×1920; manual human verification OCR text.
- **Evidence**: PNG bytes sizes all ≥ 150KB; HTML canvas snapshot.

### AC-9: Referral loop share → link → friend signup attributed
- **Type**: `rule`
- **Given**: Existing user `U1` generates share token `share_abc`. Friend clicks `GET /whatdo?ref=share_abc`.
- **When**: Friend completes 12 answers → registers new account → reveals result.
- **Then**: `ReferralShareEvent where shareToken=share_abc` → `clickedCount` += 1, `signups` += 1, `completions` += 1, `reveals` += 1. Cookie `whatdo_ref=share_abc` persists 30 days. On new friend U2's `WhatDoIdentityResult.referrerId` set to U1's id.
- **Pass Condition**: 3 DB row increments visible (before/after counts), referrerId equality.
- **Evidence**: Dev DB SELECT before/after screenshot.

### AC-10: Analytics funnel events emitted (14 names)
- **Type**: `rule`
- **Given**: A complete share → visit → answer 12 → register → reveal → card share flow as AC-9.
- **When**: After flow completes.
- **Then**: `AnalyticsFunnelEvent` table contains exactly one row each for event names defined §21: WHATDO_VIEW, QUESTION_STARTED, QUESTION_ANSWERED × 12 (count 12 allowed), QUESTION_COMPLETED, REGISTRATION_STARTED, REGISTRATION_COMPLETED, RESULT_GENERATED, RESULT_REVEALED, CARD_GENERATED, CARD_SHARED, SHARE_LINK_CLICKED, REFERRAL_SIGNUP, FRIEND_COMPLETED_WHATDO. Event order chronologically ascending per createdAt.
- **Pass Condition**: `SELECT event, COUNT(*) FROM "AnalyticsFunnelEvent" GROUP BY event` counts meet thresholds (≥12 QUESTION_ANSWERED; each others ≥1).
- **Evidence**: SQL GROUP BY output.

### AC-11: Admin Question Review workflow + pending approval tab
- **Type**: `rule`
- **Given**: 2 DRAFT questions, 1 REJECTED, 3 PENDING_APPROVAL, 5 APPROVED, 2 PUBLISHED.
- **When**: Admin user (role=MODERATOR) visits `/admin/questions`, switches tabs.
- **Then**: Each status tab shows correct counts; Approve button ONLY on PENDING_APPROVAL; Reject shows modal reason; Edit loads form with question/category/options/targets/source. Generate Trending (if no API key still shows input modal) creates DRAFT rows. Approval sets status=APPROVED + approvedBy/approvedAt set.
- **Pass Condition**: Tab counts match DB counts, approval sets fields.
- **Evidence**: Tab screenshots + SQL `SELECT status, COUNT(*) FROM "AssessmentQuestion" GROUP BY status` before/after approval.

### AC-12: Content controls system settings modifiable + applied live
- **Type**: `rule`
- **Given**: Admin `/admin/settings` Content Controls section.
- **When**: Change `rareAnswerThreshold = 30`, save; answer a 22% choice answer.
- **Then**: Rare banner shown for ≤30% (rareAnswerThreshold=30 applied live, memo cache invalidated next request).
- **Pass Condition**: Response JSON rare flag matches new threshold.
- **Evidence**: Settings page save screenshot + answer rare flag post-change.

### AC-13: WhatDo funnel analytics admin dashboard
- **Type**: `rule`
- **Given**: 2 days of funnel events (from AC-10) in DB.
- **When**: Navigate `/admin/analytics/whatdo`
- **Then**: Dashboard cards show Visitors = #WHATDO_VIEW, Started=QUESTION_STARTED, Completed=QUESTION_COMPLETED, Registrations=REGISTRATION_COMPLETED, Reveals=RESULT_REVEALED, Cards generated, Shares, Share clicks, Referral signups, Conversion rate %. Daily trend line chart shows last 14 days counts.
- **Pass Condition**: Card numbers equal SQL GROUP BY DATE(createdAt) counts.
- **Evidence**: Dashboard screenshot + SQL output.

### AC-14: Mobile-first Instagram-style question card UI
- **Type**: `rubric`
- **Dimension**: Mobile-first / Social visual fidelity
- **Scale**: 1–5
- **Anchors**: 1 = Traditional table/survey UI; 3 = Acceptable but cramped; 5 = Instagram/TikTok-level visual hierarchy, question fills screen, tap targets ≥48pt, swipe or giant buttons, low text density
- **Pass Threshold**: ≥4
- **Evidence**: Browser mobile emulation screenshots (375 × 667).

### AC-15: Zero regression of existing Home reels, create-post, voting flows
- **Type**: `rubric`
- **Dimension**: Regression quality
- **Scale**: 1–5
- **Anchors**: 1 = Major feature broken (reels won't load / publish fails); 3 = Minor cosmetic regressions only; 5 = Entirely unchanged baseline (Home reels scroll, PTR refreshes, vote YES/NO, publish flow post creation success)
- **Pass Threshold**: ≥4
- **Evidence**: Home reels page; Create post flow; Vote flow — screenshots + tRPC feed.getForYou call success response (200).

## Open Questions
- [ ] Accept using MODERATOR role as admin-role gate (or add explicit ADMIN enum value)? **Assumption: use MODERATOR gate same as existing admin sections. Ask user if wants separate ADMIN role added.**
- [ ] Pre-populate with 100+ seeded Assessment Questions in `prisma/seed-assessment-questions.ts` (as per §30 examples) or start empty and admin-approve first?
- [ ] Allow re-taking WhatDo multiple times and keeping history (new rows per take) or overwrite single latest identity per user? **Assumption: latest overwrites, history rows allowed but UI shows latest + compare button later.**
