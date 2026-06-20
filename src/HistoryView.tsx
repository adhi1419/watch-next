import { useQuery } from "@tanstack/react-query";
import { useSelectedTitle } from "./hooks/useSelectedTitle";
import { useWatchlist } from "./hooks/useWatchlist";
import { useMutations } from "./hooks/useMutations";
import { getHistory } from "./store";
import TitleCard from "./components/TitleCard";
import DetailPanel from "./components/DetailPanel";

type FilterType = "MOVIE" | "SHOW";

export default function HistoryView({ filterType, allPlatforms }: { filterType: FilterType; allPlatforms: boolean }) {
  const { selected, selectedId, select, close } = useSelectedTitle();
  const { ids: watchlistIds } = useWatchlist();
  const mutations = useMutations();

  const { data: allHistory = [], isLoading } = useQuery({ queryKey: ["history", allPlatforms], queryFn: () => getHistory(allPlatforms) });
  const items = allHistory.filter(t => t.type === filterType).sort((a, b) => a.title.localeCompare(b.title));

  return (
    <>
      {isLoading && <p className="text-[var(--color-muted)] text-center py-8">Loading history...</p>}
      {!isLoading && items.length === 0 && <p className="text-[var(--color-muted)] text-center py-8">No history yet.</p>}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(360px,1fr))] gap-5 px-6">
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
            providers={item.providers}
            isCompleted={item.tracking?.status === "completed"}
            isStopped={item.tracking?.status === "stopped"}
            isSelected={selectedId === item.id}
            progress={item.tracking ? { watched: item.tracking.watched, total: item.tracking.total } : undefined}
            onClick={() => select(item.id)}
          />
        ))}
      </div>

      {selected && (
        <DetailPanel
          selected={selected}
          onClose={close}
          onToggleWatchlist={mutations.toggleWatchlist}
          isInWatchlist={watchlistIds.has(selected.id)}
          onStopWatching={async (id) => { await mutations.untrack.mutateAsync(id); close(); }}
          onGenreClick={() => {}}
          onActorClick={() => {}}
        />
      )}
    </>
  );
}
