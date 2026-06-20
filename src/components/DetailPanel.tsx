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
      if (panelRef.current && !panelRef.current.contains(target) && !target.closest('.card')) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  // Find first season with unwatched episodes
  const firstUnwatchedSeason = detail?.seasons?.find(s => s.episodes.some(e => !e.watched))?.number ?? detail?.seasons?.[0]?.number ?? 1;

  const displaySeason = detail?.seasons?.find(s => s.number === firstUnwatchedSeason) ?? detail?.seasons?.[0];

  return (
    <aside className="detail-panel" ref={panelRef}>
      <button className="panel-close" onClick={onClose}>✕</button>
      {selected.posterUrl && <img className="panel-poster" src={selected.posterUrl} alt={selected.title} />}
      <div className="panel-scrollable">
        <h2>{selected.title}</h2>
        <div className="panel-meta">
          <span className="panel-rating">⭐ {selected.scores.imdb ?? "—"}</span>
          {selected.scores.rt && <span className="panel-tomato">🍅 {selected.scores.rt}%</span>}
          {selected.ageRating && <span className="badge">{selected.ageRating}</span>}
        </div>
        <div className="panel-details">
          <span>{selected.year}{selected.type === "SHOW" ? " – present" : ""}</span>
          {selected.seasonCount && <span>{selected.seasonCount} season{selected.seasonCount > 1 ? "s" : ""}</span>}
          {selected.type === "MOVIE" && selected.runtime && <span>{selected.runtime} min</span>}
        </div>
        <p className="panel-synopsis">{selected.synopsis}</p>
        <div className="panel-section">
          <h4>Genres</h4>
          <div className="genres">
            {selected.genres.map(g => <span key={g} className="genre clickable" onClick={() => onGenreClick(g)}>{GENRE_MAP[g] || g}</span>)}
          </div>
        </div>
        {selected.cast.length > 0 && (
          <div className="panel-section">
            <h4>Cast</h4>
            <ul className="cast-list">
              {selected.cast.slice(0, 8).map((c, i) => (
                <li key={i}>
                  <span className="clickable" onClick={() => onActorClick(c.name)}>{c.name}</span>
                  {c.character && <span className="character"> as {c.character}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {detail && detail.seasons.length > 0 && displaySeason && (
          <div className="panel-section">
            <div className="season-selector">
              <h4>Episodes</h4>
              <select value={displaySeason.number} onChange={() => {}}>
                {detail.seasons.map(s => <option key={s.number} value={s.number}>Season {s.number}</option>)}
              </select>
            </div>
            <div className="panel-episodes">
              {displaySeason.episodes.map(ep => (
                <div key={ep.number} className="episode-row" onClick={() => toggleEpisode(selected.id, displaySeason.number, ep.number, selected)}>
                  <span className={`ep-check ${ep.watched ? "checked" : ""}`}>✓</span>
                  <span className="ep-num">E{ep.number}</span>
                  <span className="ep-title">{ep.title}</span>
                  {ep.runtime && <span className="ep-runtime">{ep.runtime}m</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {loadingDetail && <p className="loading">Loading...</p>}
      </div>
      <div className="panel-actions-row">
        <button className={`action-btn ${selected.pinned ? "is-active" : ""}`} onClick={() => onToggleWatchlist(selected)} title={selected.pinned ? "Unpin" : "Pin"}>
          {selected.pinned ? "📌" : "➕"}
        </button>
        {selected.tracking && selected.tracking.status === "watching" && (
          <button className="action-btn stop" onClick={() => onStopWatching(selected.id)} title="Stop Watching">⏹️</button>
        )}
        {selected.tracking?.status === "stopped" && (
          <button className="action-btn resume" onClick={async () => { await setResumeWatching(selected.id); onClose(); }} title="Resume">▶️</button>
        )}
        {(!selected.tracking || selected.tracking.status !== "completed") && (
          <button className="action-btn" onClick={async () => { await markAllWatched(selected); onTrackingChanged?.(selected.id); }} title="Mark All Watched">👁️</button>
        )}
      </div>
    </aside>
  );
}
