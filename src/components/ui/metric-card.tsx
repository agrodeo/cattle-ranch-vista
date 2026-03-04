import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    direction: "up" | "down" | "neutral";
  };
  colored?: boolean;
  percentage?: number;
  className?: string;
}

export function MetricCard({ title, value, subtitle, icon: Icon, trend, colored, percentage, className }: MetricCardProps) {
  return (
    <div className={cn(
      "rounded-2xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:shadow-md",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        {Icon && (
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        {trend && (
          <span className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            trend.direction === "up" ? "text-primary bg-primary/10" : 
            trend.direction === "down" ? "text-destructive bg-destructive/10" : 
            "text-muted-foreground bg-muted"
          )}>
            {trend.value}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        {subtitle && (
          <p className="text-[11px] text-muted-foreground/70">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
