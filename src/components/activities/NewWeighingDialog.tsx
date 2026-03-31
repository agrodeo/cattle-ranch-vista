import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { Scale, TrendingUp, TrendingDown, Minus, Search, CheckSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivityFormHeader } from "./shared/ActivityFormHeader";
import { ActivityDatePicker } from "./shared/ActivityDatePicker";

interface WeighingRecord {
  animalId: string;
  weight: string;
}

interface WeighingDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewWeighingDialog({ open: externalOpen, onOpenChange, onSuccess }: WeighingDialogProps) {
  const { t } = useTranslation(['activities']);
  const [open, setOpen] = useState(externalOpen || false);
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [weighingRecords, setWeighingRecords] = useState<WeighingRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [fecha, setFecha] = useState<Date>(new Date());
  const [notas, setNotas] = useState("");

  const { toast } = useToast();
  const { getEligibleAnimals, createEvent } = useActivities();

  useEffect(() => {
    if (externalOpen !== undefined) setOpen(externalOpen);
  }, [externalOpen]);

  useEffect(() => {
    if (open) loadAnimals();
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const loadAnimals = async () => {
    try {
      setLoading(true);
      const eligibleAnimals = await getEligibleAnimals('PESAJE');
      setAnimals(eligibleAnimals);
    } catch (error) {
      console.error("Error loading animals:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnimals = animals.filter(a => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return a.name?.toLowerCase().includes(q) || a.id_tag?.toLowerCase().includes(q);
  });

  const handleAnimalSelection = (animalId: string, checked: boolean) => {
    if (checked) {
      setSelectedAnimals(prev => [...prev, animalId]);
      setWeighingRecords(prev => [...prev, { animalId, weight: "" }]);
    } else {
      setSelectedAnimals(prev => prev.filter(id => id !== animalId));
      setWeighingRecords(prev => prev.filter(record => record.animalId !== animalId));
    }
  };

  const updateWeight = (animalId: string, weight: string) => {
    setWeighingRecords(prev =>
      prev.map(record => record.animalId === animalId ? { ...record, weight } : record)
    );
  };

  const selectAllAnimals = () => {
    const allIds = filteredAnimals.map(a => a.id);
    setSelectedAnimals(allIds);
    setWeighingRecords(allIds.map(id => {
      const existing = weighingRecords.find(r => r.animalId === id);
      return existing || { animalId: id, weight: "" };
    }));
  };

  const clearSelection = () => {
    setSelectedAnimals([]);
    setWeighingRecords([]);
  };

  const handleSubmit = async () => {
    try {
      if (selectedAnimals.length === 0) {
        toast({ variant: "destructive", title: "Error", description: t('activities:newGeneralActivity.errorSelectAnimal') });
        return;
      }
      const invalidRecords = weighingRecords.filter(r =>
        !r.weight || isNaN(Number(r.weight)) || Number(r.weight) <= 0
      );
      if (invalidRecords.length > 0) {
        toast({ variant: "destructive", title: t('activities:newWeighing.errorTitle'), description: t('activities:newWeighing.errorInvalidWeight') });
        return;
      }
      setLoading(true);
      const event = await createEvent('PESAJE', fecha, notas);
      const mediciones = weighingRecords.map(r => ({ animal_id: r.animalId, peso_kg: Number(r.weight) }));
      const { error } = await supabase.from("pesajes").insert({ evento_id: event.id, mediciones });
      if (error) throw error;
      toast({ title: t('activities:newWeighing.successTitle'), description: t('activities:newWeighing.successDesc', { count: selectedAnimals.length }) });
      setNotas(""); setSelectedAnimals([]); setWeighingRecords([]); setOpen(false); onOpenChange?.(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving weighing:", error);
      toast({ variant: "destructive", title: t('activities:newWeighing.errorTitle'), description: t('activities:newWeighing.errorSaving') });
    } finally {
      setLoading(false);
    }
  };

  const getWeightDiff = (animal: any, newWeight: string) => {
    if (!animal.peso_actual_kg || !newWeight || isNaN(Number(newWeight))) return null;
    return Number(newWeight) - animal.peso_actual_kg;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <ActivityFormHeader
            icon={Scale}
            iconColor="text-blue-600"
            title={t('activities:newWeighing.title')}
            subtitle={t('activities:newWeighing.description')}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Date + Notes */}
          <div className="grid gap-4 sm:grid-cols-2">
            <ActivityDatePicker
              label={t('activities:newWeighing.dateLabel')}
              date={fecha}
              onDateChange={setFecha}
            />
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('activities:newWeighing.observations')}</Label>
              <Textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder={t('activities:newWeighing.observationsPlaceholder')}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {animals.length === 0 && !loading && (
            <div className="text-center py-8 space-y-2">
              <Scale className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="text-muted-foreground">{t('activities:newWeighing.noEligibleAnimals')}</p>
            </div>
          )}

          {animals.length > 0 && (
            <>
              {/* Animal selector toolbar */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  {t('activities:newWeighing.animalsLabel')} ({animals.length})
                </Label>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-10" />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={selectAllAnimals} className="shrink-0 gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t('activities:newWeighing.selectAll')}</span>
                  </Button>
                  {selectedAnimals.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={clearSelection} className="shrink-0 text-muted-foreground">
                      {t('activities:newWeighing.clear')}
                    </Button>
                  )}
                </div>

                {selectedAnimals.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/5 border border-blue-500/20">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-700">{selectedAnimals.length}</span>
                    <span className="text-sm text-blue-600/80">seleccionados</span>
                  </div>
                )}

                {/* Animal list with weight inputs */}
                <div className="max-h-80 overflow-y-auto rounded-xl border border-border divide-y divide-border/50">
                  {filteredAnimals.map(animal => {
                    const isSelected = selectedAnimals.includes(animal.id);
                    const record = weighingRecords.find(r => r.animalId === animal.id);
                    const diff = isSelected ? getWeightDiff(animal, record?.weight || "") : null;

                    return (
                      <div key={animal.id} className={cn(
                        "px-3 py-3 transition-colors",
                        isSelected ? "bg-blue-500/5" : "hover:bg-muted/50"
                      )}>
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(c) => handleAnimalSelection(animal.id, c as boolean)}
                            className="shrink-0"
                          />
                          <div className="flex-1 min-w-0" onClick={() => handleAnimalSelection(animal.id, !isSelected)}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-semibold">{animal.id_tag}</span>
                              {animal.name && <span className="text-sm text-muted-foreground truncate">{animal.name}</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-muted-foreground">{animal.sex}</span>
                              {animal.peso_actual_kg && (
                                <>
                                  <span className="text-xs text-muted-foreground/40">·</span>
                                  <span className="text-xs text-muted-foreground">Actual: {animal.peso_actual_kg} kg</span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Weight input (visible when selected) */}
                          {isSelected && (
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  inputMode="decimal"
                                  value={record?.weight || ""}
                                  onChange={(e) => updateWeight(animal.id, e.target.value)}
                                  placeholder="0.0"
                                  className="w-24 h-10 text-right font-mono font-bold text-base pr-8"
                                  autoFocus={selectedAnimals.length === 1}
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">kg</span>
                              </div>
                              {diff !== null && (
                                <div className={cn(
                                  "flex items-center gap-0.5 text-xs font-medium px-1.5 py-0.5 rounded",
                                  diff > 0 ? "text-emerald-700 bg-emerald-500/10" :
                                  diff < 0 ? "text-red-600 bg-red-500/10" :
                                  "text-muted-foreground bg-muted"
                                )}>
                                  {diff > 0 ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                                  {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center gap-2">
          <div className="flex-1" />
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t('activities:newWeighing.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={loading || selectedAnimals.length === 0} className="gap-1.5">
            <Scale className="h-4 w-4" />
            {loading ? t('activities:newWeighing.saving') : t('activities:newWeighing.registerButton')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
