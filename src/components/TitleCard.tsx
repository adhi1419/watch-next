import { Bookmark, Star } from "lucide-react";
import ProviderIcons from "./ProviderIcons";
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
  isPinned?: boolean;
  providers?: string[];
  onClick?: () => void;
}

export default function TitleCard({ title, posterUrl, imdbScore, tomatoMeter, year, totalSeasonCount, runtime, objectType, genres, isCompleted, isStopped, isSelected, progress, isPinned, providers, onClick }: TitleCardProps) {
  const pct = progress ? (progress.watched / Math.max(progress.total, 1)) * 100 : 0;

  return (
    <div
      className={`relative flex rounded-xl border overflow-hidden cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg
        ${isSelected ? "border-[var(--color-accent)]" : "border-white/[0.08]"}
        ${isCompleted ? "border-purple-500/40" : ""}
        bg-white/[0.04] backdrop-blur-sm`}
      onClick={onClick}
      data-card
    >
      {isPinned && <span className="absolute top-2 left-2 z-10 drop-shadow-lg"><Bookmark size={40} className="fill-amber-500 text-amber-500" /></span>}
      {posterUrl && <img src={posterUrl} alt={title} loading="lazy" className="w-[140px] min-h-[210px] object-cover shrink-0" />}
      <div className="p-3 flex flex-col gap-1.5 overflow-hidden">
        <h3 className="text-[1.05rem] leading-tight font-medium line-clamp-2">{title}</h3>
        <div className="flex items-center gap-3">
              {imdbScore && <span className="text-xl font-bold text-[#ffc107]"><Star size={16} className="inline fill-[#ffc107] text-[#ffc107] mr-0.5 -mt-0.5" />{imdbScore}</span>}
              {tomatoMeter && <span className="text-base font-semibold text-[#fa320a]">🍅 {tomatoMeter}%</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {year && <span className="px-2 py-0.5 rounded text-sm bg-[#2a2a2a] text-[var(--color-muted)]">{year}</span>}
              {totalSeasonCount && <span className="px-2 py-0.5 rounded text-sm bg-[#2a2a2a] text-[var(--color-muted)]">{totalSeasonCount} season{totalSeasonCount > 1 ? "s" : ""}</span>}
              {objectType === "MOVIE" && runtime && <span className="px-2 py-0.5 rounded text-sm bg-[#2a2a2a] text-[var(--color-muted)]">{runtime}m</span>}
            </div>
            {genres && genres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {genres.slice(0, 3).map(g => <span key={g} className="text-xs px-1.5 py-0.5 rounded bg-[#1a2a1a] text-[#6fbf73]">{GENRE_MAP[g] || g}</span>)}
              </div>
            )}
            {providers && providers.length > 0 && <ProviderIcons providers={providers} size={18} />}
      </div>
      {progress && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10">
          <div
            className={`h-full transition-all ${isCompleted ? "bg-purple-500" : isStopped ? "bg-red-500" : "bg-green-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
