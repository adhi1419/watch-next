import { queries } from "./db";
import { fetchTitlesMeta, type TitleMeta } from "./justwatch";

export type DerivedStatus = "watching" | "completed" | "stopped";

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
}

function deriveStatus(watched: number, total: number, storedStatus: string): DerivedStatus {
  if (storedStatus === "stopped") return "stopped";
  if (total > 0 && watched >= total) return "completed";
  if (total === 0 && watched > 0) return "completed";
  return "watching";
}

/**
 * Build enriched Title entities from a list of DB entries (tracking or watchlist).
 * Fetches metadata from JustWatch and overlays user state.
 */
export async function enrichToTitles(
  entries: { titleId: string; type: string; status?: string }[],
  opts?: { includeWatchlistCheck?: boolean }
): Promise<Title[]> {
  if (!entries.length) return [];

  const ids = entries.map(e => e.titleId);

  // Batch fetch catalog metadata
  const metaMap = await fetchTitlesMeta(ids);

  // Batch fetch episode counts from DB
  const trackingIds = entries.filter(e => e.status).map(e => e.titleId);
  const countMap = new Map(queries.episodeCountsForTitles(trackingIds).map(r => [r.titleId, r.count]));

  // Watchlist lookup
  let watchlistSet = new Set<string>();
  if (opts?.includeWatchlistCheck) {
    const all = queries.allWatchlist.all() as { titleId: string }[];
    watchlistSet = new Set(all.map(w => w.titleId));
  }

  return entries
    .map(e => {
      const meta = metaMap.get(e.titleId);
      if (!meta) return null; // Title removed from JustWatch catalog

      const watched = countMap.get(e.titleId) ?? 0;
      const total = meta.type === "MOVIE" ? 1 : meta.totalEpisodes;
      const status = e.status ? deriveStatus(watched, total, e.status) : null;

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
        tracking: status ? { status, watched, total } : null,
        pinned: watchlistSet.has(e.titleId),
      };
    })
    .filter((t): t is Title => t !== null);
}

/**
 * Enrich search results with tracking + watchlist state from DB.
 */
export async function enrichSearchResults(metas: TitleMeta[]): Promise<Title[]> {
  if (!metas.length) return [];

  const ids = metas.map(m => m.id);
  const countMap = new Map(queries.episodeCountsForTitles(ids).map(r => [r.titleId, r.count]));

  // Get tracking status for all
  const trackingRows = queries.allTracking.all() as { titleId: string; status: string }[];
  const trackingMap = new Map(trackingRows.map(r => [r.titleId, r.status]));

  const watchlistRows = queries.allWatchlist.all() as { titleId: string }[];
  const watchlistSet = new Set(watchlistRows.map(r => r.titleId));

  return metas.map(meta => {
    const storedStatus = trackingMap.get(meta.id);
    const watched = countMap.get(meta.id) ?? 0;
    const total = meta.type === "MOVIE" ? 1 : meta.totalEpisodes;
    const status = storedStatus ? deriveStatus(watched, total, storedStatus) : null;

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
      tracking: status ? { status, watched, total } : null,
      pinned: watchlistSet.has(meta.id),
    };
  });
}
