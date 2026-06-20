import { useRef, useEffect } from "react";
import TitleCard from "./TitleCard";
import type { Title } from "../types";

interface CatalogGridProps {
  titles: Title[];
  selectedId: string | null;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelect: (t: Title) => void;
  isSearchMode?: boolean;
}

export default function CatalogGrid({ titles, selectedId, loading, hasMore, onLoadMore, onSelect, isSearchMode }: CatalogGridProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !loading && hasMore) onLoadMore(); },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, hasMore, onLoadMore]);

  return (
    <>
      {loading && titles.length === 0 && <p className="loading">Searching...</p>}
      <div className="grid">
        {titles.map(t => (
          <TitleCard
            key={t.id}
            title={t.title}
            posterUrl={t.posterUrl}
            imdbScore={t.scores.imdb ?? undefined}
            tomatoMeter={t.scores.rt ?? undefined}
            year={t.year}
            totalSeasonCount={t.seasonCount ?? undefined}
            runtime={t.runtime ?? undefined}
            objectType={t.type}
            genres={t.genres}
            isCompleted={t.tracking?.status === "completed"}
            isStopped={t.tracking?.status === "stopped"}
            isSelected={selectedId === t.id}
            progress={t.tracking ? { watched: t.tracking.watched, total: t.tracking.total } : undefined}
            statusBadge={isSearchMode ? (t.tracking ? `${t.tracking.status}` : t.pinned ? "📌 Watchlist" : undefined) : undefined}
            onClick={() => onSelect(t)}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="sentinel">
        {loading && <p className="loading">Loading more...</p>}
      </div>
    </>
  );
}
