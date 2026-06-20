import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTitleDetail } from "../api";
import type { TitleDetail } from "../types";

export function useSelectedTitle() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: selected, isLoading } = useQuery<TitleDetail>({
    queryKey: ["title-detail", selectedId],
    queryFn: () => fetchTitleDetail(selectedId!),
    enabled: !!selectedId,
  });

  const select = useCallback((id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  }, []);

  const close = useCallback(() => setSelectedId(null), []);

  const refresh = useCallback(() => {
    if (selectedId) qc.invalidateQueries({ queryKey: ["title-detail", selectedId] });
  }, [selectedId, qc]);

  return { selected: selected ?? null, selectedId, isLoading, select, close, refresh };
}
