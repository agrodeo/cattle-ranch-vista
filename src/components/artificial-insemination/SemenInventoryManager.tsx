import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, AlertTriangle, Beaker } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSemenInventory, type SemenInventoryRow, type StrawType } from "@/hooks/useSemenInventory";
import { toast } from "sonner";

interface BullOption { id: string; name: string }

export function SemenInventoryManager() {
  const { t } = useTranslation(["semenInventory", "common"]);
  const { items, isLoading, upsert, remove, lowStock } = useSemenInventory();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SemenInventoryRow | null>(null);
  const [bulls, setBulls] = useState<BullOption[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("bulls").select("id, name").order("name");
      setBulls((data || []) as BullOption[]);
    })();
  }, []);

  const openCreate = () => { setEditing(null); setOpen(true); };
  const openEdit = (row: SemenInventoryRow) => { setEditing(row); setOpen(true); };

  const handleDelete = async (row: SemenInventoryRow) => {
    if (!window.confirm(t("confirmDelete"))) return;
    try {
      await remove.mutateAsync(row.id);
      toast.success(t("saved"));
    } catch (e: any) {
      toast.error(e?.message ?? t("saveError"));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Beaker className="h-5 w-5" /> {t("title")}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" /> {t("addStraw")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {lowStock.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{t("lowStockMessage", { count: lowStock.length })}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noStock")}</p>
        ) : (
          <div className="space-y-2">
            {items.map((row) => {
              const bullName = row.bull_id
                ? bulls.find(b => b.id === row.bull_id)?.name ?? t("bull")
                : (row.bull_manual as any)?.name ?? t("bullManual");
              const location = [row.tank, row.canister, row.cane_position].filter(Boolean).join(" / ");
              const isLow = row.doses_remaining <= 5;
              return (
                <div key={row.id} className="flex items-center justify-between gap-3 rounded-2xl border p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium truncate">{bullName}</span>
                      {row.batch_code && <Badge variant="outline">{row.batch_code}</Badge>}
                      <Badge variant="secondary">{t(`type_${row.straw_type}`)}</Badge>
                      {isLow && <Badge variant="destructive">{t("lowStock")}</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t("remainingOf", { remaining: row.doses_remaining, total: row.doses_total })}
                      {location && ` · ${t("location")}: ${location}`}
                      {row.centro_semen && ` · ${row.centro_semen}`}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(row)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(row)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <SemenInventoryDialog
        open={open}
        onOpenChange={setOpen}
        bulls={bulls}
        initial={editing}
        onSave={async (values) => {
          try {
            await upsert.mutateAsync(values);
            toast.success(t("saved"));
            setOpen(false);
          } catch (e: any) {
            toast.error(e?.message ?? t("saveError"));
          }
        }}
      />
    </Card>
  );
}

interface DialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  bulls: BullOption[];
  initial: SemenInventoryRow | null;
  onSave: (values: Partial<SemenInventoryRow>) => Promise<void>;
}

function SemenInventoryDialog({ open, onOpenChange, bulls, initial, onSave }: DialogProps) {
  const { t } = useTranslation(["semenInventory", "common"]);
  const [form, setForm] = useState<Partial<SemenInventoryRow>>({});

  useEffect(() => {
    if (open) {
      setForm(initial ?? {
        straw_type: "convencional",
        doses_total: 0,
        doses_remaining: 0,
        currency: "USD",
      });
    }
  }, [open, initial]);

  const set = <K extends keyof SemenInventoryRow>(key: K, value: SemenInventoryRow[K] | null) =>
    setForm(prev => ({ ...prev, [key]: value as any }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? t("editStraw") : t("addStraw")}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label>{t("bull")}</Label>
            <Select
              value={(form.bull_id as string) ?? "__manual__"}
              onValueChange={(v) => set("bull_id", v === "__manual__" ? null : (v as any))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__manual__">{t("bullManual")}</SelectItem>
                {bulls.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("batchCode")}</Label>
            <Input value={form.batch_code ?? ""} onChange={(e) => set("batch_code", e.target.value)} />
          </div>
          <div>
            <Label>{t("strawType")}</Label>
            <Select value={form.straw_type as string} onValueChange={(v) => set("straw_type", v as StrawType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="convencional">{t("type_convencional")}</SelectItem>
                <SelectItem value="sexado_hembra">{t("type_sexado_hembra")}</SelectItem>
                <SelectItem value="sexado_macho">{t("type_sexado_macho")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>{t("centroSemen")}</Label>
            <Input value={form.centro_semen ?? ""} onChange={(e) => set("centro_semen", e.target.value)} />
          </div>
          <div>
            <Label>{t("dosesTotal")}</Label>
            <Input type="number" min="0" value={form.doses_total ?? 0}
              onChange={(e) => {
                const n = Number(e.target.value) || 0;
                setForm(prev => ({
                  ...prev,
                  doses_total: n,
                  doses_remaining: initial ? prev.doses_remaining : n,
                }));
              }} />
          </div>
          <div>
            <Label>{t("dosesRemaining")}</Label>
            <Input type="number" min="0" value={form.doses_remaining ?? 0}
              onChange={(e) => set("doses_remaining", Number(e.target.value) || 0)} />
          </div>
          <div>
            <Label>{t("tank")}</Label>
            <Input value={form.tank ?? ""} onChange={(e) => set("tank", e.target.value)} />
          </div>
          <div>
            <Label>{t("canister")}</Label>
            <Input value={form.canister ?? ""} onChange={(e) => set("canister", e.target.value)} />
          </div>
          <div>
            <Label>{t("canePosition")}</Label>
            <Input value={form.cane_position ?? ""} onChange={(e) => set("cane_position", e.target.value)} />
          </div>
          <div>
            <Label>{t("costPerDose")}</Label>
            <Input type="number" step="0.01" min="0" value={form.cost_per_dose ?? ""}
              onChange={(e) => set("cost_per_dose", e.target.value === "" ? null : Number(e.target.value))} />
          </div>
          <div>
            <Label>{t("currency")}</Label>
            <Input value={form.currency ?? "USD"} onChange={(e) => set("currency", e.target.value)} />
          </div>
          <div>
            <Label>{t("purchaseDate")}</Label>
            <Input type="date" value={form.purchase_date ?? ""}
              onChange={(e) => set("purchase_date", e.target.value || null)} />
          </div>
          <div className="md:col-span-2">
            <Label>{t("notes")}</Label>
            <Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t("cancel")}</Button>
          <Button onClick={() => onSave(form)}>{t("save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
