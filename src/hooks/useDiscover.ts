import { useState, useEffect, useMemo } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { fetchTitles } from "../api";

interface UseDiscoverOptions {
  search: string;
  sortBy: string;
  genres: string[];
  filterType: "MOVIE" | "SHOW";
  activeActor: string | null;
  allPlatforms: boolean;
}

export function useDiscover({ search, sortBy, genres, filterType, activeActor, allPlatforms }: UseDiscoverOptions) {
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const effectiveSearch = activeActor || debouncedSearch;
  const isSearchMode = debouncedSearch.length > 0;

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ["titles", effectiveSearch, sortBy, genres, filterType, isSearchMode, allPlatforms],
    queryFn: ({ pageParam }) => fetchTitles({
      query: effectiveSearch || undefined,
      sort: isSearchMode ? "POPULAR" : "IMDB_SCORE",
      genres: genres.length ? genres : undefined,
      type: isSearchMode ? undefined : filterType,
      cursor: pageParam,
      excludeTracked: !isSearchMode,
      allPlatforms,
    }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.hasMore ? lastPage.cursor : undefined,
  });

  const titles = useMemo(() => data?.pages.flatMap(p => p.titles) ?? [], [data]);

  return {
    titles,
    loading: isLoading || isFetchingNextPage,
    hasMore: !!hasNextPage,
    loadMore: fetchNextPage,
    isSearchMode,
  };
}
