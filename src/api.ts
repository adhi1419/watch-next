import type { Title, TitleDetail } from "./types";

interface SearchResult {
  titles: Title[];
  cursor: string | null;
  hasMore: boolean;
}

export async function fetchTitles(opts: {
  query?: string;
  sort?: string;
  genres?: string[];
  type?: "MOVIE" | "SHOW";
  cursor?: string | null;
}): Promise<SearchResult> {
  const params = new URLSearchParams();
  if (opts.query) params.set("q", opts.query);
  if (opts.sort) params.set("sort", opts.sort);
  if (opts.genres?.length) params.set("genres", opts.genres.join(","));
  if (opts.type) params.set("type", opts.type);
  if (opts.cursor) params.set("cursor", opts.cursor);

  const resp = await fetch(`/api/titles?${params}`);
  if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);
  return resp.json();
}

export async function fetchTitleDetail(id: string): Promise<TitleDetail> {
  const resp = await fetch(`/api/titles/${encodeURIComponent(id)}`);
  if (!resp.ok) throw new Error(`Title detail failed: ${resp.status}`);
  return resp.json();
}
