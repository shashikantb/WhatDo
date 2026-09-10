# WHATDO — See it. Vote it. Know what people think.

![WhatDo Banner](./public/og-banner.svg)

**WhatDo** is a modern, social polling & opinion platform built with Next.js 14, tRPC, and Prisma. Users scroll through questions, images, videos, and hot takes — then vote, rate, react, predict, or decide with a single tap. Nine opinion post types, gamified opinion scores, AI-assisted moderation, predictions with rewards, ads, and deep analytics.

---

## 🚀 Product Overview

WhatDo takes the best parts of social feeds (scroll, react, follow) and combines them with the rigor of decision-market polling. Every post is an **opinion event** with structured inputs: yes/no, multiple choice, side-by-side comparisons, 1–10 ratings, emoji reactions, price estimates, advice decisions, and time-locked predictions that pay out opinion score when reality lands.

### Core pillars

- **9 opinion post types** covering every decision surface (YES_NO, MULTIPLE_CHOICE, A_VS_B, RATING, EMOJI, POLL, PRICE, DECISION, PREDICTION).
- **Opinion Score** — a single number that rates every user's history. Votes earn points, posts earn points, and correct predictions earn **10×** the rate of casual votes. Show it proudly next to your handle, climb the leaderboard, and become a credible voice.
- **Predictions with Resolution** — close-time locked predictions are resolved by moderators in `/admin/predictions`. Voters get notified, prediction results are materialised to `PredictionResult` rows, correct voters gain +10 Opinion Score, and a rich Correct/Incorrect banner is shown inline.
- **AI Moderation** — every post/comment gets run through an `AIProvider` abstraction layer with 9 standardised moderation flags (NSFW, HATE, SPAM, VIOLENCE, PII, COPYRIGHT, MALICIOUS_URL, HARASSMENT, MISINFORMATION). Bad content routes to `PENDING_MODERATION` / auto-reported, safe content auto-publishes. The provider is swappable: mock implementation for dev, OpenAI for production.
- **Ads** — `AdConfiguration` model drives three placements: FEED_EVERY_N (every N posts), DESKTOP_SIDEBAR (RightRail under trending), and BANNER (top of discovery pages). Impressions + clicks route to dedicated counters plus `AnalyticsEvent` rows.
- **Centralized Analytics** — 15 product events (`page_view`, `feed_impression`, `post_impression`, `vote_started`, `vote_completed`, `post_created`, `post_shared`, `post_saved`, `comment_created`, `follow_created`, `search`, `report_created`, `ad_impression`, `ad_click`) are routed through a `trackEvent()` helper. Client calls POST to `/api/analytics`; server calls write `AnalyticsEvent` rows directly with a 1-event/5s/user throttle per type.

---

## 🏗 Architecture

```
                          ┌──────────────────────────────────────────────┐
                          │            Browser / Mobile Web              │
                          │  ┌─────────────┐   ┌────────────────────┐   │
                          │  │  Client UI  │──▶│  tRPC React Query   │   │
                          │  │ (App Router)│   │ Provider (Tanstack) │   │
                          │  └──────┬──────┘   └─────────┬──────────┘   │
                          └─────────┼────────────────────┼──────────────┘
                                    │                    │
                                    ▼                    ▼ HTTPS + JSON
┌──────────────────────────────────────────────────────────────────────────┐
│                              Next.js 14 (Node)                            │
│  ┌───────────────────────┐   ┌─────────────────────────────────────┐    │
│  │   App Router Pages    │   │         tRPC Edge Handler           │    │
│  │ RSC + "use client"    │   │  ┌───────────────────────────────┐  │    │
│  │ layout / post / feed  │   │  │  Routers: posts, voting,     │  │    │
│  │ profile / admin / ... │   │  │  comments, feed, users,      │  │    │
│  └──────────┬────────────┘   │  │  social, notifications,      │  │    │
│             │                │  │  search, reports, categories, │  │    │
│             ▼                │  │  admin, media, ads            │  │    │
│    ┌──────────────────┐      │  └───────────────┬───────────────┘  │    │
│    │ /api/analytics   │      │                  │                  │    │
│    │ POST route       │      │                  ▼                  │    │
│    │ + session lookup │      │  ┌──────────────────────────────┐  │    │
│    └───────┬──────────┘      │  │  Service / Abstraction Layer │  │    │
│            │                 │  │ ┌───────┐ ┌────┐ ┌────────┐ │  │    │
│            └─────────────────┼─▶│ │ AI    │ │Sys │ │Scoring │ │  │    │
│                              │  │ │Providr│ │Cfg │ │ Utils  │ │  │    │
│                              │  │ └───┬───┘ └─┬──┘ └───┬────┘ │  │    │
│                              │  └─────┼────────┼────────┼──────┘  │    │
│                              └────────┼────────┼────────┼─────────┘    │
└───────────────────────────────────────┼────────┼────────┼──────────────┘
                                        │        │        │
                                        ▼        ▼        ▼
                     ┌────────────────────────────────────────────┐
                     │          Prisma ORM (PostgreSQL / Neon)    │
                     │  ┌──────────┐ ┌──────────┐ ┌────────────┐  │
                     │  │ Users    │ │ Posts    │ │ Votes      │  │
                     │  │ Opinions │ │ Options  │ │ Predictions│  │
                     │  │ Score    │ │ Media    │ │ PredResult │  │
                     │  ├──────────┤ ├──────────┤ ├────────────┤  │
                     │  │ Comments │ │ Reports  │ │ Follows    │  │
                     │  │ Notifs   │ │ AdsCfg   │ │ Analytics  │  │
                     │  │ Tags     │ │ Categories│ │ SystemSet  │  │
                     │  └──────────┘ └──────────┘ └────────────┘  │
                     └────────────────────────────────────────────┘
                                          ▲
                                          │ writes
                                          │
              ┌───────────────────────────┴───────────────────────┐
              │             Object Storage (Cloudflare R2)         │
              │   avatars / post-media / ad-creatives (S3 API)    │
              └───────────────────────────────────────────────────┘
```

---

## 🧱 Tech Stack

| Layer                | Choice                       | Version  | Notes                                                        |
| -------------------- | ---------------------------- | -------- | ------------------------------------------------------------ |
| Framework            | Next.js App Router           | 14.2.15  | RSC + Client Components, Edge-compatible `/api` routes.      |
| Language             | TypeScript                   | 5.x      | Strict config, `--noEmit --skipLibCheck` for CI.             |
| Data layer           | Prisma ORM                   | 5.21.1   | PostgreSQL-first, raw SQL when needed.                       |
| API Layer            | tRPC                         | 11 rc593 | End-to-end typed routers + `@tanstack/react-query` v5 cache. |
| Auth                 | NextAuth                     | 4.x      | Email magic-link + OAuth; session-backed `protectedProcedure`. |
| Styling              | Tailwind CSS                 | 3.4      | In-house design system (`Card`, `Badge`, `Button`, `Tabs`…). |
| Moderation           | Custom AI provider layer     | —        | Strategy pattern: `MockAIProvider` / `OpenAIProvider`.       |
| Media                | Cloudflare R2 / S3-compatible| —        | Presigned uploads via `media.router`.                        |
| Ads                  | In-house placements engine   | —        | `AdConfiguration` + impression/click counters.               |
| Analytics            | Prisma `AnalyticsEvent`      | —        | 15 semantic events + 5s per-user per-event throttling.       |
| Realtime queues      | (Future) Upstash Redis       | —        | Not wired yet; architecture ready.                           |

---

## 🏃 Setup Steps

```
1. Clone
   git clone <your-repo> && cd WhatDo

2. Environment
   cp .env.example .env
   # Fill in DATABASE_URL, NEXTAUTH_URL + NEXTAUTH_SECRET, storage keys, etc.

3. Install dependencies
   npm install
   # or: pnpm i / yarn

4. Provision the database schema
   npx prisma generate
   npx prisma db push

5. Seed the database
   npm run seed
   # 15+ users, 100+ posts, 1500+ votes, 500+ comments, 40+ reports,
   # 2 pre-resolved predictions, sample ad configs, categories, tags.

6. Run the dev server
   npm run dev
   → http://localhost:3000

7. Sign in as the default admin
   email:    admin@whatdo.app
   password: admin1234
   → /admin controls users, reports, ads, predictions, settings.
```

---

## 🔒 Environment Variables

| Variable                  | Default                          | Required? | Purpose                                                    |
| ------------------------- | -------------------------------- | --------- | ---------------------------------------------------------- |
| `DATABASE_URL`            | `postgresql://…`                 | ✅ yes    | Prisma PostgreSQL connection string.                       |
| `DIRECT_URL`              | `DATABASE_URL`                   | Neon only | Non-pooled connection for migrations (Neon).               |
| `NEXTAUTH_URL`            | `http://localhost:3000`          | ✅ yes    | NextAuth canonical site URL.                               |
| `NEXTAUTH_SECRET`         | —                                | ✅ yes    | JWT signing key. `openssl rand -hex 32`.                   |
| `NEXT_PUBLIC_APP_URL`     | `http://localhost:3000`          | yes       | Canonical origin used in OG image links, share URLs.       |
| `SMTP_HOST`               | `localhost`                      | for email | SMTP host for magic-link sign-in.                          |
| `SMTP_PORT`               | `587`                            | for email | SMTP port.                                                 |
| `SMTP_USER`               | —                                | for email | SMTP user.                                                 |
| `SMTP_PASSWORD`           | —                                | for email | SMTP password.                                             |
| `SMTP_FROM`               | `WHATDO <no-reply@whatdo.app>`   | for email | Address emails come from.                                  |
| `AWS_ENDPOINT`            | —                                | R2 media   | Cloudflare R2 endpoint (S3-compatible).                    |
| `AWS_REGION`              | `auto`                           | R2 media   | Region.                                                    |
| `AWS_ACCESS_KEY_ID`       | —                                | R2 media   | Credentials.                                               |
| `AWS_SECRET_ACCESS_KEY`   | —                                | R2 media   | Credentials.                                               |
| `AWS_S3_BUCKET`           | —                                | R2 media   | Bucket name.                                               |
| `R2_PUBLIC_URL`           | —                                | R2 media   | Public CDN URL for media (e.g. `https://cdn.whatdo.app`).  |
| `AI_PROVIDER`             | `mock`                           | no        | `"openai"` or `"mock"` (default).                          |
| `OPENAI_API_KEY`          | —                                | for GPT   | OpenAI v4 client key. Text moderation, image classification, comment summarization. |
| `UPSTASH_REDIS_REST_URL`  | —                                | future    | Queues / resolution workers.                               |
| `UPSTASH_REDIS_REST_TOKEN`| —                                | future    | Queues token.                                              |
| `SENTRY_DSN`              | —                                | optional  | Error monitoring — enable with `SENTRY_ORG` + project.     |
| `POSTHOG_KEY`             | —                                | optional  | Product analytics alongside internal `AnalyticsEvent`s.    |
| `GA4_MEASUREMENT_ID`      | —                                | optional  | GA4 frontend analytics.                                    |

---

## 💾 Database

### Local setup

```bash
# Option A — local Postgres
brew services start postgresql
createdb whatdo
# echo DATABASE_URL=postgresql://user:pass@localhost:5432/whatdo >> .env

# Option B — Docker
docker run --name whatdo-postgres \
  -e POSTGRES_USER=whatdo -e POSTGRES_PASSWORD=whatdo -e POSTGRES_DB=whatdo \
  -p 5432:5432 -d postgres:16-alpine
```

### Neon / managed Postgres

1. Copy the pooled **Connection string** into `DATABASE_URL`.
2. Copy the non-pooled string into `DIRECT_URL`.
3. Run `npx prisma db push` once to sync the schema.

### Common Prisma commands

```bash
npm run prisma:generate   # Regenerate @prisma/client
npm run prisma:push       # Schema → DB (no migration history, for early-stage)
npm run prisma:migrate    # Create/apply migration files (production path)
npm run prisma:studio     # Browse the DB locally (localhost:5555)
npm run seed              # Truncate + re-seed
```

### Seed counts (after `npm run seed`)

| Entity          | Approx. Count | Notes                                                     |
| --------------- | ------------- | --------------------------------------------------------- |
| Users           | ~18           | Admin user (`admin@whatdo.app`), 15 organic users, 3 mods. |
| Posts           | ~120          | Covers all 9 post types, published + some pending.        |
| Votes           | ~1,600        | One post-type distribution skewed toward YES_NO.          |
| Comments        | ~550          | Including replies nested 2 deep.                          |
| Reports         | ~45           | Mix of auto + user reports, some in `UNDER_REVIEW`.       |
| Predictions     | ~8            | 2 pre-resolved with `PredictionResult` rows + score.      |
| Ad configurations | ~6         | Three placements active + 3 paused for A/B.               |

---

## 💻 Running Locally — Scripts

| Script                  | What it does                                              |
| ----------------------- | --------------------------------------------------------- |
| `npm run dev`           | Starts Next.js dev server at http://localhost:3000.       |
| `npm run build`         | Typecheck + production build in `.next`.                  |
| `npm start`             | Runs the built server in production mode.                 |
| `npm run lint`          | ESLint project-wide (`.eslintrc.*`).                      |
| `npm run typecheck`     | `tsc --noEmit --skipLibCheck` — your CI gate.             |
| `npm run prisma:generate` | Regenerate the Prisma client.                            |
| `npm run prisma:push`   | `prisma db push` for rapid schema iteration.              |
| `npm run prisma:migrate`| `prisma migrate dev` — for schema history.                |
| `npm run seed`          | Seed the DB: `tsx prisma/seed.ts`.                        |
| `npm run analyze`       | `ANALYZE=true npm run build` — reports bundle sizes.      |

---

## 🧪 Testing

The project currently uses:

- **Type-safety first.** tRPC + Zod cover every request; TypeScript strict flags in `tsconfig.json`.
- **Playwright skeleton** is ready in `tests/` (manual add). Drop a smoke test for sign-in + voting flow once your staging DB is live.
- **Mock AI provider.** `MockAIProvider` uses a profanity word-list to surface realistic flags — perfect for behavioural test fixtures.

For a full test pass, add: `npm i -D vitest @testing-library/react @testing-library/jest-dom` then wire `package.json → "test"`.

---

## 🚢 Production Deployment Checklist

### 1. Vercel

- Import the repo. Framework preset: **Next.js**.
- Add the **Environment Variables** table above. Mark secrets `Encrypted`.
- Root directory: `./`. Build command: `npm run build`. Install command: `npm install`.
- Set the **Function region** nearest your Postgres (e.g. `iad1` for us-east Neon pools).
- Add `npm run typecheck && npm run lint` in **Project Settings → Git → Custom build command** OR use `npm run build` alone if build already typechecks via `next build`'s default.
- Deploy a preview → run manual smoke → promote.

### 2. Neon (PostgreSQL)

- Create a project with the **same region** as Vercel functions.
- Enable **Autosuspend** for staging only; keep Prod autosuspend OFF.
- Paste pooled URL to `DATABASE_URL`, direct URL to `DIRECT_URL`.
- Create a **separate branch DB** for pull-request preview builds.
- First deploy: run `npx prisma migrate deploy` or enable it as a Vercel "Build step" in `vercel.json`:
  ```json
  { "buildCommand": "prisma migrate deploy && npm run build" }
  ```

### 3. Cloudflare R2 (media storage)

1. Create an R2 bucket (e.g. `whatdo-media`).
2. Create an **R2 API Token** with edit scope → paste AWS keys into `.env`.
3. Create a **Custom Domain** CDN endpoint (e.g. `cdn.whatdo.app`) → set `R2_PUBLIC_URL`.
4. Set CORS to allow your origin:
   ```json
   [
     {
       "AllowedOrigins": ["https://whatdo.app", "http://localhost:3000"],
       "AllowedMethods": ["GET", "PUT", "POST"],
       "AllowedHeaders": ["*"],
       "ExposeHeaders":  ["ETag"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
5. Optionally enable **Object Versioning + 90-day lifecycle** into Glacier for uploads.

### 4. Upstash Redis (queues / background resolution)

- Create a **Global DB** (latency-optimised).
- Paste `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` → env.
- Wire a `/api/jobs/resolve-predictions` route OR Vercel Cron (`vercel.json`) that runs the prediction resolution background processor. Admin-resolution is **always** available through `/admin/predictions` regardless.

---

## 🔌 AI Provider Configuration

The `AIProvider` abstraction lives under `src/lib/ai/`. Swap providers with two env vars:

```
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

If either is missing, `getAIProvider()` returns `MockAIProvider`. That keeps dev/test **fully deterministic** and **free**:

- `moderateText()` → checks a profanity word list → flags `HATE / SPAM / HARASSMENT`.
- `moderateImage() / moderateVideo()` → safe-pass (returned passed=true empty flags).
- `classifyContent()` → keyword heuristic against category list.
- `summarizeComments()` → top-N comments by likes, sentiment = {likeCount: >0 → positive, 0 → neutral}.

When `AI_PROVIDER=openai` + key present, `OpenAIProvider` uses:

- `gpt-4o-mini` for text moderation, classification, and summarization.
- `gpt-4o` vision for images (configurable).
- Falls back silently if a specific model isn't available or the call errors — safe defaults.

Enable **AI auto-moderation** in Admin → Settings tab "AI Moderation". Setting is persisted to the `SystemSetting` table via `setSystemSetting()` and cached in-memory for 5 minutes.

---

## 📈 Analytics Configuration

### Internal

Everything runs out of the box using the `AnalyticsEvent` table. Browse via `/admin/analytics` (future dashboard UI, or query `prisma.analyticsEvent.groupBy`).

### External integrations

| Tool      | Wire it in                                                           |
| --------- | -------------------------------------------------------------------- |
| **PostHog** | Set `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST`. Add their `<Script>` to `layout.tsx` — PostHog autocaptures + we already emit `trackEvent`. |
| **Sentry** | `npm i @sentry/nextjs && npx @sentry/wizard@latest -i nextjs`. Captures server/client errors automatically, enriches with user from session. |
| **GA4**    | Add your `NEXT_PUBLIC_GA4_MEASUREMENT_ID` → drop the standard gtag into `layout.tsx`'s `<head>`. `page_view` + `trackEvent` provide semantic keys that align 1:1 with GA4 events. |

---

## 🔑 Admin Setup

Default credentials created by `npm run seed`:

```
Email:    admin@whatdo.app
Password: admin1234
```

Roles → Prisma schema `User.role` enum: `USER`, `MOD`, `ADMIN`.

Admin pages mounted under `/admin/*`:
- `/admin/dashboard` — high-level charts (total users, posts, votes, reports queue).
- `/admin/users` — ban/role/verify, impersonate.
- `/admin/reports` — triage: OPEN → UNDER_REVIEW → RESOLVED or DISMISSED.
- `/admin/predictions` — list OPEN/CLOSED/RESOLVED predictions, pick a correct option, **Resolve** → fires notification to every voter + writes PredictionResult rows + Opinion Score awards.
- `/admin/ads` — CRUD for `AdConfiguration`. Toggle enabled, set budgets, priority, schedule; see impression/click counters populate live.
- `/admin/settings` — Global weights for Opinion Score, AI Moderation enable toggle. Stored via `SystemSetting`.

---

## 🧩 Opinion Score Weights

| Event                   | Default | Admin Tunable                     |
| ----------------------- | ------- | ---------------------------------- |
| Cast a vote             | +1      | Yes (Admin → Settings → Weights)  |
| Create a post           | +5      | Yes                                |
| Correct prediction      | +10     | Yes                                |
| Engagement on your post | bonus   | Derived (virality + trending).     |

Calculations in `src/lib/utils/scoring.ts`. `computeOpinionScoreForPost()` / `computeOpinionScoreForVote()` are the two canonical functions. Runtime-application **on every event** happens inside routers as inline increments. Admin weight tabs → `GLOBAL_CONFIG` via `src/lib/config.ts → getSystemSetting()`; wire scoring weights there if you want dynamic runtime tuning.

---

## 🐛 Troubleshooting

### Database

- **`Can't reach database server`** — `DATABASE_URL` wrong; try `psql $DATABASE_URL` directly.
- **`db push` complains about pending migrations** — run `prisma migrate resolve --applied <migration_name>` or create a baseline.
- **Seed fails with unique key violations** — truncate first: `npm run seed` is **not idempotent**; wrap in a transaction that truncates tables.

### tRPC / API

- **`UNAUTHORIZED` on a mutation** — session expired; hard-refresh the page. The `LoginModalProvider` handles the flow automatically otherwise.
- **`TypeError: Cannot read properties of undefined (reading 'useContext')`** — missing `<TRPCProvider>` ancestor, or a server component importing `trpc` hooks. Add `"use client";`.

### AI / Moderation

- **`OpenAIProvider` never runs** — confirm `AI_PROVIDER=openai` AND `OPENAI_API_KEY` both set, then reload.
- **Comments auto-approving even when flagged** — toggle "AI Moderation" ON in Admin → Settings (the global flag gates `aiModerationEnabled`).

### Ads

- **Ads not showing on feed** — (1) create an `AdConfiguration` with `placement=FEED_EVERY_N`, `isEnabled=true`, (2) `Feed.adEveryNPosts` default is `5` — confirm index hits a multiple of 5, (3) check the `scheduleStart/scheduleEnd` window and budget counters.
- **Sidebar ad missing on desktop** — `<RightRail>` only renders on `xl:` screens.

### Build / Types

- **`tsc` fails with import path aliases** — confirm `tsconfig.json → paths["@/*"]` → `./src/*`.
- **Slow builds** — run `npm run analyze`; drop pages you don't need. Consider `"standalone"` output.

---

## 📜 License

MIT — see `LICENSE.md` for the full text.

**TL;DR:** Do anything, keep the copyright notice. No attribution required in user-facing UI, but always appreciated — drop us a line if you ship WhatDo at scale, we love to hear about it.

---

<div align="center" className="mt-8 pt-8 border-t border-border/50">
  WhatDo · Engineered for opinion-based communities.
</div>
