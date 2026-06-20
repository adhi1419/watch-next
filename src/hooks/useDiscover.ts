import { useState, useEffect, useCallback } from "react";
import { fetchTitles } from "../api";
import type { Title } from "../types";

interface UseDiscoverOptions {
  search: string;
  sortBy: string;
  genres: string[];
  filterType: "MOVIE" | "SHOW";
  activeActor: string | null;
}

export function useDiscover({ search, sortBy, genres, filterType, activeActor }: UseDiscoverOptions) {
  const [titles, setTitles] = useState<Title[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const effectiveSearch = activeActor || debouncedSearch;
  const isSearchMode = debouncedSearch.length > 0;

  const loadPage = useCallback(async (pageCursor: string | null) => {
    setLoading(true);
    try {
      const result = await fetchTitles({
        query: effectiveSearch || undefined,
        sort: sortBy,
        genres: genres.length ? genres : undefined,
        type: isSearchMode ? undefined : filterType,
        cursor: pageCursor,
        excludeTracked: !isSearchMode,
      });
      setTitles(prev => pageCursor ? [...prev, ...result.titles] : result.titles);
      setCursor(result.cursor);
      setHasMore(result.hasMore);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [effectiveSearch, sortBy, genres, filterType, isSearchMode]);

  useEffect(() => {
    setTitles([]);
    setCursor(null);
    setHasMore(true);
    loadPage(null);
  }, [effectiveSearch, sortBy, genres, filterType]);

  const loadMore = useCallback(() => { loadPage(cursor); }, [cursor, loadPage]);

  return { titles, loading, hasMore, loadMore, isSearchMode };
}
