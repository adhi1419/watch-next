import { useState, useCallback } from "react";
import { fetchTitleDetail } from "../api";
import { startTracking, stopTracking, markEpisodes, unmarkEpisodes } from "../store";
import type { Title, TitleDetail } from "../types";

export function useTrackingState() {
  const [detail, setDetail] = useState<TitleDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const handleSelect = useCallback(async (title: Title) => {
    setLoadingDetail(true);
    try {
      const d = await fetchTitleDetail(title.id);
      setDetail(d);
    } catch {
      setDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  const toggleEpisode = useCallback(async (titleId: string, season: number, episode: number, title: Title | null) => {
    if (!detail) return;
    const ep = detail.seasons.flatMap(s => s.episodes.map(e => ({ ...e, season: s.number }))).find(e => e.season === season && e.number === episode);
    if (!ep) return;

    if (ep.watched) {
      await unmarkEpisodes(titleId, [{ season, episode }]);
    } else {
      // Auto-track if not yet tracked
      if (!detail.tracking && title) {
        await startTracking(titleId, title.type);
      }
      await markEpisodes(titleId, [{ season, episode }]);
    }
    // Refresh detail
    const refreshed = await fetchTitleDetail(titleId);
    setDetail(refreshed);
  }, [detail]);

  const markAllWatched = useCallback(async (title: Title) => {
    if (!detail) return;
    if (!detail.tracking) await startTracking(title.id, title.type);
    if (title.type === "MOVIE") {
      await markEpisodes(title.id, [{ season: 1, episode: 1 }]);
    } else {
      const allEps = detail.seasons.flatMap(s => s.episodes.filter(e => !e.watched).map(e => ({ season: s.number, episode: e.number })));
      if (allEps.length) await markEpisodes(title.id, allEps);
    }
    const refreshed = await fetchTitleDetail(title.id);
    setDetail(refreshed);
  }, [detail]);

  const untrack = useCallback(async (titleId: string) => {
    await stopTracking(titleId);
    if (detail?.id === titleId) {
      const refreshed = await fetchTitleDetail(titleId);
      setDetail(refreshed);
    }
  }, [detail]);

  return { detail, loadingDetail, handleSelect, toggleEpisode, markAllWatched, untrack };
}
