import { useEffect, useState } from "react";
import { useTracking } from "./context/TrackingContext";
import { getHistory, stopTracking } from "./store";
import TitleCard from "./components/TitleCard";
import DetailPanel from "./components/DetailPanel";
import { useWatchlist } from "./hooks/useWatchlist";
import type { Title } from "./types";

type FilterType = "MOVIE" | "SHOW";

interface HistoryViewProps {
  filterType: FilterType;
}

export default function HistoryView({ filterType }: HistoryViewProps) {
  const tracking = useTracking();
  const { toggle: toggleWatchlist } = useWatchlist();
  const [items, setItems] = useState<Title[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Title | null>(null);

  useEffect(() => {
    setLoading(true);
    getHistory().then(data => {
      setItems(data.filter(t => t.type === filterType).sort((a, b) => a.title.localeCompare(b.title)));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filterType]);

  const onSelect = async (item: Title) => {
    if (selected?.id === item.id) { setSelected(null); return; }
    setSelected(item);
    await tracking.handleSelect(item);
  };

  const handleUnwatch = async (id: string) => {
    await stopTracking(id);
    setItems(prev => prev.filter(i => i.id !== id));
    setSelected(null);
  };

  return (
    <>
      {loading && <p className="text-[var(--color-muted)] text-center py-8">Loading history...</p>}
      {!loading && items.length === 0 && <p className="text-[var(--color-muted)] text-center py-8">No history yet.</p>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-5 px-4">
        {items.map(item => (
          <TitleCard
            key={item.id}
            title={item.title}
            posterUrl={item.posterUrl}
            objectType={item.type}
            imdbScore={item.scores.imdb ?? undefined}
            tomatoMeter={item.scores.rt ?? undefined}
            year={item.year}
            totalSeasonCount={item.seasonCount ?? undefined}
            runtime={item.runtime ?? undefined}
            genres={item.genres}
            isCompleted={item.tracking?.status === "completed"}
            isStopped={item.tracking?.status === "stopped"}
            isSelected={selected?.id === item.id}
            progress={item.tracking ? { watched: item.tracking.watched, total: item.tracking.total } : undefined}
            ribbonProgress
            onClick={() => onSelect(item)}
          />
        ))}
      </div>

      {selected && (
        <DetailPanel
          selected={selected}
          onClose={() => setSelected(null)}
          onToggleWatchlist={toggleWatchlist}
          onStopWatching={handleUnwatch}
          onGenreClick={() => {}}
          onActorClick={() => {}}
          onTrackingChanged={(id) => { setItems(prev => prev.filter(i => i.id !== id)); setSelected(null); }}
        />
      )}
    </>
  );
}
