import { userDb } from "../firestore";
import { enrichToTitles, enrichSearchResults, deriveStatus } from "../status";
import { searchTitles, fetchTitlesMeta, fetchSeasons } from "../justwatch";

export async function getDiscover(uid: string, allPlatforms = false) {
  const entries = await userDb(uid).watchingTracking();
  const titles = await enrichToTitles(uid, entries as any[], { includeWatchlistCheck: true, allPlatforms });
  return titles.filter(t => t.tracking?.status === "watching");
}

export async function getHistory(uid: string, allPlatforms = false) {
  const entries = await userDb(uid).allTrackingAlpha();
  const titles = await enrichToTitles(uid, entries as any[], { includeWatchlistCheck: true, allPlatforms });
  return titles.filter(t => t.tracking?.status === "completed" || t.tracking?.status === "stopped" || t.tracking?.status === "up_to_date");
}

export async function getWatchlist(uid: string) {
  const entries = await userDb(uid).allWatchlist();
  const enriched = await enrichToTitles(uid, (entries as any[]).map(e => ({ ...e, status: undefined })), { includeWatchlistCheck: false });
  return enriched.map(t => ({ ...t, pinned: true }));
}

export async function searchTitlesEndpoint(uid: string, params: URLSearchParams) {
  const q = params.get("q") ?? undefined;
  const sort = params.get("sort") ?? "POPULAR";
  const type = params.get("type") as "MOVIE" | "SHOW" | null;
  const genres = params.get("genres")?.split(",").filter(Boolean) ?? undefined;
  const cursor = params.get("cursor") ?? undefined;
  const excludeTracked = params.get("excludeTracked") === "true";
  const allPlatforms = params.get("allPlatforms") === "true";

  const result = await searchTitles({ query: q, sort, genres, cursor, allPlatforms });
  let titles = result.titles;
  if (type) titles = titles.filter(t => t.type === type);
  const enriched = await enrichSearchResults(uid, titles);
  const filtered = excludeTracked ? enriched.filter(t => !t.tracking && !t.pinned) : enriched;
  return { titles: filtered, cursor: result.cursor, hasMore: result.hasMore };
}

export async function getTitleDetail(uid: string, titleId: string) {
  const metaMap = await fetchTitlesMeta([titleId]);
  const meta = metaMap.get(titleId);
  if (!meta) return null;

  const db = userDb(uid);
  const seasonsRaw = meta.type === "SHOW" ? await fetchSeasons(titleId) : [];
  const watchedEps = await db.episodesForTitle(titleId);
  const watchedSet = new Set(watchedEps.map(e => `${e.season}-${e.episode}`));

  const seasons = seasonsRaw.map(s => ({
    number: s.number,
    episodes: s.episodes.map(ep => ({
      number: ep.number, title: ep.title, runtime: ep.runtime,
      watched: watchedSet.has(`${s.number}-${ep.number}`),
      providers: ep.providers,
    })),
  }));

  const trackingRow = await db.getTracking(titleId);
  const totalEpisodes = meta.type === "MOVIE" ? 1 : seasons.reduce((sum, s) => sum + s.episodes.length, 0);
  const watchedCount = watchedEps.length;
  const watchlistRow = await db.getWatchlist(titleId);

  let tracking = null;
  if (trackingRow) {
    const storedStatus = (trackingRow as any).status ?? "watching";
    tracking = { status: deriveStatus(watchedCount, totalEpisodes, storedStatus), watched: watchedCount, total: totalEpisodes };
  }

  return {
    id: meta.id, type: meta.type, title: meta.title, year: meta.year, synopsis: meta.synopsis,
    posterUrl: meta.posterUrl, genres: meta.genres, scores: meta.scores, runtime: meta.runtime,
    seasonCount: meta.seasonCount, cast: meta.cast, ageRating: meta.ageRating,
    tracking, pinned: !!watchlistRow, providers: meta.providers, seasons,
  };
}
