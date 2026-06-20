import type { Title } from "./types";

const json = (method: string, url: string, body?: any) =>
  fetch(url, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(r => r.json());

// Tracking
export const startTracking = (titleId: string, type: "MOVIE" | "SHOW") => json("POST", "/api/tracking", { titleId, type });
export const stopTracking = (titleId: string) => json("DELETE", "/api/tracking", { titleId });
export const setStopWatching = (titleId: string) => json("POST", `/api/tracking/${encodeURIComponent(titleId)}/stop`);
export const setResumeWatching = (titleId: string) => json("POST", `/api/tracking/${encodeURIComponent(titleId)}/resume`);

// Episodes
export const markEpisodes = (titleId: string, episodes: { season: number; episode: number }[], type?: string) =>
  json("POST", `/api/tracking/${encodeURIComponent(titleId)}/episodes`, { episodes, type });
export const unmarkEpisodes = (titleId: string, episodes: { season: number; episode: number }[]) =>
  json("DELETE", `/api/tracking/${encodeURIComponent(titleId)}/episodes`, { episodes });

// Watchlist
export const addToWatchlist = (titleId: string, type: "MOVIE" | "SHOW") => json("POST", "/api/watchlist", { titleId, type });
export const removeFromWatchlist = (titleId: string) => json("DELETE", "/api/watchlist", { titleId });

// Read endpoints
export const getDiscover = (allPlatforms = false): Promise<Title[]> => fetch(`/api/discover${allPlatforms ? "?allPlatforms=true" : ""}`).then(r => r.json());
export const getHistory = (allPlatforms = false): Promise<Title[]> => fetch(`/api/history${allPlatforms ? "?allPlatforms=true" : ""}`).then(r => r.json());
export const getWatchlist = (): Promise<Title[]> => fetch("/api/watchlist").then(r => r.json());
