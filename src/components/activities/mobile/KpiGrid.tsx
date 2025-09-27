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
  status?: 'excellent' | 'good' | 'warning' | 'critical' | 'unknown';
  badge?: string;
}

interface KpiGridProps {
  kpis: KpiData[];
  onRetry?: (index: number) => void;
}

export function KpiGrid({ kpis, onRetry }: KpiGridProps) {
  // Always use responsive grid - no horizontal scrolling
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {kpis.map((kpi, index) => (
        <KpiCard
          key={index}
          {...kpi}
          onRetry={onRetry ? () => onRetry(index) : undefined}
          className="min-w-0"
        />
      ))}
    </div>
  );
}