import { cn } from "@/lib/utils";

interface AnimalScoreBadgeProps {
  score: number;
  size?: "sm" | "md";
}

export function AnimalScoreBadge({ score, size = "sm" }: AnimalScoreBadgeProps) {
  const colorClass =
    score >= 8 ? "bg-primary/10 text-primary border-primary/20" :
    score >= 6 ? "bg-warning/10 text-warning border-warning/20" :
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