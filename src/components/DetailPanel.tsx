import { useEffect, useRef } from "react";
import { useTracking } from "../context/TrackingContext";
import { setResumeWatching } from "../store";
import { GENRE_MAP } from "./constants";
import type { Title } from "../types";

interface DetailPanelProps {
  selected: Title;
  onClose: () => void;
  onToggleWatchlist: (t: Title) => void;
  onStopWatching: (id: string) => void;
  onGenreClick: (genre: string) => void;
  onActorClick: (name: string) => void;
  onTrackingChanged?: (id: string) => void;
}

export default function DetailPanel({ selected, onClose, onToggleWatchlist, onStopWatching, onGenreClick, onActorClick, onTrackingChanged }: DetailPanelProps) {
  const { detail, loadingDetail, toggleEpisode, markAllWatched } = useTracking();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (panelRef.current && !panelRef.current.contains(target) && !target.closest('[data-card]')) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const firstUnwatchedSeason = detail?.seasons?.find(s => s.episodes.some(e => !e.watched))?.number ?? detail?.seasons?.[0]?.number ?? 1;
  const displaySeason = detail?.seasons?.find(s => s.number === firstUnwatchedSeason) ?? detail?.seasons?.[0];

  return (
    <aside ref={panelRef} className="fixed top-[var(--spacing-topbar)] right-0 bottom-0 w-[var(--spacing-panel)] shrink-0 bg-[rgba(30,30,30,0.92)] backdrop-blur-[20px] border-l border-white/8 flex flex-col z-100 overflow-hidden">
      <button onClick={onClose} className="absolute top-3 right-3 bg-black/50 border-none text-[var(--color-text)] text-lg cursor-pointer z-10 rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/80">✕</button>
      {selected.posterUrl && <img src={selected.posterUrl} alt={selected.title} className="w-full max-h-60 object-cover shrink-0" />}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3.5">
        <h2 className="text-[1.4rem] leading-tight">{selected.title}</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl font-bold text-[var(--color-gold)]">⭐ {selected.scores.imdb ?? "—"}</span>
          {selected.scores.rt && <span className="text-xl font-semibold text-[var(--color-tomato)]">🍅 {selected.scores.rt}%</span>}
          {selected.ageRating && <span className="px-2 py-0.5 rounded-[5px] text-[0.82rem] bg-[#2a2a2a] text-[var(--color-muted)]">{selected.ageRating}</span>}
        </div>
        <div className="flex gap-4 text-[var(--color-muted)] text-[0.95rem]">
          <span>{selected.year}{selected.type === "SHOW" ? " – present" : ""}</span>
          {selected.seasonCount && <span>{selected.seasonCount} season{selected.seasonCount > 1 ? "s" : ""}</span>}
          {selected.type === "MOVIE" && selected.runtime && <span>{selected.runtime} min</span>}
        </div>
        <p className="text-[0.95rem] leading-relaxed">{selected.synopsis}</p>
        <div>
          <h4 className="text-[0.82rem] uppercase text-[var(--color-muted)] mb-2 tracking-wide">Genres</h4>
          <div className="flex flex-wrap gap-1.5">
            {selected.genres.map(g => <span key={g} className="text-[0.85rem] px-2 py-0.5 rounded bg-[#1a2a1a] text-[#6fbf73] cursor-pointer hover:text-[var(--color-accent)] hover:opacity-90 transition-all" onClick={() => onGenreClick(g)}>{GENRE_MAP[g] || g}</span>)}
          </div>
        </div>
        {selected.cast.length > 0 && (
          <div>
            <h4 className="text-[0.82rem] uppercase text-[var(--color-muted)] mb-2 tracking-wide">Cast</h4>
            <ul className="list-none text-[0.92rem] flex flex-col gap-1">
              {selected.cast.slice(0, 8).map((c, i) => (
                <li key={i}>
                  <span className="cursor-pointer hover:text-[var(--color-accent)] hover:opacity-90 transition-all" onClick={() => onActorClick(c.name)}>{c.name}</span>
                  {c.character && <span className="text-[var(--color-muted)] text-[0.82rem]"> as {c.character}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {detail && detail.seasons.length > 0 && displaySeason && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-[0.82rem] uppercase text-[var(--color-muted)] tracking-wide">Episodes</h4>
              <select value={displaySeason.number} onChange={() => {}} className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[var(--color-text)] text-[0.82rem]">
                {detail.seasons.map(s => <option key={s.number} value={s.number}>Season {s.number}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              {displaySeason.episodes.map(ep => (
                <div key={ep.number} className="flex items-center gap-2.5 py-1 cursor-pointer text-[0.88rem]" onClick={() => toggleEpisode(selected.id, displaySeason.number, ep.number, selected)}>
                  <span className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${ep.watched ? "bg-[var(--color-green)] text-white" : "bg-[#3a3a3a] text-[#777]"}`}>✓</span>
                  <span className="text-[var(--color-muted)] text-[0.8rem] min-w-8">E{ep.number}</span>
                  <span className="flex-1">{ep.title}</span>
                  {ep.runtime && <span className="text-[var(--color-muted)] text-[0.75rem]">{ep.runtime}m</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {loadingDetail && <p className="text-[var(--color-muted)] text-center py-8">Loading...</p>}
      </div>
      <div className="flex gap-2 px-5 py-3 border-t border-white/8 shrink-0">
        <button className={`flex-1 py-2.5 border-none rounded-lg text-lg cursor-pointer transition-colors text-center ${selected.pinned ? "bg-[#1a2a3d] text-[#6fb3f7]" : "bg-[#2a2a2a] text-[var(--color-text)] hover:bg-[#333]"}`} onClick={() => onToggleWatchlist(selected)} title={selected.pinned ? "Unpin" : "Pin"}>
          {selected.pinned ? "📌" : "➕"}
        </button>
        {selected.tracking && selected.tracking.status === "watching" && (
          <button className="flex-1 py-2.5 border-none rounded-lg text-lg cursor-pointer transition-colors text-center bg-[rgba(231,76,60,0.2)] text-[#f87171] hover:bg-[rgba(231,76,60,0.3)]" onClick={() => onStopWatching(selected.id)} title="Stop Watching">⏹️</button>
        )}
        {selected.tracking?.status === "stopped" && (
          <button className="flex-1 py-2.5 border-none rounded-lg text-lg cursor-pointer transition-colors text-center bg-[var(--color-green)] text-white hover:brightness-110" onClick={async () => { await setResumeWatching(selected.id); onClose(); }} title="Resume">▶️</button>
        )}
        {(!selected.tracking || selected.tracking.status !== "completed") && (
          <button className="flex-1 py-2.5 border-none rounded-lg text-lg cursor-pointer transition-colors text-center bg-[#2a2a2a] text-[var(--color-text)] hover:bg-[#333]" onClick={async () => { await markAllWatched(selected); onTrackingChanged?.(selected.id); }} title="Mark All Watched">👁️</button>
        )}
      </div>
    </aside>
  );
}
