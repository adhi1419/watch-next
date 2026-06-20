import { useState, useEffect } from "react";
import { useTracking } from "./context/TrackingContext";
import { useDiscover } from "./hooks/useDiscover";
import { useWatchlist } from "./hooks/useWatchlist";
import { getDiscover } from "./store";
import { setStopWatching } from "./store";
import Carousel from "./components/Carousel";
import CatalogGrid from "./components/CatalogGrid";
import DetailPanel from "./components/DetailPanel";
import TitleCard from "./components/TitleCard";
import { GENRE_MAP } from "./components/constants";
import type { Title } from "./types";

export { GENRE_MAP };

type SortKey = "IMDB_SCORE" | "POPULAR";
type FilterType = "MOVIE" | "SHOW";

interface DiscoverViewProps {
  search: string;
  setSearch: (s: string) => void;
  sortBy: SortKey;
  activeGenres: string[];
  setActiveGenres: (v: string[]) => void;
  activeActor: string | null;
  setActiveActor: (v: string | null) => void;
  filterType: FilterType;
}

export default function DiscoverView({ search, setSearch, sortBy, activeGenres, setActiveGenres, activeActor, setActiveActor, filterType }: DiscoverViewProps) {
  const tracking = useTracking();
  const { items: watchlistItems, toggle: toggleWatchlist } = useWatchlist();
  const [selected, setSelected] = useState<Title | null>(null);
  const [currentlyWatching, setCurrentlyWatching] = useState<Title[]>([]);
  const [excludedIds, setExcludedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getDiscover().then(setCurrentlyWatching).catch(() => {});
  }, []);

  const { titles, loading, hasMore, loadMore, isSearchMode } = useDiscover({
    search, sortBy, genres: activeGenres, filterType, activeActor,
  });

  const onSelect = async (t: Title) => {
    if (selected?.id === t.id) { setSelected(null); return; }
    setSelected(t);
    await tracking.handleSelect(t);
  };

  const handleStopWatching = async (id: string) => {
    await setStopWatching(id);
    setCurrentlyWatching(prev => prev.filter(t => t.id !== id));
    setExcludedIds(prev => new Set(prev).add(id));
    setSelected(null);
  };

  const handleGenreClick = (genre: string) => setActiveGenres(activeGenres.includes(genre) ? activeGenres.filter(g => g !== genre) : [...activeGenres, genre]);
  const handleActorClick = (name: string) => { setActiveActor(activeActor === name ? null : name); setSearch(""); };
  const hasActiveFilters = activeGenres.length > 0 || activeActor;

  // Carousel items from currently watching shows
  const carouselItems = currentlyWatching
    .filter(t => t.type === "SHOW")
    .map(t => ({ id: t.id, title: t.title, posterUrl: t.posterUrl, watched: t.tracking?.watched ?? 0, total: t.tracking?.total ?? 0 }));

  return (
    <>
      {hasActiveFilters && (
        <div className="active-filters">
          {activeGenres.map(g => <span key={g} className="filter-chip" onClick={() => handleGenreClick(g)}>{GENRE_MAP[g] || g} ✕</span>)}
          {activeActor && <span className="filter-chip" onClick={() => setActiveActor(null)}>🎭 {activeActor} ✕</span>}
          <button className="clear-filters" onClick={() => { setActiveGenres([]); setActiveActor(null); setSearch(""); }}>Clear all</button>
        </div>
      )}

      {filterType === "SHOW" && !isSearchMode && carouselItems.length > 0 && (
        <Carousel items={carouselItems} onSelect={(id) => {
          const found = currentlyWatching.find(t => t.id === id);
          if (found) onSelect(found);
        }} />
      )}

      <div className="watchnext-section">
        <h3 className="watchnext-title">{isSearchMode ? "Search Results" : "Watch Next"}</h3>
        {!isSearchMode && watchlistItems.filter(w => w.type === filterType).length > 0 && (
          <div className="grid">
            {watchlistItems.filter(w => w.type === filterType).map(w => (
              <TitleCard key={w.id} title={w.title} posterUrl={w.posterUrl} objectType={w.type} isPinned onClick={() => onSelect(w)} />
            ))}
          </div>
        )}
        <CatalogGrid
          titles={titles.filter(t => !t.tracking && !t.pinned && !excludedIds.has(t.id))}
          selectedId={selected?.id ?? null}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onSelect={onSelect}
          isSearchMode={isSearchMode}
        />
      </div>

      {selected && (
        <DetailPanel
          selected={selected}
          onClose={() => setSelected(null)}
          onToggleWatchlist={toggleWatchlist}
          onStopWatching={handleStopWatching}
          onGenreClick={handleGenreClick}
          onActorClick={handleActorClick}
          onTrackingChanged={(id) => { setExcludedIds(prev => new Set(prev).add(id)); setSelected(null); }}
        />
      )}
    </>
  );
}
