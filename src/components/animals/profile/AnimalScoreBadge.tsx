import { cn } from "@/lib/utils";

interface AnimalScoreBadgeProps {
  score: number;
  hasEnoughData?: boolean;
  size?: "sm" | "md";
}

export function AnimalScoreBadge({ score, hasEnoughData = true, size = "sm" }: AnimalScoreBadgeProps) {
  if (!hasEnoughData) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-md border border-border bg-muted font-bold text-muted-foreground",
          size === "sm" ? "min-w-[2rem] px-1.5 py-0.5 text-xs" : "min-w-[2.5rem] px-2 py-1 text-sm",
        )}
      >
        —
      </span>
    );
  }

  const colorClass =
    score >= 8 ? "bg-primary/10 text-primary border-primary/20" :
    score >= 6 ? "bg-secondary text-secondary-foreground border-border" :
    score >= 4 ? "bg-accent text-accent-foreground border-border" :
    "bg-destructive/10 text-destructive border-destructive/20";

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-md border font-bold tabular-nums",
        colorClass,
        size === "sm" ? "min-w-[2rem] px-1.5 py-0.5 text-xs" : "min-w-[2.5rem] px-2 py-1 text-sm",
      )}
    >
      {score.toFixed(1)}
    </span>
  );
}