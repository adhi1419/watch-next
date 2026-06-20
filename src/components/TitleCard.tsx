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
  const cardClass = `card ${isCompleted ? "completed" : ""} ${isStopped ? "stopped" : ""} ${isSelected ? "selected" : ""} ${isPinned ? "pinned" : ""}`;
  const pct = progress ? (progress.watched / Math.max(progress.total, 1)) * 100 : 0;

  return (
    <div className={cardClass} onClick={onClick}>
      {isCompleted && <span className="completed-badge">✓</span>}
      {isPinned && <span className="pinned-badge">📌</span>}
      {posterUrl && <img src={posterUrl} alt={title} loading="lazy" />}
      <div className="card-body">
        <h3>{title}</h3>
        {!isPinned && (
          <>
            <div className="card-scores">
              {imdbScore && <span className="card-rating">⭐ {imdbScore}</span>}
              {tomatoMeter && <span className="card-tomato">🍅 {tomatoMeter}%</span>}
            </div>
            <div className="meta">
              {year && <span className="badge year">{year}</span>}
              {totalSeasonCount && <span className="badge">{totalSeasonCount} seasons</span>}
              {objectType === "MOVIE" && runtime && <span className="badge">{runtime}m</span>}
            </div>
            {genres && genres.length > 0 && (
              <div className="genres">
                {genres.slice(0, 3).map(g => <span key={g} className="genre">{GENRE_MAP[g] || g}</span>)}
              </div>
            )}
            {statusBadge && <span className="status-badge">{statusBadge}</span>}
            {progress && !ribbonProgress && (
              <div className="card-progress">
                <div className={`card-progress-bar ${isStopped ? "stopped" : ""}`}>
                  <div className={`card-progress-fill ${isStopped ? "stopped" : ""}`} style={{ width: `${pct}%` }} />
                </div>
                <span className="card-progress-text">{isCompleted ? "✓" : `${progress.watched}/${progress.total}`}</span>
              </div>
            )}
          </>
        )}
      </div>
      {progress && ribbonProgress && (
        <div className="card-ribbon">
          <div className={`card-ribbon-fill ${isCompleted ? "completed" : ""} ${isStopped ? "stopped" : ""}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}
