import { useTranslation } from "react-i18next";
import { AlertTriangle, BarChart3, Info, TrendingDown, TrendingUp, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ScoreExplanation } from "./ScoreExplanation";
import type { AnimalScore } from "@/lib/animalScore";

interface AnimalScoreCardProps {
  score: AnimalScore;
  sex: string;
  className?: string;
}

const DIMENSIONS = [
  { key: "production", labelKey: "production", bar: "bg-primary" },
  { key: "reproduction", labelKey: "reproduction", bar: "bg-secondary-foreground" },
  { key: "genetics", labelKey: "genetics", bar: "bg-muted-foreground" },
  { key: "longevity", labelKey: "longevity", bar: "bg-secondary-foreground" },
] as const;

function isFemale(sex: string) {
  return ["hembra", "female", "fêmea"].includes((sex || "").toLowerCase());
}

function getScoreColor(score: number): string {
  if (score >= 8) return "text-primary";
  if (score >= 6) return "text-secondary-foreground";
  if (score >= 4) return "text-foreground";
  return "text-destructive";
}

function getBarColor(score: number): string {
  if (score >= 8) return "bg-primary";
  if (score >= 6) return "bg-secondary-foreground";
  if (score >= 4) return "bg-muted-foreground";
  return "bg-destructive";
}

function getScoreLabelKey(score: number): string {
  if (score >= 9) return "exceptional";
  if (score >= 8) return "excellent";
  if (score >= 7) return "veryGood";
  if (score >= 6) return "good";
  if (score >= 5) return "average";
  if (score >= 4) return "belowAverage";
  return "needsAttention";
}

export function AnimalScoreCard({ score, sex, className }: AnimalScoreCardProps) {
  const { t } = useTranslation("animals");
  const dimensions = DIMENSIONS.filter((dimension) => dimension.key !== "reproduction" || isFemale(sex));
  const healthState = score.health >= 8 ? "current" : score.health >= 5 ? "pending" : "overdue";

  if (!score.hasEnoughData) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardContent className="space-y-4 p-5">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("score.title")}</p>
            <div className="mt-4 flex items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                <BarChart3 className="h-6 w-6 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{t("score.insufficientTitle")}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("score.insufficientDescription")}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 border-t pt-3">
            <span className="text-xs font-medium uppercase text-muted-foreground">{t("score.health")}</span>
            <div className="flex-1" />
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                healthState === "current" && "border-primary/20 bg-primary/10 text-primary",
                healthState === "pending" && "border-muted-foreground/20 bg-muted text-foreground",
                healthState === "overdue" && "border-destructive/20 bg-destructive/10 text-destructive"
              )}
            >
              {t(`score.healthStatus.${healthState}`)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="space-y-5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{t("score.title")}</p>
            <div className="mt-1 flex items-baseline gap-1">
              <span className={cn("text-5xl font-bold tabular-nums", getScoreColor(score.overall))}>{score.overall.toFixed(1)}</span>
              <span className="text-lg font-medium text-muted-foreground">/10</span>
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">{t(`score.${getScoreLabelKey(score.overall)}`)}</p>
          </div>

          {score.vsHerdAvg != null && (
            <div className={cn("inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm", score.vsHerdAvg >= 0 ? "border-primary/20 bg-primary/10 text-primary" : "border-destructive/20 bg-destructive/10 text-destructive")}>
              {score.vsHerdAvg >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              <div>
                <div className="font-bold tabular-nums">{score.vsHerdAvg >= 0 ? "+" : ""}{score.vsHerdAvg}%</div>
                <div className="text-xs opacity-80">{t("score.vsHerd")}</div>
              </div>
            </div>
          )}
        </div>

        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className={cn("h-full rounded-full transition-all", getBarColor(score.overall))} style={{ width: `${score.overall * 10}%` }} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {dimensions.map((dimension) => {
            const value = score[dimension.key];
            return (
              <div key={dimension.key} className="space-y-2 rounded-lg border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-muted-foreground">{t(`score.${dimension.labelKey}`)}</span>
                  <span className="text-sm font-bold tabular-nums">{value.toFixed(1)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className={cn("h-full rounded-full", dimension.bar)} style={{ width: `${value * 10}%` }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 border-t pt-3">
          <span className="text-xs font-medium uppercase text-muted-foreground">{t("score.health")}</span>
          <div className="flex-1" />
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              healthState === "current" && "border-primary/20 bg-primary/10 text-primary",
              healthState === "pending" && "border-muted-foreground/20 bg-muted text-foreground",
              healthState === "overdue" && "border-destructive/20 bg-destructive/10 text-destructive"
            )}
          >
            {t(`score.healthStatus.${healthState}`)}
          </Badge>
        </div>

        {score.badges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {score.badges.map((badge) => (
              <Badge key={badge.id} variant="outline" className={cn("gap-1", badge.variant === "success" && "border-primary/20 bg-primary/10 text-primary", badge.variant === "warning" && "border-destructive/20 bg-destructive/10 text-destructive")}>
                {badge.variant === "success" && <Trophy className="h-3 w-3" />}
                {badge.variant === "warning" && <AlertTriangle className="h-3 w-3" />}
                {t(`score.${badge.labelKey}`, badge.labelParams)}
              </Badge>
            ))}
          </div>
        )}

        <ScoreExplanation score={score} />

        {score.dataCompleteness < 60 && (
          <div className="flex gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>{t("score.dataWarning", { pct: score.dataCompleteness })}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}