import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ValidationError } from "./validate";
import * as tracking from "./routes/tracking";
import * as discover from "./routes/discover";
import * as watchlist from "./routes/watchlist";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");
const PORT = Number(process.env.PORT ?? 5173);
const isDev = process.env.NODE_ENV === "development";

const MIME: Record<string, string> = {
  ".html": "text/html", ".js": "application/javascript", ".css": "text/css",
  ".json": "application/json", ".webp": "image/webp", ".png": "image/png",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  const json = (status: number, data: any) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(data));
  };

  if (isDev) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.writeHead(204); return res.end(); }
  }

  const url = new URL(req.url!, `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method!;

  try {
    // --- Titles (catalog) ---
    if (path === "/api/titles" && method === "GET") {
      return json(200, await discover.searchTitlesEndpoint(url.searchParams));
    }
    const titleDetailMatch = path.match(/^\/api\/titles\/([^/]+)$/);
    if (titleDetailMatch && method === "GET") {
      const result = await discover.getTitleDetail(decodeURIComponent(titleDetailMatch[1]));
      if (!result) return json(404, { error: "Title not found in catalog" });
      return json(200, result);
    }

    // --- Discover & History & Watchlist (enriched reads) ---
    if (path === "/api/discover" && method === "GET") return json(200, await discover.getDiscover());
    if (path === "/api/history" && method === "GET") return json(200, await discover.getHistory());
    if (path === "/api/watchlist") {
      if (method === "GET") return json(200, await discover.getWatchlist());
      if (method === "POST") return json(200, await watchlist.postWatchlist(req));
      if (method === "DELETE") return json(200, await watchlist.deleteWatchlist(req));
    }

    // --- Tracking (user actions) ---
    if (path === "/api/tracking") {
      if (method === "POST") return json(200, await tracking.postTracking(req));
      if (method === "DELETE") return json(200, await tracking.deleteTracking(req));
    }
    const stopMatch = path.match(/^\/api\/tracking\/([^/]+)\/stop$/);
    if (stopMatch && method === "POST") return json(200, await tracking.stopTracking(decodeURIComponent(stopMatch[1])));
    const resumeMatch = path.match(/^\/api\/tracking\/([^/]+)\/resume$/);
    if (resumeMatch && method === "POST") return json(200, await tracking.resumeTracking(decodeURIComponent(resumeMatch[1])));

    // --- Episodes ---
    const epMatch = path.match(/^\/api\/tracking\/([^/]+)\/episodes$/);
    if (epMatch) {
      const titleId = decodeURIComponent(epMatch[1]);
      if (method === "POST") return json(200, await tracking.postEpisodes(titleId, req));
      if (method === "DELETE") return json(200, await tracking.deleteEpisodes(titleId, req));
    }

    // --- Static files (prod) ---
    if (!isDev) {
      const filePath = join(DIST, path === "/" ? "index.html" : path);
      try {
        const content = await readFile(filePath);
        res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
        return res.end(content);
      } catch {
        const index = await readFile(join(DIST, "index.html"));
        res.writeHead(200, { "Content-Type": "text/html" });
        return res.end(index);
      }
    }

    json(404, { error: "not found" });
  } catch (e) {
    if (e instanceof ValidationError) return json(400, { error: e.message });
    console.error("[server] error:", e);
    json(500, { error: "internal server error" });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Adhi's Watch Next [${isDev ? "dev" : "prod"}] → http://127.0.0.1:${PORT}`);
});
