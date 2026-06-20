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
  tracking: { status: "watching" | "completed" | "stopped" | "up_to_date"; watched: number; total: number } | null;
  pinned: boolean;
  providers: string[];
}

export interface Season {
  number: number;
  episodes: Episode[];
}

export interface Episode {
  number: number;
  title: string;
  runtime: number | null;
  watched: boolean;
  providers: string[];
}

export interface TitleDetail extends Title {
  seasons: Season[];
}

export type View = "discover" | "history";
