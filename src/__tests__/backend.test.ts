import { describe, it, expect } from "vitest";

const BASE = "http://127.0.0.1:5174";
const json = (method: string, path: string, body?: any) =>
  fetch(`${BASE}${path}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined }).then(async r => ({ status: r.status, data: await r.json() }));

// These tests run against the live dev server (PORT=5174)
// Start with: PORT=5174 NODE_ENV=development bun server/index.ts

describe("Backend API Integration", () => {
  const TEST_ID = "ts_test_" + Date.now();

  describe("Tracking lifecycle", () => {
    it("POST /api/tracking creates a tracking entry", async () => {
      const { status, data } = await json("POST", "/api/tracking", { titleId: TEST_ID, type: "SHOW" });
      expect(status).toBe(200);
      expect(data.ok).toBe(true);
    });

    it("POST /api/tracking rejects if title is in watchlist", async () => {
      const wlId = "ts_wl_" + Date.now();
      await json("POST", "/api/watchlist", { titleId: wlId, type: "SHOW" });
      const { status, data } = await json("POST", "/api/tracking", { titleId: wlId, type: "SHOW" });
      expect(status).toBe(400);
      expect(data.error).toContain("watchlist");
      // cleanup
      await json("DELETE", "/api/watchlist", { titleId: wlId });
    });

    it("POST /api/tracking/:id/stop sets stopped status", async () => {
      const { status } = await json("POST", `/api/tracking/${TEST_ID}/stop`);
      expect(status).toBe(200);
    });

    it("POST /api/tracking/:id/resume sets watching status", async () => {
      const { status } = await json("POST", `/api/tracking/${TEST_ID}/resume`);
      expect(status).toBe(200);
    });

    it("DELETE /api/tracking removes entry", async () => {
      const { status } = await json("DELETE", "/api/tracking", { titleId: TEST_ID });
      expect(status).toBe(200);
    });
  });

  describe("Episode marking + auto-track", () => {
    const EP_ID = "ts_ep_" + Date.now();

    it("POST episodes with type auto-creates tracking", async () => {
      const { status, data } = await json("POST", `/api/tracking/${EP_ID}/episodes`, { episodes: [{ season: 1, episode: 1 }], type: "SHOW" });
      expect(status).toBe(200);
      expect(data.count).toBe(1);
    });

    it("title is now tracked", async () => {
      // Verify by trying to add to watchlist (should fail)
      const { status } = await json("POST", "/api/watchlist", { titleId: EP_ID, type: "SHOW" });
      expect(status).toBe(400);
    });

    it("DELETE last episode auto-untracks", async () => {
      const { status } = await json("DELETE", `/api/tracking/${EP_ID}/episodes`, { episodes: [{ season: 1, episode: 1 }] });
      expect(status).toBe(200);
      // Now should be able to add to watchlist (not tracked anymore)
      const wl = await json("POST", "/api/watchlist", { titleId: EP_ID, type: "SHOW" });
      expect(wl.status).toBe(200);
      // cleanup
      await json("DELETE", "/api/watchlist", { titleId: EP_ID });
    });
  });

  describe("Watchlist → tracking atomic transition", () => {
    const ATOM_ID = "ts_atom_" + Date.now();

    it("add to watchlist", async () => {
      const { status } = await json("POST", "/api/watchlist", { titleId: ATOM_ID, type: "SHOW" });
      expect(status).toBe(200);
    });

    it("marking episode atomically removes from watchlist + creates tracking", async () => {
      const { status } = await json("POST", `/api/tracking/${ATOM_ID}/episodes`, { episodes: [{ season: 1, episode: 1 }], type: "SHOW" });
      expect(status).toBe(200);
      // Should now be tracked, not in watchlist
      const wl = await json("POST", "/api/watchlist", { titleId: ATOM_ID, type: "SHOW" });
      expect(wl.status).toBe(400); // already tracked
    });

    it("cleanup", async () => {
      await json("DELETE", `/api/tracking/${ATOM_ID}/episodes`, { episodes: [{ season: 1, episode: 1 }] });
    });
  });

  describe("Validation", () => {
    it("POST /api/tracking without type returns 400", async () => {
      const { status, data } = await json("POST", "/api/tracking", { titleId: "ts_x" });
      expect(status).toBe(400);
      expect(data.error).toContain("type");
    });

    it("POST /api/watchlist with invalid type returns 400", async () => {
      const { status } = await json("POST", "/api/watchlist", { titleId: "ts_x", type: "ANIME" });
      expect(status).toBe(400);
    });

    it("POST /api/tracking/:id/stop on non-existent title returns 400", async () => {
      const { status } = await json("POST", "/api/tracking/ts_nonexistent_999/stop");
      expect(status).toBe(400);
    });

    it("POST /api/tracking/:id/episodes without type on untracked returns 400", async () => {
      const { status, data } = await json("POST", "/api/tracking/ts_notype_999/episodes", { episodes: [{ season: 1, episode: 1 }] });
      expect(status).toBe(400);
      expect(data.error).toContain("type");
    });
  });

  describe("Platforms", () => {
    it("GET /api/platforms returns configured platforms", async () => {
      const { status, data } = await json("GET", "/api/platforms");
      expect(status).toBe(200);
      expect(data.length).toBeGreaterThanOrEqual(2);
      expect(data[0]).toHaveProperty("code");
      expect(data[0]).toHaveProperty("name");
      expect(data[0]).toHaveProperty("icon");
    });
  });
});
