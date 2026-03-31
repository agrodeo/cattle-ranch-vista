import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { isOnline } from "@/services/connectivity";
import { Stethoscope, CheckCircle, XCircle, Search, CheckSquare, Users, Calendar as CalendarIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { format, differenceInMonths, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { ActivityFormHeader } from "./shared/ActivityFormHeader";
import { ActivityDatePicker } from "./shared/ActivityDatePicker";

interface TactoRecord {
  animalId: string;
  resultado: "preñada" | "vacia" | null;
  observaciones: string;
  fechaEstimadaParto?: Date;
}

interface TactoDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewTactoDialog({ open: externalOpen, onOpenChange, onSuccess }: TactoDialogProps) {
  const { t } = useTranslation('activities');
  const [open, setOpen] = useState(externalOpen || false);
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [corrales, setCorrales] = useState<any[]>([]);
  const [selectedCorral, setSelectedCorral] = useState<string>("all");
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [tactoRecords, setTactoRecords] = useState<TactoRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [fecha, setFecha] = useState<Date>(new Date());
  const [notas, setNotas] = useState("");

  const { toast } = useToast();
  const { getEligibleAnimals, createEvent } = useActivities();

  useEffect(() => {
    if (externalOpen !== undefined) setOpen(externalOpen);
  }, [externalOpen]);

  useEffect(() => {
    if (open) { loadAnimals(); loadCorrales(); }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const loadAnimals = async () => {
    try {
      setLoading(true);
      const eligibleAnimals = await getEligibleAnimals('TACTO');
      setAnimals(eligibleAnimals);
    } catch (error) {
      console.error("Error loading animals:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCorrales = async () => {
    try {
      if (!isOnline()) {
        const { db } = await import('@/services/db');
        const cached = await db.corrales_cache.toArray();
        setCorrales(cached.map(c => ({ id: c.id, name: c.name })));
        return;
      }
      const { data, error } = await supabase.from('corrales').select('id, name').order('name');
      if (error) throw error;
      setCorrales(data || []);
    } catch (error) {
      console.error("Error loading corrales:", error);
    }
  };

  const filteredAnimals = (() => {
    let list = selectedCorral && selectedCorral !== "all"
      ? animals.filter(a => a.corral_id === selectedCorral) : animals;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(a => a.name?.toLowerCase().includes(q) || a.id_tag?.toLowerCase().includes(q));
    }
    return list;
  })();

  const handleAnimalToggle = (animalId: string) => {
    if (selectedAnimals.includes(animalId)) {
      setSelectedAnimals(prev => prev.filter(id => id !== animalId));
      setTactoRecords(prev => prev.filter(r => r.animalId !== animalId));
    } else {
      setSelectedAnimals(prev => [...prev, animalId]);
      setTactoRecords(prev => [...prev, { animalId, resultado: null, observaciones: "" }]);
    }
  };

  const selectAllAnimals = () => {
    const allIds = filteredAnimals.map(a => a.id);
    setSelectedAnimals(allIds);
    setTactoRecords(allIds.map(id => {
      const existing = tactoRecords.find(r => r.animalId === id);
      return existing || { animalId: id, resultado: null, observaciones: "" };
    }));
  };

  const clearSelection = () => { setSelectedAnimals([]); setTactoRecords([]); };

  const updateTactoRecord = (animalId: string, field: keyof TactoRecord, value: any) => {
    setTactoRecords(prev => prev.map(record => {
      if (record.animalId !== animalId) return record;
      const updated = { ...record, [field]: value };
      if (field === 'resultado' && value === 'preñada') updated.fechaEstimadaParto = addDays(fecha, 283);
      else if (field === 'resultado' && value === 'vacia') updated.fechaEstimadaParto = undefined;
      return updated;
    }));
  };

  const markAllAs = (result: "preñada" | "vacia") => {
    setTactoRecords(prev => prev.map(r => ({
      ...r, resultado: result,
      fechaEstimadaParto: result === 'preñada' ? addDays(fecha, 283) : undefined
    })));
  };

  const handleSubmit = async () => {
    try {
      if (selectedAnimals.length === 0) {
        toast({ variant: "destructive", title: t('tacto.errorTitle'), description: t('tacto.errorSelectFemale') });
        return;
      }
      const invalidRecords = tactoRecords.filter(r => r.resultado === null);
      if (invalidRecords.length > 0) {
        toast({ variant: "destructive", title: t('tacto.errorTitle'), description: `${invalidRecords.length} ${t('tacto.errorNoResults')}` });
        return;
      }
      setLoading(true);
      const event = await createEvent('TACTO', fecha, notas);
      const resultados = tactoRecords.map(r => ({ animal_id: r.animalId, resultado: r.resultado, observaciones: r.observaciones || null }));
      const { error } = await supabase.from("tactos").insert({ evento_id: event.id, resultados });
      if (error) throw error;

      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Usuario no autenticado");
      const { data: userData } = await supabase.from('profiles').select('*').eq('user_id', user.data.user.id).single();
      const cabanaId = (userData as any)?.cabaña_id;
      if (!cabanaId) throw new Error("Usuario sin cabaña asignada");

      for (const record of tactoRecords) {
        const { error: detectionError } = await supabase.rpc('process_pregnancy_detection', {
          _animal_id: record.animalId, _fecha_tacto: format(fecha, 'yyyy-MM-dd'),
          _resultado: record.resultado, _cabana_id: cabanaId, _observaciones: record.observaciones
        });
        if (detectionError) console.error('Error processing pregnancy detection:', detectionError);
      }

      const pregnantCount = tactoRecords.filter(r => r.resultado === 'preñada').length;
      const emptyCount = tactoRecords.filter(r => r.resultado === 'vacia').length;
      toast({ title: t('tacto.successTitle'), description: t('tacto.successDescription', { pregnant: pregnantCount, empty: emptyCount }) });

      setNotas(""); setSelectedAnimals([]); setTactoRecords([]); setOpen(false); onOpenChange?.(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving tacto:", error);
      toast({ variant: "destructive", title: t('tacto.errorTitle'), description: t('tacto.errorDescription') });
    } finally {
      setLoading(false);
    }
  };

  const pregnantCount = tactoRecords.filter(r => r.resultado === 'preñada').length;
  const emptyCount = tactoRecords.filter(r => r.resultado === 'vacia').length;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <ActivityFormHeader
            icon={Stethoscope}
            iconColor="text-violet-600"
            title={t('tacto.registerTitle')}
            subtitle={t('tacto.description')}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Date + Corral filter + Notes */}
          <div className="grid gap-4 sm:grid-cols-3">
            <ActivityDatePicker label={t('tacto.detectionDate')} date={fecha} onDateChange={setFecha} />
            {corrales.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">{t('tacto.filterByCorral')}</Label>
                <Select value={selectedCorral} onValueChange={setSelectedCorral}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('tacto.allCorrals')}</SelectItem>
                    {corrales.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('tacto.generalObservations')}</Label>
              <Textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder={t('tacto.observationsPlaceholder')} rows={2} className="resize-none" />
            </div>
          </div>

          {animals.length === 0 && !loading ? (
            <div className="text-center py-8 space-y-2">
              <Stethoscope className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="text-muted-foreground">{t('tacto.noEligibleFemales')}</p>
            </div>
          ) : (
            <>
              {/* Animal selector */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">
                  {t('tacto.eligibleFemales')} ({filteredAnimals.length})
                </Label>

                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-10" />
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={selectAllAnimals} className="shrink-0 gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5" />
                  </Button>
                  {selectedAnimals.length > 0 && (
                    <Button type="button" variant="ghost" size="sm" onClick={clearSelection} className="shrink-0 text-muted-foreground">
                      {t('tacto.clear')}
                    </Button>
                  )}
                </div>

                {selectedAnimals.length > 0 && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-500/5 border border-violet-500/20">
                    <Users className="h-4 w-4 text-violet-600" />
                    <span className="text-sm font-semibold text-violet-700">{selectedAnimals.length}</span>
                    <span className="text-sm text-violet-600/80">seleccionadas</span>
                  </div>
                )}

                <div className="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border/50">
                  {filteredAnimals.map(animal => {
                    const selected = selectedAnimals.includes(animal.id);
                    return (
                      <div
                        key={animal.id}
                        onClick={() => handleAnimalToggle(animal.id)}
                        className={cn("flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors", selected ? "bg-violet-500/5" : "hover:bg-muted/50")}
                      >
                        <Checkbox checked={selected} onCheckedChange={() => handleAnimalToggle(animal.id)} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold">{animal.id_tag}</span>
                            {animal.name && <span className="text-sm text-muted-foreground truncate">{animal.name}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {animal.birth_date && (
                              <span className="text-xs text-muted-foreground">{differenceInMonths(new Date(), new Date(animal.birth_date))}m</span>
                            )}
                            {animal.breed && <span className="text-xs text-muted-foreground">{animal.breed}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Results section */}
              {tactoRecords.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-semibold">{t('tacto.result')} ({tactoRecords.length})</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => markAllAs('preñada')} className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1">
                        <CheckCircle className="h-3.5 w-3.5" />
                        {t('tacto.allPregnant', 'Todas Preñadas')}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => markAllAs('vacia')} className="text-red-600 border-red-200 hover:bg-red-50 gap-1">
                        <XCircle className="h-3.5 w-3.5" />
                        {t('tacto.allEmpty', 'Todas Vacías')}
                      </Button>
                    </div>
                  </div>

                  {/* Summary counters */}
                  {(pregnantCount > 0 || emptyCount > 0) && (
                    <div className="flex gap-3">
                      {pregnantCount > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-xs font-semibold text-emerald-700">{pregnantCount} Preñadas</span>
                        </div>
                      )}
                      {emptyCount > 0 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                          <XCircle className="h-3.5 w-3.5 text-red-600" />
                          <span className="text-xs font-semibold text-red-700">{emptyCount} Vacías</span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {tactoRecords.map(record => {
                      const animal = animals.find(a => a.id === record.animalId);
                      if (!animal) return null;
                      return (
                        <Card key={record.animalId} className={cn(
                          "p-3 border-l-[3px] transition-colors",
                          record.resultado === 'preñada' ? "border-l-emerald-500 bg-emerald-500/5" :
                          record.resultado === 'vacia' ? "border-l-red-500 bg-red-500/5" :
                          "border-l-muted"
                        )}>
                          <div className="flex items-center gap-3">
                            {/* Animal info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-semibold">{animal.id_tag}</span>
                                {animal.name && <span className="text-sm text-muted-foreground">{animal.name}</span>}
                              </div>
                              {record.fechaEstimadaParto && (
                                <div className="flex items-center gap-1 mt-0.5">
                                  <CalendarIcon className="h-3 w-3 text-emerald-600" />
                                  <span className="text-xs text-emerald-700">FPP: {format(record.fechaEstimadaParto, "dd/MM/yyyy")}</span>
                                </div>
                              )}
                            </div>

                            {/* Result toggle */}
                            <div className="flex gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => updateTactoRecord(record.animalId, 'resultado', 'preñada')}
                                className={cn(
                                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border",
                                  record.resultado === 'preñada'
                                    ? "bg-emerald-500 text-white border-emerald-500"
                                    : "bg-background text-muted-foreground border-border hover:border-emerald-300"
                                )}
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                P
                              </button>
                              <button
                                type="button"
                                onClick={() => updateTactoRecord(record.animalId, 'resultado', 'vacia')}
                                className={cn(
                                  "flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border",
                                  record.resultado === 'vacia'
                                    ? "bg-red-500 text-white border-red-500"
                                    : "bg-background text-muted-foreground border-border hover:border-red-300"
                                )}
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                V
                              </button>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center gap-2">
          <div className="flex-1" />
          <Button variant="outline" onClick={() => handleOpenChange(false)}>{t('tacto.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading || tactoRecords.length === 0} className="gap-1.5">
            <Stethoscope className="h-4 w-4" />
            {loading ? t('tacto.saving') : t('tacto.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
