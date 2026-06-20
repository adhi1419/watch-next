import { useState, useEffect } from "react";
import { TrackingProvider } from "./context/TrackingContext";
import DiscoverView from "./DiscoverView";
import HistoryView from "./HistoryView";
import { GENRE_MAP } from "./components/constants";
import type { View } from "./types";
import "./App.css";

type SortKey = "IMDB_SCORE" | "POPULAR";
type FilterType = "MOVIE" | "SHOW";

export default function App() {
  const [view, setView] = useState<View>("discover");
  const [sortBy, setSortBy] = useState<SortKey>("IMDB_SCORE");
  const [filterType, setFilterType] = useState<FilterType>("SHOW");
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [activeGenres, setActiveGenres] = useState<string[]>([]);
  const [activeActor, setActiveActor] = useState<string | null>(null);

  const handleGenreClick = (genre: string) => setActiveGenres(prev => prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]);

  useEffect(() => {
    if (!showFilters) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.topbar-search')) setShowFilters(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showFilters]);

  return (
    <TrackingProvider>
      <div className="app">
        <nav className="topbar">
          <h1 className="topbar-title">Adhi's Watch Next</h1>
          <div className="topbar-search">
            <input type="text" placeholder="Search..." value={activeActor || search} onChange={(e) => { setActiveActor(null); setSearch(e.target.value); }} />
            <button className="filter-btn-inline" onClick={() => setShowFilters(!showFilters)} title="Filters">
              <svg width='16' height='16' viewBox='0 0 16 16' fill='currentColor'><rect x='2' y='3' width='12' height='1.5' rx='0.75'/><rect x='4' y='7.25' width='8' height='1.5' rx='0.75'/><rect x='6' y='11.5' width='4' height='1.5' rx='0.75'/></svg>
            </button>
            {showFilters && (
              <div className="filter-dropdown">
                <label>Sort</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)}>
                  <option value="IMDB_SCORE">IMDb Rating</option>
                  <option value="POPULAR">Popularity</option>
                </select>
                <label>Genre</label>
                <div className="filter-genres">
                  {Object.entries(GENRE_MAP).map(([code, name]) => (
                    <button key={code} className={`genre-chip ${activeGenres.includes(code) ? "active" : ""}`} onClick={() => handleGenreClick(code)}>{name}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="pill-toggle">
            <div className="pill-slider" data-active={filterType === "MOVIE" ? "right" : "left"} />
            <button className={filterType === "SHOW" ? "active" : ""} onClick={() => setFilterType("SHOW")}>TV Shows</button>
            <button className={filterType === "MOVIE" ? "active" : ""} onClick={() => setFilterType("MOVIE")}>Movies</button>
          </div>
        </nav>

        <div className="view-tabs">
          <div className="pill-toggle">
            <div className="pill-slider" data-active={view === "history" ? "right" : "left"} />
            <button className={view === "discover" ? "active" : ""} onClick={() => setView("discover")}>Discover</button>
            <button className={view === "history" ? "active" : ""} onClick={() => setView("history")}>History</button>
          </div>
        </div>

        <main className="main-scroll">
          {view === "discover" && (
            <DiscoverView
              search={search}
              setSearch={setSearch}
              sortBy={sortBy}
              activeGenres={activeGenres}
              setActiveGenres={setActiveGenres}
              activeActor={activeActor}
              setActiveActor={setActiveActor}
              filterType={filterType}
            />
          )}
          {view === "history" && <HistoryView filterType={filterType} />}
        </main>
      </div>
    </TrackingProvider>
  );
}
