import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, RefreshCw } from "lucide-react";

interface KpiCardProps {
  title: string;
  value: string | number;
  delta?: {
    value: string;
    trend: "up" | "down" | "neutral";
  };
  icon?: LucideIcon;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function KpiCard({ 
  title, 
  value, 
  delta, 
  icon: Icon, 
  loading = false, 
  error = false, 
  onRetry,
  className 
}: KpiCardProps) {
  if (loading) {
    return (
      <Card className={cn("card-shadow", className)}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            {Icon && (
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-ink-100">
                <Skeleton className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("card-shadow border-red-200", className)}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <p className="text-sm font-medium text-ink-600">{title}</p>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-600">Error al cargar</span>
              </div>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("card-shadow hover:shadow-card-hover transition-all duration-200", className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-ink-600">{title}</p>
            <p className="text-2xl sm:text-3xl font-semibold tabular-nums text-ink-900">
              {value}
            </p>
          </div>
          {Icon && (
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-brand-50">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-brand-600" />
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