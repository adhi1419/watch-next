# Watch Next — PRD

## Goal

A personal streaming discovery and tracking app. Browse multi-provider catalogs (Netflix, Prime), track episode progress, manage a watchlist, and never lose track of what you're watching.

## Architecture

### Deployment Model

Frontend and backend are **independently deployable**. The API is a standalone HTTP service — it could be rewritten in any language (Rust, Go, etc.) without touching the client. The contract is HTTP/JSON.

```
Frontend (GitHub Pages, CDN)  ──────►  Backend API (Cloud Run)  ──────►  Firestore + JustWatch
```

### Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS, TanStack Query, wouter, Lucide |
| Backend | Bun, TypeScript, node:http (replaceable) |
| Database | Firestore (per-user collections) |
| Auth | Firebase Authentication (Google sign-in) |
| Frontend Hosting | GitHub Pages (global CDN) |
| Backend Hosting | Cloud Run (europe-west3, scales to zero) |
| CI/CD | GitHub Actions (parallel: Pages + Cloud Build → Cloud Run) |
| Data Source | JustWatch GraphQL API |

### Backend Modules (`server/`)

| Module | Responsibility |
|--------|---------------|
| `index.ts` | HTTP server, route dispatch, error handling, auth gate |
| `firestore.ts` | Firestore client, per-user scoped queries |
| `auth.ts` | Firebase ID token verification |
| `justwatch.ts` | Catalog provider: multi-platform config, GraphQL client, 5-min cache |
| `status.ts` | `deriveStatus()` + `enrichToTitles()` batch enrichment |
| `validate.ts` | Input validation |
| `routes/tracking.ts` | Tracking + episodes (atomic watchlist→tracking transition) |
| `routes/discover.ts` | Search, browse, discover, history, title detail |
| `routes/watchlist.ts` | Watchlist CRUD |

### Frontend Modules (`src/`)

| Module | Responsibility |
|--------|---------------|
| `App.tsx` | Shell: topbar, search, filters, routing (wouter), auth gate |
| `DiscoverView.tsx` | Carousel + Watch Next grid + DetailPanel |
| `HistoryView.tsx` | Completed/stopped/up_to_date grid |
| `hooks/useSelectedTitle.ts` | Title detail query (TanStack Query) |
| `hooks/useDiscover.ts` | Infinite query for catalog browse/search |
| `hooks/useWatchlist.ts` | Watchlist query |
| `hooks/useMutations.ts` | All write operations + global invalidation |
| `hooks/useUrlState.ts` | URL ↔ app state sync (wouter) |
| `components/DetailPanel.tsx` | Fixed right panel with episodes, actions |
| `components/TitleCard.tsx` | Card with scores, genres, providers, ribbon progress |
| `components/ProviderIcons.tsx` | Platform logo badges |
| `components/AuthGate.tsx` | Login screen + auth state hook |
| `components/ErrorBoundary.tsx` | Crash recovery |

## Data Model

### Core Entity: Title

```typescript
interface Title {
  id: string;
  type: "MOVIE" | "SHOW";
  title: string;
  year: number;
  synopsis: string;
  posterUrl: string | null;
  genres: string[];
  scores: { imdb: number | null; rt: number | null; tmdb: number | null };
  runtime: number | null;
  seasonCount: number | null;
  cast: { name: string; character: string | null }[];
  ageRating: string | null;
  tracking: { status: "watching" | "completed" | "stopped" | "up_to_date"; watched: number; total: number } | null;
  pinned: boolean;
  providers: string[];
}
```

### Principles

1. **DB stores only IDs + user state** — no catalog data
2. **Backend is the only layer that knows JustWatch** — type mapping at boundary
3. **Completed is derived at read time** — live episode counts from provider
4. **Watchlist and tracking are mutually exclusive** — enforced atomically
5. **Multi-provider** — configurable platform list, per-episode availability
6. **Up-to-date detection** — shows with all platform-available episodes watched

### Firestore Schema

```
users/{uid}/tracking/{titleId}     → { type, status, startedAt }
users/{uid}/episodes/{titleId_s_e} → { titleId, season, episode, watchedAt }
users/{uid}/watchlist/{titleId}    → { type, addedAt }
```

## API Surface

### Public

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/platforms` | Platform config `[{code, name, icon}]` |

### Authenticated (Bearer token)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/titles?q=&sort=&genres=&type=&cursor=&excludeTracked=&allPlatforms=` | Browse/search |
| GET | `/api/titles/:id` | Title detail with seasons + per-episode providers + watched |
| GET | `/api/discover?allPlatforms=` | Currently watching |
| GET | `/api/history?allPlatforms=` | Completed + stopped + up_to_date |
| GET | `/api/watchlist` | Pinned titles |
| POST | `/api/tracking` | Start tracking `{titleId, type}` |
| DELETE | `/api/tracking` | Remove tracking `{titleId}` |
| POST | `/api/tracking/:id/stop` | Stop watching |
| POST | `/api/tracking/:id/resume` | Resume |
| POST | `/api/tracking/:id/episodes` | Mark episodes `{episodes:[...], type}` (atomic) |
| DELETE | `/api/tracking/:id/episodes` | Unmark (auto-untracks at zero) |
| POST | `/api/watchlist` | Pin `{titleId, type}` |
| DELETE | `/api/watchlist` | Unpin `{titleId}` |

## Running

```bash
# Local development
PORT=5174 NODE_ENV=development bun server/index.ts
npx vite

# Production (Cloud Run)
# Deployed via GitHub Actions on push to main
# URL: https://watch-next-547004818963.europe-west3.run.app
```

## Backlog

| # | Feature | Type | Effort |
|---|---------|------|--------|
| 1 | Mobile responsive layout | UI | M |
| 2 | History tab stats (watched count, total watch time) | Feature | S |
| 3 | Bug: Watchlist tiles missing rating/year/metadata | Bug | S |
| 4 | User preferences for platform selection (per-user, not hardcoded) | Feature | M |
| 5 | Bug: Hide carousel scroll button when not enough titles | Bug | XS |
| 6 | Personal star rating on titles | Feature | S |
| 7 | Recommendation engine (weighted by watch history + user ratings) | Feature | L |
| 8 | Migrate backend to Rust | Infra | XL |
| 9 | Richer catalog APIs (IMDB enrichment, multiple sources) | Feature | L |
| 10 | Sub-categories (documentaries, anime, short films) | Feature | M |
