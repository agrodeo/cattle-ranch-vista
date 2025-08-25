import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface KpiCardProps {
  title: string;
  value: string | number;
  delta?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  icon?: LucideIcon;
  className?: string;
}

export function KpiCard({ title, value, delta, icon: Icon, className }: KpiCardProps) {
  return (
    <Card className={cn("card-shadow hover:shadow-card-hover transition-all duration-200", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-ink-600">{title}</p>
            <p className="text-3xl font-semibold tabular-nums text-ink-900">
              {value}
            </p>
          </div>
          {Icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50">
              <Icon className="h-6 w-6 text-brand-600" />
            </div>
          )}
        </div>
        {delta && (
          <div className="mt-4 flex items-center">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                delta.trend === "up" && "bg-brand-100 text-brand-800",
                delta.trend === "down" && "bg-red-100 text-red-800",
                delta.trend === "neutral" && "bg-ink-100 text-ink-700"
              )}
            >
              {delta.value}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}