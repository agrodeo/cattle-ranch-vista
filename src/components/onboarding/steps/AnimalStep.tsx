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

const CATEGORIES = ["Toro", "Vaca", "Ternero", "Ternera", "Vaquillona", "Novillo"] as const;
type Category = (typeof CATEGORIES)[number];

// Map category → sex/status flags compatible with the rest of the app
const categoryToFields = (cat: Category) => {
  switch (cat) {
    case "Toro":
      return { sex: "Macho", status: "Activo", is_castrated: false };
    case "Vaca":
      return { sex: "Hembra", status: "Activo", is_castrated: false };
    case "Ternero":
      return { sex: "Macho", status: "Activo", is_castrated: false };
    case "Ternera":
      return { sex: "Hembra", status: "Activo", is_castrated: false };
    case "Vaquillona":
      return { sex: "Hembra", status: "Activo", is_castrated: false };
    case "Novillo":
      return { sex: "Macho", status: "Activo", is_castrated: true };
  }
};

export const AnimalStep = ({ onComplete, onSkip, onBack }: AnimalStepProps) => {
  const { t } = useTranslation(["onboarding"]);
  const { currentUser } = useSupabaseAuth();
  const [tag, setTag] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [breed, setBreed] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!tag.trim()) {
      toast.error(t("onboarding:animalStep.tagRequired"));
      return;
    }
    if (!category) {
      toast.error(t("onboarding:animalStep.categoryRequired"));
      return;
    }
    if (!currentUser?.cabañaId) return;
    setLoading(true);
    try {
      const fields = categoryToFields(category as Category);
      const { error } = await supabase.from("animals").insert([
        {
          id_tag: tag.trim(),
          name: tag.trim(),
          breed: breed.trim() || null,
          birth_date: birthDate || null,
          cabaña_id: currentUser.cabañaId,
          ...fields,
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

  return (
    <WizardStepShell
      title={t("onboarding:animalStep.title")}
      subtitle={t("onboarding:animalStep.subtitle")}
      onBack={onBack}
      onSkip={onSkip}
      onContinue={handleSubmit}
      loading={loading}
      continueDisabled={!tag.trim() || !category}
      isFinal
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="animal-tag" className="block text-base font-medium text-foreground">
            {t("onboarding:animalStep.tagLabel")}
          </label>
          <input
            id="animal-tag"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            placeholder={t("onboarding:animalStep.tagPlaceholder")}
            autoFocus
            className="w-full min-h-[48px] px-4 text-base rounded-xl border-2 border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="animal-category" className="block text-base font-medium text-foreground">
            {t("onboarding:animalStep.categoryLabel")}
          </label>
          <select
            id="animal-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category)}
            className="w-full min-h-[48px] px-4 text-base rounded-xl border-2 border-border bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          >
            <option value="">{t("onboarding:animalStep.categoryPlaceholder")}</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {t(`onboarding:animalStep.categories.${c}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="animal-breed" className="block text-base font-medium text-foreground">
            {t("onboarding:animalStep.breedLabel")}
          </label>
          <input
            id="animal-breed"
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
            placeholder={t("onboarding:animalStep.breedPlaceholder")}
            className="w-full min-h-[48px] px-4 text-base rounded-xl border-2 border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="animal-birth" className="block text-base font-medium text-foreground">
            {t("onboarding:animalStep.birthDateLabel")}
          </label>
          <input
            id="animal-birth"
            type="date"
            value={birthDate}
            onChange={(e) => setBirthDate(e.target.value)}
            className="w-full min-h-[48px] px-4 text-base rounded-xl border-2 border-border bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
      </div>
    </WizardStepShell>
  );
};
