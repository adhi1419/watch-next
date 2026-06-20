const GQL_URL = "https://apis.justwatch.com/graphql";

// Type mapping: JustWatch → domain
const TYPE_MAP: Record<string, "MOVIE" | "SHOW"> = {
  SHOW: "SHOW",
  MINI_SERIES: "SHOW",
  MOVIE: "MOVIE",
  SHORT_FILM: "MOVIE",
};

export function mapType(jwType: string): "MOVIE" | "SHOW" {
  return TYPE_MAP[jwType] ?? "MOVIE";
}

// --- Title metadata (batch, for enriching tracked/watchlist/search results) ---

export interface TitleMeta {
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
  totalEpisodes: number;
}

// Cache with TTL
const cache = new Map<string, { data: TitleMeta; expires: number }>();
const TTL = 5 * 60 * 1000;

const NODES_QUERY = `query($ids: [ID!]!) {
  nodes(ids: $ids) {
    id
    ... on MovieOrShowOrSeasonOrEpisode { objectType }
    ... on Show { totalSeasonCount seasons { episodes { id } } }
    ... on MovieOrShow {
      content(country: "DE", language: "en") {
        title originalReleaseYear shortDescription posterUrl runtime ageCertification
        genres { shortName }
        scoring { imdbScore imdbVotes tmdbScore tomatoMeter }
        credits { name role characterName }
      }
    }
  }
}`;

function parseNode(node: any): TitleMeta {
  const c = node.content ?? {};
  const totalEpisodes = (node.seasons ?? []).reduce((sum: number, s: any) => sum + (s.episodes?.length ?? 0), 0);
  return {
    id: node.id,
    type: mapType(node.objectType),
    title: c.title ?? "Unknown",
    year: c.originalReleaseYear ?? 0,
    synopsis: c.shortDescription ?? "",
    posterUrl: c.posterUrl ? `https://images.justwatch.com${c.posterUrl.replace("{profile}", "s276").replace("{format}", "webp")}` : null,
    genres: (c.genres ?? []).map((g: any) => g.shortName),
    scores: {
      imdb: c.scoring?.imdbScore ?? null,
      rt: c.scoring?.tomatoMeter ?? null,
      tmdb: c.scoring?.tmdbScore ?? null,
    },
    runtime: c.runtime ?? null,
    seasonCount: node.totalSeasonCount ?? null,
    cast: (c.credits ?? []).filter((cr: any) => cr.role === "ACTOR").slice(0, 10).map((cr: any) => ({ name: cr.name, character: cr.characterName })),
    ageRating: c.ageCertification ?? null,
    totalEpisodes,
  };
}

export async function fetchTitlesMeta(ids: string[]): Promise<Map<string, TitleMeta>> {
  const result = new Map<string, TitleMeta>();
  const uncached: string[] = [];
  const now = Date.now();

  for (const id of ids) {
    const hit = cache.get(id);
    if (hit && now < hit.expires) result.set(id, hit.data);
    else uncached.push(id);
  }

  if (uncached.length > 0) {
    try {
      const resp = await fetch(GQL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: NODES_QUERY, variables: { ids: uncached } }),
      });
      if (resp.ok) {
        const json = await resp.json();
        for (const node of json?.data?.nodes ?? []) {
          if (!node) continue;
          const meta = parseNode(node);
          result.set(meta.id, meta);
          cache.set(meta.id, { data: meta, expires: now + TTL });
        }
      }
    } catch (e) {
      console.error("[justwatch] batch fetch failed:", e);
    }
  }

  return result;
}

// --- Search/browse (for /api/titles) ---

const SEARCH_QUERY = `query($first: Int!, $after: String, $searchQuery: String, $sortBy: PopularTitlesSorting!, $genres: [String!]) {
  popularTitles(country: "DE", first: $first, after: $after, sortBy: $sortBy, sortRandomSeed: 0,
    filter: { packages: ["nfx"], searchQuery: $searchQuery, genres: $genres }) {
    edges { node { id
      ... on MovieOrShowOrSeasonOrEpisode { objectType }
      ... on Show { totalSeasonCount seasons { episodes { id } } }
      content(country: "DE", language: "en") {
        title originalReleaseYear shortDescription posterUrl runtime ageCertification
        genres { shortName }
        scoring { imdbScore tmdbScore tomatoMeter }
        credits { name role characterName }
      }
    } }
    pageInfo { endCursor hasNextPage }
  }
}`;

export interface SearchResult {
  titles: TitleMeta[];
  cursor: string | null;
  hasMore: boolean;
}

export async function searchTitles(opts: { query?: string; sort?: string; genres?: string[]; cursor?: string; pageSize?: number }): Promise<SearchResult> {
  const { query, sort = "IMDB_SCORE", genres, cursor, pageSize = 50 } = opts;
  const resp = await fetch(GQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { first: pageSize, after: cursor || null, searchQuery: query || null, sortBy: sort, genres: genres?.length ? genres : null },
    }),
  });
  if (!resp.ok) throw new Error(`JustWatch search failed: ${resp.status}`);
  const json = await resp.json();
  const data = json.data.popularTitles;
  const titles = (data.edges ?? []).map((e: any) => {
    const meta = parseNode(e.node);
    cache.set(meta.id, { data: meta, expires: Date.now() + TTL });
    return meta;
  });
  return { titles, cursor: data.pageInfo.endCursor, hasMore: data.pageInfo.hasNextPage };
}

// --- Season detail (for /api/titles/:id) ---

const SEASONS_QUERY = `query($id: ID!) {
  node(id: $id) {
    ... on Show {
      seasons {
        content(country: "DE", language: "en") { seasonNumber }
        episodes {
          content(country: "DE", language: "en") { title episodeNumber seasonNumber runtime }
        }
      }
    }
  }
}`;

export interface SeasonData {
  number: number;
  episodes: { number: number; title: string; runtime: number | null }[];
}

export async function fetchSeasons(titleId: string): Promise<SeasonData[]> {
  const resp = await fetch(GQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: SEASONS_QUERY, variables: { id: titleId } }),
  });
  if (!resp.ok) return [];
  const json = await resp.json();
  const seasons = json.data?.node?.seasons;
  if (!seasons) return [];
  return seasons.map((s: any) => ({
    number: s.content.seasonNumber,
    episodes: (s.episodes ?? []).map((e: any) => ({
      number: e.content.episodeNumber,
      title: e.content.title ?? "",
      runtime: e.content.runtime ?? null,
    })),
  }));
}

// --- Netflix availability check (targeted, for few titles) ---

const AVAILABILITY_QUERY = `query($id: ID!) {
  node(id: $id) {
    ... on Show { seasons {
      episodes {
        id
        offers(country: "DE", platform: WEB, filter: { packages: ["nfx"] }) { id }
      }
    } }
  }
}`;

/**
 * Count Netflix-available episodes for a single show.
 * Only call this for shows in "watching" state (max ~5 at a time).
 */
export async function fetchNetflixAvailableCount(titleId: string): Promise<number | undefined> {
  try {
    const resp = await fetch(GQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: AVAILABILITY_QUERY, variables: { id: titleId } }),
    });
    if (!resp.ok) return undefined;
    const json = await resp.json();
    const seasons = json.data?.node?.seasons;
    if (!seasons) return undefined;
    return seasons.reduce((sum: number, s: any) =>
      sum + (s.episodes ?? []).filter((e: any) => e.offers?.length > 0).length, 0
    );
  } catch {
    return undefined;
  }
}
