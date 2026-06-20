import { Database } from "bun:sqlite";
import { createServer } from "node:http";

const db = new Database(process.env.DB_PATH || "/tmp/test-watched.db");
const port = parseInt(process.env.PORT || "5199");

db.run("CREATE TABLE IF NOT EXISTS tracking (title_id TEXT PRIMARY KEY, title TEXT, poster_url TEXT, total_season_count INT, object_type TEXT, total_episodes INT, status TEXT DEFAULT 'watching', started_at TEXT DEFAULT CURRENT_TIMESTAMP)");
db.run("CREATE TABLE IF NOT EXISTS episode_progress (title_id TEXT, season INT, episode INT, watched_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(title_id, season, episode))");
db.run("CREATE TABLE IF NOT EXISTS watchlist (title_id TEXT PRIMARY KEY, type TEXT CHECK(type IN ('MOVIE','SHOW')), title TEXT, poster_url TEXT, added_at TEXT DEFAULT CURRENT_TIMESTAMP)");

function deriveStatus(watchedEpisodes, totalEpisodes, storedStatus) {
  if (storedStatus === 'stopped') return 'stopped';
  if (watchedEpisodes >= totalEpisodes) return 'completed';
  return 'watching';
}

async function readBody(req) { let b = ""; for await (const c of req) b += c; return b; }

createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }

  const json = (s, d) => { res.writeHead(s, { "Content-Type": "application/json" }); res.end(JSON.stringify(d)); };
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;
  const method = req.method;

  if (path === "/api/tracking" && method === "GET") {
    const entries = db.query("SELECT title_id as titleId, title, poster_url as posterUrl, total_season_count as totalSeasonCount, object_type as objectType, total_episodes as totalEpisodes, status FROM tracking ORDER BY started_at DESC").all();
    for (const e of entries) {
      e.watchedEpisodes = db.query("SELECT title_id as titleId, season, episode, watched_at as watchedAt FROM episode_progress WHERE title_id = ?").all([e.titleId]);
      e.status = deriveStatus(e.watchedEpisodes.length, e.totalEpisodes, e.status);
    }
    return json(200, entries);
  }
  if (path === "/api/tracking" && method === "POST") {
    const { titleId, title, posterUrl, totalSeasonCount, objectType, totalEpisodes } = JSON.parse(await readBody(req));
    db.run("INSERT OR REPLACE INTO tracking (title_id, title, poster_url, total_season_count, object_type, total_episodes) VALUES (?,?,?,?,?,?)", [titleId, title, posterUrl, totalSeasonCount, objectType, totalEpisodes]);
    return json(200, { ok: true });
  }
  if (path === "/api/tracking" && method === "DELETE") {
    const { titleId } = JSON.parse(await readBody(req));
    db.run("DELETE FROM episode_progress WHERE title_id = ?", [titleId]);
    db.run("DELETE FROM tracking WHERE title_id = ?", [titleId]);
    return json(200, { ok: true });
  }

  const epMatch = path.match(/^\/api\/tracking\/([^/]+)\/episodes$/);
  if (epMatch) {
    const titleId = epMatch[1];
    if (method === "GET") return json(200, db.query("SELECT title_id as titleId, season, episode, watched_at as watchedAt FROM episode_progress WHERE title_id = ? ORDER BY season, episode").all([titleId]));
    if (method === "POST") {
      const body = JSON.parse(await readBody(req));
      const episodes = body.episodes ?? [{ season: body.season, episode: body.episode }];
      const stmt = db.prepare("INSERT OR IGNORE INTO episode_progress (title_id, season, episode) VALUES (?, ?, ?)");
      const tx = db.transaction(() => { for (const ep of episodes) stmt.run(titleId, ep.season, ep.episode); });
      tx();
      return json(200, { ok: true, count: episodes.length });
    }
    if (method === "DELETE") {
      const body = JSON.parse(await readBody(req));
      const episodes = body.episodes ?? [{ season: body.season, episode: body.episode }];
      const stmt = db.prepare("DELETE FROM episode_progress WHERE title_id = ? AND season = ? AND episode = ?");
      const tx = db.transaction(() => { for (const ep of episodes) stmt.run(titleId, ep.season, ep.episode); });
      tx();
      return json(200, { ok: true, count: episodes.length });
    }
  }

  // --- Stop/Resume ---
  const stopMatch = path.match(/^\/api\/tracking\/([^/]+)\/stop$/);
  if (stopMatch && method === "POST") {
    const titleId = stopMatch[1];
    const row = db.query("SELECT title_id FROM tracking WHERE title_id = ?").get([titleId]);
    if (!row) return json(404, { error: "not found" });
    db.run("UPDATE tracking SET status = 'stopped' WHERE title_id = ?", [titleId]);
    return json(200, { ok: true });
  }
  const resumeMatch = path.match(/^\/api\/tracking\/([^/]+)\/resume$/);
  if (resumeMatch && method === "POST") {
    const titleId = resumeMatch[1];
    const row = db.query("SELECT title_id FROM tracking WHERE title_id = ?").get([titleId]);
    if (!row) return json(404, { error: "not found" });
    db.run("UPDATE tracking SET status = 'watching' WHERE title_id = ?", [titleId]);
    return json(200, { ok: true });
  }

  // --- Discover ---
  if (path === "/api/discover" && method === "GET") {
    const entries = db.query("SELECT title_id as titleId, title, poster_url as posterUrl, total_season_count as totalSeasonCount, object_type as objectType, total_episodes as totalEpisodes, status, started_at as startedAt FROM tracking WHERE status = 'watching' ORDER BY started_at DESC").all();
    const currentlyWatching = [];
    for (const e of entries) {
      e.watchedEpisodes = db.query("SELECT title_id as titleId, season, episode, watched_at as watchedAt FROM episode_progress WHERE title_id = ?").all([e.titleId]);
      e.status = deriveStatus(e.watchedEpisodes.length, e.totalEpisodes, e.status);
      if (e.status === "watching") currentlyWatching.push(e);
    }
    return json(200, { currentlyWatching });
  }

  // --- History ---
  if (path === "/api/history" && method === "GET") {
    const entries = db.query("SELECT title_id as titleId, title, poster_url as posterUrl, total_season_count as totalSeasonCount, object_type as objectType, total_episodes as totalEpisodes, status FROM tracking ORDER BY title ASC").all();
    const history = [];
    for (const e of entries) {
      e.watchedEpisodes = db.query("SELECT title_id as titleId, season, episode, watched_at as watchedAt FROM episode_progress WHERE title_id = ?").all([e.titleId]);
      e.status = deriveStatus(e.watchedEpisodes.length, e.totalEpisodes, e.status);
      if (e.status === "completed" || e.status === "stopped") history.push(e);
    }
    return json(200, history);
  }

  // --- Watchlist ---
  if (path === "/api/watchlist" && method === "GET") {
    const type = url.searchParams.get("type");
    const q = type ? "SELECT title_id as titleId, type, title, poster_url as posterUrl, added_at as addedAt FROM watchlist WHERE type = ? ORDER BY added_at DESC" : "SELECT title_id as titleId, type, title, poster_url as posterUrl, added_at as addedAt FROM watchlist ORDER BY added_at DESC";
    return json(200, type ? db.query(q).all([type]) : db.query(q).all());
  }
  if (path === "/api/watchlist" && method === "POST") {
    const { titleId, type, title, posterUrl } = JSON.parse(await readBody(req));
    if (!['MOVIE', 'SHOW'].includes(type)) return json(400, { error: "type must be MOVIE or SHOW" });
    db.run("INSERT OR IGNORE INTO watchlist (title_id, type, title, poster_url) VALUES (?,?,?,?)", [titleId, type, title, posterUrl]);
    return json(200, { ok: true });
  }
  if (path === "/api/watchlist" && method === "DELETE") {
    const { titleId } = JSON.parse(await readBody(req));
    db.run("DELETE FROM watchlist WHERE title_id = ?", [titleId]);
    return json(200, { ok: true });
  }

  json(404, { error: "not found" });
}).listen(port, "127.0.0.1", () => console.log(`test server on :${port}`));
