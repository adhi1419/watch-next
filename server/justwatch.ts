const GQL_URL = "https://apis.justwatch.com/graphql";
const COUNTRY = "DE";

// --- Platform configuration (will move to user prefs table with multi-user) ---
export interface Platform {
  code: string;       // JustWatch package code
  name: string;
  icon: string;       // URL to platform icon
}

export const PLATFORMS: Platform[] = [
  { code: "nfx", name: "Netflix", icon: "https://images.justwatch.com/icon/207360008/s100/netflix.webp" },
  { code: "amp", name: "Amazon Prime", icon: "https://images.justwatch.com/icon/52449861/s100/amazon-prime-video.webp" },
];

const PACKAGE_CODES = PLATFORMS.map(p => p.code);


// --- Type mapping ---
const TYPE_MAP: Record<string, "MOVIE" | "SHOW"> = { SHOW: "SHOW", MINI_SERIES: "SHOW", MOVIE: "MOVIE", SHORT_FILM: "MOVIE" };
export function mapType(jwType: string): "MOVIE" | "SHOW" { return TYPE_MAP[jwType] ?? "MOVIE"; }

// --- Title metadata ---
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
  providers: string[]; // platform codes available on
}

const cache = new Map<string, { data: TitleMeta; expires: number }>();
const TTL = 5 * 60 * 1000;

const NODES_QUERY = `query($ids: [ID!]!, $country: Country!, $packages: [String!]) {
  nodes(ids: $ids) {
    id
    ... on MovieOrShowOrSeasonOrEpisode { objectType }
    ... on Show { totalSeasonCount seasons { episodes { id } } }
    ... on MovieOrShow {
      content(country: $country, language: "en") {
        title originalReleaseYear shortDescription posterUrl runtime ageCertification
        genres { shortName }
        scoring { imdbScore imdbVotes tmdbScore tomatoMeter }
        credits { name role characterName }
      }
      offers(country: $country, platform: WEB, filter: { packages: $packages }) {
        package { shortName }
      }
    }
  }
}`;

function parseNode(node: any): TitleMeta {
  const c = node.content ?? {};
  const totalEpisodes = (node.seasons ?? []).reduce((sum: number, s: any) => sum + (s.episodes?.length ?? 0), 0);
  const providers = [...new Set((node.offers ?? []).map((o: any) => o.package?.shortName).filter(Boolean))] as string[];
  return {
    id: node.id,
    type: mapType(node.objectType),
    title: c.title ?? "Unknown",
    year: c.originalReleaseYear ?? 0,
    synopsis: c.shortDescription ?? "",
    posterUrl: c.posterUrl ? `https://images.justwatch.com${c.posterUrl.replace("{profile}", "s276").replace("{format}", "webp")}` : null,
    genres: (c.genres ?? []).map((g: any) => g.shortName),
    scores: { imdb: c.scoring?.imdbScore ?? null, rt: c.scoring?.tomatoMeter ?? null, tmdb: c.scoring?.tmdbScore ?? null },
    runtime: c.runtime ?? null,
    seasonCount: node.totalSeasonCount ?? null,
    cast: (c.credits ?? []).filter((cr: any) => cr.role === "ACTOR").slice(0, 10).map((cr: any) => ({ name: cr.name, character: cr.characterName })),
    ageRating: c.ageCertification ?? null,
    totalEpisodes,
    providers,
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
    // JustWatch nodes() enforces a page-size limit (~100 IDs -> "page too large" TOO_BIG)
    // and a query complexity budget (350K -> exceeded at ~200 IDs with this field set).
    // Both fail with HTTP 200 + data.nodes=null, so we must chunk AND check json.errors.
    const CHUNK = 40;
    for (let i = 0; i < uncached.length; i += CHUNK) {
      const chunk = uncached.slice(i, i + CHUNK);
      try {
        const resp = await fetch(GQL_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: NODES_QUERY, variables: { ids: chunk, country: COUNTRY, packages: PACKAGE_CODES } }),
        });
        if (!resp.ok) {
          console.error(`[justwatch] nodes fetch HTTP ${resp.status} for chunk of ${chunk.length}`);
          continue;
        }
        const json = await resp.json();
        if (json?.errors?.length) {
          console.error("[justwatch] nodes query errors:", JSON.stringify(json.errors).slice(0, 300));
        }
        for (const node of json?.data?.nodes ?? []) {
          if (!node) continue;
          const meta = parseNode(node);
          result.set(meta.id, meta);
          cache.set(meta.id, { data: meta, expires: now + TTL });
        }
      } catch (e) {
        console.error("[justwatch] batch fetch failed:", e);
      }
    }
  }
  return result;
}

// --- Search/browse ---
const SEARCH_QUERY = `query($first: Int!, $after: String, $searchQuery: String, $sortBy: PopularTitlesSorting!, $genres: [String!], $country: Country!, $packages: [String!]) {
  popularTitles(country: $country, first: $first, after: $after, sortBy: $sortBy, sortRandomSeed: 0,
    filter: { packages: $packages, searchQuery: $searchQuery, genres: $genres }) {
    edges { node { id
      ... on MovieOrShowOrSeasonOrEpisode { objectType }
      ... on Show { totalSeasonCount seasons { episodes { id } } }
      content(country: $country, language: "en") {
        title originalReleaseYear shortDescription posterUrl runtime ageCertification
        genres { shortName }
        scoring { imdbScore tmdbScore tomatoMeter }
        credits { name role characterName }
      }
      offers(country: $country, platform: WEB, filter: { packages: $packages }) {
        package { shortName }
      }
    } }
    pageInfo { endCursor hasNextPage }
  }
}`;

export interface SearchResult { titles: TitleMeta[]; cursor: string | null; hasMore: boolean }

export async function searchTitles(opts: { query?: string; sort?: string; genres?: string[]; cursor?: string; pageSize?: number; allPlatforms?: boolean }): Promise<SearchResult> {
  const { query, sort = "IMDB_SCORE", genres, cursor, pageSize = 50, allPlatforms } = opts;
  const packages = allPlatforms ? null : PACKAGE_CODES;
  const resp = await fetch(GQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: SEARCH_QUERY,
      variables: { first: pageSize, after: cursor || null, searchQuery: query || null, sortBy: sort, genres: genres?.length ? genres : null, country: COUNTRY, packages },
    }),
  });
  if (!resp.ok) throw new Error(`JustWatch search failed: ${resp.status}`);
  const json = await resp.json();
  const data = json.data.popularTitles;
  const titles = (data.edges ?? []).map((e: any) => { const meta = parseNode(e.node); cache.set(meta.id, { data: meta, expires: Date.now() + TTL }); return meta; });
  return { titles, cursor: data.pageInfo.endCursor, hasMore: data.pageInfo.hasNextPage };
}

// --- Season detail with per-episode providers ---
const SEASONS_QUERY = `query($id: ID!, $country: Country!, $packages: [String!]) {
  node(id: $id) {
    ... on Show {
      seasons {
        content(country: $country, language: "en") { seasonNumber }
        episodes {
          content(country: $country, language: "en") { title episodeNumber seasonNumber runtime }
          offers(country: $country, platform: WEB, filter: { packages: $packages }) {
            package { shortName }
          }
        }
      }
    }
  }
}`;

export interface EpisodeData { number: number; title: string; runtime: number | null; providers: string[] }
export interface SeasonData { number: number; episodes: EpisodeData[] }

export async function fetchSeasons(titleId: string): Promise<SeasonData[]> {
  const resp = await fetch(GQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: SEASONS_QUERY, variables: { id: titleId, country: COUNTRY, packages: PACKAGE_CODES } }),
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
      providers: [...new Set((e.offers ?? []).map((o: any) => o.package?.shortName).filter(Boolean))] as string[],
    })),
  }));
}

// --- Availability check (provider-agnostic, for up_to_date detection) ---
export async function fetchAvailableEpisodeCount(titleId: string): Promise<number | undefined> {
  try {
    const resp = await fetch(GQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: `query($id: ID!, $country: Country!, $packages: [String!]) {
          node(id: $id) { ... on Show { seasons { episodes { id offers(country: $country, platform: WEB, filter: { packages: $packages }) { id } } } } }
        }`,
        variables: { id: titleId, country: COUNTRY, packages: PACKAGE_CODES },
      }),
    });
    if (!resp.ok) return undefined;
    const json = await resp.json();
    const seasons = json.data?.node?.seasons;
    if (!seasons) return undefined;
    return seasons.reduce((sum: number, s: any) => sum + (s.episodes ?? []).filter((e: any) => e.offers?.length > 0).length, 0);
  } catch { return undefined; }
}
