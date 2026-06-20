import { queries, transaction } from "../db";
import { readJSON, requireFields, ValidationError } from "../validate";
import type { IncomingMessage } from "node:http";

export async function postTracking(req: IncomingMessage) {
  const body = await readJSON(req);
  requireFields(body, ["titleId", "type"]);
  if (!["MOVIE", "SHOW"].includes(body.type)) throw new ValidationError("type must be MOVIE or SHOW");
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
  transaction(() => {
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
  })();
  return { ok: true, count: episodes.length };
}
