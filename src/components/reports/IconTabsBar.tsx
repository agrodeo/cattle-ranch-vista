import { cn } from "@/lib/utils";
import { Beef, Heart, BarChart3, Cross, Syringe, DollarSign, TrendingUp, LayoutGrid, Medal } from "lucide-react";

interface Tab {
  id: string;
  label: string;
  shortLabel: string;
}

interface IconTabsBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const tabIcons = {
  herd: Beef,
  ranking: Medal,
  reproductive: Heart,
  production: BarChart3,
  corrales: LayoutGrid,
  evolution: TrendingUp,
  mortality: Cross,
  vaccines: Syringe,
  financial: DollarSign,
};

export function IconTabsBar({ tabs, activeTab, onTabChange }: IconTabsBarProps) {
  return (
    <div className="lg:hidden">
      <div className="flex justify-center">
        <div className="inline-flex bg-background border border-border rounded-lg p-1 gap-0.5 sm:gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const IconComponent = tabIcons[tab.id as keyof typeof tabIcons];
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[3rem] sm:min-w-[3.5rem] h-10 sm:h-11 rounded-md transition-all duration-200 px-1.5",
                  "hover:bg-muted/50 shrink-0",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={tab.label}
                title={tab.label}
              >
                {IconComponent && <IconComponent size={18} className="sm:w-5 sm:h-5" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}