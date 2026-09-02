import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useStartPlan } from "@/hooks/useStartPlan";

/**
 * "Qué podés activar": shows the data milestones that turn on analytics
 * already built into the app. Benefit first, work second.
 */
export const StartPlanCard = () => {
  const { t } = useTranslation(["onboarding"]);
  const navigate = useNavigate();
  const { steps, completed, total, allDone, isLoading } = useStartPlan();

  if (isLoading || allDone || steps.length === 0) return null;

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-foreground">
                {t("onboarding:startPlan.title")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("onboarding:startPlan.subtitle")}
              </p>
            </div>
          </div>
          <span className="text-sm font-semibold text-primary shrink-0">
            {completed}/{total}
          </span>
        </div>

        <Progress value={(completed / total) * 100} className="h-2" />

        <ul className="space-y-2">
          {steps.map((step) => (
            <li key={step.key}>
              <button
                type="button"
                onClick={() => navigate(step.route)}
                className={`w-full text-left rounded-2xl border p-3 flex items-start gap-3 transition-colors ${
                  step.done
                    ? "border-border bg-background/60"
                    : "border-border bg-background hover:border-primary/50"
                }`}
              >
                <div
                  className={`h-7 w-7 shrink-0 rounded-full flex items-center justify-center ${
                    step.done ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >
                  {step.done ? <Check className="h-4 w-4" strokeWidth={3} /> : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-base font-semibold ${
                      step.done ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {t(`onboarding:startPlan.steps.${step.key}.action`)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(`onboarding:startPlan.steps.${step.key}.benefit`)}
                  </p>
                  {!step.done && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <span className="font-medium">
                        {t("onboarding:startPlan.notActiveYet")}:
                      </span>{" "}
                      {t(`onboarding:startPlan.steps.${step.key}.unlocks`)}
                    </p>
                  )}
                </div>
                {!step.done && (
                  <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 mt-1" />
                )}
              </button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};
