import { useState, useEffect } from "react";
import { TrackingProvider } from "./context/TrackingContext";
import DiscoverView from "./DiscoverView";
import HistoryView from "./HistoryView";
import { GENRE_MAP } from "./components/constants";
import type { View } from "./types";

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
      <div className="flex flex-col h-screen">
        {/* Top Bar */}
        <nav className="sticky top-0 z-100 flex items-center justify-between px-6 h-[var(--spacing-topbar)] bg-[rgba(30,30,30,0.7)] backdrop-blur-[16px] border-b border-white/8 w-full">
          <h1 className="text-lg whitespace-nowrap shrink-0">Adhi's Watch Next</h1>
          <div className="topbar-search flex-1 max-w-[500px] flex items-center relative">
            <input
              type="text"
              placeholder="Search..."
              value={activeActor || search}
              onChange={(e) => { setActiveActor(null); setSearch(e.target.value); }}
              className="flex-1 py-2 pl-5 pr-10 rounded-full border border-white/10 bg-white/5 backdrop-blur-[12px] text-[var(--color-text)] text-sm"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-[var(--color-muted)] cursor-pointer p-1 flex items-center rounded-full hover:text-[var(--color-text)] transition-colors" onClick={() => setShowFilters(!showFilters)} title="Filters">
              <svg width='16' height='16' viewBox='0 0 16 16' fill='currentColor'><rect x='2' y='3' width='12' height='1.5' rx='0.75'/><rect x='4' y='7.25' width='8' height='1.5' rx='0.75'/><rect x='6' y='11.5' width='4' height='1.5' rx='0.75'/></svg>
            </button>
            {showFilters && (
              <div className="absolute top-[calc(100%+8px)] right-0 bg-[rgba(30,30,30,0.85)] backdrop-blur-[16px] border border-white/10 rounded-xl p-3 flex flex-col gap-2 z-200 min-w-40">
                <label className="text-xs uppercase text-[var(--color-muted)]">Sort</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="px-2 py-1.5 rounded-lg border border-[#333] bg-[var(--color-bg)] text-[var(--color-text)] text-sm">
                  <option value="IMDB_SCORE">IMDb Rating</option>
                  <option value="POPULAR">Popularity</option>
                </select>
                <label className="text-xs uppercase text-[var(--color-muted)]">Genre</label>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(GENRE_MAP).map(([code, name]) => (
                    <button key={code} className={`px-2 py-0.5 rounded-full text-xs border cursor-pointer transition-all ${activeGenres.includes(code) ? "bg-[rgba(229,9,20,0.2)] border-[var(--color-accent)] text-[var(--color-accent)]" : "bg-[#2a2a2a] text-[var(--color-muted)] border-transparent hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"}`} onClick={() => handleGenreClick(code)}>{name}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {/* Pill Toggle - TV/Movie */}
          <div className="relative inline-flex bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-full p-[3px] shrink-0">
            <div className={`absolute inset-[3px] rounded-full bg-[var(--color-accent)] transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] w-[calc(50%-3px)] ${filterType === "MOVIE" ? "left-auto right-[3px]" : ""}`} />
            <button className={`relative z-1 px-4 py-1.5 border-none bg-transparent text-sm font-medium cursor-pointer rounded-full transition-colors flex-1 text-center leading-tight ${filterType === "SHOW" ? "text-white" : "text-[var(--color-muted)]"}`} onClick={() => setFilterType("SHOW")}>TV Shows</button>
            <button className={`relative z-1 px-4 py-1.5 border-none bg-transparent text-sm font-medium cursor-pointer rounded-full transition-colors flex-1 text-center leading-tight ${filterType === "MOVIE" ? "text-white" : "text-[var(--color-muted)]"}`} onClick={() => setFilterType("MOVIE")}>Movies</button>
          </div>
        </nav>

        {/* Main Content */}
        <main className="main-scroll flex-1 overflow-y-auto pb-6">
          {/* View Tabs - floating over content */}
          <div className="sticky top-0 z-50 flex justify-center py-2 px-4 -mb-[44px] pointer-events-none">
            <div className="relative inline-flex pointer-events-auto backdrop-blur-[24px] backdrop-saturate-[1.8] bg-white/[0.07] border-2 border-white/25 rounded-full p-[3px] shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
              <div className={`absolute top-[3px] bottom-[3px] w-[calc(50%-3px)] bg-[var(--color-accent)] rounded-full transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] ${view === "history" ? "translate-x-[calc(100%+2px)]" : "translate-x-[2px]"}`} />
              <button className={`relative z-1 px-6 py-1.5 border-none bg-transparent text-[0.9rem] font-bold cursor-pointer rounded-full transition-colors ${view === "discover" ? "text-white" : "text-white/60"}`} onClick={() => setView("discover")}>Discover</button>
              <button className={`relative z-1 px-6 py-1.5 border-none bg-transparent text-[0.9rem] font-bold cursor-pointer rounded-full transition-colors ${view === "history" ? "text-white" : "text-white/60"}`} onClick={() => setView("history")}>History</button>
            </div>
          </div>

          {view === "discover" && (
            <DiscoverView search={search} setSearch={setSearch} sortBy={sortBy} activeGenres={activeGenres} setActiveGenres={setActiveGenres} activeActor={activeActor} setActiveActor={setActiveActor} filterType={filterType} />
          )}
          {view === "history" && <HistoryView filterType={filterType} />}
        </main>
      </div>
    </TrackingProvider>
  );
}
