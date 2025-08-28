import { KpiCard } from "@/components/ui/kpi-card";
import { LucideIcon } from "lucide-react";

interface KpiData {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  loading?: boolean;
  error?: boolean;
}

interface KpiGridProps {
  kpis: KpiData[];
  onRetry?: (index: number) => void;
}

export function KpiGrid({ kpis, onRetry }: KpiGridProps) {
  // For mobile, if more than 4 KPIs, use horizontal scroll
  const showHorizontalScroll = kpis.length > 4;

  if (showHorizontalScroll) {
    return (
      <div className="sm:hidden">
        <div className="flex gap-3 overflow-x-auto scrollbar-none snap-x -mx-3 px-3">
          {kpis.map((kpi, index) => (
            <div key={index} className="snap-start shrink-0 w-40">
              <KpiCard
                {...kpi}
                onRetry={onRetry ? () => onRetry(index) : undefined}
                className="h-full"
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Standard grid for desktop and mobile with ≤4 KPIs
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
      {kpis.map((kpi, index) => (
        <KpiCard
          key={index}
          {...kpi}
          onRetry={onRetry ? () => onRetry(index) : undefined}
        />
      ))}
    </div>
  );
}