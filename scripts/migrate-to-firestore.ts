/**
 * Migration script: SQLite → Firestore
 * Usage: UID=<your-firebase-uid> bun scripts/migrate-to-firestore.ts
 */
import { Database } from "bun:sqlite";
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const uid = process.env.FIREBASE_UID;
if (!uid) { console.error("Set FIREBASE_UID env var to your Firebase user ID"); process.exit(1); }

const app = initializeApp({ credential: applicationDefault(), projectId: "watch-next-500021" });
const db = getFirestore(app, "watch-next-user-data");

const sqlite = new Database("watched.db");

async function migrate() {
  console.log(`Migrating to Firestore under users/${uid}/...`);

  // Tracking
  const tracking = sqlite.query("SELECT title_id, type, status, started_at FROM tracking").all() as any[];
  console.log(`Tracking: ${tracking.length} entries`);
  for (const row of tracking) {
    await db.doc(`users/${uid}/tracking/${row.title_id}`).set({
      type: row.type,
      status: row.status,
      startedAt: row.started_at,
    });
  }

  // Episodes (batch in groups of 500)
  const episodes = sqlite.query("SELECT title_id, season, episode, watched_at FROM episode_progress").all() as any[];
  console.log(`Episodes: ${episodes.length} entries`);
  const BATCH_SIZE = 500;
  for (let i = 0; i < episodes.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = episodes.slice(i, i + BATCH_SIZE);
    for (const ep of chunk) {
      const id = `${ep.title_id}_s${ep.season}_e${ep.episode}`;
      batch.set(db.doc(`users/${uid}/episodes/${id}`), {
        titleId: ep.title_id,
        season: ep.season,
        episode: ep.episode,
        watchedAt: ep.watched_at,
      });
    }
    await batch.commit();
    console.log(`  Episodes batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(episodes.length / BATCH_SIZE)} committed`);
  }

  // Watchlist
  const watchlist = sqlite.query("SELECT title_id, type, added_at FROM watchlist").all() as any[];
  console.log(`Watchlist: ${watchlist.length} entries`);
  for (const row of watchlist) {
    await db.doc(`users/${uid}/watchlist/${row.title_id}`).set({
      type: row.type,
      addedAt: row.added_at,
    });
  }

  console.log("✅ Migration complete!");
}

migrate().catch(e => { console.error("Migration failed:", e); process.exit(1); });
