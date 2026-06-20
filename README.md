# Watch Next

A personal streaming discovery and tracking app. Browse Netflix + Amazon Prime catalogs, track episode progress, and manage your watchlist.

**Live**: https://watch-next-547004818963.europe-west3.run.app

## Features

- **Multi-Provider** — Netflix DE + Amazon Prime DE with platform icons on titles and episodes
- **Currently Watching** — Carousel of in-progress shows with episode tracking
- **Watch Next** — Recommendations sorted by IMDb rating, watchlist items first
- **History** — Completed, stopped, and "up to date" titles with progress ribbons
- **Episode Tracking** — Per-episode marks, auto-track on first episode, auto-untrack on last unmark
- **Up-to-date Detection** — Detects when all platform-available episodes are watched
- **Search** — Real-time search across all providers
- **Google Sign-in** — Firebase Auth with per-user Firestore collections
- **Reactive UI** — TanStack Query with global invalidation on mutations

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS, TanStack Query, wouter, Lucide |
| Backend | Bun, TypeScript |
| Database | Firestore |
| Auth | Firebase Authentication |
| Hosting | Cloud Run (GCP) |
| CI/CD | GitHub Actions → Cloud Build → Cloud Run |
| Data | JustWatch GraphQL API |

## Architecture

```
src/                          server/
├── App.tsx                   ├── index.ts        (routing, auth)
├── DiscoverView.tsx          ├── firestore.ts    (per-user DB)
├── HistoryView.tsx           ├── auth.ts         (token verify)
├── hooks/                    ├── justwatch.ts    (catalog, cache)
│   ├── useSelectedTitle      ├── status.ts       (enrichment)
│   ├── useDiscover           └── routes/
│   ├── useWatchlist               ├── tracking.ts
│   └── useMutations               ├── discover.ts
├── components/                     └── watchlist.ts
│   ├── DetailPanel
│   ├── TitleCard
│   ├── Carousel
│   └── ProviderIcons
├── api.ts
└── store.ts
```

## Running Locally

```bash
npm install

# Set up Firebase config
cp .env.example .env.local  # fill in your Firebase project values

# Backend (needs gcloud auth application-default login)
PORT=5174 NODE_ENV=development bun server/index.ts

# Frontend
npx vite
```

## Testing

```bash
# UAT tests (mock-based)
npx vitest run src/__tests__/uat.test.ts

# Backend integration tests (requires running server)
npx vitest run src/__tests__/backend.test.ts
```

## Deployment

Push to `main` triggers GitHub Actions → Cloud Build → Cloud Run.

Manual deploy:
```bash
gcloud builds submit --tag=europe-west3-docker.pkg.dev/watch-next-500021/watch-next/watch-next:latest --region=europe-west3
gcloud run deploy watch-next --image=europe-west3-docker.pkg.dev/watch-next-500021/watch-next/watch-next:latest --region=europe-west3
```
