import { useQuery } from "@tanstack/react-query";
import { useDiscover } from "./hooks/useDiscover";
import { useWatchlist } from "./hooks/useWatchlist";
import { useSelectedTitle } from "./hooks/useSelectedTitle";
import { useMutations } from "./hooks/useMutations";
import { getDiscover } from "./store";
import Carousel from "./components/Carousel";
import CatalogGrid from "./components/CatalogGrid";
import DetailPanel from "./components/DetailPanel";
import { GENRE_MAP } from "./components/constants";

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
  allPlatforms: boolean;
}

export default function DiscoverView({ search, setSearch, sortBy, activeGenres, setActiveGenres, activeActor, setActiveActor, filterType, allPlatforms }: DiscoverViewProps) {
  const { items: watchlistItems, ids: watchlistIds } = useWatchlist();
  const { selected, selectedId, isLoading: panelLoading, select, close } = useSelectedTitle();
  const mutations = useMutations();

  const { data: currentlyWatching = [] } = useQuery({ queryKey: ["discover", allPlatforms], queryFn: () => getDiscover(allPlatforms) });

  const { titles, loading, hasMore, loadMore, isSearchMode } = useDiscover({
    search, sortBy, genres: activeGenres, filterType, activeActor, allPlatforms,
  });

  const handleStopWatching = async (id: string) => {
    await mutations.stopWatching.mutateAsync(id);
    close();
  };

  const handleGenreClick = (genre: string) => setActiveGenres(activeGenres.includes(genre) ? activeGenres.filter(g => g !== genre) : [...activeGenres, genre]);
  const handleActorClick = (name: string) => { setActiveActor(activeActor === name ? null : name); setSearch(""); };
  const hasActiveFilters = activeGenres.length > 0 || activeActor;

  const carouselItems = currentlyWatching
    .filter(t => t.type === "SHOW")
    .map(t => ({ id: t.id, title: t.title, posterUrl: t.posterUrl, watched: t.tracking?.watched ?? 0, total: t.tracking?.total ?? 0 }));

  return (
    <>
      {hasActiveFilters && (
        <div className="flex items-center gap-2 px-6 py-2 flex-wrap">
          {activeGenres.map(g => <span key={g} className="px-3 py-1 rounded-full text-xs bg-[rgba(229,9,20,0.2)] text-[var(--color-accent)] border border-[var(--color-accent)] cursor-pointer hover:opacity-70" onClick={() => handleGenreClick(g)}>{GENRE_MAP[g] || g} ✕</span>)}
          {activeActor && <span className="px-3 py-1 rounded-full text-xs bg-[rgba(229,9,20,0.2)] text-[var(--color-accent)] border border-[var(--color-accent)] cursor-pointer hover:opacity-70" onClick={() => setActiveActor(null)}>🎭 {activeActor} ✕</span>}
          <button className="bg-transparent border-none text-[var(--color-muted)] text-xs cursor-pointer underline" onClick={() => { setActiveGenres([]); setActiveActor(null); setSearch(""); }}>Clear all</button>
        </div>
      )}

      {filterType === "SHOW" && !isSearchMode && carouselItems.length > 0 && (
        <Carousel items={carouselItems} onSelect={(id) => select(id)} />
      )}

      <div>
        <h3 className="text-lg font-bold mb-2 px-4">{isSearchMode ? "Search Results" : "Watch Next"}</h3>
        <CatalogGrid
          titles={[
            ...(!isSearchMode ? watchlistItems.filter(w => w.type === filterType) : []),
            ...titles,
          ]}
          selectedId={selectedId}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={loadMore}
          onSelect={(t) => select(t.id)}
        />
      </div>

      {selected && (
        <DetailPanel
          selected={selected}
          onClose={close}
          onToggleWatchlist={mutations.toggleWatchlist}
          isInWatchlist={watchlistIds.has(selected.id)}
          onStopWatching={handleStopWatching}
          onGenreClick={handleGenreClick}
          onActorClick={handleActorClick}
        />
      )}
      {panelLoading && selectedId && !selected && (
        <aside className="fixed top-[var(--spacing-topbar)] right-0 bottom-0 w-[var(--spacing-panel)] bg-[rgba(30,30,30,0.92)] backdrop-blur-[20px] border-l border-white/8 flex items-center justify-center z-100">
          <p className="text-[var(--color-muted)]">Loading...</p>
        </aside>
      )}
    </>
  );
}
