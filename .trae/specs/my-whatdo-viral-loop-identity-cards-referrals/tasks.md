# WHATDO — "My WhatDo" Viral Identity Loop Implementation Plan

## Task 1: Database schema — Prisma models + enums for assessment questions/answers/identity/referrals
- **Status**: `pending`
- **Priority**: high
- **Depends On**: None
- **Description**:
  - Add enums `QuestionStatus` (DRAFT → ARCHIVED §3 states) and `QuestionTaxonomy` (13 categories §4).
  - Add models: `AssessmentQuestion`, `AssessmentQuestionOption`, `QuestionResponse`, `WhatDoIdentityResult`, `ReferralShareEvent`, `AnalyticsFunnelEvent` per §8 §9 §10 §20 §21.
  - Add nullable columns on `User`: `city`, `region`, `country`, `ageGroup`, `lastAssessmentSessionId`.
  - Reuse existing `SystemSetting` for `whatdo.*` config keys §7 §15 §22.
  - Run `npx prisma validate`, `generate`; `db push` on dev database.
- **Acceptance Criteria Addressed**: AC-1
- **Test Requirements**:
  - `rule` TR-1.1: `npx prisma validate` exits 0; `prisma db push` no unexecutable errors; `npx prisma -v` list all new enums & tables.
  - `rule` TR-1.2: SQL `SELECT enum_range(null::"QuestionStatus")` returns all 9 expected status labels.
  - `rule` TR-1.3: `User` new 5 columns exist via `SELECT column_name FROM information_schema.columns WHERE table_name='User' AND column_name IN ('city','region','country','ageGroup','lastAssessmentSessionId')` count=5.
- **Notes**: Add `@@unique` on `QuestionResponse(sessionId, assessmentQuestionId)` and `QuestionResponse(userId, assessmentQuestionId)` separately via two unique indexes; allow one of user/sessionId NULL per row Prisma @@unique allows null one nullable.

## Task 2: Seed initial 50 curated Assessment Questions (examples §4 + Appendix E)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - Create `prisma/seed-assessment-questions.ts` with 50+ questions spanning the 13 categories including LOCAL_CITY Mumbai/Pune/Bangalore variants, Money/Career/Relationship/Technology/Local trend examples; at least 10 per answer type (YES_NO / MULTIPLE_CHOICE / A_VS_B / CLASSIC_POLL / RATING / DECISION / PREDICTION).
  - Seed with status `APPROVED`; published_at = now so questions are live immediately.
  - Add `npm run db:seed:questions` command to package.json scripts.
- **Acceptance Criteria Addressed**: AC-2 (seed corpus needed), AC-5 (variety)
- **Test Requirements**:
  - `rule` TR-2.1: After `npm run db:seed:questions`; SQL query `SELECT "category", COUNT(*) FROM "AssessmentQuestion" GROUP BY "category"` returns rows for at least 12 of 13 taxonomy categories (Internet Trend can be 0 if no trend seed defined), total rows ≥ 48.
  - `rule` TR-2.2: Every question `options` non-empty JSON array length ≥2.

## Task 3: Lib — Weighted question selector + category mix algorithm (§23)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 2
- **Description**:
  - `src/lib/whatdo/question-selector.ts`: function `pickNextQuestion({alreadyAnsweredIds[], userId?, city?, country?, ageGroup?, mixConfig})` scoring 30% engagement, 20% relevance (cat-age-city match), 15% freshness, 15% diversity (alreadySeenCat penalty), 10% locality exact tag match, 10% historical. Default mix 12-question bucket Personality2 / Lifestyle2 / Money1 / Career1 / Tech1 / Relationship1 / Entertainment1 / FoodTravel1 / Trend1 / Local1.
  - Utility `ensureMixSatisfied(queue, config)`.
- **Acceptance Criteria Addressed**: AC-2
- **Test Requirements**:
  - `rule` TR-3.1: Unit test: pickNextQuestion called 12 times with empty set, city=Pune; returned ids distinct; category mix within ±1 tolerance of default config; at least one question with target_city='Pune' (if any exist in seed).
  - `rule` TR-3.2: Called 10 times, ids returned never include alreadyAnsweredIds from param set.

## Task 4: Lib — Score Engine (§10 agreement + rarity + majority + contrarian + city) + 12 Archetype Classifier (§11)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1
- **Description**:
  - `src/lib/whatdo/score-engine.ts`:
    - `async computeUserAgreementPercents(userId, responses[])`: for each response aggregate `QuestionResponse WHERE assessmentQuestionId = X AND selectedOptionId = response.optionId` count / total count; return array of per-question pcts; zero-data questions marked insufficient.
    - `computeRarity(perQuestionPcts)` lowest 1 pct → rarestAnswerPct + ref id + question.
    - `computeCityAlignment(userId, city, responses, minSampleSize=50)`: same as global but filter responses where `citySnapshot = user.city`; return NULL if sampleSize < min.
    - `computeSignals(responses, questions)`: 5 scores 0-100 Curiosity, Risk-Taking, Creativity, Social, Independence — mapped per-question signal weights (e.g. Money/HighRisk MCQ option → risk taking weighted high)
    - `classifyWhatDoType(signals, {majorityMatches, contrarian, rarityPct})` → one of 12 strings + strongestTrait label + emoji prefix.
  - `src/lib/whatdo/archetypes.ts`: 12 definitions + label → color/theme/template suggestion + strongest-trait dictionary.
  - `src/lib/whatdo/signals.ts`: per-taxonomy signal weights matrix for option bucketing.
- **Acceptance Criteria Addressed**: AC-4, AC-5
- **Test Requirements**:
  - `rule` TR-4.1: Spot query: 3 questions SQL GROUP BY yields pcts 24, 67, 14; engine returns same within ±0.5.
  - `rule` TR-4.2: City sample 12 responses, minSize=50 → returns NULL; UI later shows "Not enough WhatDo data yet" text literal.
  - `rule` TR-4.3: 5 extreme fixture signal matrices → classifies to 5 distinct archetype labels (BOLD, DEEP, UNPREDICTABLE, EXPLORER, CONTRARIAN expected among 5).

## Task 5: tRPC whatdo.router.ts — all user-facing APIs (start → next → submit → calculate → share card → AI prompt → track)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 3, Task 4
- **Description**:
  - Create router `src/lib/trpc/routers/whatdo.router.ts` with procs:
    - `whatdo.start({ref?: cuid})` → issues `sessionId` cuid cookie `whatdo_sess=…`; logs WHATDO_VIEW + SHARE_LINK_CLICKED if ref param.
    - `whatdo.nextQuestion()` reads session cookie + userId if auth'd; uses Task 3 selector, returns question JSON.
    - `whatdo.submitAnswer({questionId, optionId, citySnapshot?})` → inserts QuestionResponse optimistic (unique constraint checks P2002). Emits QUESTION_ANSWERED event. If N=10 reached and not logged in → emits QUESTION_COMPLETED + RESULT_GENERATED placeholder but marks `requiresLogin=true`.
    - `whatdo.calculateResult()` → requires ≥10 responses; uses score engine to write WhatDoIdentityResult row + signals, emits RESULT_GENERATED event.
    - `whatdo.revealAfterLogin({fromSessionId})` → merge sessionId responses to userId, de-dupe, delete anon session; returns now-logged in result.
    - `whatdo.generateShareToken({resultId, type='CARD'|'RARE'|'CHALLENGE'})` → ReferralShareEvent row with cuid shareToken.
    - `whatdo.generateAIPrompt({resultId})` → return §18 template prompt string with real type, signals, rarest answer, city strings.
    - `whatdo.trackShareClick({shareToken})` → ++clickedCount.
- **Acceptance Criteria Addressed**: AC-3, AC-4, AC-5, AC-9, AC-10
- **Test Requirements**:
  - `rule` TR-5.1: Start → 10 submit anon → calculate → "please login before reveal". Login, merge → calculate → whatdoType set, data visible.
  - `rule` TR-5.2: Share token generated → length=25 cuid valid regex `^[a-z0-9]+$`; SQL count increment for share click.
  - `rule` TR-5.3: Analytics funnel events emitted for each step count matches AC-10.

## Task 6: tRPC admin-questions.router.ts — question management + trend scaffold
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 1
- **Description**:
  - `src/lib/trpc/routers/admin-questions.router.ts`: procedures
    - `admin.questions.list({status?, category?, search?, page?})`
    - `admin.questions.get(id)` preview
    - `admin.questions.update(id, payload)` edits.
    - `admin.questions.approve(id)`, `admin.questions.reject(id, reason)`, `admin.questions.publish(id, scheduledAt?)`, `admin.questions.close(id)`, `admin.questions.generateSimilar(id)` dup with status DRAFT.
    - `admin.questions.generateTrending({seedKeyword?})` — scaffold: if env OPENAI_API_KEY/TRENDS_API_KEY available call, otherwise returns manual 5 placeholder suggestion drafts with sourceReference="Trending scaffold — complete manually before approval". Always writes draft rows with aiGenerated=true & trendContext populated.
    - `admin.analytics.whatdoFunnel({days=14})` aggregated daily counts per event name; conversion% fields.
  - Wire routers into `_app.ts`; enforce MODERATOR role guard same pattern as existing admin router.
- **Acceptance Criteria Addressed**: AC-11, AC-13
- **Test Requirements**:
  - `rule` TR-6.1: list PENDING_APPROVAL matches SQL count for status='PENDING_APPROVAL'.
  - `rule` TR-6.2: approve(id) → status='APPROVED', approvedBy/approvedAt now set.
  - `rule` TR-6.3: funnel(days=1) returns all event names from events emitted earlier Task 5.

## Task 7: NextAuth post-login merge handler (anonymous session → logged-in user)
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 1, Task 5
- **Description**:
  - Modify NextAuth sign in callback/events or wrap client login success to call `whatdo.revealAfterLogin(sessionId=read cookie)`. Server action `src/app/actions/mergeAssessmentSession.ts` or auth callback update `events.signIn` on `auth.ts` reads cookie `whatdo_sess` → runs SQL update: `UPDATE "QuestionResponse" SET "userId" = $1 WHERE "sessionId" = $2 AND "userId" IS NULL`. Cleanup cookie.
  - Middleware `src/middleware.ts` reads `?ref=` param → set `whatdo_ref` cookie httpOnly 30 days, emit SHARE_LINK_CLICKED event.
- **Acceptance Criteria Addressed**: AC-3, AC-9
- **Test Requirements**:
  - `rule` TR-7.1: Before login 10 responses under session `s1`, `userId=NULL`. After sign-in → SELECT WHERE userId=NEW → count=10; `sessionId=s1` no longer in rows (set NULL or preserved).
  - `rule` TR-7.2: Referral cookie present after clicking `?ref=TOKEN` with correct token value.

## Task 8: User UI — `/whatdo` landing page, question flow 1–15 cards, progress dots, rare answer banner
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5, Task 6
- **Description**:
  - `src/app/whatdo/page.tsx` — hero "Find out what kind of thinker you are. [START]". If `?ref=TOKEN` → "Your friend's WhatDo Type is X… find yours!" (loads ReferralShareEvent shareToken → type from latest referrer identity).
  - `src/app/whatdo/quiz/page.tsx` — full screen question stack with progress dots top, swipe/tap big buttons, optimistic submit.
  - `src/components/whatdo/AssessmentQuestionCard.tsx` card with question, buttons A/B/C/D 44pt min tap; rare banner overlay when TR-rare triggered.
  - `src/components/whatdo/ProgressDots.tsx` 12 dots filled current outline remaining.
  - `src/components/whatdo/RareAnswerBanner.tsx` toast "⚡ YOUR ANSWER IS RARE Only N% agree. Part of N% club. [SHARE RESULT]".
- **Acceptance Criteria Addressed**: AC-2 (de-dupe & mix), AC-6 (rare banner), AC-7, AC-14, AC-15
- **Test Requirements**:
  - `rule` TR-8.1: After 12 answers → 12 distinct question ids; no repeats. Progress dots === answered count.
  - `rule` TR-8.2: Answer an option with pct=14 (<=rareThreshold) → banner renders visible. Answer 32% → no banner.
  - `rubric` TR-8.3: Mobile UI Instagram fidelity (AC-14). Scale 1/3/5, pass ≥4. Screenshots 375×812. Evidence: screenshot.

## Task 9: User UI — `/whatdo/result` reveal page + WhatDo Signals + 6 share card templates + PNG download/share
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5, Task 8
- **Description**:
  - `src/app/whatdo/result/page.tsx` — gated with login; shows result card (§10), type header in caps, agreement/rareness, strongest trait, rarest answer question + pct, city alignment or data-tbd, 5 signal progress bars §19.
  - `src/app/api/og/whatdo-card/route.ts` — optional OG endpoint for link previews.
  - `src/components/whatdo/WhatDoResultCard.tsx` (HTML rendered card section used by client renderer).
  - `src/components/whatdo/ShareCardCanvas.tsx` — canvas renderer 1080×1920 implementing 6 template variants switching color palettes/fonts: (1) Minimal (mono, white on near-black), (2) Neon / Gen-Z (hot pink + cyan gradients), (3) Premium Dark (gold serif luxury), (4) Colourful (vibrant gradient), (5) FuturisticAI (grid lines neon blue), (6) LocalCity (adds city name prominent + emoji skyline).
  - Buttons: [DOWNLOAD PNG] blob save; [SHARE] navigator.share with shareLink `whatdo.co.in/whatdo?ref=TOKEN`; [COPY AI PROMPT]; [CHALLENGE A FRIEND] same share.
  - `src/lib/whatdo/ai-prompt.ts` generate prompt text §18 from identity + signals + city real values.
- **Acceptance Criteria Addressed**: AC-4, AC-5, AC-8, AC-10
- **Test Requirements**:
  - `rule` TR-9.1: PNG download for each of 6 templates → `file <img.png` returns "PNG image data, 1080 x 1920". All size ≥120KB (no empty).
  - `rule` TR-9.2: Share URL includes `?ref=` + cuid token.
  - `rule` TR-9.3: AI prompt contains real whatdoType (e.g. "THE BOLD DECISION MAKER") not placeholder text; city present where set; no fabricated career/wealth claims.

## Task 10: Home `/` integration — Daily WhatDo hero pinned at top
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 5, Task 8
- **Description**:
  - `src/components/whatdo/DailyWhatDoHero.tsx` — one featured question per UTC day. Lazy selector picks highest engagement published PUBLISHED LOCALITY question for user's city or global fallback.
  - Insert into `src/app/page.tsx` right after `<header>…</header>` BEFORE PullToRefresh or feed wrapper. So reel cards underneath & DailyWhatDoHero scrolls naturally with page content inside reels container pt padding.
  - Answer Daily question → optimistic percent + "See what your city thinks" link to /whatdo/quiz.
- **Acceptance Criteria Addressed**: AC-7, AC-15
- **Test Requirements**:
  - `rule` TR-10.1: Home DOM `children[0] after header = DailyWhatDoHero data-testid element; child index correct.
  - `rule` TR-10.2: Answer click → vote count increments; % shown (or "Not enough…" empty state if data sparse).

## Task 11: Admin UI — `/admin/questions` review dashboard + tabs §6
- **Status**: `pending`
- **Priority**: medium
- **Depends On**: Task 6
- **Description**:
  - `src/app/admin/questions/page.tsx` tabs Draft, Pending, Approved, Scheduled, Live, Expired, Rejected. Question cards with preview (§6 style): Question / Category / Target / Location / Source Reference / Suggested Options / Why May Perform / Controversy / Sensitivity / AI Quality Score pill / Status label.
  - Toolbar actions: Edit · Approve · Reject · Generate Similar. Generate Trending Questions CTA top → modal → seedKeyword optional → create draft rows.
  - `src/app/admin/analytics/whatdo/page.tsx` funnel cards visitors, started, completed, registrations, reveals, cards, shares, clicks, referral signups, conversion%; 14-day daily line chart Recharts; top 5 viral questions; top 5 shared types; city heat counts.
  - `src/app/admin/settings/page.tsx` new Content Controls section: numQuestions (10–20), rareAnswerThreshold %, veryRareThreshold %, minCitySampleSize, questionLifetime hours.
  - Admin sidebar links added `/admin/layout.tsx` sidebar menu Questions link + Analytics/WhatDo link.
- **Acceptance Criteria Addressed**: AC-11, AC-12, AC-13
- **Test Requirements**:
  - `rule` TR-11.1: Admin tabs switch status filter, counts match SQL GROUP BY status counts.
  - `rule` TR-11.2: Settings save rare=30, after answering 22%, rareBanner shown next time.
  - `rule` TR-11.3: Funnel dashboard card numbers = SQL GROUP BY DAY(createdAt) output.

## Task 12: Bottom nav / Home linkups, final 0-regression smoke tests, commit, push, deploy
- **Status**: `pending`
- **Priority**: high
- **Depends On**: Task 8, Task 9, Task 10, Task 11
- **Description**:
  - Add one new tab icon "🎯 My WhatDo" pill button in [BottomNav.tsx] BEFORE Home tab OR small badge banner linking `/whatdo` from home hero — product chooses location; recommendation: add a "My WhatDo" pill CTA on profile page (top of profile page banner) and keep bottom nav already trimmed (user previously removed Trending). Or add to Home hero banner below brand bar.
  - Run `GetDiagnostics` on all files; `npm run build` check no new TypeScript errors.
  - Smoke tests: Home reels scroll, PTR refresh, create post successful publish, vote on a post succeeds.
  - Commit push main → Vercel auto deploy.
- **Acceptance Criteria Addressed**: AC-15
- **Test Requirements**:
  - `rule` TR-12.1: `GetDiagnostics` global workspace 0 new added TS errors, no breaking changes to existing tRPC signatures.
  - `rubric` TR-12.2: Baseline regression (AC-15). Scale 1/3/5. Pass ≥4. Evidence: screenshots of Home reels / Create post publish / Vote success toasts.
  - `rule` TR-12.3: Production deployment URL returns 200 on `/whatdo`.
- **Notes**: No breaking db changes — all Prisma changes additive only. No existing files deleted, only appended routes & components.

## Issue I-1: (Placeholder template for Review findings — populate if review finds defects)
- **Status**: `cancelled`
- **Cancellation Reason**: No review findings yet; this template remains as placeholder; will activate if independent review detects actionable defects.
- **Cancellation Approved By**: N/A pre-populated template; will convert to pending on real finding
