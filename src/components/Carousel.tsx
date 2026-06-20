import { useRef } from "react";
import CarouselCard from "./CarouselCard";

interface CurrentlyWatchingItem {
  id: string;
  title: string;
  posterUrl: string | null;
  watched: number;
  total: number;
}

interface CarouselProps {
  items: CurrentlyWatchingItem[];
  onSelect: (id: string, title: string, posterUrl: string | null) => void;
}

export default function Carousel({ items, onSelect }: CarouselProps) {
  const ref = useRef<HTMLDivElement>(null);

  if (!items.length) return null;

  return (
    <div className="carousel-section">
      <h3 className="carousel-title">Currently Watching</h3>
      <div className="carousel-container">
        <div className="carousel-track" ref={ref}>
          {items.map(item => (
            <CarouselCard
              key={item.id}
              title={item.title}
              posterUrl={item.posterUrl}
              watched={item.watched}
              total={item.total}
              onClick={() => onSelect(item.id, item.title, item.posterUrl)}
            />
          ))}
        </div>
        <button className="carousel-arrow" onClick={() => ref.current?.scrollBy({ left: 300, behavior: "smooth" })} aria-label="Scroll right">›</button>
      </div>
    </div>
  );
}
