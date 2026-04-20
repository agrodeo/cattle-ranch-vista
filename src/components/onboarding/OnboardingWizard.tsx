import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, CheckCircle2 } from "lucide-react";
import { VaccinesStep } from "./steps/VaccinesStep";
import { CorralStep } from "./steps/CorralStep";
import { AnimalStep } from "./steps/AnimalStep";

interface OnboardingWizardProps {
  onComplete: () => void;
}

type StepKey = "vaccines" | "corrals" | "animals";
const STEP_ORDER: StepKey[] = ["vaccines", "corrals", "animals"];

export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const { t } = useTranslation(["onboarding"]);
  const [stepIndex, setStepIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  const goNext = () => {
    if (stepIndex < STEP_ORDER.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      setShowSuccess(true);
    }
  };
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  useEffect(() => {
    if (!showSuccess) return;
    const id = setTimeout(onComplete, 2000);
    return () => clearTimeout(id);
  }, [showSuccess, onComplete]);

  if (showSuccess) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center p-6 animate-fade-in">
        <div className="text-center space-y-5">
          <div className="mx-auto w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
            <CheckCircle2 className="h-14 w-14 text-primary" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("onboarding:wizard.success.title")}
          </h1>
          <p className="text-base text-muted-foreground">
            {t("onboarding:wizard.success.subtitle")}
          </p>
        </div>
      </div>
    );
  }

  const currentKey = STEP_ORDER[stepIndex];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col sm:items-center sm:justify-center p-0 sm:p-6">
      <div className="w-full sm:max-w-md sm:rounded-3xl sm:shadow-xl sm:border sm:border-border bg-card flex flex-col min-h-[100dvh] sm:min-h-0">
        {/* Functional dot progress indicator */}
        <div className="px-6 pt-8 pb-2 sm:pt-6">
          <div className="flex items-center justify-center gap-3">
            {STEP_ORDER.map((key, i) => {
              const completed = i < stepIndex;
              const active = i === stepIndex;
              return (
                <div key={key} className="flex items-center gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-full text-sm font-semibold transition-all ${
                        completed
                          ? "bg-primary text-primary-foreground"
                          : active
                          ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {completed ? <Check className="h-4 w-4" /> : i + 1}
                    </div>
                    <span
                      className={`text-[11px] font-medium ${
                        active
                          ? "text-foreground"
                          : completed
                          ? "text-primary"
                          : "text-muted-foreground"
                      }`}
                    >
                      {t(`onboarding:wizard.labels.${key}`)}
                    </span>
                  </div>
                  {i < STEP_ORDER.length - 1 && (
                    <div
                      className={`w-8 h-0.5 -mt-5 ${
                        completed ? "bg-primary" : "bg-border"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step body */}
        <div className="flex-1 px-6 pb-8 pt-4 overflow-y-auto">
          {currentKey === "vaccines" && (
            <VaccinesStep onComplete={goNext} onSkip={goNext} />
          )}
          {currentKey === "corrals" && (
            <CorralStep onComplete={goNext} onSkip={goNext} onBack={goBack} />
          )}
          {currentKey === "animals" && (
            <AnimalStep
              onComplete={() => setShowSuccess(true)}
              onSkip={() => setShowSuccess(true)}
              onBack={goBack}
            />
          )}
        </div>
      </div>
    </div>
  );
};
