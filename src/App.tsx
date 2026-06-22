import { useState, useEffect } from "react";
import { Router } from "wouter";
import { SlidersHorizontal, LogOut, Tv, Film, X } from "lucide-react";
import DiscoverView from "./DiscoverView";
import HistoryView from "./HistoryView";
import { GENRE_MAP } from "./components/constants";
import { useUrlState } from "./hooks/useUrlState";
import { useAuth, LoginScreen } from "./components/AuthGate";
import { useIsMobile } from "./hooks/useIsMobile";
import { useDiscover } from "./hooks/useDiscover";
import { BottomDock, type DockTab } from "./components/BottomDock";
import { SearchOverlay } from "./components/SearchOverlay";

export default function App() {
  const { user, loading, signIn, signOut } = useAuth();

  if (loading) return <div className="flex items-center justify-center h-screen text-[var(--color-muted)]">Loading...</div>;
  if (!user) return <LoginScreen onSignIn={signIn} />;

  return (
    <Router base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
      <AppShell user={user} onSignOut={signOut} />
    </Router>
  );
}

function AppShell({ user, onSignOut }: { user: any; onSignOut: () => void }) {
  const { view, filterType, sort, genres, push } = useUrlState();
  const [showFilters, setShowFilters] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeActor, setActiveActor] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [allPlatforms, setAllPlatforms] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [mobileSearch, setMobileSearch] = useState("");
  const isMobile = useIsMobile();

  const overlayResults = useDiscover({
    search: mobileSearch,
    sortBy: sort,
    genres,
    filterType: filterType as "MOVIE" | "SHOW",
    activeActor: null,
    allPlatforms,
  });

  const handleGenreClick = (genre: string) => {
    const next = genres.includes(genre) ? genres.filter(g => g !== genre) : [...genres, genre];
    push({ genres: next });
  };

  const handleDockNavigate = (tab: DockTab) => {
    if (tab === "search") {
      setShowSearchOverlay(true);
    } else if (tab === "history") {
      push({ view: "history" });
    } else if (tab === "discover-show") {
      push({ view: "discover", filterType: "SHOW" });
    } else if (tab === "discover-movie") {
      push({ view: "discover", filterType: "MOVIE" });
    }
  };

  const activeDockTab: DockTab = showSearchOverlay ? "search" : view === "history" ? "history" : filterType === "MOVIE" ? "discover-movie" : "discover-show";

  useEffect(() => {
    if (!showFilters) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.topbar-search')) setShowFilters(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showFilters]);

  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-usermenu]')) setShowUserMenu(false);
    };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [showUserMenu]);

  return (
    <div className="flex flex-col h-screen">
      {/* Top Bar */}
      <nav className="sticky top-0 z-100 flex items-center justify-between px-4 md:px-6 h-[var(--spacing-topbar)] bg-[rgba(30,30,30,0.7)] backdrop-blur-[16px] border-b border-white/8 w-full">
        <a onClick={() => { push({ view: "discover", filterType: "SHOW" }); setSearch(""); setActiveActor(null); setShowSearchOverlay(false); }} className="shrink-0 cursor-pointer">
          <svg width="32" height="32" viewBox="0 0 64 64" fill="none"><rect width="64" height="64" rx="14" fill="#1a1a1a"/><path d="M16 8h32a4 4 0 0 1 4 4v44l-20-12-20 12V12a4 4 0 0 1 4-4z" fill="#e50914" opacity="0.9"/><polygon points="26,22 26,42 44,32" fill="white"/></svg>
        </a>

        {/* Desktop center: search + toggle (hidden on mobile) */}
        <div className="hidden md:flex flex-1 min-w-0 items-center justify-center gap-3" data-testid="topbar-center">
          <div className="topbar-search flex-1 min-w-0 max-w-[500px] flex items-center relative">
            <input
              type="text"
              placeholder="Search..."
              value={activeActor || search}
              onChange={(e) => { setActiveActor(null); setSearch(e.target.value); }}
              className="flex-1 py-2 pl-5 pr-10 rounded-full border border-white/10 bg-white/5 backdrop-blur-[12px] text-[var(--color-text)] text-sm"
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-transparent border-none text-[var(--color-muted)] cursor-pointer p-1 flex items-center rounded-full hover:text-[var(--color-text)] transition-colors" onClick={() => setShowFilters(!showFilters)} title="Filters">
              <SlidersHorizontal size={16} />
            </button>
            {(search || activeActor) && (
              <button className="absolute right-8 top-1/2 -translate-y-1/2 bg-transparent border-none text-[var(--color-muted)] cursor-pointer p-1 flex items-center rounded-full hover:text-[var(--color-text)] transition-colors" onClick={() => { setSearch(""); setActiveActor(null); }} title="Clear">
                <X size={14} />
              </button>
            )}
            {showFilters && (
              <div className="absolute top-[calc(100%+8px)] right-0 bg-[rgba(30,30,30,0.85)] backdrop-blur-[16px] border border-white/10 rounded-xl p-3 flex flex-col gap-2 z-200 min-w-40">
                <label className="text-xs uppercase text-[var(--color-muted)]">Sort</label>
                <select value={sort} onChange={(e) => push({ sort: e.target.value })} className="px-2 py-1.5 rounded-lg border border-[#333] bg-[var(--color-bg)] text-[var(--color-text)] text-sm">
                  <option value="IMDB_SCORE">IMDb Rating</option>
                  <option value="POPULAR">Popularity</option>
                </select>
                <label className="text-xs uppercase text-[var(--color-muted)]">Genre</label>
                <div className="flex flex-wrap gap-1">
                  {Object.entries(GENRE_MAP).map(([code, name]) => (
                    <button key={code} className={`px-2 py-0.5 rounded-full text-xs border cursor-pointer transition-all ${genres.includes(code) ? "bg-[rgba(229,9,20,0.2)] border-[var(--color-accent)] text-[var(--color-accent)]" : "bg-[#2a2a2a] text-[var(--color-muted)] border-transparent hover:border-[var(--color-accent)] hover:text-[var(--color-text)]"}`} onClick={() => handleGenreClick(code)}>{name}</button>
                  ))}
                </div>
                <label className="text-xs uppercase text-[var(--color-muted)]">Platforms</label>
                <button className={`px-2 py-1 rounded-full text-xs border cursor-pointer transition-all ${allPlatforms ? "bg-[rgba(229,9,20,0.2)] border-[var(--color-accent)] text-[var(--color-accent)]" : "bg-[#2a2a2a] text-[var(--color-muted)] border-transparent hover:border-[var(--color-accent)]"}`} onClick={() => setAllPlatforms(!allPlatforms)}>
                  {allPlatforms ? "All platforms" : "My platforms only"}
                </button>
              </div>
            )}
          </div>
          {/* TV/Movie toggle */}
          <div className="relative inline-flex bg-white/5 backdrop-blur-[12px] border border-white/10 rounded-full p-[3px] shrink-0">
            <div className={`absolute inset-[3px] rounded-full bg-[var(--color-accent)] transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] w-[calc(50%-3px)] ${filterType === "MOVIE" ? "left-auto right-[3px]" : ""}`} />
            <button className={`relative z-1 px-3 py-1.5 border-none bg-transparent cursor-pointer rounded-full transition-colors ${filterType === "SHOW" ? "text-white" : "text-[var(--color-muted)]"}`} onClick={() => push({ filterType: "SHOW" })} title="TV Shows"><Tv size={16} /></button>
            <button className={`relative z-1 px-3 py-1.5 border-none bg-transparent cursor-pointer rounded-full transition-colors ${filterType === "MOVIE" ? "text-white" : "text-[var(--color-muted)]"}`} onClick={() => push({ filterType: "MOVIE" })} title="Movies"><Film size={16} /></button>
          </div>
        </div>

        <div className="ml-3 shrink-0 relative" data-usermenu>
          <button onClick={() => setShowUserMenu(prev => !prev)} className="flex items-center bg-transparent border-none cursor-pointer">
            {user.photoURL && <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full hover:ring-2 hover:ring-white/20 transition-all" />}
          </button>
          {showUserMenu && (
            <div className="absolute top-full right-0 mt-2 bg-[rgba(30,30,30,0.95)] backdrop-blur-[16px] border border-white/10 rounded-xl p-1 min-w-36 z-200">
              <div className="px-3 py-2 text-xs text-[var(--color-muted)] border-b border-white/8">{user.email}</div>
              <button onClick={onSignOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--color-text)] bg-transparent border-none cursor-pointer rounded-lg hover:bg-white/5 transition-colors">
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <main className={`main-scroll flex-1 overflow-y-auto ${isMobile ? "pb-16" : "pb-6"}`}>
        {/* View Tabs (floating pill) */}
        <div className="sticky top-0 z-50 flex justify-center py-2 px-4 -mb-[44px] pointer-events-none">
          <div className="relative inline-flex pointer-events-auto backdrop-blur-[24px] backdrop-saturate-[1.8] bg-white/[0.07] border-2 border-white/25 rounded-full p-[3px] shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
            <div className={`absolute top-[3px] bottom-[3px] w-[calc(50%-3px)] bg-[var(--color-accent)] rounded-full transition-transform duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] ${view === "history" ? "translate-x-[calc(100%+2px)]" : "translate-x-[2px]"}`} />
            <button className={`relative z-1 px-6 py-1.5 border-none bg-transparent text-[0.9rem] font-bold cursor-pointer rounded-full transition-colors ${view === "discover" ? "text-white" : "text-white/60"}`} onClick={() => push({ view: "discover" })}>Discover</button>
            <button className={`relative z-1 px-6 py-1.5 border-none bg-transparent text-[0.9rem] font-bold cursor-pointer rounded-full transition-colors ${view === "history" ? "text-white" : "text-white/60"}`} onClick={() => push({ view: "history" })}>History</button>
          </div>
        </div>

        {view === "discover" && (
          <DiscoverView search={search} setSearch={setSearch} sortBy={sort as "IMDB_SCORE" | "POPULAR"} activeGenres={genres} setActiveGenres={(g) => push({ genres: g })} activeActor={activeActor} setActiveActor={setActiveActor} filterType={filterType} allPlatforms={allPlatforms} />
        )}
        {view === "history" && <HistoryView filterType={filterType} allPlatforms={allPlatforms} />}
      </main>

      {/* Mobile: Bottom Dock */}
      {isMobile && <BottomDock activeTab={activeDockTab} onNavigate={handleDockNavigate} />}

      {/* Mobile: Search Overlay */}
      {showSearchOverlay && (
        <SearchOverlay
          onClose={() => { setShowSearchOverlay(false); setMobileSearch(""); }}
          onSearch={(q) => setMobileSearch(q)}
          sortBy={sort}
          onSortChange={(v) => push({ sort: v })}
          genres={genres}
          onGenreToggle={handleGenreClick}
          allPlatforms={allPlatforms}
          onPlatformToggle={() => setAllPlatforms(!allPlatforms)}
          results={overlayResults.titles}
          loading={overlayResults.loading}
          hasMore={overlayResults.hasMore}
          onLoadMore={overlayResults.loadMore}
          onSelectTitle={(t) => { setShowSearchOverlay(false); setMobileSearch(""); push({ view: "discover", filterType: t.type }); }}
        />
      )}
    </div>
  );
}
