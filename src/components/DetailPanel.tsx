import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { BookmarkCheck, Square, Play, Eye, Plus, X, Check, Star } from "lucide-react";
import { useMutations } from "../hooks/useMutations";
import ProviderIcons from "./ProviderIcons";
import { GENRE_MAP } from "./constants";
import type { TitleDetail } from "../types";

interface DetailPanelProps {
  selected: TitleDetail;
  onClose: () => void;
  onToggleWatchlist: (t: TitleDetail) => void;
  isInWatchlist: boolean;
  onStopWatching: (id: string) => void;
  onGenreClick: (genre: string) => void;
  onActorClick: (name: string) => void;
}

export default function DetailPanel({ selected, onClose, onToggleWatchlist, isInWatchlist, onStopWatching, onGenreClick, onActorClick }: DetailPanelProps) {
  const mutations = useMutations();
  const qc = useQueryClient();
  const panelRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (panelRef.current && !panelRef.current.contains(target) && !target.closest('[data-card]')) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const refresh = () => qc.invalidateQueries({ queryKey: ["title-detail", selected.id] });

  const firstUnwatchedSeason = selected.seasons?.find(s => s.episodes.some(e => !e.watched))?.number ?? selected.seasons?.[0]?.number ?? 1;
  const [selectedSeason, setSelectedSeason] = useState(firstUnwatchedSeason);
  const displaySeason = selected.seasons?.find(s => s.number === selectedSeason) ?? selected.seasons?.[0];

  const handleToggleEpisode = async (season: number, episode: number, watched: boolean) => {
    await mutations.toggleEpisode(selected.id, season, episode, watched, selected);
    refresh();
  };

  const handleMarkAllWatched = async () => {
    if (selected.type === "MOVIE") {
      await mutations.markEpisodes.mutateAsync({ titleId: selected.id, episodes: [{ season: 1, episode: 1 }], type: selected.type });
    } else {
      const unwatched = selected.seasons.flatMap(s => s.episodes.filter(e => !e.watched).map(e => ({ season: s.number, episode: e.number })));
      if (unwatched.length) await mutations.markEpisodes.mutateAsync({ titleId: selected.id, episodes: unwatched, type: selected.type });
    }
    refresh();
  };

  return (
    <aside className="fixed inset-0 md:inset-auto md:top-[var(--spacing-topbar)] md:right-0 md:bottom-0 md:w-[var(--spacing-panel)] bg-[rgba(30,30,30,0.92)] backdrop-blur-[20px] border-l border-white/8 flex flex-col z-200 md:z-100 overflow-hidden overscroll-contain" ref={panelRef}>
      <button className="absolute top-3 right-3 bg-black/50 border-none text-[var(--color-text)] cursor-pointer z-10 rounded-full w-7 h-7 flex items-center justify-center hover:bg-black/80" onClick={onClose}><X size={16} /></button>
      {selected.posterUrl && <img src={selected.posterUrl} alt={selected.title} className="w-full max-h-60 object-cover shrink-0" />}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3.5">
        <h2 className="text-xl leading-tight">{selected.title}</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl font-bold text-[#ffc107]"><Star size={20} className="inline fill-[#ffc107] text-[#ffc107] mr-1" />{selected.scores.imdb ?? "—"}</span>
          {selected.scores.rt && <span className="text-lg font-semibold text-[#fa320a]">🍅 {selected.scores.rt}%</span>}
          {selected.ageRating && <span className="px-2 py-0.5 rounded text-sm bg-[#2a2a2a] text-[var(--color-muted)]">{selected.ageRating}</span>}
          {selected.providers?.length > 0 && <ProviderIcons providers={selected.providers} size={20} />}
        </div>
        <div className="flex gap-4 text-[var(--color-muted)] text-sm">
          <span>{selected.year}{selected.type === "SHOW" ? " – present" : ""}</span>
          {selected.seasonCount && <span>{selected.seasonCount} season{selected.seasonCount > 1 ? "s" : ""}</span>}
          {selected.type === "MOVIE" && selected.runtime && <span>{selected.runtime} min</span>}
        </div>
        <p className="text-sm leading-relaxed">{selected.synopsis}</p>
        <div>
          <h4 className="text-xs uppercase text-[var(--color-muted)] mb-2 tracking-wider">Genres</h4>
          <div className="flex flex-wrap gap-1.5">
            {selected.genres.map(g => <span key={g} className="text-sm px-2 py-0.5 rounded bg-[#1a2a1a] text-[#6fbf73] cursor-pointer hover:text-[var(--color-accent)]" onClick={() => onGenreClick(g)}>{GENRE_MAP[g] || g}</span>)}
          </div>
        </div>
        {selected.cast.length > 0 && (
          <div>
            <h4 className="text-xs uppercase text-[var(--color-muted)] mb-2 tracking-wider">Cast</h4>
            <ul className="list-none text-sm flex flex-col gap-1">
              {selected.cast.slice(0, 8).map((c, i) => (
                <li key={i}>
                  <span className="cursor-pointer hover:text-[var(--color-accent)]" onClick={() => onActorClick(c.name)}>{c.name}</span>
                  {c.character && <span className="text-[var(--color-muted)] text-xs"> as {c.character}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {selected.seasons.length > 0 && displaySeason && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs uppercase text-[var(--color-muted)] tracking-wider">Episodes</h4>
              <select className="px-2 py-1 rounded-lg border border-white/10 bg-white/5 text-[var(--color-text)] text-xs" value={selectedSeason} onChange={(e) => setSelectedSeason(Number(e.target.value))}>
                {selected.seasons.map(s => <option key={s.number} value={s.number}>Season {s.number}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-0.5">
              {displaySeason.episodes.map(ep => (
                <div key={ep.number} className="flex items-center gap-2.5 py-1 cursor-pointer text-sm" onClick={() => handleToggleEpisode(displaySeason.number, ep.number, ep.watched)}>
                  <span className={`w-[22px] h-[22px] rounded-full flex items-center justify-center shrink-0 transition-all ${ep.watched ? "bg-green-500 text-white" : "bg-[#3a3a3a] text-[#777]"}`}><Check size={12} /></span>
                  <span className="text-[var(--color-muted)] text-xs min-w-8">E{ep.number}</span>
                  <span className="flex-1">{ep.title}</span>
                  {ep.providers?.length > 0 && <ProviderIcons providers={ep.providers} size={14} />}
                  {ep.runtime && <span className="text-[var(--color-muted)] text-xs">{ep.runtime}m</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-2 px-5 py-3 border-t border-white/8 shrink-0">
        {!selected.tracking && (
          <button className={`flex-1 py-2.5 border-none rounded-lg text-lg cursor-pointer transition-colors text-center ${isInWatchlist ? "bg-[#1a2a3d] text-[#6fb3f7]" : "bg-[#2a2a2a] text-[var(--color-text)] hover:bg-[#333]"}`} onClick={() => onToggleWatchlist(selected)} title={isInWatchlist ? "Remove from Watchlist" : "Add to Watchlist"}>
            {isInWatchlist ? <BookmarkCheck size={20} className="mx-auto" /> : <Plus size={20} className="mx-auto" />}
          </button>
        )}
        {selected.tracking?.status === "watching" && (
          <button className="flex-1 py-2.5 border-none rounded-lg text-lg cursor-pointer transition-colors text-center bg-[rgba(231,76,60,0.2)] text-[#f87171] hover:bg-[rgba(231,76,60,0.3)]" onClick={() => onStopWatching(selected.id)} title="Stop Watching"><Square size={20} className="mx-auto" /></button>
        )}
        {selected.tracking?.status === "stopped" && (
          <button className="flex-1 py-2.5 border-none rounded-lg text-lg cursor-pointer transition-colors text-center bg-green-500 text-white hover:brightness-110" onClick={async () => { await mutations.resumeWatching.mutateAsync(selected.id); refresh(); }} title="Resume"><Play size={20} className="mx-auto" /></button>
        )}
        {selected.tracking && ["completed", "stopped", "up_to_date"].includes(selected.tracking.status) && (
          <button className="flex-1 py-2.5 border-none rounded-lg text-lg cursor-pointer transition-colors text-center bg-[#2a2a2a] text-[var(--color-muted)] hover:bg-[#333]" onClick={() => onStopWatching(selected.id)} title="Remove from History"><X size={20} className="mx-auto" /></button>
        )}
        {(!selected.tracking || !["completed", "up_to_date"].includes(selected.tracking.status)) && (
          <button className="flex-1 py-2.5 border-none rounded-lg text-lg cursor-pointer transition-colors text-center bg-[#2a2a2a] text-[var(--color-text)] hover:bg-[#333]" onClick={handleMarkAllWatched} title="Mark All Watched"><Eye size={20} className="mx-auto" /></button>
        )}
      </div>
    </aside>
  );
}
