import { Skeleton } from "@/components/ui/skeleton";

interface PageLoadingProps {
  /** Number of skeleton cards to show */
  cards?: number;
  /** Show KPI row at the top */
  showKpis?: boolean;
  /** Optional loading message */
  message?: string;
}

/**
 * Modern page-level loading skeleton.
 * Replaces the old spinner + "loading" text with a content-shaped placeholder.
 */
export function PageLoading({ cards = 3, showKpis = true, message }: PageLoadingProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* KPI row */}
      {showKpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Content cards */}
      <div className="space-y-4">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>

      {/* Optional message */}
      {message && (
        <p className="text-center text-sm text-muted-foreground pt-2">{message}</p>
      )}
    </div>
  );
}
