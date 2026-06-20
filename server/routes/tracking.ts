import { queries, transaction } from "../db";
import { readJSON, requireFields, ValidationError } from "../validate";
import type { IncomingMessage } from "node:http";

export async function postTracking(req: IncomingMessage) {
  const body = await readJSON(req);
  requireFields(body, ["titleId", "type"]);
  if (!["MOVIE", "SHOW"].includes(body.type)) throw new ValidationError("type must be MOVIE or SHOW");
  // Can't track a title that's in the watchlist
  const inWatchlist = queries.getWatchlist.get(body.titleId);
  if (inWatchlist) throw new ValidationError("Title is in watchlist — remove from watchlist before tracking");
  queries.insertTracking.run(body.titleId, body.type);
  return { ok: true };
}

export async function deleteTracking(req: IncomingMessage) {
  const { titleId } = await readJSON(req);
  requireFields({ titleId }, ["titleId"]);
  transaction(() => {
    queries.deleteAllEpisodes.run(titleId);
    queries.deleteTracking.run(titleId);
  })();
  return { ok: true };
}

export async function stopTracking(titleId: string) {
  const row = queries.getTracking.get(titleId);
  if (!row) throw new ValidationError("Title not found");
  queries.setStatus.run("stopped", titleId);
  return { ok: true };
}

export async function resumeTracking(titleId: string) {
  const row = queries.getTracking.get(titleId);
  if (!row) throw new ValidationError("Title not found");
  queries.setStatus.run("watching", titleId);
  return { ok: true };
}

export async function postEpisodes(titleId: string, req: IncomingMessage) {
  const body = await readJSON(req);
  const episodes: { season: number; episode: number }[] =
    body.episodes ?? [{ season: body.season, episode: body.episode }];
  const type = body.type as string | undefined;
  transaction(() => {
    const existing = queries.getTracking.get(titleId);
    if (!existing) {
      if (!type) throw new ValidationError("type required when marking episodes on untracked title");
      queries.deleteWatchlist.run(titleId); // no-op if not in watchlist
      queries.insertTracking.run(titleId, type);
    }
    for (const ep of episodes) queries.insertEpisode.run(titleId, ep.season, ep.episode);
  })();
  return { ok: true, count: episodes.length };
}

export async function deleteEpisodes(titleId: string, req: IncomingMessage) {
  const body = await readJSON(req);
  const episodes: { season: number; episode: number }[] =
    body.episodes ?? [{ season: body.season, episode: body.episode }];
  transaction(() => {
    for (const ep of episodes) queries.deleteEpisode.run(titleId, ep.season, ep.episode);
    // Auto-untrack if no episodes remain
    const remaining = queries.episodesForTitle.all(titleId);
    if (remaining.length === 0) queries.deleteTracking.run(titleId);
  })();
  return { ok: true, count: episodes.length };
}
