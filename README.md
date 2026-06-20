# Adhi's Watch Next

A personal streaming discovery and tracking app. Browse Netflix + Amazon Prime catalogs, track episode progress, and manage your watchlist — all powered by JustWatch's public API.

## Features

- **Discover** — Browse titles sorted by IMDb rating or popularity, filter by genre and platform
- **Currently Watching** — Horizontal carousel of shows you're actively watching with episode progress
- **Watch Next** — Recommendations grid (watchlist items first, then catalog)
- **History** — Completed, stopped, and "up to date" titles with progress ribbons
- **Episode Tracking** — Per-episode check marks, bulk mark, auto-track on first episode
- **Multi-Provider** — Netflix DE + Amazon Prime DE (configurable, extensible)
- **Up-to-date Detection** — Shows where you've watched all available episodes on your platforms
- **Search** — Real-time search across all providers with relevance sorting

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS, TanStack Query, wouter |
| Backend | Bun, TypeScript, node:http |
| Database | SQLite (bun:sqlite) |
| Icons | Lucide React |
| Data Source | JustWatch GraphQL API |

## Architecture

```
server/
├── index.ts          HTTP server, routing, error handling
├── db.ts             SQLite, migrations, prepared statements
├── justwatch.ts      Catalog provider (multi-platform, 5-min cache)
├── status.ts         Title enrichment, status derivation
├── validate.ts       Input validation
└── routes/           tracking, discover, watchlist

src/
├── App.tsx           Shell (topbar, filters, routing via wouter)
├── DiscoverView.tsx  Carousel + Watch Next grid + Detail panel
├── HistoryView.tsx   Completed/stopped/up_to_date grid
├── hooks/            useSelectedTitle, useDiscover, useWatchlist, useMutations, useUrlState
├── components/       TitleCard, DetailPanel, Carousel, CatalogGrid, ProviderIcons, ErrorBoundary
├── api.ts            REST client
├── store.ts          Backend API wrapper
└── types.ts          Shared interfaces
```

## Running

```bash
# Install dependencies
npm install

# Development (API + Vite HMR)
PORT=5174 NODE_ENV=development bun server/index.ts  # Backend on :5174
npx vite                                             # Frontend on :5173 (proxies /api → :5174)

# Production
npx vite build
bun server/index.ts                                  # Serves dist/ + API on :5173
```

## Testing

```bash
# UAT tests (mock-based, no server needed)
npx vitest run src/__tests__/uat.test.ts

# Backend integration tests (requires running server on :5174)
PORT=5174 NODE_ENV=development bun server/index.ts &
npx vitest run src/__tests__/backend.test.ts
```

## API

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/platforms` | Configured platforms |
| GET | `/api/titles?q=&sort=&genres=&type=&cursor=&excludeTracked=&allPlatforms=` | Browse/search |
| GET | `/api/titles/:id` | Title detail with seasons + per-episode providers |
| GET | `/api/discover?allPlatforms=` | Currently watching |
| GET | `/api/history?allPlatforms=` | Completed + stopped + up_to_date |
| GET | `/api/watchlist` | Pinned titles |
| POST | `/api/tracking` | Start tracking `{titleId, type}` |
| DELETE | `/api/tracking` | Remove tracking `{titleId}` |
| POST | `/api/tracking/:id/stop` | Stop watching |
| POST | `/api/tracking/:id/resume` | Resume |
| POST | `/api/tracking/:id/episodes` | Mark episodes (auto-tracks, removes from watchlist) |
| DELETE | `/api/tracking/:id/episodes` | Unmark (auto-untracks when last episode removed) |
| POST | `/api/watchlist` | Add to watchlist `{titleId, type}` |
| DELETE | `/api/watchlist` | Remove `{titleId}` |

## Design Decisions

- **DB stores only IDs + user state** — no catalog data cached in SQLite
- **Completed is derived, never stored** — live episode counts from JustWatch
- **Watchlist and tracking are mutually exclusive** — backend enforces atomically
- **Provider-agnostic frontend** — backend maps JustWatch types at the boundary
- **TanStack Query** — all mutations invalidate globally, views auto-refresh
