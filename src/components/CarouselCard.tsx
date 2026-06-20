interface CarouselCardProps {
  title: string;
  posterUrl: string | null;
  watched: number;
  total: number;
  onClick?: () => void;
}

export default function CarouselCard({ title, posterUrl, watched, total, onClick }: CarouselCardProps) {
  return (
    <div onClick={onClick} className="flex-[0_0_320px] bg-white/4 border border-white/8 rounded-[10px] overflow-hidden cursor-pointer transition-all duration-200 hover:bg-white/8 hover:scale-[1.02]">
      {posterUrl && <img src={posterUrl} alt={title} loading="lazy" className="w-full h-[400px] object-cover" />}
      <div className="p-1.5 px-2">
        <span className="text-[0.78rem] font-medium line-clamp-2">{title}</span>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 h-[3px] bg-[#2a2a2a] rounded-sm overflow-hidden">
            <div className="h-full bg-[var(--color-green)] rounded-sm transition-[width] duration-300" style={{ width: `${(watched / Math.max(total, 1)) * 100}%` }} />
          </div>
          <span className="text-[0.65rem] text-[var(--color-muted)] whitespace-nowrap">{watched}/{total}</span>
        </div>
      </div>
    </div>
  );
}
