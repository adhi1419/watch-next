import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWatchlist } from "../store";

export function useWatchlist() {
  const { data: items = [] } = useQuery({ queryKey: ["watchlist"], queryFn: getWatchlist });
  const ids = useMemo(() => new Set(items.map(t => t.id)), [items]);
  return { items, ids };
}
