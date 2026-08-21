import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, CircleAlert, CircleCheck, CircleMinus, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { AnimalScore, DimensionKey } from "@/lib/animalScore";

const DIMENSION_ORDER: DimensionKey[] = ["production", "reproduction", "health", "genetics", "longevity"];

const toneIcon = {
  positive: CircleCheck,
  negative: CircleAlert,
  neutral: CircleMinus,
} as const;

const toneClass = {
  positive: "text-primary",
  negative: "text-destructive",
  neutral: "text-muted-foreground",
} as const;

interface ScoreExplanationProps {
  score: AnimalScore;
  defaultOpen?: boolean;
  className?: string;
}

export function ScoreExplanation({ score, defaultOpen = false, className }: ScoreExplanationProps) {
  const { t } = useTranslation("animals");
  const [open, setOpen] = useState(defaultOpen);

  const inbreeding = score.inbreeding;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className={cn("rounded-lg border bg-muted/30", className)}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="h-auto w-full justify-between px-3 py-2.5 text-sm font-medium">
          <span className="flex items-center gap-2 text-left">
            <HelpCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
            {t("score.why.title")}
          </span>
          <ChevronDown className={cn("h-4 w-4 flex-shrink-0 transition-transform", open && "rotate-180")} />
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4 border-t px-3 py-3">
        <p className="text-xs text-muted-foreground">
          {t("score.why.intro", { category: score.category, confidence: score.confidence })}
        </p>

        <div className="space-y-3">
          {DIMENSION_ORDER.filter((key) => score.weights[key] > 0).map((key) => {
            const reasons = score.explanations.filter((item) => item.dimension === key);
            const applicable = score.applicable[key];
            return (
              <div key={key} className="rounded-lg border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">{t(`score.${key}`)}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-md text-[11px] font-medium">
                      {t("score.why.weight", { pct: Math.round(score.weights[key] * 100) })}
                    </Badge>
                    <span className="text-sm font-bold tabular-nums">{applicable ? score[key].toFixed(1) : "—"}</span>
                  </div>
                </div>
                {!applicable && <p className="mt-1 text-xs text-muted-foreground">{t("score.why.notCounted")}</p>}
                {reasons.length > 0 && (
                  <ul className="mt-2 space-y-1.5">
                    {reasons.map((reason, index) => {
                      const Icon = toneIcon[reason.tone];
                      return (
                        <li key={`${reason.key}-${index}`} className="flex gap-2 text-xs text-muted-foreground">
                          <Icon className={cn("mt-0.5 h-3.5 w-3.5 flex-shrink-0", toneClass[reason.tone])} />
                          <span>{t(`score.why.${reason.key}`, reason.params)}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        {inbreeding?.parentsKnown && (
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3 text-xs",
              inbreeding.penalty >= 1.5
                ? "border-destructive/20 bg-destructive/10 text-destructive"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            <span className="font-medium">
              {t("score.why.inbreedingSummary", { pct: Math.round(inbreeding.coefficient * 1000) / 10 })}
            </span>
            <Badge variant="outline" className="rounded-md text-[11px]">
              {t(`score.why.inbreedingLevel.${inbreeding.level}`)}
              {inbreeding.penalty > 0 ? ` · −${inbreeding.penalty}` : ""}
            </Badge>
          </div>
        )}

        <p className="text-[11px] leading-relaxed text-muted-foreground">{t("score.why.formula")}</p>
      </CollapsibleContent>
    </Collapsible>
  );
}
