# Adhi's Watch Next — PRD

## Goal

A personal streaming discovery and tracking app that surfaces high-quality titles via IMDb/RT scores, supports watchlist curation, and tracks episode-level progress — all without accounts or external dependencies beyond JustWatch's public GraphQL API.

## Non-goals

- Multi-user/auth (single-user local app)
- Multi-platform catalog aggregation (Netflix DE only for now, extensible later)
- Recommendation engine / ML-based suggestions
- Mobile-native app (web-only, responsive)
- Content playback or deep-linking to streaming player
- TV Time / Trakt import (deferred)

---

## Architecture

### Data Source
- **JustWatch GraphQL API** (`apis.justwatch.com/graphql`) — no auth required
- Country: DE, Provider filter: `nfx` (Netflix)
- Key queries: `popularTitles` (search/browse), `nodes` (batch metadata), `node` (seasons/episodes)
- Available: title, year, synopsis, genres, IMDb/TMDB/RT scores, runtime, poster, credits, ageCertification, productionCountries, totalSeasonCount, full season/episode data

### Stack

| Layer | Tech | Notes |
|-------|------|-------|
| Frontend | Vite 8 + React 19 + TypeScript 6 | Modular components, context-based state |
| Backend | Bun + TypeScript (`server/`) | Single server, layered modules |
| Database | `bun:sqlite` (`watched.db`) | Prepared statements, batch queries |
| Hosting | systemd on dev desktop | Tunnel: `https://adhitr-netflix-recs.c.tunnels.lab.aws.dev` |

### Backend Modules (`server/`)

| Module | Responsibility |
|--------|---------------|
| `index.ts` | HTTP server, route dispatch, error handling. Dev/prod mode via `NODE_ENV` |
| `db.ts` | SQLite connection, schema migrations (`pragma user_version`), prepared statements |
| `justwatch.ts` | JustWatch GraphQL client with 5-min in-memory TTL cache |
| `status.ts` | `deriveStatus()` logic + `enrichEntries()` batch enrichment (no N+1) |
| `validate.ts` | Safe JSON parsing, `requireFields()`, `ValidationError` class |
| `routes/tracking.ts` | CRUD for tracking + episodes + stop/resume |
| `routes/discover.ts` | `/api/discover` + `/api/history` |
| `routes/watchlist.ts` | Watchlist CRUD with type validation |

### Frontend Modules (`src/`)

| Module | Responsibility |
|--------|---------------|
| `App.tsx` | Shell: topbar, search, filters, TV/Movie toggle, tab routing |
| `DiscoverView.tsx` | Composes Carousel + CatalogGrid + DetailPanel (~130 lines) |
| `HistoryView.tsx` | Completed/stopped grid with panel |
| `context/TrackingContext.tsx` | Provider wrapping `useTrackingState` — eliminates prop drilling |
| `hooks/useTrackingState.ts` | Core tracking state: IDs, episode progress, season loading |
| `hooks/useDiscover.ts` | Pagination, debounce, dedup filtering |
| `hooks/useWatchlist.ts` | Watchlist state + toggle |
| `components/DetailPanel.tsx` | Fixed right panel: poster, scores, episodes, actions |
| `components/Carousel.tsx` | Currently Watching horizontal scroll |
| `components/CatalogGrid.tsx` | Infinite scroll grid with intersection observer |
| `components/TitleCard.tsx` | Shared card with progress/status badges |
| `components/CarouselCard.tsx` | Compact card for carousel |
| `api.ts` | JustWatch GraphQL queries (popularTitles, seasons/episodes) |
| `store.ts` | Backend REST wrapper |
| `types.ts` | Shared TypeScript interfaces |

---

## Data Model

### Core Principle
**"Completed" is never stored — it's derived at read time.**

The backend fetches live episode counts from the catalog provider (5-min cache) and compares against watched episodes. No stale data, no background cron.

### Core Entity: Title

Every API response uses the same shape. The frontend never sees provider-native types.

```typescript
interface Title {
  id: string;                    // Opaque provider ID
  type: "MOVIE" | "SHOW";       // Domain types — backend maps from provider
  title: string;
  year: number;
  synopsis: string;
  posterUrl: string | null;
  genres: string[];
  scores: { imdb: number | null; rt: number | null; tmdb: number | null };
  runtime: number | null;        // Minutes (movies), null (shows)
  seasonCount: number | null;    // Shows only
  cast: { name: string; character: string | null }[];
  ageRating: string | null;
  tracking: {                    // null if not tracked
    status: "watching" | "completed" | "stopped";
    watched: number;
    total: number;
  } | null;
  pinned: boolean;
}

// Full detail (returned by /api/titles/:id only)
interface TitleDetail extends Title {
  seasons: Season[];
}

interface Season {
  number: number;
  episodes: { number: number; title: string; runtime: number | null; watched: boolean }[];
}
```

### Design Principles

1. **DB stores only IDs + user state** — no catalog data duplicated
2. **Backend is the only layer that knows JustWatch exists** — maps at the boundary
3. **Type mapping**: JustWatch SHOW/MINI_SERIES → SHOW, MOVIE/SHORT_FILM → MOVIE
4. **Enrichment at read time** — hydrate from provider on every response (cached)
5. **Consistent shape** — same Title entity everywhere in the system

### States (derived at API response time)

| State | Condition |
|-------|-----------|
| Currently Watching | tracking entry + `watched < total` (live) |
| Completed | tracking entry + `watched >= total` (live) + status ≠ 'stopped' |
| Stopped | explicit `status = 'stopped'` in DB |
| Pinned (Watchlist) | in watchlist table |
| Unwatched | no tracking entry |

### DB Schema

```sql
-- User state only. No catalog data.
CREATE TABLE tracking (
  title_id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('MOVIE','SHOW')),
  status TEXT NOT NULL DEFAULT 'watching' CHECK(status IN ('watching','stopped')),
  started_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE episode_progress (
  title_id TEXT NOT NULL,
  season INT NOT NULL,
  episode INT NOT NULL,
  watched_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(title_id, season, episode)
);

CREATE TABLE watchlist (
  title_id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('MOVIE','SHOW')),
  added_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

---

## UI Design

### Layout

```
┌────────────────────────────────────────────────────────────┐
│ Top bar: "Adhi's Watch Next" | Search + ⚙️ | [TV] [Movies] │
├────────────────────────────────────────────────────────────┤
│            [Discover]  [History]                            │
├────────────────────────────────────────────────────────────┤
│ (tab content fills remaining viewport)                     │
└────────────────────────────────────────────────────────────┘
```

### Discover Tab (default)

**TV Shows mode:**
- **Currently Watching** — horizontal carousel, ordered by recency. TV only.
- **Watch Next** — vertical infinite scroll. Pinned watchlist first, then JustWatch recs (IMDb sorted). Excludes currently watching + history.

**Movies mode:**
- No carousel. Watch Next only: pinned movies → movie recommendations.

### History Tab
- Completed + Stopped titles, alphabetical order
- Badge per card: "Completed ✅" or "Stopped (5/10)"
- Respects TV/Movie toggle
- Actions: Resume Watching, Mark Unwatched

### Search Mode (overrides tabs)
When search has text → replaces all sections with flat results mixing ALL titles with inline status badges. Clears when search is emptied.

### Deduplication Rules
1. Currently Watching > Pinned Watch Next > Recommendations
2. History (completed + stopped) excluded from Watch Next
3. No title appears in more than one section

### Detail Panel (right side, fixed, full height)
- Poster, title, scores (IMDb + RT), year, seasons/runtime
- Synopsis, genres (clickable → filter), cast (clickable → search)
- Season dropdown — opens to season containing next unwatched episode
- Episodes with round check marks (green when watched)
- Actions: Add to Watchlist | Mark Watched | Stop Watching | Resume

### Card Design
- Glassmorphism style (frosted glass, blur)
- Title (wraps 2 lines), IMDb + RT scores, year badge, season/runtime badge, genre chips
- Progress bar: green (watching), red (stopped), full purple + ✓ badge (completed)
- Completed cards: 70% opacity, purple border

---

## API Surface

### Catalog (read, enriched from provider)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/titles?q=&sort=&genres=&type=&cursor=` | Search/browse. Returns `Title[]` |
| GET | `/api/titles/:id` | Full detail: `TitleDetail` with seasons + watched state |
| GET | `/api/discover` | Currently watching `Title[]` |
| GET | `/api/history` | Completed + stopped `Title[]`, alphabetical |
| GET | `/api/watchlist` | Pinned `Title[]` |

### User actions (write)

| Method | Endpoint | Body | Purpose |
|--------|----------|------|---------|
| POST | `/api/tracking` | `{titleId, type}` | Start tracking |
| DELETE | `/api/tracking` | `{titleId}` | Remove tracking + episodes |
| POST | `/api/tracking/:id/stop` | — | Set stopped |
| POST | `/api/tracking/:id/resume` | — | Resume watching |
| POST | `/api/tracking/:id/episodes` | `{season, episode}` or `{episodes:[...]}` | Mark watched |
| DELETE | `/api/tracking/:id/episodes` | same | Unmark |
| POST | `/api/watchlist` | `{titleId, type}` | Pin |
| DELETE | `/api/watchlist` | `{titleId}` | Unpin |

All return JSON. Errors: `400` validation, `404` not found, `502` upstream failure.

---

## Running

```bash
# Development (backend API on :5173, Vite HMR on :5173 via proxy)
bun server/index.ts                     # API only (NODE_ENV=development for CORS)
npx vite                                # Frontend with HMR

# Production
npx vite build                          # Build frontend to dist/
bun server/index.ts                     # Serves dist/ + API on :5173

# systemd
sudo systemctl start netflix-recs       # Uses server/index.ts
```

---

## Future Stories

| ID | Story | Status |
|----|-------|--------|
| S1 | Multi-Provider Support (Disney+, Prime via packages filter) | Deferred |
| S2 | TV Time Import (CSV/JSON match to JustWatch IDs) | Deferred |
| S3 | VPS Deployment (Docker, Caddy HTTPS) | Deferred |
| S4 | Ratings & Notes (star rating + free-text on completed) | Deferred |
| S5 | Data Export (JSON backup) | Deferred |
| S6 | CSS Modules / split stylesheets | Ready |
| S7 | Mobile responsive breakpoints | Deferred |
