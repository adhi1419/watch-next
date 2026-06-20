import { queries } from "../db";
import { enrichToTitles, enrichSearchResults, deriveStatus } from "../status";
import { searchTitles, fetchTitlesMeta, fetchSeasons } from "../justwatch";

export async function getDiscover(allPlatforms = false) {
  const entries = queries.watchingTracking.all() as any[];
  const titles = await enrichToTitles(entries, { includeWatchlistCheck: true, allPlatforms });
  return titles.filter(t => t.tracking?.status === "watching");
}

export async function getHistory(allPlatforms = false) {
  const entries = queries.allTrackingAlpha.all() as any[];
  const titles = await enrichToTitles(entries, { includeWatchlistCheck: true, allPlatforms });
  return titles.filter(t => t.tracking?.status === "completed" || t.tracking?.status === "stopped" || t.tracking?.status === "up_to_date");
}

export async function getWatchlist() {
  const entries = queries.allWatchlist.all() as { titleId: string; type: string }[];
  const enriched = await enrichToTitles(
    entries.map(e => ({ ...e, status: undefined })),
    { includeWatchlistCheck: false }
  );
  // Mark all as pinned (they're from watchlist table)
  return enriched.map(t => ({ ...t, pinned: true }));
}

export async function searchTitlesEndpoint(params: URLSearchParams) {
  const q = params.get("q") ?? undefined;
  const sort = params.get("sort") ?? "POPULAR";
  const type = params.get("type") as "MOVIE" | "SHOW" | null;
  const genres = params.get("genres")?.split(",").filter(Boolean) ?? undefined;
  const cursor = params.get("cursor") ?? undefined;
  const excludeTracked = params.get("excludeTracked") === "true";
  const allPlatforms = params.get("allPlatforms") === "true";

  const result = await searchTitles({ query: q, sort, genres, cursor, allPlatforms });

  // Filter by type if specified
  let titles = result.titles;
  if (type) titles = titles.filter(t => t.type === type);

  // Enrich with tracking/watchlist state
  const enriched = await enrichSearchResults(titles);

  // Optionally exclude tracked/pinned titles
  const filtered = excludeTracked
    ? enriched.filter(t => !t.tracking && !t.pinned)
    : enriched;

  return { titles: filtered, cursor: result.cursor, hasMore: result.hasMore };
}

export async function getTitleDetail(titleId: string) {
  // Fetch metadata
  const metaMap = await fetchTitlesMeta([titleId]);
  const meta = metaMap.get(titleId);
  if (!meta) return null;

  // Fetch seasons
  const seasonsRaw = meta.type === "SHOW" ? await fetchSeasons(titleId) : [];

  // Get watched episodes from DB
  const watchedEps = queries.episodesForTitle.all(titleId) as { season: number; episode: number }[];
  const watchedSet = new Set(watchedEps.map(e => `${e.season}-${e.episode}`));

  // Build seasons with watched state + providers
  const seasons = seasonsRaw.map(s => ({
    number: s.number,
    episodes: s.episodes.map(ep => ({
      number: ep.number,
      title: ep.title,
      runtime: ep.runtime,
      watched: watchedSet.has(`${s.number}-${ep.number}`),
      providers: ep.providers,
    })),
  }));

  // Get tracking state
  const trackingRow = queries.getTracking.get(titleId) as { titleId: string } | null;
  const totalEpisodes = meta.type === "MOVIE" ? 1 : seasons.reduce((sum, s) => sum + s.episodes.length, 0);
  const watchedCount = watchedEps.length;

  // Watchlist check
  const watchlistRow = queries.getWatchlist.get(titleId);

  // Derive status
  let tracking = null;
  if (trackingRow) {
    const entry = queries.getTrackingFull.get(titleId) as { status: string } | null;
    const storedStatus = entry?.status ?? "watching";
    const status = deriveStatus(watchedCount, totalEpisodes, storedStatus);
    tracking = { status, watched: watchedCount, total: totalEpisodes };
  }

  return {
    id: meta.id,
    type: meta.type,
    title: meta.title,
    year: meta.year,
    synopsis: meta.synopsis,
    posterUrl: meta.posterUrl,
    genres: meta.genres,
    scores: meta.scores,
    runtime: meta.runtime,
    seasonCount: meta.seasonCount,
    cast: meta.cast,
    ageRating: meta.ageRating,
    tracking,
    pinned: !!watchlistRow,
    providers: meta.providers,
    seasons,
  };
}
