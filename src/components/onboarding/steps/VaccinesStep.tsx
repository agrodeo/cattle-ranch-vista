import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft } from "lucide-react";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";
import { toast } from "sonner";

interface VaccineTemplate {
  vaccine_code: string;
  vaccine_name: string;
  vaccine_type: string;
  description: string;
  is_mandatory: boolean;
  sex_restriction?: string;
  min_age_months?: number;
  max_age_months?: number;
  frequency_months?: number;
  doses_required?: number;
  interval_between_doses_days?: number;
  country: string;
}

const defaultVaccineTemplates: VaccineTemplate[] = [
  { vaccine_code: "AFTOSA", vaccine_name: "Aftosa", vaccine_type: "Viral", description: "Vacuna obligatoria contra fiebre aftosa", is_mandatory: true, min_age_months: 3, frequency_months: 6, doses_required: 1, country: "Argentina" },
  { vaccine_code: "BRUCELOSIS", vaccine_name: "Brucelosis", vaccine_type: "Bacteriana", description: "Vacuna obligatoria contra brucelosis en hembras", is_mandatory: true, sex_restriction: "Hembra", min_age_months: 3, max_age_months: 8, doses_required: 1, country: "Argentina" },
  { vaccine_code: "CARBUNCO", vaccine_name: "Carbunco", vaccine_type: "Bacteriana", description: "Vacuna contra carbunco sintomático", is_mandatory: false, min_age_months: 6, frequency_months: 12, doses_required: 1, country: "Argentina" },
  { vaccine_code: "MANCHA_GANGRENA", vaccine_name: "Mancha/Gangrena", vaccine_type: "Bacteriana", description: "Vacuna contra enfermedades clostridiales", is_mandatory: false, min_age_months: 2, frequency_months: 12, doses_required: 1, country: "Argentina" },
  { vaccine_code: "IBR_DVB", vaccine_name: "IBR/DVB", vaccine_type: "Viral", description: "Vacuna contra rinotraqueitis y diarrea viral bovina", is_mandatory: false, min_age_months: 6, frequency_months: 12, doses_required: 2, interval_between_doses_days: 30, country: "Argentina" },
];

interface VaccinesStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const VaccinesStep = ({ onComplete, onSkip }: VaccinesStepProps) => {
  const { t } = useTranslation(["onboarding"]);
  const [selected, setSelected] = useState<Set<number>>(new Set([0, 1]));
  const [loading, setLoading] = useState(false);
  const { createRequirement } = useVaccinationRequirements();

  const toggle = (i: number) => {
    const next = new Set(selected);
    next.has(i) ? next.delete(i) : next.add(i);
    setSelected(next);
  };

  const handleContinue = async () => {
    if (selected.size === 0) {
      toast.error(t("onboarding:selectVaccineOrSkip"));
      return;
    }
    setLoading(true);
    try {
      await Promise.all(
        Array.from(selected).map((i) => createRequirement(defaultVaccineTemplates[i]))
      );
      toast.success(t("onboarding:vaccinationConfiguredSuccess"));
      onComplete();
    } catch {
      toast.error(t("onboarding:vaccinesStep.savingError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="text-center space-y-3">
        <div className="text-6xl leading-none" aria-hidden>💉</div>
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          {t("onboarding:vaccinesStep.title")}
        </h2>
        <p className="text-base text-muted-foreground px-2">
          {t("onboarding:vaccinesStep.subtitle")}
        </p>
      </div>

      <div className="grid gap-3">
        {defaultVaccineTemplates.map((v, i) => {
          const isSelected = selected.has(i);
          return (
            <button
              key={v.vaccine_code}
              type="button"
              onClick={() => toggle(i)}
              className={`text-left p-4 rounded-2xl border-2 transition-all active:scale-[0.99] ${
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox checked={isSelected} className="mt-1 h-5 w-5" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-base text-foreground">{v.vaccine_name}</span>
                    {v.is_mandatory && (
                      <Badge className="bg-primary text-primary-foreground border-0 text-xs">
                        {t("onboarding:mandatory")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground leading-snug">{v.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-3 pt-2">
        <button
          type="button"
          onClick={handleContinue}
          disabled={loading || selected.size === 0}
          className="w-full h-14 rounded-2xl text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("onboarding:wizard.continue")}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={loading}
          className="w-full h-12 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          {t("onboarding:wizard.skip")}
        </button>
      </div>
    </div>
  );
};
