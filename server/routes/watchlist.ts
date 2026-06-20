import { queries } from "../db";
import { readJSON, requireFields, ValidationError } from "../validate";
import type { IncomingMessage } from "node:http";

export async function postWatchlist(req: IncomingMessage) {
  const body = await readJSON(req);
  requireFields(body, ["titleId", "type"]);
  if (!["MOVIE", "SHOW"].includes(body.type)) throw new ValidationError("type must be MOVIE or SHOW");
  const inTracking = queries.getTracking.get(body.titleId);
  if (inTracking) throw new ValidationError("Title is being tracked — stop tracking before adding to watchlist");
  queries.insertWatchlist.run(body.titleId, body.type);
  return { ok: true };
}

export async function deleteWatchlist(req: IncomingMessage) {
  const { titleId } = await readJSON(req);
  requireFields({ titleId }, ["titleId"]);
  queries.deleteWatchlist.run(titleId);
  return { ok: true };
}
