import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronDown, Plus, X, Trash2 } from "lucide-react";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";
import { toast } from "sonner";

type SexFilter = "all" | "Macho" | "Hembra";

interface VaccineConfig {
  vaccine_code: string;
  vaccine_name: string;
  vaccine_type: string;
  description: string;
  // user-editable
  selected: boolean;
  is_mandatory: boolean;
  sex: SexFilter;
  min_age_months?: number | "";
  max_age_months?: number | "";
  // metadata
  isCustom?: boolean;
  expanded?: boolean;
}

const presetVaccines: VaccineConfig[] = [
  { vaccine_code: "AFTOSA", vaccine_name: "Aftosa", vaccine_type: "Viral", description: "Vacuna obligatoria contra fiebre aftosa", selected: true, is_mandatory: true, sex: "all", min_age_months: 3, max_age_months: "" },
  { vaccine_code: "BRUCELOSIS", vaccine_name: "Brucelosis", vaccine_type: "Bacteriana", description: "Obligatoria en hembras", selected: true, is_mandatory: true, sex: "Hembra", min_age_months: 3, max_age_months: 8 },
  { vaccine_code: "CARBUNCO", vaccine_name: "Carbunco", vaccine_type: "Bacteriana", description: "Carbunco sintomático", selected: false, is_mandatory: false, sex: "all", min_age_months: 6, max_age_months: "" },
  { vaccine_code: "MANCHA_GANGRENA", vaccine_name: "Mancha/Gangrena", vaccine_type: "Bacteriana", description: "Enfermedades clostridiales", selected: false, is_mandatory: false, sex: "all", min_age_months: 2, max_age_months: "" },
  { vaccine_code: "IBR_DVB", vaccine_name: "IBR/DVB", vaccine_type: "Viral", description: "Rinotraqueitis y diarrea viral bovina", selected: false, is_mandatory: false, sex: "all", min_age_months: 6, max_age_months: "" },
];

interface VaccinesStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const VaccinesStep = ({ onComplete, onSkip }: VaccinesStepProps) => {
  const { t } = useTranslation(["onboarding"]);
  const [vaccines, setVaccines] = useState<VaccineConfig[]>(presetVaccines);
  const [loading, setLoading] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const { createRequirement } = useVaccinationRequirements();

  const update = (idx: number, patch: Partial<VaccineConfig>) => {
    setVaccines((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const toggleExpand = (idx: number) => {
    setVaccines((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, expanded: !v.expanded } : v))
    );
  };

  const removeCustom = (idx: number) => {
    setVaccines((prev) => prev.filter((_, i) => i !== idx));
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    const code = `CUSTOM_${customName.trim().toUpperCase().replace(/\s+/g, "_")}_${Date.now()}`;
    setVaccines((prev) => [
      ...prev,
      {
        vaccine_code: code,
        vaccine_name: customName.trim(),
        vaccine_type: "Personalizada",
        description: customDesc.trim(),
        selected: true,
        is_mandatory: false,
        sex: "all",
        min_age_months: "",
        max_age_months: "",
        isCustom: true,
        expanded: true,
      },
    ]);
    setCustomName("");
    setCustomDesc("");
    setShowCustomForm(false);
  };

  const selectedCount = vaccines.filter((v) => v.selected).length;

  const handleContinue = async () => {
    if (selectedCount === 0) {
      toast.error(t("onboarding:selectVaccineOrSkip"));
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
            min_age_months: v.min_age_months === "" ? undefined : Number(v.min_age_months),
            max_age_months: v.max_age_months === "" ? undefined : Number(v.max_age_months),
            doses_required: 1,
            country: "Argentina",
          })
        )
      );
      onComplete();
    } catch {
      toast.error(t("onboarding:vaccinesStep.savingError"));
    } finally {
      setLoading(false);
    }
  };

  const summaryFor = (v: VaccineConfig) => {
    const parts: string[] = [];
    if (v.sex === "Macho") parts.push(t("onboarding:vaccinesStep.sexMale"));
    else if (v.sex === "Hembra") parts.push(t("onboarding:vaccinesStep.sexFemale"));
    else parts.push(t("onboarding:vaccinesStep.summary.all"));

    const min = v.min_age_months;
    const max = v.max_age_months;
    if (min !== "" && max !== "" && min !== undefined && max !== undefined) {
      parts.push(t("onboarding:vaccinesStep.summary.ageRange", { min, max }));
    } else if (min !== "" && min !== undefined) {
      parts.push(t("onboarding:vaccinesStep.summary.fromAge", { min }));
    } else if (max !== "" && max !== undefined) {
      parts.push(t("onboarding:vaccinesStep.summary.untilAge", { max }));
    }
    return parts.join(" · ");
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
          {t("onboarding:vaccinesStep.title")}
        </h2>
        <p className="text-base text-muted-foreground">
          {t("onboarding:vaccinesStep.subtitle")}
        </p>
      </div>

      <div className="space-y-3">
        {vaccines.map((v, idx) => {
          const isSelected = v.selected;
          return (
            <div
              key={v.vaccine_code}
              className={`rounded-2xl border-2 transition-colors ${
                isSelected ? "border-primary bg-primary/5" : "border-border bg-card"
              }`}
            >
              {/* Row header */}
              <div className="p-4 flex items-start gap-3">
                <button
                  type="button"
                  onClick={() => update(idx, { selected: !isSelected })}
                  className="mt-0.5 flex-shrink-0"
                  aria-label={v.vaccine_name}
                >
                  <Checkbox checked={isSelected} className="h-5 w-5 pointer-events-none" />
                </button>

                <button
                  type="button"
                  onClick={() => toggleExpand(idx)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-base text-foreground">
                      {v.vaccine_name}
                    </span>
                    {v.is_mandatory && (
                      <Badge className="bg-primary text-primary-foreground border-0 text-xs">
                        {t("onboarding:mandatory")}
                      </Badge>
                    )}
                    {v.isCustom && (
                      <Badge variant="outline" className="text-xs">
                        {t("onboarding:vaccinesStep.customVaccineName")}
                      </Badge>
                    )}
                  </div>
                  {v.description && (
                    <p className="text-sm text-muted-foreground leading-snug">
                      {v.description}
                    </p>
                  )}
                  {isSelected && (
                    <p className="text-xs text-foreground/70 mt-1.5 font-medium">
                      {summaryFor(v)}
                    </p>
                  )}
                </button>

                <div className="flex items-center gap-1">
                  {v.isCustom && (
                    <button
                      type="button"
                      onClick={() => removeCustom(idx)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                      aria-label={t("onboarding:vaccinesStep.remove")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleExpand(idx)}
                    className="p-2 text-muted-foreground"
                    aria-label={t("onboarding:vaccinesStep.configure")}
                  >
                    <ChevronDown
                      className={`h-5 w-5 transition-transform ${
                        v.expanded ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Expanded config */}
              {v.expanded && (
                <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border/50">
                  {/* Sex filter */}
                  <div className="space-y-2 pt-3">
                    <label className="block text-sm font-medium text-foreground">
                      {t("onboarding:vaccinesStep.sexFilter")}
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(["all", "Macho", "Hembra"] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => update(idx, { sex: opt })}
                          className={`min-h-[44px] px-3 text-sm font-medium rounded-xl border-2 transition-colors ${
                            v.sex === opt
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground"
                          }`}
                        >
                          {opt === "all"
                            ? t("onboarding:vaccinesStep.sexAll")
                            : opt === "Macho"
                            ? t("onboarding:vaccinesStep.sexMale")
                            : t("onboarding:vaccinesStep.sexFemale")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Age range */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-foreground">
                      {t("onboarding:vaccinesStep.ageFilter")}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        placeholder={t("onboarding:vaccinesStep.minAge")}
                        value={v.min_age_months ?? ""}
                        onChange={(e) =>
                          update(idx, {
                            min_age_months: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                        className="min-h-[48px] px-4 text-base rounded-xl border-2 border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        placeholder={t("onboarding:vaccinesStep.maxAge")}
                        value={v.max_age_months ?? ""}
                        onChange={(e) =>
                          update(idx, {
                            max_age_months: e.target.value === "" ? "" : Number(e.target.value),
                          })
                        }
                        className="min-h-[48px] px-4 text-base rounded-xl border-2 border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                      />
                    </div>
                  </div>

                  {/* Mandatory toggle */}
                  <label className="flex items-center gap-3 cursor-pointer min-h-[44px]">
                    <Checkbox
                      checked={v.is_mandatory}
                      onCheckedChange={(c) => update(idx, { is_mandatory: !!c })}
                      className="h-5 w-5"
                    />
                    <span className="text-sm font-medium text-foreground">
                      {t("onboarding:vaccinesStep.mandatory")}
                    </span>
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Custom vaccine form / add button */}
      {showCustomForm ? (
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4 space-y-3">
          <input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder={t("onboarding:vaccinesStep.customVaccineNamePlaceholder")}
            autoFocus
            className="w-full min-h-[48px] px-4 text-base rounded-xl border-2 border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <input
            value={customDesc}
            onChange={(e) => setCustomDesc(e.target.value)}
            placeholder={t("onboarding:vaccinesStep.customDescriptionPlaceholder")}
            className="w-full min-h-[48px] px-4 text-base rounded-xl border-2 border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setShowCustomForm(false);
                setCustomName("");
                setCustomDesc("");
              }}
              className="flex-1 h-12 rounded-xl border-2 border-border text-sm font-medium text-foreground"
            >
              <X className="h-4 w-4 inline mr-1" />
              {t("onboarding:vaccinesStep.cancel")}
            </button>
            <button
              type="button"
              onClick={addCustom}
              disabled={!customName.trim()}
              className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {t("onboarding:vaccinesStep.saveCustom")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCustomForm(true)}
          className="w-full min-h-[52px] rounded-2xl border-2 border-dashed border-primary/40 text-primary font-medium hover:bg-primary/5 transition-colors inline-flex items-center justify-center gap-2"
        >
          <Plus className="h-5 w-5" />
          {t("onboarding:vaccinesStep.addCustom")}
        </button>
      )}

      <div className="space-y-3 pt-2">
        <p className="text-xs text-center text-muted-foreground">
          {t("onboarding:vaccinesStep.selectedCount", { count: selectedCount })}
        </p>
        <button
          type="button"
          onClick={handleContinue}
          disabled={loading || selectedCount === 0}
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
