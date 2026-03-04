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
    if (!colored || percentage === undefined) return "";
    if (percentage >= 80) return "bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200";
    if (percentage >= 60) return "bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200";
    if (percentage >= 40) return "bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200";
    return "bg-gradient-to-br from-red-50 to-red-100 border-red-200";
  };

  const getTextColor = () => {
    if (!colored || percentage === undefined) return "text-slate-900";
    if (percentage >= 80) return "text-emerald-900";
    if (percentage >= 60) return "text-blue-900";
    if (percentage >= 40) return "text-amber-900";
    return "text-red-900";
  };

  return (
    <div className={cn(
      "rounded-2xl border p-4 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 animate-fade-in",
      colored ? getColorClass() : "border-slate-200 bg-white/80 backdrop-blur-sm",
      className
    )}>
      <div className="flex items-center justify-between mb-2">
        {Icon && (
          <div className={cn(
            "p-2 rounded-lg",
            colored ? "bg-white/50" : "bg-primary/10"
          )}>
            <Icon className={cn("h-4 w-4", colored ? getTextColor() : "text-primary")} />
          </div>
        )}
        {trend && (
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            trend.direction === "up" ? "text-emerald-700 bg-emerald-100" : 
            trend.direction === "down" ? "text-red-700 bg-red-100" : 
            "text-slate-700 bg-slate-100"
          )}>
            {trend.value}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <p className={cn("text-2xl font-display font-bold", getTextColor())}>{value}</p>
        <p className={cn("text-xs font-medium", 
          colored ? getTextColor().replace('900', '700') : "text-slate-600"
        )}>
          {title}
        </p>
        {subtitle && (
          <p className={cn("text-[10px]",
            colored ? getTextColor().replace('900', '600') : "text-slate-500"
          )}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}