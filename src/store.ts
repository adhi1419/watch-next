import { getIdToken } from "./firebase";
import type { Title } from "./types";

const API = import.meta.env.VITE_API_URL || "";

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getIdToken();
  return token ? { "Content-Type": "application/json", "Authorization": `Bearer ${token}` } : { "Content-Type": "application/json" };
}

async function authFetch(method: string, url: string, body?: any) {
  const headers = await authHeaders();
  const resp = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error);
  }
  return resp.json();
}

// Tracking
export const startTracking = (titleId: string, type: "MOVIE" | "SHOW") => authFetch("POST", `${API}/api/tracking`, { titleId, type });
export const stopTracking = (titleId: string) => authFetch("DELETE", `${API}/api/tracking`, { titleId });
export const setStopWatching = (titleId: string) => authFetch("POST", `${API}/api/tracking/${encodeURIComponent(titleId)}/stop`);
export const setResumeWatching = (titleId: string) => authFetch("POST", `${API}/api/tracking/${encodeURIComponent(titleId)}/resume`);

// Episodes
export const markEpisodes = (titleId: string, episodes: { season: number; episode: number }[], type?: string) =>
  authFetch("POST", `${API}/api/tracking/${encodeURIComponent(titleId)}/episodes`, { episodes, type });
export const unmarkEpisodes = (titleId: string, episodes: { season: number; episode: number }[]) =>
  authFetch("DELETE", `${API}/api/tracking/${encodeURIComponent(titleId)}/episodes`, { episodes });

// Watchlist
export const addToWatchlist = (titleId: string, type: "MOVIE" | "SHOW") => authFetch("POST", `${API}/api/watchlist`, { titleId, type });
export const removeFromWatchlist = (titleId: string) => authFetch("DELETE", `${API}/api/watchlist`, { titleId });

// Read endpoints
export const getDiscover = (allPlatforms = false): Promise<Title[]> => authFetch("GET", `${API}/api/discover${allPlatforms ? "?allPlatforms=true" : ""}`);
export const getHistory = (allPlatforms = false): Promise<Title[]> => authFetch("GET", `${API}/api/history${allPlatforms ? "?allPlatforms=true" : ""}`);
export const getWatchlist = (): Promise<Title[]> => authFetch("GET", `${API}/api/watchlist`);
