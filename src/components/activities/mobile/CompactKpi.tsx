import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompactKpiProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  className?: string;
}

export function CompactKpi({ title, value, icon: Icon, trend, className }: CompactKpiProps) {
  return (
    <div className={cn(
      "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm",
      className
    )}>
      <div className="flex items-center justify-between mb-1">
        {Icon && <Icon className="h-4 w-4 text-slate-600" />}
        {trend && (
          <span className={cn(
            "text-xs font-medium",
            trend.direction === "up" ? "text-emerald-600" : 
            trend.direction === "down" ? "text-red-600" : 
            "text-slate-600"
          )}>
            {trend.value}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-lg font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 text-ellipsis whitespace-nowrap overflow-hidden">
          {title}
        </p>
      </div>
    </div>
  );
}