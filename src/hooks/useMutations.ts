import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as store from "../store";
import type { Title } from "../types";

export function useMutations() {
  const qc = useQueryClient();
  const invalidateAll = () => qc.invalidateQueries();

  const track = useMutation({
    mutationFn: ({ titleId, type }: { titleId: string; type: "MOVIE" | "SHOW" }) => store.startTracking(titleId, type),
    onSuccess: invalidateAll,
  });

  const untrack = useMutation({
    mutationFn: (titleId: string) => store.stopTracking(titleId),
    onSuccess: invalidateAll,
  });

  const stopWatching = useMutation({
    mutationFn: (titleId: string) => store.setStopWatching(titleId),
    onSuccess: invalidateAll,
  });

  const resumeWatching = useMutation({
    mutationFn: (titleId: string) => store.setResumeWatching(titleId),
    onSuccess: invalidateAll,
  });

  const markEpisodes = useMutation({
    mutationFn: ({ titleId, episodes, type }: { titleId: string; episodes: { season: number; episode: number }[]; type?: string }) => store.markEpisodes(titleId, episodes, type),
    onSuccess: invalidateAll,
  });

  const unmarkEpisodes = useMutation({
    mutationFn: ({ titleId, episodes }: { titleId: string; episodes: { season: number; episode: number }[] }) => store.unmarkEpisodes(titleId, episodes),
    onSuccess: invalidateAll,
  });

  const addWatchlist = useMutation({
    mutationFn: ({ titleId, type }: { titleId: string; type: "MOVIE" | "SHOW" }) => store.addToWatchlist(titleId, type),
    onSuccess: invalidateAll,
  });

  const removeWatchlist = useMutation({
    mutationFn: (titleId: string) => store.removeFromWatchlist(titleId),
    onSuccess: invalidateAll,
  });

  const toggleWatchlist = async (title: Title) => {
    if (title.pinned) await removeWatchlist.mutateAsync(title.id);
    else await addWatchlist.mutateAsync({ titleId: title.id, type: title.type });
  };

  const markAllWatched = async (title: Title) => {
    if (title.type === "MOVIE") {
      await markEpisodes.mutateAsync({ titleId: title.id, episodes: [{ season: 1, episode: 1 }], type: title.type });
    }
    // For shows, caller (DetailPanel) handles collecting unwatched episodes
  };

  const toggleEpisode = async (titleId: string, season: number, episode: number, watched: boolean, title?: Title) => {
    if (watched) {
      await unmarkEpisodes.mutateAsync({ titleId, episodes: [{ season, episode }] });
    } else {
      await markEpisodes.mutateAsync({ titleId, episodes: [{ season, episode }], type: title?.type });
    }
  };

  return { track, untrack, stopWatching, resumeWatching, markEpisodes, unmarkEpisodes, addWatchlist, removeWatchlist, toggleWatchlist, markAllWatched, toggleEpisode };
}
