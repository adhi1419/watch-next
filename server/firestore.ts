import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Initialize Firebase Admin (uses GOOGLE_APPLICATION_CREDENTIALS in prod, or local emulator)
const app = initializeApp();
const db = getFirestore(app);

// --- Query helpers scoped to a user ---

export function userDb(uid: string) {
  const trackingCol = db.collection(`users/${uid}/tracking`);
  const episodesCol = db.collection(`users/${uid}/episodes`);
  const watchlistCol = db.collection(`users/${uid}/watchlist`);

  return {
    // Tracking
    async allTracking() {
      const snap = await trackingCol.orderBy("startedAt", "desc").get();
      return snap.docs.map(d => ({ titleId: d.id, ...d.data() }));
    },
    async watchingTracking() {
      const snap = await trackingCol.where("status", "==", "watching").orderBy("startedAt", "desc").get();
      return snap.docs.map(d => ({ titleId: d.id, ...d.data() }));
    },
    async allTrackingAlpha() {
      const snap = await trackingCol.get();
      return snap.docs.map(d => ({ titleId: d.id, ...d.data() })).sort((a, b) => (a.titleId > b.titleId ? 1 : -1));
    },
    async getTracking(titleId: string) {
      const doc = await trackingCol.doc(titleId).get();
      return doc.exists ? { titleId: doc.id, ...doc.data() } : null;
    },
    async insertTracking(titleId: string, type: string) {
      await trackingCol.doc(titleId).set({ type, status: "watching", startedAt: new Date().toISOString() }, { merge: false });
    },
    async deleteTracking(titleId: string) {
      await trackingCol.doc(titleId).delete();
    },
    async setStatus(titleId: string, status: string) {
      await trackingCol.doc(titleId).update({ status });
    },

    // Episodes
    async episodesForTitle(titleId: string) {
      const snap = await episodesCol.where("titleId", "==", titleId).orderBy("season").orderBy("episode").get();
      return snap.docs.map(d => d.data() as { titleId: string; season: number; episode: number; watchedAt: string });
    },
    async episodeCountsForTitles(titleIds: string[]) {
      if (!titleIds.length) return [];
      // Firestore IN query max 30 items, batch if needed
      const results: { titleId: string; count: number }[] = [];
      for (let i = 0; i < titleIds.length; i += 30) {
        const batch = titleIds.slice(i, i + 30);
        const snap = await episodesCol.where("titleId", "in", batch).get();
        const counts = new Map<string, number>();
        snap.docs.forEach(d => {
          const tid = d.data().titleId;
          counts.set(tid, (counts.get(tid) ?? 0) + 1);
        });
        counts.forEach((count, titleId) => results.push({ titleId, count }));
      }
      return results;
    },
    async insertEpisode(titleId: string, season: number, episode: number) {
      const id = `${titleId}_s${season}_e${episode}`;
      await episodesCol.doc(id).set({ titleId, season, episode, watchedAt: new Date().toISOString() });
    },
    async deleteEpisode(titleId: string, season: number, episode: number) {
      const id = `${titleId}_s${season}_e${episode}`;
      await episodesCol.doc(id).delete();
    },
    async deleteAllEpisodes(titleId: string) {
      const snap = await episodesCol.where("titleId", "==", titleId).get();
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    },
    async episodeCountForTitle(titleId: string) {
      const snap = await episodesCol.where("titleId", "==", titleId).get();
      return snap.size;
    },

    // Watchlist
    async allWatchlist() {
      const snap = await watchlistCol.orderBy("addedAt", "desc").get();
      return snap.docs.map(d => ({ titleId: d.id, ...d.data() }));
    },
    async getWatchlist(titleId: string) {
      const doc = await watchlistCol.doc(titleId).get();
      return doc.exists ? { titleId: doc.id, ...doc.data() } : null;
    },
    async insertWatchlist(titleId: string, type: string) {
      await watchlistCol.doc(titleId).set({ type, addedAt: new Date().toISOString() });
    },
    async deleteWatchlist(titleId: string) {
      await watchlistCol.doc(titleId).delete();
    },
  };
}

export default db;
