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
  const getColorClass = () => {
    if (!colored || percentage === undefined) return "bg-primary/5";
    if (percentage >= 80) return "bg-primary/5";
    if (percentage >= 60) return "bg-blue-500/5";
    if (percentage >= 40) return "bg-amber-500/5";
    return "bg-destructive/5";
  };

  const getIconBg = () => {
    if (!colored || percentage === undefined) return "bg-primary/10";
    if (percentage >= 80) return "bg-primary/10";
    if (percentage >= 60) return "bg-blue-500/10";
    if (percentage >= 40) return "bg-amber-500/10";
    return "bg-destructive/10";
  };

  const getIconColor = () => {
    if (!colored || percentage === undefined) return "text-primary";
    if (percentage >= 80) return "text-primary";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-amber-600";
    return "text-destructive";
  };

  const getValueColor = () => {
    if (!colored || percentage === undefined) return "text-foreground";
    if (percentage >= 80) return "text-primary";
    if (percentage >= 60) return "text-blue-600";
    if (percentage >= 40) return "text-amber-600";
    return "text-destructive";
  };

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-border/40 p-4 sm:p-6 shadow-sm transition-all duration-300",
      colored ? getColorClass() : "bg-primary/5",
      className
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
            {title}
          </p>
          <p className={cn("text-2xl sm:text-3xl font-bold tracking-tight", getValueColor())}>
            {value}
          </p>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">{subtitle}</p>
          )}
          {trend && (
            <span className={cn(
              "inline-flex text-xs font-medium px-2 py-0.5 rounded-full",
              trend.direction === "up" ? "text-primary bg-primary/10" :
              trend.direction === "down" ? "text-destructive bg-destructive/10" :
              "text-muted-foreground bg-muted"
            )}>
              {trend.value}
            </span>
          )}
        </div>
        {Icon && (
          <div className={cn(
            "flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl",
            colored ? getIconBg() : "bg-primary/10"
          )}>
            <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", colored ? getIconColor() : "text-primary")} />
          </div>
        )}
      </div>
    </div>
  );
}
