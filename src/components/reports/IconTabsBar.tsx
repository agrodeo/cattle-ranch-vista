import { cn } from "@/lib/utils";
import { Beef, Heart, BarChart3, Cross, Syringe, DollarSign, TrendingUp } from "lucide-react";

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
  reproductive: Heart,
  production: BarChart3,
  evolution: TrendingUp,
  mortality: Cross,
  vaccines: Syringe,
  financial: DollarSign,
};

export function IconTabsBar({ tabs, activeTab, onTabChange }: IconTabsBarProps) {
  return (
    <div className="lg:hidden">
      <div className="flex justify-center">
        <div className="flex bg-background border border-border rounded-lg p-1 gap-1">
          {tabs.map((tab) => {
            const IconComponent = tabIcons[tab.id as keyof typeof tabIcons];
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex items-center justify-center w-12 h-10 rounded-md transition-all duration-200",
                  "hover:bg-muted/50",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={tab.label}
                title={tab.label}
              >
                {IconComponent && <IconComponent size={20} />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}