import { GENRE_MAP } from "./constants";

interface TitleCardProps {
  title: string;
  posterUrl: string | null;
  imdbScore?: number;
  tomatoMeter?: number;
  year?: number;
  totalSeasonCount?: number;
  runtime?: number;
  objectType: string;
  genres?: string[];
  isCompleted?: boolean;
  isStopped?: boolean;
  isSelected?: boolean;
  progress?: { watched: number; total: number };
  statusBadge?: string;
  isPinned?: boolean;
  ribbonProgress?: boolean;
  onClick?: () => void;
}

export default function TitleCard({ title, posterUrl, imdbScore, tomatoMeter, year, totalSeasonCount, runtime, objectType, genres, isCompleted, isStopped, isSelected, progress, statusBadge, isPinned, ribbonProgress, onClick }: TitleCardProps) {
  const pct = progress ? (progress.watched / Math.max(progress.total, 1)) * 100 : 0;

  return (
    <div
      onClick={onClick}
      data-card
      className={`relative bg-white/4 backdrop-blur-[8px] border rounded-[var(--radius-card)] overflow-hidden flex cursor-pointer transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] ${isSelected ? "border-[var(--color-accent)]" : isCompleted ? "border-[rgba(156,89,217,0.4)]" : isPinned ? "border-[rgba(255,193,7,0.3)]" : "border-white/8"}`}
    >
      {isCompleted && <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[var(--color-purple)] text-white flex items-center justify-center text-xs font-bold z-2">✓</span>}
      {isPinned && <span className="absolute top-1.5 left-1.5 text-[0.7rem] z-2">📌</span>}
      {posterUrl && <img src={posterUrl} alt={title} loading="lazy" className="w-[140px] min-h-[210px] object-cover shrink-0" />}
      <div className="p-3.5 flex flex-col gap-1.5 overflow-hidden">
        <h3 className="text-[1.05rem] leading-tight line-clamp-2">{title}</h3>
        {!isPinned && (
          <>
            <div className="flex items-center gap-3">
              {imdbScore && <span className="text-xl font-bold text-[var(--color-gold)]">⭐ {imdbScore}</span>}
              {tomatoMeter && <span className="text-base font-semibold text-[var(--color-tomato)]">🍅 {tomatoMeter}%</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {year && <span className="px-2 py-0.5 rounded-[5px] text-[0.82rem] bg-[#2a2a2a] text-[var(--color-muted)]">{year}</span>}
              {totalSeasonCount && <span className="px-2 py-0.5 rounded-[5px] text-[0.82rem] bg-[#2a2a2a] text-[var(--color-muted)]">{totalSeasonCount} seasons</span>}
              {objectType === "MOVIE" && runtime && <span className="px-2 py-0.5 rounded-[5px] text-[0.82rem] bg-[#2a2a2a] text-[var(--color-muted)]">{runtime}m</span>}
            </div>
            {genres && genres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {genres.slice(0, 3).map(g => <span key={g} className="text-[0.78rem] px-1.5 py-0.5 rounded bg-[#1a2a1a] text-[#6fbf73]">{GENRE_MAP[g] || g}</span>)}
              </div>
            )}
            {statusBadge && <span className="text-[0.72rem] px-1.5 py-0.5 rounded-full bg-white/8 text-[var(--color-muted)] mt-1 inline-block">{statusBadge}</span>}
            {progress && !ribbonProgress && (
              <div className="flex items-center gap-2 mt-auto">
                <div className="flex-1 h-1 bg-[#2a2a2a] rounded-sm overflow-hidden">
                  <div className={`h-full rounded-sm transition-[width] duration-300 ${isStopped ? "bg-[var(--color-red)]" : "bg-[var(--color-green)]"}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="text-[0.7rem] text-[var(--color-muted)] whitespace-nowrap">{isCompleted ? "✓" : `${progress.watched}/${progress.total}`}</span>
              </div>
            )}
          </>
        )}
      </div>
      {progress && ribbonProgress && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div className={`h-full transition-[width] duration-300 ${isCompleted ? "bg-[var(--color-purple)]" : isStopped ? "bg-[var(--color-red)]" : "bg-[var(--color-green)]"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
