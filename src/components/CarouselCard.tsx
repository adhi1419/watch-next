interface CarouselCardProps {
  title: string;
  posterUrl: string | null;
  watched: number;
  total: number;
  onClick?: () => void;
}

export default function CarouselCard({ title, posterUrl, watched, total, onClick }: CarouselCardProps) {
  return (
    <div className="carousel-card" onClick={onClick}>
      {posterUrl && <img src={posterUrl} alt={title} loading="lazy" />}
      <div className="carousel-card-body">
        <span className="carousel-card-title">{title}</span>
        <div className="card-progress">
          <div className="card-progress-bar">
            <div className="card-progress-fill" style={{ width: `${(watched / Math.max(total, 1)) * 100}%` }} />
          </div>
          <span className="card-progress-text">{watched}/{total}</span>
        </div>
      </div>
    </div>
  );
}
