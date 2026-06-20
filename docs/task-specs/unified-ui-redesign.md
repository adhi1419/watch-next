# Task: Unified UI Redesign — Adhi's Watch Next

## Context
Project plan: /local/home/adhitr/workplace/misc/netflix-recs/docs/unified-ui-redesign.md
Working dir: /local/home/adhitr/workplace/misc/netflix-recs
Test runner (frontend): npm test (vitest)
Test runner (backend): bun test tests/
Dev server: npx vite --host 127.0.0.1 --port 5173 (with proxy to dev-server.mjs on 5174)
Build: npm run build

## Approach
TDD for each slice: write failing test → implement minimum code → refactor → verify green.

## Steps

### Slice 1: DB Migration + API State Derivation

1. Read current `dev-server.mjs` and `tests/backend.test.ts` to understand existing schema
2. Write backend tests for:
   - `status` column in tracking table ('watching' | 'stopped')
   - State derivation: watchedEpisodes < total = 'watching', >= total = 'completed'  
   - Stopped status preserves episode progress
   - New `watchlist` table with type constraint (MOVIE|SHOW)
   - Watchlist CRUD operations
3. Run `bun test tests/` — confirm tests FAIL (red)
4. Implement DB schema changes in `dev-server.mjs`:
   - Add `status TEXT DEFAULT 'watching'` to tracking table
   - Create `watchlist` table (title_id PK, type, title, poster_url, added_at)
   - Remove old `lists` and `list_items` tables
5. Implement state derivation logic in a helper function
6. Run `bun test tests/` — confirm tests PASS (green)
7. Mirror changes to `server.mjs` (production server)

### Slice 2: API Endpoints

8. Write backend tests for new endpoints:
   - GET /api/discover returns currentlyWatching array
   - GET /api/history returns completed+stopped alphabetically
   - POST /api/tracking/:id/stop sets status='stopped'
   - POST /api/tracking/:id/resume sets status='watching'
   - GET/POST/DELETE /api/watchlist CRUD
   - /api/discover excludes completed+stopped IDs
9. Run tests — confirm FAIL
10. Implement endpoints in `dev-server.mjs`
11. Run tests — confirm PASS
12. Mirror to `server.mjs`
13. Update vite.config.ts proxy entries for new routes

### Slice 3: Currently Watching Carousel (UI)

14. Read current `src/DiscoverView.tsx` and `src/hooks/useTrackingState.ts`
15. Write frontend test: useTrackingState returns currentlyWatching sorted by recency
16. Implement carousel component in DiscoverView:
    - Horizontal scroll container with overflow-x: auto
    - Right-arrow scroll button
    - Cards ordered by recency of last episode marked
    - Only shows when TV mode is active
17. Add CSS for carousel (horizontal scroll, scroll-snap, arrow button)
18. Run `npm test` — confirm PASS

### Slice 4: Watch Next with Deduplication

19. Write frontend test: recommendations exclude currentlyWatching and history IDs
20. Update DiscoverView to:
    - Fetch watchlist items (pinned) for current type
    - Fetch JustWatch recommendations excluding tracked/completed/stopped IDs
    - Render pinned items first, then recommendations
    - Movie mode: no carousel, just pinned movies → recs
21. Run `npm test` — confirm PASS

### Slice 5: History Tab

22. Create `src/HistoryView.tsx`:
    - Fetches from /api/history?type=SHOW|MOVIE
    - Alphabetical grid with status badges ("Completed ✅" / "Stopped at S3E4")
    - Detail panel shows Resume Watching + Mark Unwatched actions
23. Wire into App.tsx tab routing (Discover | History below topbar)
24. Run `npm test` — confirm PASS

### Slice 6: Search Results Mode

25. Update DiscoverView: when debouncedSearch is non-empty, replace tab content with flat search results
26. Search results show ALL titles with inline status badges
27. Clearing search restores normal tab view
28. Run `npm test` — confirm PASS

### Slice 7: Side Panel Updates

29. Update detail panel action row:
    - "Add to Watchlist" replaces "Add to List" (pin/unpin toggle)
    - "Stop Watching" button (for in-progress shows)
    - "Resume Watching" button (for stopped shows in History)
30. Remove old ListsView.tsx (replaced by watchlist)
31. Run full test suite: `npm test && bun test tests/`
32. Build production: `npm run build`
33. Verify production server: `bun server.mjs` serves correctly
