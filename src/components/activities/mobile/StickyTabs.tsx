import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  shortLabel: string;
}

interface StickyTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function StickyTabs({ tabs, activeTab, onTabChange }: StickyTabsProps) {
  return (
    <header className="sticky top-0 z-30 -mx-3 mb-2 bg-white/95 backdrop-blur px-3 py-2 border-b border-slate-200">
      <div className="flex gap-2 overflow-x-auto snap-x scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "snap-start shrink-0 px-3 py-2 rounded-full text-sm border font-medium transition-colors",
              "min-w-fit whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-emerald-600",
              activeTab === tab.id
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            )}
            aria-pressed={activeTab === tab.id}
          >
            <span className="sm:hidden">{tab.shortLabel}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </header>
  );
}