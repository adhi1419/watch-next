# Unified UI Redesign — Project Plan

## Design Agreement (from grill-me session 2026-06-20)

### Core Concept
Replace the 3-tab navigation (Discover / My Lists / Tracking) with a 2-tab unified experience: **Discover** (active watching + recommendations) and **History** (completed + stopped).

### Data Model

States are **derived at read time** — the backend never stores "completed":

| State | Condition | Source |
|-------|-----------|--------|
| Currently Watching | has tracking entry + `watchedEpisodes < totalEpisodes` | tracking table + live JustWatch data |
| Completed | has tracking entry + `watchedEpisodes >= totalEpisodes` | derived (not stored) |
| Stopped | explicit `status = 'stopped'` in tracking table | tracking.status column |
| Pinned (Watchlist) | in watchlist table, type-scoped | watchlist table |
| Unwatched | no tracking entry, not in watchlist | absence of records |

**Key insight**: No cron needed for "new episodes released" detection. Because completed is derived from live episode counts, a show automatically returns to "Currently Watching" when JustWatch adds new episodes.

### Discover Tab (default view)

```
┌────────────────────────────────────────────────────────────┐
│ Top bar: Title | Search + Filter ⚙️ | [TV Shows] [Movies]  │
├────────────────────────────────────────────────────────────┤
│         [Discover]  [History]   <- tabs below topbar       │
├────────────────────────────────────────────────────────────┤
│ Currently Watching (TV only, horizontal scroll, by recency)│
│ [card→] [card→] [card→] [card→]  ▸                        │
├────────────────────────────────────────────────────────────┤
│ Watch Next (vertical infinite scroll)                      │
│ [📌 pinned] [📌 pinned] [rec] [rec] [rec] ...             │
│ Excludes: currently watching + history                     │
└────────────────────────────────────────────────────────────┘
```

- **TV Shows mode**: Currently Watching carousel (top) + Watch Next grid (below)
- **Movies mode**: No carousel. Watch Next only (pinned movies → movie recommendations)
- **No duplicates**: priority is Currently Watching > Pinned > Recommendations

### History Tab

```
┌────────────────────────────────────────────────────────────┐
│         [Discover]  [History]                               │
├────────────────────────────────────────────────────────────┤
│ Completed + Stopped titles, alphabetical                   │
│ Badge: "Completed ✅" or "Stopped at S3E4"                 │
│ Respects TV/Movie toggle                                   │
│ Actions: Resume Watching, Mark Unwatched                   │
└────────────────────────────────────────────────────────────┘
```

### Search Mode (overrides tabs)
When search has text → replaces all sections with flat "Search Results" mixing ALL titles (currently watching, history, catalog) with inline status badges. Clears when search is emptied.

### Side Panel Actions
- **Add to Watchlist** (pin/unpin toggle)
- **Mark Watched** (TV: marks all episodes, auto → History. Movies: track + mark)
- **Stop Watching** (moves to History with progress frozen, resumable)
- **Episodes** (season dropdown, round check marks)

### DB Schema Changes

```sql
-- tracking table: add status column
ALTER TABLE tracking ADD COLUMN status TEXT DEFAULT 'watching';
-- status: 'watching' | 'stopped' (no 'completed' — derived)

-- Replace lists + list_items with single watchlist table
CREATE TABLE watchlist (
  title_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('MOVIE', 'SHOW')),
  title TEXT,
  poster_url TEXT,
  added_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (title_id)
);

-- Drop: lists, list_items tables
```

### Deduplication Rules
1. Currently Watching shows are excluded from Watch Next
2. History (completed + stopped) titles are excluded from Watch Next
3. Watchlist pins appear at the start of Watch Next (not duplicated in recs)

### Movies
- Movies NEVER appear in "Currently Watching" (no episode progress)
- Movies in watchlist appear in Watch Next (movie mode)
- "Mark Watched" on a movie → straight to History
- Watchlist is type-scoped: a watchlist entry has `type: 'MOVIE' | 'SHOW'`

### Scroll Behaviors
- Currently Watching: horizontal infinite scroll with right-arrow button, ordered by recency of last episode marked
- Watch Next: vertical infinite scroll (same as current Discover grid)
- History: vertical infinite scroll, alphabetical

---

## Implementation Plan (Vertical Slices)

### Slice 1: DB Migration + API State Derivation
**Layers**: DB → API
**What**: Add `status` column to tracking, create `watchlist` table, drop old `lists`/`list_items`. Update API to derive state (currently_watching / completed / stopped) by comparing episode progress against JustWatch counts.
**Risk**: Need to handle existing data migration gracefully.
**Blocked by**: nothing
**Tests**:
- Status derivation: given 5/10 episodes → 'watching'; 10/10 → 'completed'
- Stopped status persists episode progress
- Watchlist type constraint (can't add movie with type='SHOW')

### Slice 2: API Endpoints for New Views
**Layers**: API
**What**: New endpoints that return data shaped for the UI:
- `GET /api/discover` → { currentlyWatching: [...], excludeIds: [...] }
- `GET /api/history?type=SHOW|MOVIE` → sorted alphabetically with status badges
- `POST /api/tracking/:id/stop` → sets status='stopped'
- `POST /api/tracking/:id/resume` → sets status='watching'
- `DELETE /api/tracking/:id/unwatch` → removes tracking + episodes (already exists as DELETE /api/tracking)
- `GET/POST/DELETE /api/watchlist` → CRUD for single watchlist
**Blocked by**: Slice 1
**Tests**:
- /api/discover excludes completed+stopped titles
- /api/history returns only completed+stopped, alphabetical
- stop/resume toggle preserves episode progress

### Slice 3: Discover Tab UI — Currently Watching Carousel
**Layers**: UI
**What**: Horizontal scrollable row at top of Discover (TV mode only). Cards ordered by recency. Right-arrow scroll button. Clicking a card opens the detail panel.
**Blocked by**: Slice 2
**Tests**: (visual/manual)

### Slice 4: Discover Tab UI — Watch Next with Deduplication
**Layers**: UI + API
**What**: Vertical infinite scroll below carousel. Pinned watchlist items first, then JustWatch recommendations. Excludes IDs from currently_watching + history. Movie mode: no carousel, just pinned movies → recs.
**Blocked by**: Slice 2, Slice 3
**Tests**:
- No title appears in both carousel and grid
- Pinned items precede recommendations
- Movie mode hides carousel

### Slice 5: History Tab
**Layers**: UI + API
**What**: New tab showing completed + stopped titles alphabetically. Badge per card ("Completed ✅" or "Stopped at S3E4"). Respects TV/Movie toggle. Side panel actions: Resume Watching, Mark Unwatched.
**Blocked by**: Slice 2
**Tests**:
- Resume moves title back to Currently Watching
- Unwatched removes all trace (tracking + episodes)
- Respects type filter

### Slice 6: Search Results Mode
**Layers**: UI
**What**: When search has text, replace tab content with flat "Search Results" list. Shows ALL titles (from JustWatch + your tracked/history) with inline status badges. Each result shows its state.
**Blocked by**: Slice 4, Slice 5
**Tests**:
- Search shows results from all categories
- Each result has correct status badge
- Clearing search restores normal tab view

### Slice 7: Side Panel Updates
**Layers**: UI
**What**: Update actions row: "Add to Watchlist" (replaces "Add to List"), "Stop Watching" button (for in-progress shows), "Resume Watching" (for stopped shows in History).
**Blocked by**: Slice 2
**Tests**:
- Stop Watching preserves progress and moves to History
- Resume Watching returns to carousel

---

## Execution Approach
- **TDD**: Write failing test → implement → refactor (per .kiro/skills/tdd.md)
- **Vertical slices**: Each slice is independently shippable
- **Parallelism**: Slices 3, 5, 7 can run in parallel after Slice 2 completes

---

## Architecture Refactor (2026-06-20)

The codebase was refactored from "slop max" to a production-quality layered architecture:

### Backend: `server/` replaces `server.mjs` + `dev-server.mjs`
- Single entry point with NODE_ENV switch (CORS in dev, static serving in prod)
- Batch DB queries (no N+1), prepared statements
- JustWatch 5-min in-memory cache
- Input validation + proper error responses (400/404/500)
- Schema migrations via `pragma user_version`

### Frontend: Decomposed from god-components
- `TrackingContext` eliminates prop drilling
- `DetailPanel`, `Carousel`, `CatalogGrid` extracted from 430-line DiscoverView
- `useDiscover`, `useWatchlist` hooks for domain-specific state
- DiscoverView reduced from 430 → 130 lines (composition only)
- Dead code (`TrackingView.tsx`) removed
- Unused dependency (`express`) removed

### Status: All TypeScript compiles clean, Vite builds in 122ms, server starts without errors.
