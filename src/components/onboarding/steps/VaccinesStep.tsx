import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";

interface VaccineConfig {
  vaccine_code: string;
  vaccine_name: string;
  vaccine_type: string;
  description: string;
  is_mandatory: boolean;
  sex: "all" | "Macho" | "Hembra";
  min_age_months?: number;
  max_age_months?: number;
  selected: boolean;
}

const presetVaccines: VaccineConfig[] = [
  { vaccine_code: "AFTOSA", vaccine_name: "Aftosa", vaccine_type: "Viral", description: "Vacuna obligatoria contra fiebre aftosa", selected: true, is_mandatory: true, sex: "all", min_age_months: 3 },
  { vaccine_code: "BRUCELOSIS", vaccine_name: "Brucelosis", vaccine_type: "Bacteriana", description: "Obligatoria en hembras", selected: true, is_mandatory: true, sex: "Hembra", min_age_months: 3, max_age_months: 8 },
  { vaccine_code: "CARBUNCO", vaccine_name: "Carbunco", vaccine_type: "Bacteriana", description: "Carbunco sintomático", selected: true, is_mandatory: false, sex: "all", min_age_months: 6 },
  { vaccine_code: "MANCHA_GANGRENA", vaccine_name: "Mancha/Gangrena", vaccine_type: "Bacteriana", description: "Enfermedades clostridiales", selected: true, is_mandatory: false, sex: "all", min_age_months: 2 },
  { vaccine_code: "IBR_DVB", vaccine_name: "IBR/DVB", vaccine_type: "Viral", description: "Rinotraqueitis y diarrea viral bovina", selected: true, is_mandatory: false, sex: "all", min_age_months: 6 },
];

interface VaccinesStepProps {
  onComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export const VaccinesStep = ({ onComplete, onSkip, onBack }: VaccinesStepProps) => {
  const { t } = useTranslation(["onboarding"]);
  const [vaccines, setVaccines] = useState<VaccineConfig[]>(presetVaccines);
  const [loading, setLoading] = useState(false);
  const { createRequirement } = useVaccinationRequirements();

  const toggle = (idx: number) =>
    setVaccines((prev) => prev.map((v, i) => (i === idx ? { ...v, selected: !v.selected } : v)));

  const selectedCount = vaccines.filter((v) => v.selected).length;

  const handleContinue = async () => {
    if (selectedCount === 0) {
      onSkip();
      return;
    }
    setLoading(true);
    try {
      const selected = vaccines.filter((v) => v.selected);
      await Promise.all(
        selected.map((v) =>
          createRequirement({
            vaccine_code: v.vaccine_code,
            vaccine_name: v.vaccine_name,
            vaccine_type: v.vaccine_type,
            description: v.description || undefined,
            is_mandatory: v.is_mandatory,
            sex_restriction: v.sex === "all" ? null : v.sex,
            min_age_months: v.min_age_months,
            max_age_months: v.max_age_months,
            doses_required: 1,
            country: "Argentina",
          }),
        ),
      );
      onComplete();
    } catch {
      toast.error(t("onboarding:vaccinesStep.savingError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <button
        type="button"
        onClick={onBack}
        className="self-start inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground -ml-2 px-2 py-1 rounded-md"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("onboarding:wizard.back")}
      </button>

      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          {t("onboarding:vaccinesStep.title")}
        </h2>
        <p className="text-base text-muted-foreground">
          {t("onboarding:vaccinesStep.introSimple")}
        </p>
      </div>

      <div className="space-y-2">
        {vaccines.map((v, idx) => (
          <button
            key={v.vaccine_code}
            type="button"
            onClick={() => toggle(idx)}
            className={`w-full text-left rounded-2xl border-2 p-4 flex items-start gap-3 transition-colors ${
              v.selected ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <Checkbox checked={v.selected} className="h-5 w-5 mt-0.5 pointer-events-none" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-base text-foreground">{v.vaccine_name}</p>
              {v.description && (
                <p className="text-sm text-muted-foreground leading-snug mt-0.5">{v.description}</p>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="space-y-3 pt-2">
        <p className="text-xs text-center text-muted-foreground">
          {t("onboarding:vaccinesStep.selectedCount", { count: selectedCount })}
        </p>
        <button
          type="button"
          onClick={handleContinue}
          disabled={loading}
          className="w-full h-14 rounded-2xl text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("onboarding:wizard.finish")}
        </button>
        <button
          type="button"
          onClick={onSkip}
          disabled={loading}
          className="w-full h-12 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          {t("onboarding:vaccinesStep.skipLabel")}
        </button>
      </div>
    </div>
  );
};
