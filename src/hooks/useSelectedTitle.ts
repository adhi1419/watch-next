import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchTitleDetail } from "../api";
import { useUrlState } from "./useUrlState";
import type { TitleDetail } from "../types";

export function useSelectedTitle() {
  const { titleId: selectedId, push } = useUrlState();
  const qc = useQueryClient();

  const { data: selected, isLoading } = useQuery<TitleDetail>({
    queryKey: ["title-detail", selectedId],
    queryFn: () => fetchTitleDetail(selectedId!),
    enabled: !!selectedId,
  });

  const select = useCallback((id: string) => {
    push({ titleId: selectedId === id ? null : id });
  }, [push, selectedId]);

  const close = useCallback(() => push({ titleId: null }), [push]);

  const refresh = useCallback(() => {
    if (selectedId) qc.invalidateQueries({ queryKey: ["title-detail", selectedId] });
  }, [selectedId, qc]);

  return { selected: selected ?? null, selectedId, isLoading, select, close, refresh };
}
