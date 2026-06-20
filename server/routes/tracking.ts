import { userDb } from "../firestore";
import { readJSON, requireFields, ValidationError } from "../validate";
import type { IncomingMessage } from "node:http";

export async function postTracking(uid: string, req: IncomingMessage) {
  const body = await readJSON(req);
  requireFields(body, ["titleId", "type"]);
  if (!["MOVIE", "SHOW"].includes(body.type)) throw new ValidationError("type must be MOVIE or SHOW");
  const db = userDb(uid);
  const inWatchlist = await db.getWatchlist(body.titleId);
  if (inWatchlist) throw new ValidationError("Title is in watchlist — remove from watchlist before tracking");
  await db.insertTracking(body.titleId, body.type);
  return { ok: true };
}

export async function deleteTracking(uid: string, req: IncomingMessage) {
  const { titleId } = await readJSON(req);
  requireFields({ titleId }, ["titleId"]);
  const db = userDb(uid);
  await db.deleteAllEpisodes(titleId);
  await db.deleteTracking(titleId);
  return { ok: true };
}

export async function stopTracking(uid: string, titleId: string) {
  const db = userDb(uid);
  const row = await db.getTracking(titleId);
  if (!row) throw new ValidationError("Title not found");
  await db.setStatus(titleId, "stopped");
  return { ok: true };
}

export async function resumeTracking(uid: string, titleId: string) {
  const db = userDb(uid);
  const row = await db.getTracking(titleId);
  if (!row) throw new ValidationError("Title not found");
  await db.setStatus(titleId, "watching");
  return { ok: true };
}

export async function postEpisodes(uid: string, titleId: string, req: IncomingMessage) {
  const body = await readJSON(req);
  const episodes: { season: number; episode: number }[] =
    body.episodes ?? [{ season: body.season, episode: body.episode }];
  const type = body.type as string | undefined;
  const db = userDb(uid);

  // Auto-track if not yet tracked
  const existing = await db.getTracking(titleId);
  if (!existing) {
    if (!type) throw new ValidationError("type required when marking episodes on untracked title");
    await db.deleteWatchlist(titleId); // no-op if not in watchlist
    await db.insertTracking(titleId, type);
  }
  for (const ep of episodes) await db.insertEpisode(titleId, ep.season, ep.episode);
  return { ok: true, count: episodes.length };
}

export async function deleteEpisodes(uid: string, titleId: string, req: IncomingMessage) {
  const body = await readJSON(req);
  const episodes: { season: number; episode: number }[] =
    body.episodes ?? [{ season: body.season, episode: body.episode }];
  const db = userDb(uid);
  for (const ep of episodes) await db.deleteEpisode(titleId, ep.season, ep.episode);
  // Auto-untrack if no episodes remain
  const remaining = await db.episodeCountForTitle(titleId);
  if (remaining === 0) await db.deleteTracking(titleId);
  return { ok: true, count: episodes.length };
}
