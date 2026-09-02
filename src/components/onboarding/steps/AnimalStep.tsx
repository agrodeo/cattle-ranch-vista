import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Loader2,
  Plus,
  Trash2,
  ChevronDown,
  Wand2,
  ArrowLeft,
  FileSpreadsheet,
  Keyboard,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { ARGENTINE_BREEDS } from "@/components/animals/AnimalFormDialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import AnimalExcelUploadAdvanced from "@/components/excel-upload/AnimalExcelUploadAdvanced";
import { toast } from "sonner";

interface AnimalStepProps {
  onComplete: (count: number) => void;
  onSkip?: () => void;
  onBack?: () => void;
}

type Mode = "chooser" | "excel" | "range" | "manual";

interface OnboardingAnimalRow {
  id: string;
  id_tag: string;
  sex: "" | "Macho" | "Hembra";
  birth_year: number | null;
  breed: string;
  category: string;
  birth_date: string;
  isDuplicate: boolean;
  existsInDb: boolean;
}

interface BatchDefaults {
  birth_year: number;
  breed: string;
  category: string;
}

const makeRow = (defaults?: Partial<BatchDefaults>): OnboardingAnimalRow => ({
  id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`,
  id_tag: "",
  sex: "",
  birth_year: defaults?.birth_year ?? null,
  breed: defaults?.breed ?? "",
  category: defaults?.category ?? "",
  birth_date: "",
  isDuplicate: false,
  existsInDb: false,
});

const inputCls =
  "w-full h-12 px-3 text-base rounded-lg border-2 border-border bg-background focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors";

export const AnimalStep = ({ onComplete, onSkip, onBack }: AnimalStepProps) => {
  const { t } = useTranslation(["onboarding"]);
  const { currentUser } = useSupabaseAuth();
  const { subscriptionStatus, planNames } = useSubscription();

  const currentYear = new Date().getFullYear();
  const [mode, setMode] = useState<Mode>("chooser");
  const [defaults, setDefaults] = useState<BatchDefaults>({
    birth_year: currentYear - 2,
    breed: "",
    category: "",
  });
  const [rows, setRows] = useState<OnboardingAnimalRow[]>(() =>
    Array.from({ length: 5 }, () => makeRow({ birth_year: currentYear - 2 })),
  );
  const [existingTags, setExistingTags] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [showDefaults, setShowDefaults] = useState(false);

  // Range generator state
  const [rangePrefix, setRangePrefix] = useState("");
  const [rangeFrom, setRangeFrom] = useState<number | "">(1);
  const [rangeTo, setRangeTo] = useState<number | "">(20);
  const [rangeSex, setRangeSex] = useState<"Macho" | "Hembra">("Hembra");
  const [rangeYear, setRangeYear] = useState<number>(currentYear - 2);

  // Fetch existing tags once for dup check
  useEffect(() => {
    if (!currentUser?.cabañaId) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("animals")
        .select("id_tag")
        .eq("cabaña_id", currentUser.cabañaId);
      if (!cancelled && data) {
        setExistingTags(new Set(data.map((d) => (d.id_tag || "").trim().toLowerCase()).filter(Boolean)));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.cabañaId]);

  // Recompute duplicate flags whenever rows change
  const annotatedRows = useMemo(() => {
    const tagCounts = new Map<string, number>();
    rows.forEach((r) => {
      const tag = r.id_tag.trim().toLowerCase();
      if (tag) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
    return rows.map((r) => {
      const tag = r.id_tag.trim().toLowerCase();
      return {
        ...r,
        isDuplicate: !!tag && (tagCounts.get(tag) || 0) > 1,
        existsInDb: !!tag && existingTags.has(tag),
      };
    });
  }, [rows, existingTags]);

  const validRows = useMemo(
    () =>
      annotatedRows.filter(
        (r) =>
          r.id_tag.trim() &&
          r.sex &&
          (r.birth_year || defaults.birth_year) &&
          !r.isDuplicate &&
          !r.existsInDb,
      ),
    [annotatedRows, defaults.birth_year],
  );
  const readyCount = validRows.length;

  const update = (id: string, patch: Partial<OnboardingAnimalRow>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) =>
    setRows((prev) => (prev.length === 1 ? prev : prev.filter((r) => r.id !== id)));
  const addRows = (n: number) =>
    setRows((prev) => [...prev, ...Array.from({ length: n }, () => makeRow(defaults))]);

  // Auto-add 3 more rows when last row is filled
  useEffect(() => {
    if (mode !== "manual") return;
    const last = rows[rows.length - 1];
    if (last && last.id_tag.trim() && last.sex) {
      setRows((prev) => [...prev, ...Array.from({ length: 3 }, () => makeRow(defaults))]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows[rows.length - 1]?.id_tag, rows[rows.length - 1]?.sex, mode]);

  const rangeCount =
    Number.isFinite(Number(rangeTo)) && Number.isFinite(Number(rangeFrom))
      ? Math.max(0, Number(rangeTo) - Number(rangeFrom) + 1)
      : 0;

  const rangeTagAt = (n: number) => {
    const width = String(Number(rangeTo) || 0).length;
    const num = String(n).padStart(width, "0");
    return rangePrefix ? `${rangePrefix}-${num}` : num;
  };

  const generateRange = () => {
    const from = Number(rangeFrom);
    const to = Number(rangeTo);
    if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) {
      toast.error(t("onboarding:animalStep.rangeInvalid"));
      return;
    }
    const count = to - from + 1;
    if (count > 500) {
      toast.error(t("onboarding:animalStep.rangeTooLarge"));
      return;
    }
    const newRows: OnboardingAnimalRow[] = [];
    for (let i = from; i <= to; i++) {
      newRows.push({
        ...makeRow(defaults),
        id_tag: rangeTagAt(i),
        sex: rangeSex,
        birth_year: rangeYear,
      });
    }
    // Replace empty trailing rows, keep existing filled ones
    setRows((prev) => {
      const filled = prev.filter((r) => r.id_tag.trim() || r.sex);
      return [...filled, ...newRows, makeRow(defaults), makeRow(defaults)];
    });
    setMode("manual");
    toast.success(t("onboarding:animalStep.rangeGenerated", { count }));
  };

  const handleSubmit = async () => {
    if (!currentUser?.cabañaId) return;
    if (readyCount === 0) {
      toast.error(t("onboarding:animalStep.noValidRows"));
      return;
    }

    // Plan limit check
    if (subscriptionStatus) {
      const remaining = subscriptionStatus.maxAnimals - subscriptionStatus.currentAnimalsCount;
      if (readyCount > remaining) {
        toast.error(
          t("onboarding:animalStep.planLimitExceeded", {
            count: readyCount,
            max: subscriptionStatus.maxAnimals,
            plan: planNames[subscriptionStatus.plan],
          }),
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = validRows.map((r) => {
        const year = r.birth_year || defaults.birth_year;
        return {
          id_tag: r.id_tag.trim(),
          sex: r.sex,
          breed: r.breed || defaults.breed || null,
          birth_date: r.birth_date || `${year}-01-01`,
          status: "Activo",
          is_castrated: false,
          cabaña_id: currentUser.cabañaId,
        };
      });

      const { error } = await supabase.from("animals").insert(payload);
      if (error) throw error;

      toast.success(t("onboarding:animalStep.successCount", { count: payload.length }));
      onComplete(payload.length);
    } catch (e: any) {
      console.error(e);
      toast.error(
        e?.code === "23505"
          ? t("onboarding:animalStep.duplicateIdError")
          : t("onboarding:animalStep.savedError"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleExcelDone = async () => {
    let count = 0;
    if (currentUser?.cabañaId) {
      const { count: c } = await supabase
        .from("animals")
        .select("id", { count: "exact", head: true })
        .eq("cabaña_id", currentUser.cabañaId);
      count = c ?? 0;
    }
    onComplete(count);
  };

  // Permanent escape hatch — present on every screen of this step.
  const SkipLink = () =>
    onSkip ? (
      <button
        type="button"
        onClick={onSkip}
        className="w-full h-12 text-sm font-medium text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
      >
        {t("onboarding:animalStep.skipAndEnter")}
      </button>
    ) : null;

  const BackToChooser = () => (
    <button
      type="button"
      onClick={() => setMode("chooser")}
      className="self-start inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors -ml-2 px-2 py-1 rounded-md"
    >
      <ArrowLeft className="h-4 w-4" />
      {t("onboarding:animalStep.chooser.backToOptions")}
    </button>
  );

  const Heading = ({ title, subtitle }: { title: string; subtitle: string }) => (
    <div className="space-y-2">
      <h2 className="text-2xl sm:text-3xl font-bold text-foreground">{title}</h2>
      <p className="text-base text-muted-foreground">{subtitle}</p>
    </div>
  );

  // ---------- Chooser ----------
  if (mode === "chooser") {
    const options = [
      {
        key: "excel" as const,
        icon: FileSpreadsheet,
        badge: t("onboarding:animalStep.chooser.fastest"),
      },
      { key: "range" as const, icon: Wand2, badge: "" },
      { key: "manual" as const, icon: Keyboard, badge: "" },
    ];
    return (
      <div className="flex flex-col gap-5 animate-fade-in">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="self-start inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors -ml-2 px-2 py-1 rounded-md"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("onboarding:wizard.back")}
          </button>
        )}
        <Heading
          title={t("onboarding:animalStep.title")}
          subtitle={t("onboarding:animalStep.chooser.subtitle")}
        />
        <div className="space-y-3">
          {options.map((o) => {
            const Icon = o.icon;
            return (
              <button
                key={o.key}
                type="button"
                onClick={() => setMode(o.key)}
                className="w-full text-left rounded-2xl border-2 border-border bg-background p-4 hover:border-primary/50 transition-colors flex items-start gap-4"
              >
                <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-base font-semibold text-foreground">
                      {t(`onboarding:animalStep.chooser.${o.key}Title`)}
                    </p>
                    {o.badge && (
                      <span className="text-[11px] font-semibold text-primary bg-primary/10 rounded-full px-2 py-0.5">
                        {o.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {t(`onboarding:animalStep.chooser.${o.key}Desc`)}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 mt-3" />
              </button>
            );
          })}
        </div>
        <SkipLink />
      </div>
    );
  }

  // ---------- Excel ----------
  if (mode === "excel") {
    return (
      <div className="flex flex-col gap-5 animate-fade-in">
        <BackToChooser />
        <Heading
          title={t("onboarding:animalStep.chooser.excelTitle")}
          subtitle={t("onboarding:animalStep.chooser.excelDesc")}
        />
        {currentUser?.cabañaId && (
          <AnimalExcelUploadAdvanced
            userCabañaId={currentUser.cabañaId}
            onUploadComplete={handleExcelDone}
          />
        )}
        <SkipLink />
      </div>
    );
  }

  // ---------- Range ----------
  if (mode === "range") {
    return (
      <div className="flex flex-col gap-5 animate-fade-in">
        <BackToChooser />
        <Heading
          title={t("onboarding:animalStep.chooser.rangeTitle")}
          subtitle={t("onboarding:animalStep.chooser.rangeDesc")}
        />
        <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("onboarding:animalStep.rangePrefix")}
              </label>
              <input
                value={rangePrefix}
                onChange={(e) => setRangePrefix(e.target.value)}
                placeholder="AG"
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("onboarding:animalStep.rangeFrom")}
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={rangeFrom}
                onChange={(e) => setRangeFrom(e.target.value === "" ? "" : Number(e.target.value))}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("onboarding:animalStep.rangeTo")}
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={rangeTo}
                onChange={(e) => setRangeTo(e.target.value === "" ? "" : Number(e.target.value))}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("onboarding:animalStep.colSex")}
              </label>
              <select
                value={rangeSex}
                onChange={(e) => setRangeSex(e.target.value as "Macho" | "Hembra")}
                className={inputCls}
              >
                <option value="Hembra">{t("onboarding:animalStep.female")}</option>
                <option value="Macho">{t("onboarding:animalStep.male")}</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("onboarding:animalStep.colBirthYear")}
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={rangeYear}
                onChange={(e) => setRangeYear(Number(e.target.value) || currentYear)}
                className={inputCls}
              />
            </div>
          </div>
          {rangeCount > 0 && (
            <p className="text-sm text-foreground">
              {t("onboarding:animalStep.chooser.rangePreview", {
                count: rangeCount,
                first: rangeTagAt(Number(rangeFrom)),
                last: rangeTagAt(Number(rangeTo)),
              })}
            </p>
          )}
          <button
            type="button"
            onClick={generateRange}
            className="w-full h-12 rounded-lg bg-primary text-primary-foreground text-base font-semibold hover:bg-primary/90"
          >
            {t("onboarding:animalStep.rangeGenerate", { count: rangeCount })}
          </button>
        </div>
        <SkipLink />
      </div>
    );
  }

  // ---------- Manual table ----------
  return (
    <div className="flex flex-col gap-5 animate-fade-in">
      <BackToChooser />
      <Heading
        title={t("onboarding:animalStep.title")}
        subtitle={t("onboarding:animalStep.intro")}
      />

      {/* Defaults */}
      <Collapsible open={showDefaults} onOpenChange={setShowDefaults}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between rounded-xl border-2 border-dashed border-border px-4 py-3 text-sm font-medium text-foreground hover:border-primary/40 transition-colors"
          >
            <span className="inline-flex items-center gap-2">
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showDefaults ? "rotate-180" : ""}`}
              />
              {t("onboarding:animalStep.defaultsTitle")}
            </span>
            <span className="text-xs text-muted-foreground">
              {defaults.birth_year}
              {defaults.breed ? ` · ${defaults.breed}` : ""}
            </span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-border p-3 bg-background">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("onboarding:animalStep.colBirthYear")}
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={defaults.birth_year}
                onChange={(e) =>
                  setDefaults((d) => ({ ...d, birth_year: Number(e.target.value) || currentYear }))
                }
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("onboarding:animalStep.colBreed")}
              </label>
              <select
                value={defaults.breed}
                onChange={(e) => setDefaults((d) => ({ ...d, breed: e.target.value }))}
                className={inputCls}
              >
                <option value="">—</option>
                {ARGENTINE_BREEDS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">
                {t("onboarding:animalStep.colCategory")}
              </label>
              <input
                type="text"
                value={defaults.category}
                onChange={(e) => setDefaults((d) => ({ ...d, category: e.target.value }))}
                placeholder="—"
                className={inputCls}
              />
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left text-xs font-semibold text-muted-foreground">
                <th className="px-2 py-2 w-8">#</th>
                <th className="px-2 py-2 min-w-[120px]">{t("onboarding:animalStep.colTag")} *</th>
                <th className="px-2 py-2 min-w-[140px]">{t("onboarding:animalStep.colSex")} *</th>
                <th className="px-2 py-2 min-w-[90px]">{t("onboarding:animalStep.colBirthYear")} *</th>
                <th className="px-2 py-2 min-w-[120px]">{t("onboarding:animalStep.colBreed")}</th>
                <th className="px-2 py-2 min-w-[140px]">{t("onboarding:animalStep.colBirthDate")}</th>
                <th className="px-2 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {annotatedRows.map((r, idx) => {
                const errClass = r.isDuplicate
                  ? "ring-2 ring-destructive/60"
                  : r.existsInDb
                  ? "ring-2 ring-amber-500/60"
                  : "";
                return (
                  <tr key={r.id} className="border-t border-border align-middle">
                    <td className="px-2 py-2 text-xs text-muted-foreground">{idx + 1}</td>
                    <td className="px-2 py-2">
                      <input
                        value={r.id_tag}
                        onChange={(e) => update(r.id, { id_tag: e.target.value })}
                        placeholder="0123"
                        className={`${inputCls} ${errClass}`}
                      />
                      {(r.isDuplicate || r.existsInDb) && (
                        <p className="text-[10px] text-destructive mt-0.5">
                          {r.existsInDb
                            ? t("onboarding:animalStep.alreadyExists")
                            : t("onboarding:animalStep.duplicateRow")}
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <div className="grid grid-cols-2 gap-1">
                        {(["Macho", "Hembra"] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => update(r.id, { sex: r.sex === s ? "" : s })}
                            className={`h-12 rounded-lg text-xs font-semibold border-2 transition-colors ${
                              r.sex === s
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-foreground hover:border-primary/40"
                            }`}
                          >
                            {s === "Macho" ? "♂" : "♀"} {s === "Macho" ? t("onboarding:animalStep.male") : t("onboarding:animalStep.female")}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="number"
                        inputMode="numeric"
                        value={r.birth_year ?? ""}
                        onChange={(e) =>
                          update(r.id, {
                            birth_year: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                        placeholder={String(defaults.birth_year)}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        value={r.breed}
                        onChange={(e) => update(r.id, { breed: e.target.value })}
                        className={inputCls}
                      >
                        <option value="">{defaults.breed || "—"}</option>
                        {ARGENTINE_BREEDS.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="date"
                        value={r.birth_date}
                        max={new Date().toISOString().split("T")[0]}
                        onChange={(e) => update(r.id, { birth_date: e.target.value })}
                        className={inputCls}
                      />
                    </td>
                    <td className="px-2 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => remove(r.id)}
                        className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={t("onboarding:animalStep.removeRow")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => addRows(5)}
          className="inline-flex items-center gap-1.5 h-11 px-3 rounded-lg border-2 border-dashed border-border text-sm font-medium text-foreground hover:border-primary/40"
        >
          <Plus className="h-4 w-4" />
          {t("onboarding:animalStep.addRows")}
        </button>
        <button
          type="button"
          onClick={() => setMode("range")}
          className="inline-flex items-center gap-1.5 h-11 px-3 rounded-lg border-2 border-dashed border-primary/40 text-sm font-medium text-primary hover:bg-primary/5"
        >
          <Wand2 className="h-4 w-4" />
          {t("onboarding:animalStep.rangeToggle")}
        </button>
      </div>

      {/* Submit */}
      <div className="sticky bottom-0 -mx-6 px-6 pt-3 pb-2 bg-card border-t border-border space-y-2">
        <p className="text-xs text-center text-muted-foreground">
          {t("onboarding:animalStep.readyCount", { count: readyCount })}
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting || readyCount === 0}
          className="w-full h-14 rounded-2xl text-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99] transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            t("onboarding:animalStep.submit", { count: readyCount })
          )}
        </button>
        <SkipLink />
      </div>
    </div>
  );
};
