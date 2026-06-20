import { useState, useEffect, useCallback } from "react";
import { getWatchlist, addToWatchlist, removeFromWatchlist } from "../store";
import type { Title } from "../types";

export function useWatchlist() {
  const [items, setItems] = useState<Title[]>([]);
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getWatchlist().then(data => {
      setItems(data);
      setIds(new Set(data.map(t => t.id)));
    }).catch(() => {});
  }, []);

  const toggle = useCallback(async (title: Title) => {
    if (ids.has(title.id)) {
      await removeFromWatchlist(title.id);
      setIds(prev => { const s = new Set(prev); s.delete(title.id); return s; });
      setItems(prev => prev.filter(t => t.id !== title.id));
    } else {
      await addToWatchlist(title.id, title.type);
      setIds(prev => new Set(prev).add(title.id));
      setItems(prev => [...prev, { ...title, pinned: true }]);
    }
  }, [ids]);

  return { items, ids, toggle };
}
