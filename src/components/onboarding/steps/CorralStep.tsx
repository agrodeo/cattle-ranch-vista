import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { toast } from "sonner";
import { WizardStepShell } from "../WizardStepShell";

interface CorralStepProps {
  onComplete: (count: number) => void;
  onSkip: () => void;
  onBack: () => void;
}

interface Row {
  id: string;
  name: string;
}

const makeRow = (): Row => ({
  id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
  name: "",
});

export const CorralStep = ({ onComplete, onSkip, onBack }: CorralStepProps) => {
  const { t } = useTranslation(["onboarding"]);
  const { currentUser } = useSupabaseAuth();
  const [rows, setRows] = useState<Row[]>(() => [makeRow(), makeRow(), makeRow()]);
  const [loading, setLoading] = useState(false);

  const valid = rows.filter((r) => r.name.trim());
  const canContinue = valid.length > 0;

  const update = (id: string, name: string) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, name } : r)));
  const remove = (id: string) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  const add = () => setRows((prev) => [...prev, makeRow()]);

  const handleSubmit = async () => {
    if (!currentUser?.cabañaId) return;
    if (valid.length === 0) {
      toast.error(t("onboarding:corralStep.nameRequired"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("corrales").insert(
        valid.map((r) => ({
          name: r.name.trim(),
          cabaña_id: currentUser.cabañaId,
          user_id: currentUser.id,
        })),
      );
      if (error) throw error;
      toast.success(t("onboarding:corralStep.savedSuccessBulk", { count: valid.length }));
      onComplete(valid.length);
    } catch (e) {
      console.error(e);
      toast.error(t("onboarding:corralStep.savedError"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <WizardStepShell
      title={t("onboarding:corralStep.title")}
      subtitle={t("onboarding:corralStep.introBulk")}
      onBack={onBack}
      onSkip={onSkip}
      onContinue={handleSubmit}
      loading={loading}
      continueDisabled={!canContinue}
    >
      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={r.id} className="flex items-center gap-2">
            <span className="w-6 text-xs font-medium text-muted-foreground text-right">{i + 1}.</span>
            <input
              value={r.name}
              onChange={(e) => update(r.id, e.target.value)}
              placeholder={t("onboarding:corralStep.namePlaceholder")}
              autoFocus={i === 0}
              className="flex-1 h-12 px-4 text-base rounded-xl border-2 border-border bg-background placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
            />
            <button
              type="button"
              onClick={() => remove(r.id)}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
              aria-label={t("onboarding:corralStep.removeRow")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={add}
          className="w-full h-12 rounded-xl border-2 border-dashed border-border text-sm font-medium text-foreground hover:border-primary/40 inline-flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          {t("onboarding:corralStep.addAnother")}
        </button>
      </div>
    </WizardStepShell>
  );
};
