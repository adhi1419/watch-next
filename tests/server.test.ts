import { test, expect, beforeAll, afterAll, beforeEach } from "bun:test";
import { Database } from "bun:sqlite";
import { unlinkSync, existsSync } from "node:fs";

const TEST_DB = "/tmp/test-watched.db";
const PORT = 5299;
const BASE = `http://127.0.0.1:${PORT}`;
let proc: ReturnType<typeof Bun.spawn>;

function post(path: string, body: any) {
  return fetch(`${BASE}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
function del(path: string, body: any) {
  return fetch(`${BASE}${path}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
function get(path: string) { return fetch(`${BASE}${path}`); }

beforeAll(async () => {
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
  proc = Bun.spawn(["bun", "run", `${import.meta.dir}/test-server.mjs`], {
    env: { ...process.env, DB_PATH: TEST_DB, PORT: String(PORT) },
    stdout: "pipe", stderr: "pipe",
  });
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`${BASE}/api/tracking`); if (r.ok) break; } catch { await Bun.sleep(100); }
  }
});

afterAll(() => {
  proc?.kill();
  if (existsSync(TEST_DB)) unlinkSync(TEST_DB);
});

beforeEach(() => {
  const db = new Database(TEST_DB);
  db.run("DELETE FROM episode_progress");
  db.run("DELETE FROM tracking");
  db.close();
});

test("POST /api/tracking starts tracking with metadata", async () => {
  await post("/api/tracking", { titleId: "ts1", title: "Breaking Bad", posterUrl: "http://img.jpg", totalSeasonCount: 5, objectType: "SHOW", totalEpisodes: 62 });
  const entries = await (await get("/api/tracking")).json();
  expect(entries).toHaveLength(1);
  expect(entries[0].titleId).toBe("ts1");
  expect(entries[0].title).toBe("Breaking Bad");
  expect(entries[0].totalEpisodes).toBe(62);
});

test("DELETE /api/tracking deletes tracking entry AND all episode_progress", async () => {
  await post("/api/tracking", { titleId: "ts2", title: "X", posterUrl: "", totalSeasonCount: 1, objectType: "SHOW", totalEpisodes: 10 });
  await post("/api/tracking/ts2/episodes", { season: 1, episode: 1 });
  await del("/api/tracking", { titleId: "ts2" });
  const entries = await (await get("/api/tracking")).json();
  expect(entries).toHaveLength(0);
  const db = new Database(TEST_DB);
  expect(db.query("SELECT * FROM episode_progress WHERE title_id = ?").all(["ts2"])).toHaveLength(0);
  db.close();
});

test("POST /api/tracking/:id/episodes with single episode inserts one row", async () => {
  await post("/api/tracking", { titleId: "ts3", title: "Y", posterUrl: "", totalSeasonCount: 1, objectType: "SHOW", totalEpisodes: 5 });
  const res = await post("/api/tracking/ts3/episodes", { season: 1, episode: 3 });
  expect((await res.json()).count).toBe(1);
  const eps = await (await get("/api/tracking/ts3/episodes")).json();
  expect(eps).toHaveLength(1);
  expect(eps[0].season).toBe(1);
  expect(eps[0].episode).toBe(3);
});

test("POST /api/tracking/:id/episodes with episodes array inserts all in transaction", async () => {
  await post("/api/tracking", { titleId: "ts4", title: "Z", posterUrl: "", totalSeasonCount: 1, objectType: "SHOW", totalEpisodes: 10 });
  const res = await post("/api/tracking/ts4/episodes", { episodes: [{ season: 1, episode: 1 }, { season: 1, episode: 2 }, { season: 1, episode: 3 }] });
  expect((await res.json()).count).toBe(3);
  const eps = await (await get("/api/tracking/ts4/episodes")).json();
  expect(eps).toHaveLength(3);
});

test("DELETE /api/tracking/:id/episodes with single episode deletes one row", async () => {
  await post("/api/tracking", { titleId: "ts5", title: "A", posterUrl: "", totalSeasonCount: 1, objectType: "SHOW", totalEpisodes: 5 });
  await post("/api/tracking/ts5/episodes", { episodes: [{ season: 1, episode: 1 }, { season: 1, episode: 2 }] });
  await del("/api/tracking/ts5/episodes", { season: 1, episode: 1 });
  const eps = await (await get("/api/tracking/ts5/episodes")).json();
  expect(eps).toHaveLength(1);
  expect(eps[0].episode).toBe(2);
});

test("DELETE /api/tracking/:id/episodes with episodes array deletes all", async () => {
  await post("/api/tracking", { titleId: "ts6", title: "B", posterUrl: "", totalSeasonCount: 1, objectType: "SHOW", totalEpisodes: 5 });
  await post("/api/tracking/ts6/episodes", { episodes: [{ season: 1, episode: 1 }, { season: 1, episode: 2 }, { season: 1, episode: 3 }] });
  await del("/api/tracking/ts6/episodes", { episodes: [{ season: 1, episode: 1 }, { season: 1, episode: 3 }] });
  const eps = await (await get("/api/tracking/ts6/episodes")).json();
  expect(eps).toHaveLength(1);
  expect(eps[0].episode).toBe(2);
});

test("GET /api/tracking returns status=completed when watched >= total", async () => {
  await post("/api/tracking", { titleId: "ts7", title: "Short", posterUrl: "", totalSeasonCount: 1, objectType: "SHOW", totalEpisodes: 2 });
  await post("/api/tracking/ts7/episodes", { episodes: [{ season: 1, episode: 1 }, { season: 1, episode: 2 }] });
  const entries = await (await get("/api/tracking")).json();
  expect(entries[0].status).toBe("completed");
});

test("GET /api/tracking returns status=watching when watched < total", async () => {
  await post("/api/tracking", { titleId: "ts8", title: "Long", posterUrl: "", totalSeasonCount: 1, objectType: "SHOW", totalEpisodes: 10 });
  await post("/api/tracking/ts8/episodes", { season: 1, episode: 1 });
  const entries = await (await get("/api/tracking")).json();
  expect(entries[0].status).toBe("watching");
});

test("POST /api/tracking with duplicate titleId replaces existing entry", async () => {
  await post("/api/tracking", { titleId: "ts9", title: "Old", posterUrl: "old.jpg", totalSeasonCount: 1, objectType: "SHOW", totalEpisodes: 5 });
  await post("/api/tracking", { titleId: "ts9", title: "New", posterUrl: "new.jpg", totalSeasonCount: 2, objectType: "SHOW", totalEpisodes: 20 });
  const entries = await (await get("/api/tracking")).json();
  expect(entries).toHaveLength(1);
  expect(entries[0].title).toBe("New");
  expect(entries[0].totalEpisodes).toBe(20);
});
