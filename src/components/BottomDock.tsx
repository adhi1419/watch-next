import { Tv, Film, Search, Clock } from "lucide-react";

export type DockTab = "discover-show" | "discover-movie" | "search" | "history";

interface BottomDockProps {
  activeTab: DockTab;
  onNavigate: (tab: DockTab) => void;
}

export function BottomDock({ activeTab, onNavigate }: BottomDockProps) {
  const tabs: { id: DockTab; label: string; icon: typeof Tv }[] = [
    { id: "discover-show", label: "TV Shows", icon: Tv },
    { id: "discover-movie", label: "Movies", icon: Film },
    { id: "search", label: "Search", icon: Search },
    { id: "history", label: "History", icon: Clock },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-200 flex items-center justify-around h-14 bg-[rgba(20,20,20,0.95)] backdrop-blur-[16px] border-t border-white/8 pb-[env(safe-area-inset-bottom)]">
      {tabs.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          aria-label={label}
          onClick={() => onNavigate(id)}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full bg-transparent border-none cursor-pointer min-h-[44px] ${activeTab === id ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"}`}
        >
          <Icon size={20} />
          <span className="text-[10px]">{label}</span>
        </button>
      ))}
    </nav>
  );
}
