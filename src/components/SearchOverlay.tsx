import { useRef, useEffect, useState } from "react";
import { X, SlidersHorizontal } from "lucide-react";
import { GENRE_MAP } from "./constants";
import CatalogGrid from "./CatalogGrid";
import type { Title } from "../types";

interface SearchOverlayProps {
  onClose: () => void;
  onSearch: (q: string) => void;
  sortBy: string;
  onSortChange: (v: string) => void;
  genres: string[];
  onGenreToggle: (g: string) => void;
  allPlatforms: boolean;
  onPlatformToggle: () => void;
  results?: Title[];
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  onSelectTitle?: (t: Title) => void;
}

export function SearchOverlay({ onClose, onSearch, sortBy, onSortChange, genres, onGenreToggle, allPlatforms, onPlatformToggle, results = [], loading = false, hasMore = false, onLoadMore, onSelectTitle }: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="fixed inset-0 z-300 bg-[var(--color-bg)] flex flex-col">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/8">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search shows and movies..."
          onChange={(e) => onSearch(e.target.value)}
          className="flex-1 py-2 px-4 rounded-full border border-white/10 bg-white/5 text-[var(--color-text)] text-base min-h-[44px]"
          data-testid="search-overlay-input"
        />
        <button
          aria-label="Filters"
          onClick={() => setShowFilters(!showFilters)}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-transparent border-none text-[var(--color-muted)] cursor-pointer"
        >
          <SlidersHorizontal size={20} />
        </button>
        <button
          aria-label="Close search"
          onClick={onClose}
          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center bg-transparent border-none text-[var(--color-muted)] cursor-pointer"
        >
          <X size={20} />
        </button>
      </div>

      {showFilters && (
        <div className="px-4 py-3 border-b border-white/8 flex flex-col gap-3">
          <label className="text-xs uppercase text-[var(--color-muted)]">Sort</label>
          <select value={sortBy} onChange={(e) => onSortChange(e.target.value)} className="px-3 py-2 rounded-lg border border-[#333] bg-[var(--color-bg)] text-[var(--color-text)] text-sm min-h-[44px]">
            <option value="IMDB_SCORE">IMDb Rating</option>
            <option value="POPULAR">Popularity</option>
          </select>
          <label className="text-xs uppercase text-[var(--color-muted)]">Genre</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(GENRE_MAP).map(([code, name]) => (
              <button key={code} className={`px-3 py-2 rounded-full text-sm border cursor-pointer min-h-[44px] ${genres.includes(code) ? "bg-[rgba(229,9,20,0.2)] border-[var(--color-accent)] text-[var(--color-accent)]" : "bg-[#2a2a2a] text-[var(--color-muted)] border-transparent"}`} onClick={() => onGenreToggle(code)}>{name}</button>
            ))}
          </div>
          <label className="text-xs uppercase text-[var(--color-muted)]">Platforms</label>
          <button className={`px-3 py-2 rounded-full text-sm border cursor-pointer min-h-[44px] ${allPlatforms ? "bg-[rgba(229,9,20,0.2)] border-[var(--color-accent)] text-[var(--color-accent)]" : "bg-[#2a2a2a] text-[var(--color-muted)] border-transparent"}`} onClick={onPlatformToggle}>
            {allPlatforms ? "All platforms" : "My platforms only"}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-0 py-4">
        <CatalogGrid
          titles={results}
          selectedId={null}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={onLoadMore ?? (() => {})}
          onSelect={(t) => onSelectTitle?.(t)}
        />
      </div>
    </div>
  );
}
