import { cn } from "@/lib/utils";

interface Tab {
  id: string;
  label: string;
  shortLabel: string;
}

interface TabsChipsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function TabsChips({ tabs, activeTab, onTabChange }: TabsChipsProps) {
  // Split tabs into rows if more than 4 on mobile
  const mobileTabsPerRow = 2;
  const shouldSplit = tabs.length > 4;
  
  return (
    <>
      {/* Mobile: Multi-row grid */}
      <div className="lg:hidden">
        <div className={cn(
          "grid gap-2 -mx-3 px-3 sm:-mx-4 sm:px-4",
          shouldSplit ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"
        )}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "px-3 py-2 rounded-full text-sm border font-medium transition-colors",
                "min-w-0 truncate text-center",
                activeTab === tab.id
                  ? "bg-brand-600 text-white border-brand-600"
                  : "bg-white text-ink-700 border-ink-200 hover:bg-ink-50"
              )}
            >
              <span className="sm:hidden">{tab.shortLabel}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Desktop: Standard tabs */}
      <div className="hidden lg:block">
        <div className="border-b border-ink-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors",
                  activeTab === tab.id
                    ? "border-brand-500 text-brand-600"
                    : "border-transparent text-ink-500 hover:text-ink-700 hover:border-ink-300"
                )}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}