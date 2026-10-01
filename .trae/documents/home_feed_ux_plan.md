# Home Feed UX Enhancements Plan (3 features: Pull-to-refresh + Sort Confirm + Full-screen Reels Viewer on click)

## Repository Research

### Current state: Home page (`src/app/page.tsx`)
- Client-side Next.js App Router page ("use client") with TanStack tRPC InfiniteQuery for getForYou / getTrending fallback
- Scroll container: `overflow-y-scroll snap-y snap-mandatory scroll-smooth scrollbar-hide` 100dvh, refs reelsRef
- Feed items rendered as `<article>` via `<ReelsPostCard>` with `snap-start snap-always`
- Click handler `handlePostClick = (post, index) => router.push("/post/{id}")` — navigates to separate detail page
- Active tracking via IntersectionObserver on [data-reels-index], threshold 0.6 → `setActiveIndex(idx)`; also triggers `fetchNextPage()` when near end
- NO current pull-to-refresh: feed has `staleTime: 10_000` so reloads every 10s cache, user has no manual gesture way

### Current state: Sorting logic (`feed.router.ts`)
- **Home For-You feed** (L128-214 `getForYou`): NOT strictly latest/newest. Actual order:
  1. DB SQL `orderBy: [{isFeatured: desc}, {trendingScore: desc}, {createdAt: desc}]` (L134)
  2. Then JS in-memory re-sort: `items.sort((a,b) => b.feedScore - a.feedScore)` (L203) — feedScoreWeighted = weighted composite of trendingScore + virality + controversy + createdAt age decay + user category interest weights + creator frequency normalization.
  3. So NEWEST is a tiebreaker, NOT the primary sort. This is correct for "For You" / personalization home feed.
- **Following feed** (L243): `orderBy: createdAt desc` (strict chronological newest)
- **Get latest (L323) getLatest**: `orderBy: createdAt desc`
- **User question clarification needed?** User said: "how we are showing means sorting based on latest one right in home screen..." — user ASSUMING latest. Reality: personalized feedScore primary, createdAt only tertiary tiebreaker. We need to inform user + optionally ADD a "Latest / For You" toggle in top bar so user can switch between personalized (current) vs pure chronological newest.

### Current state: Post detail navigation click handler
- `src/app/page.tsx L115-117`: `handlePostClick(post, index) => router.push("/post/{id}")`
- `/post/[id]/PostPageClient.tsx` renders as static page via AppShell max-w-680px centred column — `PostCard` inline layout, NOT reels viewer, user must click back button. NO swipe between posts.
- Instagram pattern reference: click reel on home → opens MODAL/overlay viewer with SAME snap-y full-screen reels feed, starting at the clicked index, user swipes up/down to navigate to other posts from the current feed list. Close button dismisses overlay back to grid/home scroll position.

### Dependencies
- No gesture libraries currently installed (no framer-motion, no react-swipeable, no @use-gesture). Plan uses pure pointer/touch events for pull-to-refresh to avoid package install (per project rules - avoid new deps unless necessary).
- Reel viewer modal: reuse existing design-system [Modal.tsx](file:///Users/shashikantborgavakar/Documents/trae_projects/WhatDo/src/components/design-system/Modal.tsx) pattern (fullscreen variant if exists, else extend with full-screen fixed backdrop).
- Reuse `ReelsPostCard` component inside the viewer (the exact same card already supports full-screen reels rendering — we just fixed media clarity in last commit cfbb47f).

## Files and Modules

### New files
- `src/components/feed/PullToRefresh.tsx` — zero-dependency pointer/touch-based PTR wrapper for the feed scroll container. Shows "Pull to refresh / Release to refresh" indicator, triggers refetch, spins spinner on active.
- `src/components/feed/ReelsViewerModal.tsx` — Full-screen Modal-based reels viewer. Takes `items[]`, `initialIndex` props. Renders the same snap-mandatory snap-y container + ReelsPostCard list inside, starts at clicked index. Close (X) button top-left / ESC / backdrop click dismisses back to home. Uses IntersectionObserver to track current viewed index inside modal.

### Edited files
- `src/app/page.tsx` (Home page, ~426 lines):
  - Wrap reelsRef scroll container in `<PullToRefresh onRefresh={() => forYouQuery.refetch() + trendingQuery.refetch()}>` wrapper.
  - Replace `handlePostClick` router.push with `setViewerOpen(true) + setViewerInitialIndex(idx) + pass items array to viewer`.
  - Add `FeedSortToggle` inline top bar switcher "For You" (default personalized sort we already have) vs "Latest" (pure newest chronological via new `getLatest` infinite query hook or existing `getLatest` call).
  - Wire a new `latestQuery` tRPC infinite for users who flip to Latest tab.
- `src/components/feed/ReelsPostCard.tsx`:
  - No functional changes needed (it already renders full-screen perfectly). Minor: make the `onClick` on the whole card non-navigation (bubbles up to parent page's new viewer-open handler — currently onClick is only passed down from parent so it's fine, just ensure ReelsPostCard is wrapped in clickable div in both contexts).
- (Optional, small) `src/components/design-system/Modal.tsx`: Add `size="fullscreen"` variant if missing, to support 100dvh bg-black with no rounded corners for the viewer overlay.
- (Optional, small) Add `FeedSortToggle` tiny component inline in page.tsx OR add it as separate file `src/components/feed/FeedSortToggle.tsx` — a tab switcher similar to Instagram Reels top tabs.

## Implementation Steps

### Step 1 — Inform user of current sort & build plan confirmation
Answer user's Q2 clearly (home = NOT latest-only; it's personalized weighted FeedScore using trending+virality+category interest + featured pins, createdAt is tiebreaker. Present option: we add a top bar toggle "For You / Latest" so user can switch.)

### Step 2 — Create PullToRefresh wrapper
- Pure React + touchstart/touchmove/touchend + mousedown/mousemove/mouseup passive listeners, translate translateY indicator 0→80px max via CSS custom property, show refresh arrow icon rotated, on release >= 60px fire `onRefresh()` callback
- Only activate when the scroll container `scrollTop === 0` (not when user mid-scroll — critical)
- Pass `isRefreshing` boolean from parent (e.g. `forYouQuery.isRefetching || trendingQuery.isFetching`), display spinner when refreshing
- Wrap the existing reelsRef `<div>` in Home page.tsx L295-307 with PTR

### Step 3 — Add sort toggle "For You | Latest" to home top header bar
- New state `sortMode: "foryou" | "latest"` in Home page
- When sortMode = latest, use `trpc.feed.getLatest.useInfiniteQuery({limit: 20})` already defined in feed.router L321-350 (exists: `orderBy: createdAt desc`)
- When sortMode = foryou, keep current `forYouQuery` (existing personalized)
- Switch tabs resets items, updates scroll container scrollTop 0 smooth, invalidates other query
- UI tab pills at top: underline / pill selection active state on current tab

### Step 4 — Create ReelsViewerModal full-screen overlay component
- Props: `open: boolean; onClose: () => void; items: Post[]; initialIndex: number; onClickPost?: () => void; onVoteSuccess?: (postId) => void`
- Render inside `<Modal>` full-screen variant (z-50, fixed inset-0, background black)
- Internal `viewerRef = useRef<HTMLDivElement>` as the `snap-y snap-mandatory overflow-y-scroll h-[100dvh]` container
- Initial scroll: on open, call `scrollTo` on `viewerRef` to the `initialIndex * clientHeight` OR scroll the Nth card via native scroll snap
- Same pattern as home page: IntersectionObserver on cards with threshold 0.6 → track activeIndex state, call `fetchNextPage` of passed nextPage callback when near end
- Render `<ReelsPostCard>` per item (exact same component already perfected)
- Top-left "X" close button (ChevronLeft or X icon, white)
- Listen for Escape key

### Step 5 — Wire ReelsViewerModal into home page
- Replace `handlePostClick` with: `setViewerInitialIndex(index); setViewerOpen(true)`
- Place `<ReelsViewerModal items={items} open={viewerOpen} initialIndex={viewerInitialIndex} onClose={setViewerOpen(false)} onVoteSuccess={handleVoteSuccess} />` near bottom of JSX in page.tsx (before BottomNav)
- Pass fetchNextPage and hasNextPage props so viewer can also paginate

### Step 6 — Diagnostics, build, commit, deploy
- GetDiagnostics: zero new TS errors
- `tsc --noEmit` / `next build` (respect build gates)
- Commit message: `feat(home): pull-to-refresh + sort for-you/latest toggle + click opens reels viewer modal`
- Push origin main → Vercel deploy

## Dependencies and Considerations
- **No new packages**: Avoid installing framer-motion/swipeable. PTR via vanilla touch events works perfectly on mobile web (Instagram's pattern uses same native scroll + touch events).
- **Backward compat**: Existing `/post/[id]` route remains for direct link sharing; click-from-home opens modal viewer (shallow URL change optional, but plan avoids to keep scope bounded. If user wants URL in address bar too, we use next router push shallow with `/post/{id}?viewer=1`).
- **Snap-scroll in modal**: Same CSS classes as home container, so identical scroll feel.
- **Scroll lock when modal open**: Existing Modal component already handles scroll-body-lock (verify in Modal.tsx; if not add document.body.style.overflow = 'hidden' on open, restore on close).
- **Video playback on active card**: Already works via existing IntersectionObserver active detection (home feed uses it implicitly — any autoplay logic tied to activeIndex will work same inside viewer modal via its own observer).

## Validation
1. PTR: Scroll home to top → drag down 60+ px → release → "refreshing" spinner shows, tRPC queries refetch, new posts appear if any. Works on both mobile touch and mousedown desktop.
2. Sort toggle: Click "Latest" — feed order changes to pure newest first (seed posts with createdAt order visible in admin post list descending latest top). Click "For You" — personalized weighted order restored.
3. Viewer modal: Click post on home → modal opens, starting at EXACT clicked card (no off-by-one). Swipe up with finger / scroll wheel → next snap card loads. Swipe down → previous card. Click X top left OR ESC → modal closes → back to home feed at same scroll position (no reset). Vote on viewer post → optimistic state mirrors home. Same video clarity as recently committed cfbb47f.
4. Diagnostics: zero new tsserver errors on modified files.

## Risks
- **Modal scroll reset on open**: IntersectionObserver re-runs inside new container → trivial. Risk mitigated by setting initialIndex via scrollTop to the correct element's offsetTop before first render snapshot.
- **PTR interfering with scroll**: We gate activation on container.scrollTop === 0 only, so mid-feed scroll can never trigger PTR. Standard pattern.
- **Sort toggle stale results**: After switching tabs, call `queryClient.removeQueries()` on other tab + reset items array + forced scrollTop 0 smooth to avoid mixed arrays.
- **New route vs modal scope creep**: Plan explicitly scopes viewer to HOME only (not Trending page not Post page deep links); avoids scope creep.

## Approve Note
Per user's workflow rule "architectural approval before coding starts" — confirm: approve the plan (all 3 features with optional sort toggle clarification).
