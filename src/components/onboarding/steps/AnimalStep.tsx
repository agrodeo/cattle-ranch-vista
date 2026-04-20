import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "sonner";
import { WizardStepShell } from "../WizardStepShell";

interface AnimalStepProps {
  onComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
}

// Match the breed list used in AnimalFormDialog so onboarding stays consistent with the rest of the app
const BREEDS = [
  "Angus", "Hereford", "Shorthorn", "Charolais", "Limousin", "Simmental",
  "Brahman", "Nelore", "Braford", "Brangus", "Santa Gertrudis", "Senepol",
  "Bonsmara", "Holando Argentino", "Jersey", "Criollo", "Wagyu", "Corriente", "Otro",
];

export const AnimalStep = ({ onComplete, onSkip, onBack }: AnimalStepProps) => {
  const { t } = useTranslation(["onboarding"]);
  const { currentUser } = useSupabaseAuth();
  const [name, setName] = useState("");
  const [idTag, setIdTag] = useState("");
  const [sex, setSex] = useState<"" | "Macho" | "Hembra">("");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);

  const canContinue = !!idTag.trim() && !!sex && !!breed && !!birthDate;

  const handleSubmit = async () => {
    if (!idTag.trim()) return toast.error(t("onboarding:animalStep.tagRequired"));
    if (!sex) return toast.error(t("onboarding:animalStep.sexRequired"));
    if (!breed) return toast.error(t("onboarding:animalStep.breedRequired"));
    if (!birthDate) return toast.error(t("onboarding:animalStep.birthDateRequired"));
    if (!currentUser?.cabañaId) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("animals").insert([
        {
          id_tag: idTag.trim(),
          name: name.trim() || null,
          breed,
          birth_date: birthDate,
          sex,
          status: "Activo",
          is_castrated: false,
          cabaña_id: currentUser.cabañaId,
        },
      ]);
      if (error) throw error;
      toast.success(t("onboarding:animalStep.savedSuccess"));
      onComplete();
    } catch (e) {
      console.error(e);
      toast.error(t("onboarding:animalStep.savedError"));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full min-h-[48px] px-4 text-base rounded-xl border-2 border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";

  return (
    <WizardStepShell
      title={t("onboarding:animalStep.title")}
      subtitle={t("onboarding:animalStep.subtitle")}
      onBack={onBack}
      onSkip={onSkip}
      onContinue={handleSubmit}
      loading={loading}
      continueDisabled={!canContinue}
      isFinal
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="animal-tag" className="block text-base font-medium text-foreground">
            {t("onboarding:animalStep.tagLabel")} *
          </label>
          <input
            id="animal-tag"
            value={idTag}
            onChange={(e) => setIdTag(e.target.value)}
            placeholder={t("onboarding:animalStep.tagPlaceholder")}
            autoFocus
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="animal-name" className="block text-base font-medium text-foreground">
            {t("onboarding:animalStep.nameLabel")}
          </label>
          <input
            id="animal-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("onboarding:animalStep.namePlaceholder")}
            className={inputClass}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="animal-sex" className="block text-base font-medium text-foreground">
            {t("onboarding:animalStep.sexLabel")} *
          </label>
          <select
            id="animal-sex"
            value={sex}
            onChange={(e) => setSex(e.target.value as "Macho" | "Hembra")}
            className={inputClass}
          >
            <option value="">{t("onboarding:animalStep.sexPlaceholder")}</option>
            <option value="Macho">{t("onboarding:animalStep.sexMale")}</option>
            <option value="Hembra">{t("onboarding:animalStep.sexFemale")}</option>
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="animal-breed" className="block text-base font-medium text-foreground">
            {t("onboarding:animalStep.breedLabel")} *
          </label>
          <select
            id="animal-breed"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            className={inputClass}
          >
            <option value="">{t("onboarding:animalStep.breedPlaceholder")}</option>
            {BREEDS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="animal-birth" className="block text-base font-medium text-foreground">
            {t("onboarding:animalStep.birthDateLabel")} *
          </label>
          <input
            id="animal-birth"
            type="date"
            value={birthDate}
            max={new Date().toISOString().split("T")[0]}
            onChange={(e) => setBirthDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
    </WizardStepShell>
  );
};
