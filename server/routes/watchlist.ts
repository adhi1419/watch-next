import { userDb } from "../firestore";
import { readJSON, requireFields, ValidationError } from "../validate";
import type { IncomingMessage } from "node:http";

export async function postWatchlist(uid: string, req: IncomingMessage) {
  const body = await readJSON(req);
  requireFields(body, ["titleId", "type"]);
  if (!["MOVIE", "SHOW"].includes(body.type)) throw new ValidationError("type must be MOVIE or SHOW");
  const db = userDb(uid);
  const inTracking = await db.getTracking(body.titleId);
  if (inTracking) throw new ValidationError("Title is being tracked — stop tracking before adding to watchlist");
  await db.insertWatchlist(body.titleId, body.type);
  return { ok: true };
}

export async function deleteWatchlist(uid: string, req: IncomingMessage) {
  const { titleId } = await readJSON(req);
  requireFields({ titleId }, ["titleId"]);
  await userDb(uid).deleteWatchlist(titleId);
  return { ok: true };
}
