import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { VaccinesStep } from "./steps/VaccinesStep";
import { CorralStep } from "./steps/CorralStep";
import { AnimalStep } from "./steps/AnimalStep";

interface OnboardingWizardProps {
  onComplete: () => void;
}

type StepKey = "animals" | "corrals" | "vaccines";
const STEP_ORDER: StepKey[] = ["animals", "corrals", "vaccines"];

interface SummaryCounts {
  animals: number;
  corrals: number;
}

export const OnboardingWizard = ({ onComplete }: OnboardingWizardProps) => {
  const { t } = useTranslation(["onboarding"]);
  const { currentUser } = useSupabaseAuth();
  const navigate = useNavigate();
  const [showWelcome, setShowWelcome] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [summary, setSummary] = useState<SummaryCounts>({ animals: 0, corrals: 0 });

  // Pull ownerName / companyName from authed user, falling back to localStorage pending data
  const [identity, setIdentity] = useState<{ ownerName: string; companyName: string }>({
    ownerName: currentUser?.fullName || "",
    companyName: currentUser?.cabañaName || "",
  });

  useEffect(() => {
    if (identity.ownerName && identity.companyName) return;
    try {
      const pendingOwner = localStorage.getItem("pending_owner_data");
      const pendingCabana = localStorage.getItem("pending_cabana");
      const owner = pendingOwner ? JSON.parse(pendingOwner) : null;
      const cabana = pendingCabana ? JSON.parse(pendingCabana) : null;
      setIdentity((prev) => ({
        ownerName: prev.ownerName || owner?.full_name || "",
        companyName: prev.companyName || cabana?.name || "",
      }));
    } catch {
      /* noop */
    }
  }, [identity.ownerName, identity.companyName]);

  useEffect(() => {
    setIdentity((prev) => ({
      ownerName: prev.ownerName || currentUser?.fullName || "",
      companyName: prev.companyName || currentUser?.cabañaName || "",
    }));
  }, [currentUser?.fullName, currentUser?.cabañaName]);

  const goNext = () => {
    if (stepIndex < STEP_ORDER.length - 1) setStepIndex((i) => i + 1);
    else setShowSuccess(true);
  };
  const goBack = () => setStepIndex((i) => Math.max(0, i - 1));

  const currentKey = STEP_ORDER[stepIndex];
  const progressPct = ((stepIndex + (showSuccess ? 1 : 0)) / STEP_ORDER.length) * 100;

  // ---------- Welcome screen ----------
  if (showWelcome) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col sm:items-center sm:justify-center p-0 sm:p-6">
        <div className="w-full sm:max-w-md sm:rounded-3xl sm:shadow-xl sm:border sm:border-border bg-card flex flex-col min-h-[100dvh] sm:min-h-0 p-6 sm:p-8 animate-fade-in">
          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {t("onboarding:welcomeScreen.title", { name: identity.ownerName || "" })}
              </h1>
              <p className="text-base text-muted-foreground">
                {t("onboarding:welcomeScreen.subtitle", { company: identity.companyName || "" })}
              </p>
            </div>
            <ol className="space-y-3">
              {(
                [
                  { k: "animals", emoji: "🐄", noteKey: "onboarding:welcomeScreen.animalsNote" },
                  { k: "corrals", emoji: "📍", noteKey: "" },
                  { k: "vaccines", emoji: "💉", noteKey: "" },
                ] as const
              ).map((s, i) => (
                <li
                  key={s.k}
                  className="flex items-start gap-3 rounded-2xl border border-border p-4 bg-background"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <p className="text-base font-semibold text-foreground">
                      {s.emoji} {t(`onboarding:welcomeScreen.step_${s.k}`)}
                    </p>
                    {s.noteKey && (
                      <p className="text-xs text-muted-foreground mt-0.5">{t(s.noteKey)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <p className="text-xs text-center text-muted-foreground">
              ⏱️ {t("onboarding:welcomeScreen.estimatedTime")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowWelcome(false)}
            className="mt-6 w-full h-14 rounded-2xl text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99] transition-all shadow-md inline-flex items-center justify-center gap-2"
          >
            {t("onboarding:welcomeScreen.startButton")}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  // ---------- Success summary ----------
  if (showSuccess) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col sm:items-center sm:justify-center p-0 sm:p-6">
        <div className="w-full sm:max-w-md sm:rounded-3xl sm:shadow-xl sm:border sm:border-border bg-card flex flex-col min-h-[100dvh] sm:min-h-0 p-6 sm:p-8 animate-fade-in">
          <div className="flex-1 flex flex-col justify-center space-y-6">
            <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-scale-in">
              <Check className="h-10 w-10 text-primary" strokeWidth={3} />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                {t("onboarding:successScreen.title")}
              </h1>
              <p className="text-base text-muted-foreground">
                {t("onboarding:successScreen.ready")}
              </p>
            </div>
            <div className="space-y-2">
              <div className="rounded-2xl border border-border bg-background p-4 flex items-center gap-3">
                <span className="text-2xl">🐄</span>
                <p className="text-base font-semibold text-foreground">
                  {t("onboarding:successScreen.animalsLoaded", { count: summary.animals })}
                </p>
              </div>
              {summary.corrals > 0 && (
                <div className="rounded-2xl border border-border bg-background p-4 flex items-center gap-3">
                  <span className="text-2xl">📍</span>
                  <p className="text-base font-semibold text-foreground">
                    {t("onboarding:successScreen.corralsCreated", { count: summary.corrals })}
                  </p>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-3 pt-6">
            <button
              type="button"
              onClick={() => {
                onComplete();
                navigate("/animals");
              }}
              className="w-full h-14 rounded-2xl text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99] transition-all shadow-md inline-flex items-center justify-center gap-2"
            >
              {t("onboarding:successScreen.viewHerd")}
              <ArrowRight className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={onComplete}
              className="w-full h-12 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("onboarding:successScreen.goDashboard")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Wizard body ----------
  return (
    <div className="min-h-[100dvh] bg-background flex flex-col sm:items-center sm:justify-center p-0 sm:p-6">
      <div className="w-full sm:max-w-2xl sm:rounded-3xl sm:shadow-xl sm:border sm:border-border bg-card flex flex-col min-h-[100dvh] sm:min-h-0">
        {/* Progress header */}
        <div className="px-6 pt-6 pb-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>
              {t("onboarding:wizard.stepLabel", {
                current: stepIndex + 1,
                total: STEP_ORDER.length,
              })}
            </span>
            <span>{t(`onboarding:wizard.labels.${currentKey}`)}</span>
          </div>
          <Progress value={progressPct} className="h-2" />
          <div className="flex items-center justify-between gap-2">
            {STEP_ORDER.map((key, i) => {
              const completed = i < stepIndex;
              const active = i === stepIndex;
              return (
                <div key={key} className="flex items-center gap-1.5 flex-1 min-w-0">
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all shrink-0 ${
                      completed
                        ? "bg-primary text-primary-foreground"
                        : active
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {completed ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </div>
                  <span
                    className={`text-xs font-medium truncate ${
                      active ? "text-foreground" : completed ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {t(`onboarding:wizard.labels.${key}`)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step body */}
        <div className="flex-1 px-6 pb-8 pt-2 overflow-y-auto">
          {currentKey === "animals" && (
            <AnimalStep
              onComplete={(count) => {
                setSummary((s) => ({ ...s, animals: count }));
                goNext();
              }}
            />
          )}
          {currentKey === "corrals" && (
            <CorralStep
              onComplete={(count) => {
                setSummary((s) => ({ ...s, corrals: count }));
                goNext();
              }}
              onSkip={goNext}
              onBack={goBack}
            />
          )}
          {currentKey === "vaccines" && (
            <VaccinesStep
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
