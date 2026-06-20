import { userDb } from "./firestore";
import { fetchTitlesMeta, fetchAvailableEpisodeCount, type TitleMeta } from "./justwatch";

export type DerivedStatus = "watching" | "completed" | "stopped" | "up_to_date";

export interface Title {
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
  tracking: { status: DerivedStatus; watched: number; total: number } | null;
  pinned: boolean;
  providers: string[];
}

export function deriveStatus(watched: number, total: number, storedStatus: string, available?: number): DerivedStatus {
  if (storedStatus === "stopped") return "stopped";
  if (total > 0 && watched >= total) return "completed";
  if (total === 0 && watched > 0) return "completed";
  if (available !== undefined && available > 0 && watched >= available) return "up_to_date";
  return "watching";
}

export async function enrichToTitles(
  uid: string,
  entries: { titleId: string; type: string; status?: string }[],
  opts?: { includeWatchlistCheck?: boolean; allPlatforms?: boolean }
): Promise<Title[]> {
  if (!entries.length) return [];
  const db = userDb(uid);

  const ids = entries.map(e => e.titleId);
  const metaMap = await fetchTitlesMeta(ids);

  const trackingIds = entries.filter(e => e.status).map(e => e.titleId);
  const countMap = new Map((await db.episodeCountsForTitles(trackingIds)).map(r => [r.titleId, r.count]));

  let watchlistSet = new Set<string>();
  if (opts?.includeWatchlistCheck) {
    const all = await db.allWatchlist();
    watchlistSet = new Set(all.map((w: any) => w.titleId));
  }

  const results = entries
    .map(e => {
      const meta = metaMap.get(e.titleId);
      if (!meta) return null;
      const watched = countMap.get(e.titleId) ?? 0;
      const total = meta.type === "MOVIE" ? 1 : meta.totalEpisodes;
      const status = e.status ? deriveStatus(watched, total, e.status) : null;
      return {
        id: meta.id, type: meta.type, title: meta.title, year: meta.year, synopsis: meta.synopsis,
        posterUrl: meta.posterUrl, genres: meta.genres, scores: meta.scores, runtime: meta.runtime,
        seasonCount: meta.seasonCount, cast: meta.cast, ageRating: meta.ageRating,
        tracking: status ? { status, watched, total } : null,
        pinned: watchlistSet.has(e.titleId), providers: meta.providers,
      };
    })
    .filter((t): t is Title => t !== null);

  if (!opts?.allPlatforms) {
    const watchingShows = results.filter(t => t.tracking?.status === "watching" && t.type === "SHOW" && t.tracking.watched > 0);
    if (watchingShows.length > 0) {
      const checks = await Promise.all(watchingShows.map(t => fetchAvailableEpisodeCount(t.id)));
      for (let i = 0; i < watchingShows.length; i++) {
        const available = checks[i];
        const t = watchingShows[i];
        if (available !== undefined && t.tracking && t.tracking.watched >= available) {
          t.tracking = { ...t.tracking, status: "up_to_date" };
        }
      }
    }
  }

  return results;
}

export async function enrichSearchResults(uid: string, metas: TitleMeta[]): Promise<Title[]> {
  if (!metas.length) return [];
  const db = userDb(uid);

  const ids = metas.map(m => m.id);
  const countMap = new Map((await db.episodeCountsForTitles(ids)).map(r => [r.titleId, r.count]));

  const trackingRows = await db.allTracking();
  const trackingMap = new Map(trackingRows.map((r: any) => [r.titleId, r.status]));
  const watchlistRows = await db.allWatchlist();
  const watchlistSet = new Set(watchlistRows.map((r: any) => r.titleId));

  return metas.map(meta => {
    const storedStatus = trackingMap.get(meta.id);
    const watched = countMap.get(meta.id) ?? 0;
    const total = meta.type === "MOVIE" ? 1 : meta.totalEpisodes;
    const status = storedStatus ? deriveStatus(watched, total, storedStatus) : null;
    return {
      id: meta.id, type: meta.type, title: meta.title, year: meta.year, synopsis: meta.synopsis,
      posterUrl: meta.posterUrl, genres: meta.genres, scores: meta.scores, runtime: meta.runtime,
      seasonCount: meta.seasonCount, cast: meta.cast, ageRating: meta.ageRating,
      tracking: status ? { status, watched, total } : null,
      pinned: watchlistSet.has(meta.id), providers: meta.providers,
    };
  });
}
