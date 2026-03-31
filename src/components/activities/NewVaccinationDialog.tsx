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
import { Calendar as CalendarIcon, Syringe, Search, CheckSquare, Users, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { VaccineSelector } from "./VaccineSelector";
import { ActivityFormHeader } from "./shared/ActivityFormHeader";
import { ActivityDatePicker } from "./shared/ActivityDatePicker";

interface VaccinationDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewVaccinationDialog({ open: externalOpen, onOpenChange, onSuccess }: VaccinationDialogProps) {
  const { t } = useTranslation(['activities', 'common']);
  const [open, setOpen] = useState(externalOpen || false);
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [fecha, setFecha] = useState<Date>(new Date());
  const [vacuna, setVacuna] = useState("");
  const [lote, setLote] = useState("");
  const [dosis, setDosis] = useState("");
  const [via, setVia] = useState("");
  const [notas, setNotas] = useState("");

  const { toast } = useToast();
  const { getEligibleAnimals } = useActivities();

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
      const eligibleAnimals = await getEligibleAnimals('VACUNACION');
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

  const handleAnimalToggle = (animalId: string) => {
    setSelectedAnimals(prev =>
      prev.includes(animalId) ? prev.filter(id => id !== animalId) : [...prev, animalId]
    );
  };

  const selectAllAnimals = () => setSelectedAnimals(filteredAnimals.map(a => a.id));
  const clearSelection = () => setSelectedAnimals([]);

  const handleSubmit = async () => {
    try {
      if (!vacuna.trim()) {
        toast({ variant: "destructive", title: t('activities:newVaccination.errorTitle'), description: t('activities:newVaccination.errorSelectVaccine') });
        return;
      }
      if (selectedAnimals.length === 0) {
        toast({ variant: "destructive", title: t('activities:newVaccination.errorTitle'), description: t('activities:newVaccination.errorSelectAnimal') });
        return;
      }
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const vaccinationPromises = selectedAnimals.map(animalId =>
        supabase.rpc('record_animal_vaccination', {
          _animal_id: animalId, _requirement_id: vacuna,
          _date: fecha.toISOString().split('T')[0],
          _lot: lote.trim() || null, _dose: dosis.trim() || null,
          _route: via.trim() || null, _created_by: user.id
        })
      );
      await Promise.all(vaccinationPromises);

      toast({
        title: "✓ " + t('activities:newVaccination.registered'),
        description: `${t('activities:newVaccination.registeredDesc')} ${selectedAnimals.length} ${t('activities:newVaccination.animalsVaccinated')}`,
      });
      setVacuna(""); setLote(""); setDosis(""); setVia(""); setNotas(""); setSelectedAnimals([]);
      setOpen(false); onOpenChange?.(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving vaccination:", error);
      toast({ variant: "destructive", title: t('activities:newVaccination.errorTitle'), description: t('activities:newVaccination.errorSaving') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <ActivityFormHeader
            icon={Syringe}
            iconColor="text-emerald-600"
            title={t('activities:newVaccination.title')}
            subtitle={t('activities:newVaccination.description')}
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Vaccine + Date row */}
          <div className="grid gap-4 sm:grid-cols-2">
            <VaccineSelector
              value={vacuna}
              onChange={setVacuna}
              placeholder={t('activities:vaccination.selectVaccine')}
              selectedAnimals={selectedAnimals}
            />
            <ActivityDatePicker
              label={t('activities:newVaccination.dateLabel')}
              date={fecha}
              onDateChange={setFecha}
            />
          </div>

          {/* Batch details */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('activities:newVaccination.lot')}</Label>
              <Input value={lote} onChange={(e) => setLote(e.target.value)} placeholder={t('activities:newVaccination.lotNumber')} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('activities:newVaccination.dose')}</Label>
              <Input value={dosis} onChange={(e) => setDosis(e.target.value)} placeholder={t('activities:newVaccination.doseAmount')} className="h-10" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('activities:newVaccination.route')}</Label>
              <Input value={via} onChange={(e) => setVia(e.target.value)} placeholder={t('activities:newVaccination.routePlaceholder')} className="h-10" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t('activities:newVaccination.observations')}</Label>
            <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder={t('activities:newVaccination.additionalObservations')} rows={2} className="resize-none" />
          </div>

          {/* Animal Selection */}
          {animals.length === 0 && !loading ? (
            <div className="text-center py-8 space-y-2">
              <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="text-muted-foreground">{t('activities:newVaccination.noEligibleAnimals')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">
                {t('activities:newVaccination.animalsLabel')} ({animals.length})
              </Label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-10" />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={selectAllAnimals} className="shrink-0 gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('activities:newVaccination.selectAll')}</span>
                </Button>
                {selectedAnimals.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" onClick={clearSelection} className="shrink-0 text-muted-foreground">
                    {t('activities:newVaccination.clear')}
                  </Button>
                )}
              </div>

              {selectedAnimals.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <Users className="h-4 w-4 text-emerald-600" />
                  <span className="text-sm font-semibold text-emerald-700">{selectedAnimals.length}</span>
                  <span className="text-sm text-emerald-600/80">seleccionados</span>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto rounded-xl border border-border divide-y divide-border/50">
                {filteredAnimals.map(animal => {
                  const selected = selectedAnimals.includes(animal.id);
                  return (
                    <div
                      key={animal.id}
                      onClick={() => handleAnimalToggle(animal.id)}
                      className={cn("flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors", selected ? "bg-emerald-500/5" : "hover:bg-muted/50")}
                    >
                      <Checkbox checked={selected} onCheckedChange={() => handleAnimalToggle(animal.id)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{animal.id_tag}</span>
                          {animal.name && <span className="text-sm text-muted-foreground truncate">{animal.name}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {animal.sex && <span className="text-xs text-muted-foreground">{animal.sex}</span>}
                          {animal.breed && (
                            <><span className="text-xs text-muted-foreground/40">·</span><span className="text-xs text-muted-foreground">{animal.breed}</span></>
                          )}
                          {animal.corral_name && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{animal.corral_name}</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center gap-2">
          <div className="flex-1" />
          <Button variant="outline" onClick={() => handleOpenChange(false)}>{t('common:cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading || selectedAnimals.length === 0 || !vacuna.trim()} className="gap-1.5">
            <Syringe className="h-4 w-4" />
            {loading ? t('activities:newVaccination.saving') : t('activities:newVaccination.registerButton')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
