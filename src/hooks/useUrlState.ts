import { useCallback, useEffect } from "react";
import { useLocation, useSearch } from "wouter";

type View = "discover" | "history";
type FilterType = "MOVIE" | "SHOW";

interface UrlState {
  view: View;
  filterType: FilterType;
  sort: string;
  genres: string[];
  titleId: string | null;
}

export function useUrlState() {
  const [location, setLocation] = useLocation();
  const search = useSearch();

  useEffect(() => {
    if (location === "/" || location === "") {
      setLocation("/discover/shows", { replace: true });
    }
  }, []);

  const segments = location.split("/").filter(Boolean);
  const view: View = segments[0] === "history" ? "history" : "discover";
  const typeSeg = segments[1]?.toLowerCase();
  const filterType: FilterType = typeSeg === "movies" ? "MOVIE" : "SHOW";

  const params = new URLSearchParams(search);
  const state: UrlState = {
    view,
    filterType,
    sort: params.get("sort") ?? "POPULAR",
    genres: params.get("genres")?.split(",").filter(Boolean) ?? [],
    titleId: params.get("title"),
  };

  const buildUrl = useCallback((updates: Partial<UrlState>) => {
    const next = { ...state, ...updates };
    const typePath = next.filterType === "MOVIE" ? "movies" : "shows";
    const base = `/${next.view}/${typePath}`;
    const p = new URLSearchParams();
    if (next.sort !== "POPULAR") p.set("sort", next.sort);
    if (next.genres.length) p.set("genres", next.genres.join(","));
    if (next.titleId) p.set("title", next.titleId);
    const qs = p.toString();
    return qs ? `${base}?${qs}` : base;
  }, [state]);

  const push = useCallback((updates: Partial<UrlState>) => {
    setLocation(buildUrl(updates));
  }, [buildUrl, setLocation]);

  return { ...state, push };
}
