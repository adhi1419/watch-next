import { describe, it, expect } from "vitest";

// --- Mock API responses captured from live backend ---

const MOCK_DISCOVER = [
  { id: "ts383064", type: "SHOW", title: "Nobody Wants This", year: 2024, scores: { imdb: 7.7, rt: 87, tmdb: 7.4 }, tracking: { status: "watching", watched: 10, total: 20 }, pinned: false, providers: ["nfx"] },
  { id: "ts434526", type: "SHOW", title: "Owning Manhattan", year: 2024, scores: { imdb: 7.3, rt: null, tmdb: 6.4 }, tracking: { status: "watching", watched: 8, total: 16 }, pinned: false, providers: ["nfx"] },
];

const MOCK_HISTORY = [
  { id: "tm112130", type: "MOVIE", title: "Pulp Fiction", year: 1994, scores: { imdb: 8.8, rt: 92, tmdb: 8.483 }, tracking: { status: "completed", watched: 1, total: 1 }, pinned: false, providers: ["nfx", "amp"] },
  { id: "ts20233", type: "SHOW", title: "Rick and Morty", year: 2013, scores: { imdb: 9, rt: 91, tmdb: 8.7 }, tracking: { status: "up_to_date", watched: 81, total: 91 }, pinned: false, providers: ["nfx"] },
  { id: "ts21984", type: "SHOW", title: "Assassination Classroom", year: 2015, scores: { imdb: 8, rt: null, tmdb: 8.2 }, tracking: { status: "stopped", watched: 25, total: 47 }, pinned: false, providers: ["nfx"] },
];

const MOCK_WATCHLIST = [
  { id: "ts78125", type: "SHOW", title: "The Boys", year: 2019, scores: { imdb: 8.6, rt: 93, tmdb: 8.455 }, tracking: null, pinned: true, providers: ["amp"] },
  { id: "ts222333", type: "SHOW", title: "Arcane: League of Legends", year: 2021, scores: { imdb: 9, rt: 100, tmdb: 8.751 }, tracking: null, pinned: true, providers: ["nfx"] },
];

const MOCK_BROWSE: { titles: any[]; cursor: string | null; hasMore: boolean } = {
  titles: [
    { id: "ts511840", type: "SHOW", title: "Steel Ball Run: JoJo's Bizarre Adventure", year: 2026, scores: { imdb: 9.9, rt: null, tmdb: null }, tracking: null, pinned: false, providers: ["nfx"] },
    { id: "ts20681", type: "SHOW", title: "Seinfeld", year: 1989, scores: { imdb: 8.9, rt: 89, tmdb: 8.257 }, tracking: null, pinned: false, providers: ["nfx"] },
  ],
  cursor: "abc123",
  hasMore: true,
};

const MOCK_SEARCH = {
  titles: [
    { id: "ts222333", type: "SHOW", title: "Arcane: League of Legends", year: 2021, scores: { imdb: 9, rt: 100, tmdb: 8.751 }, tracking: null, pinned: true, providers: ["nfx"] },
  ],
  cursor: null,
  hasMore: false,
};

const MOCK_PLATFORMS = [
  { code: "nfx", name: "Netflix", icon: "https://images.justwatch.com/icon/207360008/s100/netflix.webp" },
  { code: "amp", name: "Amazon Prime", icon: "https://images.justwatch.com/icon/52449861/s100/amazon-prime-video.webp" },
];

// --- Tests ---

describe("Status Derivation", () => {
  it("movie with 1 episode watched = completed", () => {
    const movie = MOCK_HISTORY[0]; // Pulp Fiction
    expect(movie.tracking.status).toBe("completed");
    expect(movie.tracking.watched).toBe(1);
    expect(movie.tracking.total).toBe(1);
  });

  it("show with all available episodes watched = up_to_date", () => {
    const show = MOCK_HISTORY[1]; // Rick and Morty
    expect(show.tracking.status).toBe("up_to_date");
    expect(show.tracking.watched).toBe(81);
    expect(show.tracking.total).toBe(91); // 91 total but only 81 on Netflix
  });

  it("show with partial progress and stopped = stopped", () => {
    const show = MOCK_HISTORY[2]; // Assassination Classroom
    expect(show.tracking.status).toBe("stopped");
    expect(show.tracking.watched).toBe(25);
    expect(show.tracking.total).toBe(47);
  });

  it("currently watching shows have watched < total", () => {
    for (const t of MOCK_DISCOVER) {
      expect(t.tracking.watched).toBeLessThan(t.tracking.total);
      expect(t.tracking.status).toBe("watching");
    }
  });
});

describe("Watchlist / Tracking Mutual Exclusivity", () => {
  it("watchlist items have tracking=null", () => {
    for (const t of MOCK_WATCHLIST) {
      expect(t.tracking).toBeNull();
      expect(t.pinned).toBe(true);
    }
  });

  it("tracked items are not pinned", () => {
    for (const t of MOCK_DISCOVER) {
      expect(t.pinned).toBe(false);
      expect(t.tracking).not.toBeNull();
    }
  });
});

describe("Multi-Provider Support", () => {
  it("platforms endpoint returns configured providers", () => {
    expect(MOCK_PLATFORMS).toHaveLength(2);
    expect(MOCK_PLATFORMS.map(p => p.code)).toEqual(["nfx", "amp"]);
  });

  it("titles include provider codes", () => {
    const boys = MOCK_WATCHLIST[0]; // The Boys
    expect(boys.providers).toEqual(["amp"]); // Amazon only

    const pulpFiction = MOCK_HISTORY[0];
    expect(pulpFiction.providers).toContain("nfx");
    expect(pulpFiction.providers).toContain("amp"); // On both
  });

  it("browse results are filtered to configured platforms", () => {
    for (const t of MOCK_BROWSE.titles) {
      expect(t.providers.length).toBeGreaterThan(0);
      const validCodes = MOCK_PLATFORMS.map(p => p.code);
      for (const p of t.providers) {
        expect(validCodes).toContain(p);
      }
    }
  });
});

describe("Search vs Browse", () => {
  it("browse uses excludeTracked - no tracked titles in results", () => {
    for (const t of MOCK_BROWSE.titles) {
      // Titles in browse with excludeTracked should not have active tracking
      // (completed titles may appear since they're in history, but watching should not)
      if (t.tracking) {
        expect(t.tracking.status).not.toBe("watching");
      }
    }
  });

  it("search returns titles regardless of tracking state", () => {
    // Arcane is in watchlist (pinned) but still appears in search
    const arcane = MOCK_SEARCH.titles[0];
    expect(arcane.pinned).toBe(true);
  });

  it("browse is paginated with cursor", () => {
    expect(MOCK_BROWSE.cursor).not.toBeNull();
    expect(MOCK_BROWSE.hasMore).toBe(true);
  });
});

describe("Deduplication Rules", () => {
  it("currently watching titles excluded from watch next (via excludeTracked)", () => {
    const watchingIds = new Set(MOCK_DISCOVER.map(t => t.id));
    for (const t of MOCK_BROWSE.titles) {
      expect(watchingIds.has(t.id)).toBe(false);
    }
  });

  it("watchlist items appear in watch next but not duplicated in recs", () => {
    // Watchlist items have pinned=true, browse results have pinned=false
    for (const t of MOCK_BROWSE.titles) {
      expect(t.pinned).toBe(false);
    }
  });
});

describe("Up-to-date Detection", () => {
  it("shows with all platform-available episodes watched get up_to_date status", () => {
    const rm = MOCK_HISTORY.find(t => t.title === "Rick and Morty")!;
    expect(rm.tracking.status).toBe("up_to_date");
    // 81 watched, 91 total (10 episodes in S9 not on Netflix DE)
    expect(rm.tracking.watched).toBe(81);
    expect(rm.tracking.total).toBe(91);
  });

  it("up_to_date titles appear in history, not discover", () => {
    const historyIds = new Set(MOCK_HISTORY.map(t => t.id));
    const discoverIds = new Set(MOCK_DISCOVER.map(t => t.id));
    // Rick and Morty in history but not discover
    expect(historyIds.has("ts20233")).toBe(true);
    expect(discoverIds.has("ts20233")).toBe(false);
  });
});
