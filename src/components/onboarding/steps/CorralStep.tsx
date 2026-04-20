import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "sonner";
import { WizardStepShell } from "../WizardStepShell";

interface CorralStepProps {
  onComplete: () => void;
  onSkip: () => void;
  onBack: () => void;
}

export const CorralStep = ({ onComplete, onSkip, onBack }: CorralStepProps) => {
  const { t } = useTranslation(["onboarding"]);
  const { currentUser } = useSupabaseAuth();
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("");
  const [hectares, setHectares] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(t("onboarding:corralStep.nameRequired"));
      return;
    }
    if (!currentUser?.cabañaId) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("corrales").insert({
        name: name.trim(),
        capacity: capacity ? parseInt(capacity) : null,
        hectareas: hectares ? parseFloat(hectares) : null,
        cabaña_id: currentUser.cabañaId,
        user_id: currentUser.id,
      });
      if (error) throw error;
      toast.success(t("onboarding:corralStep.savedSuccess"));
      onComplete();
    } catch (e) {
      console.error(e);
      toast.error(t("onboarding:corralStep.savedError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardStepShell
      icon="🐄"
      title={t("onboarding:corralStep.title")}
      subtitle={t("onboarding:corralStep.subtitle")}
      onBack={onBack}
      onSkip={onSkip}
      onContinue={handleSubmit}
      loading={loading}
      continueDisabled={!name.trim()}
    >
      <div className="space-y-4">
        <Field
          id="corral-name"
          label={t("onboarding:corralStep.nameLabel")}
          placeholder={t("onboarding:corralStep.namePlaceholder")}
          value={name}
          onChange={setName}
          autoFocus
        />
        <Field
          id="corral-capacity"
          label={t("onboarding:corralStep.capacityLabel")}
          placeholder={t("onboarding:corralStep.capacityPlaceholder")}
          value={capacity}
          onChange={setCapacity}
          type="number"
          inputMode="numeric"
        />
        <Field
          id="corral-hectares"
          label={t("onboarding:corralStep.hectaresLabel")}
          placeholder={t("onboarding:corralStep.hectaresPlaceholder")}
          value={hectares}
          onChange={setHectares}
          type="number"
          inputMode="decimal"
        />
      </div>
    </WizardStepShell>
  );
};

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  inputMode,
  autoFocus,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: "numeric" | "decimal" | "text";
  autoFocus?: boolean;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-base font-medium text-foreground">
        {label}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full min-h-[48px] px-4 text-base rounded-xl border-2 border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
      />
    </div>
  );
}
