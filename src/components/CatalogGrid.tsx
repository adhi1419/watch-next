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
}

export default function CatalogGrid({ titles, selectedId, loading, hasMore, onLoadMore, onSelect }: CatalogGridProps) {
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
      {loading && titles.length === 0 && <p className="text-[var(--color-muted)] text-center py-8">Searching...</p>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-5 px-6">
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
            statusBadge={undefined}
            onClick={() => onSelect(t)}
          />
        ))}
      </div>
      <div ref={sentinelRef} className="min-h-px py-8 text-center">
        {loading && <p className="text-[var(--color-muted)] text-center py-8">Loading more...</p>}
      </div>
    </>
  );
}
