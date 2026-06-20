import { Database } from "bun:sqlite";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, "..", "watched.db");

const db = new Database(DB_PATH);

// Migration: v1 had catalog data in tables, v2 is IDs-only
const CURRENT_VERSION = 2;

function migrate() {
  const { user_version: version } = db.query("PRAGMA user_version").get() as any;

  if (version < 2) {
    // Recreate tables with lean schema (drop catalog columns)
    db.run("DROP TABLE IF EXISTS tracking_new");
    db.run(`CREATE TABLE tracking_new (
      title_id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('MOVIE','SHOW')),
      status TEXT NOT NULL DEFAULT 'watching' CHECK(status IN ('watching','stopped')),
      started_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    // Migrate existing data
    try {
      db.run(`INSERT OR IGNORE INTO tracking_new (title_id, type, status, started_at)
        SELECT title_id, COALESCE(object_type, 'SHOW'), COALESCE(status, 'watching'), COALESCE(started_at, datetime('now'))
        FROM tracking`);
    } catch {}
    db.run("DROP TABLE IF EXISTS tracking");
    db.run("ALTER TABLE tracking_new RENAME TO tracking");

    // episode_progress stays the same
    db.run(`CREATE TABLE IF NOT EXISTS episode_progress (
      title_id TEXT NOT NULL,
      season INT NOT NULL,
      episode INT NOT NULL,
      watched_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY(title_id, season, episode)
    )`);

    // Watchlist: drop catalog columns
    db.run("DROP TABLE IF EXISTS watchlist_new");
    db.run(`CREATE TABLE watchlist_new (
      title_id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('MOVIE','SHOW')),
      added_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`);
    try {
      db.run(`INSERT OR IGNORE INTO watchlist_new (title_id, type, added_at)
        SELECT title_id, type, COALESCE(added_at, datetime('now')) FROM watchlist`);
    } catch {}
    db.run("DROP TABLE IF EXISTS watchlist");
    db.run("ALTER TABLE watchlist_new RENAME TO watchlist");

    db.run(`PRAGMA user_version = ${CURRENT_VERSION}`);
  }
}

migrate();

export const queries = {
  // Tracking
  allTracking: db.query("SELECT title_id as titleId, type, status, started_at as startedAt FROM tracking ORDER BY started_at DESC"),
  watchingTracking: db.query("SELECT title_id as titleId, type, status, started_at as startedAt FROM tracking WHERE status = 'watching' ORDER BY started_at DESC"),
  allTrackingAlpha: db.query("SELECT title_id as titleId, type, status FROM tracking ORDER BY title_id ASC"),
  getTracking: db.query("SELECT title_id as titleId FROM tracking WHERE title_id = ?"),
  getTrackingFull: db.query("SELECT title_id as titleId, type, status, started_at as startedAt FROM tracking WHERE title_id = ?"),
  insertTracking: db.query("INSERT OR IGNORE INTO tracking (title_id, type) VALUES (?, ?)"),
  deleteTracking: db.query("DELETE FROM tracking WHERE title_id = ?"),
  setStatus: db.query("UPDATE tracking SET status = ? WHERE title_id = ?"),

  // Episodes
  episodesForTitle: db.query("SELECT season, episode, watched_at as watchedAt FROM episode_progress WHERE title_id = ? ORDER BY season, episode"),
  insertEpisode: db.query("INSERT OR IGNORE INTO episode_progress (title_id, season, episode) VALUES (?, ?, ?)"),
  deleteEpisode: db.query("DELETE FROM episode_progress WHERE title_id = ? AND season = ? AND episode = ?"),
  deleteAllEpisodes: db.query("DELETE FROM episode_progress WHERE title_id = ?"),

  // Batch episode counts
  episodeCountsForTitles: (ids: string[]) => {
    if (!ids.length) return [];
    const placeholders = ids.map(() => "?").join(",");
    return db.query(
      `SELECT title_id as titleId, COUNT(*) as count FROM episode_progress WHERE title_id IN (${placeholders}) GROUP BY title_id`
    ).all(...ids) as { titleId: string; count: number }[];
  },

  // Watchlist
  allWatchlist: db.query("SELECT title_id as titleId, type, added_at as addedAt FROM watchlist ORDER BY added_at DESC"),
  getWatchlist: db.query("SELECT title_id as titleId FROM watchlist WHERE title_id = ?"),
  insertWatchlist: db.query("INSERT OR IGNORE INTO watchlist (title_id, type) VALUES (?, ?)"),
  deleteWatchlist: db.query("DELETE FROM watchlist WHERE title_id = ?"),

  // All tracked + watchlist IDs (for enrichment lookups)
  allUserTitleIds: () => {
    const tracking = db.query("SELECT title_id FROM tracking").all() as { title_id: string }[];
    const watchlist = db.query("SELECT title_id FROM watchlist").all() as { title_id: string }[];
    return [...new Set([...tracking.map(r => r.title_id), ...watchlist.map(r => r.title_id)])];
  },
};

export const transaction = db.transaction.bind(db);
export default db;
