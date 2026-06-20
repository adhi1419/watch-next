# Watch Next

A personal streaming discovery and tracking app. Browse Netflix + Amazon Prime catalogs, track episode progress, and manage your watchlist.

**Live**: https://adhi1419.github.io/watch-next/  
**API**: https://watch-next-547004818963.europe-west3.run.app

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

## Architecture

Frontend and backend are independently deployable. The API is a standalone HTTP service with no frontend coupling — it could be rewritten in any language (Rust, Go, etc.) without touching the client.

```
┌─────────────────────────────────────┐     ┌──────────────────────────────────┐
│ Frontend (GitHub Pages, global CDN)  │     │ Backend API (Cloud Run)           │
│                                     │     │                                  │
│ React 19 + Vite + Tailwind          │────▶│ Bun + TypeScript                 │
│ TanStack Query + wouter             │     │ Firebase Admin (auth + Firestore)│
│ Firebase Auth (client SDK)          │     │ JustWatch GraphQL (catalog)      │
│                                     │     │                                  │
│ adhi1419.github.io/watch-next/      │     │ watch-next-*.europe-west3.run.app│
└─────────────────────────────────────┘     └──────────────────────────────────┘
                                                         │
                                            ┌────────────┼────────────┐
                                            ▼            ▼            ▼
                                      Firestore    Firebase Auth   JustWatch
                                      (user data)  (Google OAuth)  (catalog)
```

### Frontend (`src/`)

| Module | Role |
|--------|------|
| `App.tsx` | Shell, routing, auth gate, topbar |
| `DiscoverView.tsx` | Carousel + Watch Next + DetailPanel |
| `HistoryView.tsx` | Completed/stopped grid |
| `hooks/` | useSelectedTitle, useDiscover, useWatchlist, useMutations |
| `components/` | TitleCard, DetailPanel, Carousel, ProviderIcons |
| `api.ts` + `store.ts` | REST client (all calls go to `VITE_API_URL`) |

### Backend (`server/`)

| Module | Role |
|--------|------|
| `index.ts` | HTTP routing, CORS, auth middleware |
| `firestore.ts` | Per-user Firestore collections |
| `auth.ts` | Firebase ID token verification |
| `justwatch.ts` | Multi-platform catalog provider (5-min cache) |
| `status.ts` | Title enrichment, status derivation |
| `routes/` | tracking, discover, watchlist |

## Running Locally

```bash
npm install
cp .env.example .env.local  # fill in Firebase config + API URL

# Backend (needs gcloud auth application-default login)
PORT=5174 NODE_ENV=development bun server/index.ts

# Frontend (proxies /api → localhost:5174)
npx vite
```

## Testing

```bash
npx vitest run src/__tests__/uat.test.ts        # Mock-based UAT
npx vitest run src/__tests__/backend.test.ts    # Integration (needs server)
```

## Deployment

Push to `main` triggers two parallel GitHub Actions jobs:
- **Frontend** → Vite build → GitHub Pages
- **Backend** → Docker build (Cloud Build) → Cloud Run

Manual backend deploy:
```bash
gcloud builds submit --tag=europe-west3-docker.pkg.dev/watch-next-500021/watch-next/watch-next:latest --region=europe-west3
gcloud run deploy watch-next --image=europe-west3-docker.pkg.dev/watch-next-500021/watch-next/watch-next:latest --region=europe-west3
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript, Vite, Tailwind, TanStack Query, wouter, Lucide |
| Backend | Bun, TypeScript (replaceable — API contract is HTTP/JSON) |
| Database | Firestore |
| Auth | Firebase Authentication |
| Frontend Hosting | GitHub Pages (CDN) |
| Backend Hosting | Cloud Run (europe-west3) |
| CI/CD | GitHub Actions |
| Data Source | JustWatch GraphQL API |
