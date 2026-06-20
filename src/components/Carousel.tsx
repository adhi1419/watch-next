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
    <div className="pt-3 px-4">
      <h3 className="text-lg font-bold mb-2">Currently Watching</h3>
      <div className="relative">
        <div ref={ref} className="flex gap-3 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
        <button onClick={() => ref.current?.scrollBy({ left: 300, behavior: "smooth" })} aria-label="Scroll right" className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/70 border border-white/20 text-white text-xl flex items-center justify-center cursor-pointer hover:bg-black/90">›</button>
      </div>
    </div>
  );
}
