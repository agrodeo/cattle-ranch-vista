import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Plus, Search, CheckSquare, Users, ClipboardList } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { isOnline } from "@/services/connectivity";
import { categorizeAnimal } from "@/lib/animalCategories";
import { getTranslatedSex } from "@/lib/translations";
import { ActivityFormHeader } from "./shared/ActivityFormHeader";
import { ActivityDatePicker } from "./shared/ActivityDatePicker";

interface NewGeneralActivityDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  preselectedType?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

interface Animal {
  id: string;
  name?: string;
  id_tag: string;
  sex: string;
  breed: string;
  birth_date?: string;
  corral_id?: string;
  corral?: { name: string };
  is_castrated?: boolean;
}

const getActivityTypes = (t: any) => [
  { value: "destete", label: t('activities:managementActivityTypes.destete.label'), icon: "🐄", description: t('activities:managementActivityTypes.destete.description'), fields: ["peso_destete", "edad_destete", "metodo"] },
  { value: "marcacion", label: t('activities:managementActivityTypes.marcacion.label'), icon: "🔥", description: t('activities:managementActivityTypes.marcacion.description'), fields: ["ubicacion_marca", "tipo_hierro", "numero_marca"] },
  { value: "castracion", label: t('activities:managementActivityTypes.castracion.label'), icon: "✂️", description: t('activities:managementActivityTypes.castracion.description'), fields: ["metodo_castracion", "anestesia", "antibiotico"] },
  { value: "descorne", label: t('activities:managementActivityTypes.descorne.label'), icon: "🦏", description: t('activities:managementActivityTypes.descorne.description'), fields: ["metodo_descorne", "edad_animal", "cicatrizante"] },
  { value: "traslado", label: t('activities:managementActivityTypes.traslado.label'), icon: "📦", description: t('activities:managementActivityTypes.traslado.description'), fields: ["corral_origen", "corral_destino", "motivo_traslado"] },
  { value: "tratamiento", label: t('activities:managementActivityTypes.tratamiento.label'), icon: "💊", description: t('activities:managementActivityTypes.tratamiento.description'), fields: ["medicamento", "dosis", "via_administracion", "diagnostico"] },
  { value: "revision", label: t('activities:managementActivityTypes.revision.label'), icon: "🔍", description: t('activities:managementActivityTypes.revision.description'), fields: ["temperatura", "frecuencia_cardiaca", "estado_general", "hallazgos"] },
  { value: "apareamiento", label: t('activities:managementActivityTypes.apareamiento.label'), icon: "💕", description: t('activities:managementActivityTypes.apareamiento.description'), fields: ["toro_id", "toro_nombre", "metodo_monta"] },
  { value: "parto", label: t('activities:managementActivityTypes.parto.label'), icon: "🐄", description: t('activities:managementActivityTypes.parto.description'), fields: ["tipo_parto", "dificultad", "peso_cria", "sexo_cria", "vitalidad"] },
];

export function NewGeneralActivityDialog({ open: externalOpen, onOpenChange, preselectedType, onClose, onSuccess }: NewGeneralActivityDialogProps) {
  const { t } = useTranslation('activities');
  const activityTypes = getActivityTypes(t);
  const open = externalOpen ?? false;
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedType, setSelectedType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activityData, setActivityData] = useState<Record<string, any>>({});

  const { toast } = useToast();
  const { createEvent } = useActivities();

  const handleOpenChange = (newOpen: boolean) => {
    onOpenChange?.(newOpen);
    if (!newOpen) onClose?.();
  };

  const loadAnimals = async () => {
    setLoadingAnimals(true);
    try {
      if (!isOnline()) {
        const { db } = await import('@/services/db');
        const cached = await db.animals_cache.toArray();
        const filtered = cached.filter(a => { const s = (a.status || '').toLowerCase(); return s !== 'vendido' && s !== 'muerto'; });
        const corrales = await db.corrales_cache.toArray();
        const corralMap = new Map(corrales.map(c => [c.id, { name: c.name }]));
        setAnimals(filtered.map(a => ({ ...a, corral: a.corral_id ? corralMap.get(a.corral_id) : undefined })) as Animal[]);
      } else {
        const { data, error } = await supabase.from('animals').select('id, name, id_tag, sex, breed, birth_date, status, corral_id, is_castrated, corral:corrales(name)').not('status', 'ilike', 'vendido').not('status', 'ilike', 'muerto').order('id_tag');
        if (error) throw error;
        setAnimals(data || []);
      }
    } catch (error) {
      console.error('Error loading animals:', error);
    } finally {
      setLoadingAnimals(false);
    }
  };

  const filteredAnimals = animals.filter(a => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return a.id_tag?.toLowerCase().includes(q) || a.name?.toLowerCase().includes(q);
  });

  const handleAnimalToggle = (id: string) => {
    setSelectedAnimals(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAllAnimals = () => setSelectedAnimals(filteredAnimals.map(a => a.id));
  const clearSelection = () => setSelectedAnimals([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType) {
      toast({ title: t('activities:newGeneralActivity.errorTitle'), description: t('activities:newGeneralActivity.errorRequired'), variant: "destructive" });
      return;
    }
    if (selectedAnimals.length === 0) {
      toast({ title: t('activities:newGeneralActivity.errorTitle'), description: t('activities:newGeneralActivity.errorSelectAnimal'), variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
      const eventPayload = { tipo_actividad: selectedType, responsable: responsiblePerson, animales_ids: selectedAnimals, detalles: activityData };
      await createEvent("GENERAL", selectedDate, notes, eventPayload);
      toast({ title: "✓ " + t('activities:newGeneralActivity.success'), description: `${selectedType} — ${selectedAnimals.length} animales` });
      onSuccess?.();
      setSelectedDate(new Date()); setSelectedType(""); setNotes(""); setResponsiblePerson(""); setSelectedAnimals([]); setActivityData({});
      setOpen(false); onOpenChange?.(false); onClose?.();
    } catch (error) {
      toast({ title: t('activities:newGeneralActivity.errorTitle'), description: t('activities:newGeneralActivity.errorSaving'), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedActivityType = activityTypes.find(type => type.value === selectedType);

  const getFieldType = (field: string): 'text' | 'number' | 'select' => {
    const numberFields = ['peso_destete', 'edad_destete', 'peso_cria', 'temperatura', 'frecuencia_cardiaca', 'dosis'];
    const selectFields = ['metodo', 'tipo_hierro', 'metodo_castracion', 'metodo_descorne', 'via_administracion', 'tipo_parto', 'dificultad', 'sexo_cria', 'vitalidad', 'estado_general', 'metodo_monta'];
    if (numberFields.includes(field)) return 'number';
    if (selectFields.includes(field)) return 'select';
    return 'text';
  };

  const getSelectOptions = (field: string) => {
    const optionsMap: Record<string, string[]> = {
      metodo: ['tradicional', 'gradual', 'temporal'], tipo_hierro: ['electrico', 'fuego', 'frio'],
      metodo_castracion: ['quirurgico', 'elastico', 'pinza'], metodo_descorne: ['cauterizacion', 'pasta', 'quirurgico'],
      via_administracion: ['oral', 'intramuscular', 'subcutanea', 'intravenosa'], tipo_parto: ['normal', 'distocico', 'cesarea'],
      dificultad: ['sin_dificultad', 'leve', 'moderada', 'severa'], sexo_cria: ['macho', 'hembra'],
      vitalidad: ['vivo', 'muerto', 'debil'], estado_general: ['excelente', 'bueno', 'regular', 'malo'],
      metodo_monta: ['libre', 'controlada', 'dirigida']
    };
    return (optionsMap[field] || []).map(value => ({ value, label: t(`activityOptions.${value}`) }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <ActivityFormHeader
            icon={ClipboardList}
            iconColor="text-slate-600"
            title={t('activities:newGeneralActivity.title')}
          />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Activity type pills */}
          <div className="space-y-2">
            <Label className="text-sm font-semibold">{t('activityFields.activityType')} *</Label>
            <div className="flex flex-wrap gap-2">
              {activityTypes.map(type => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setSelectedType(type.value)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                    selectedType === type.value
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span>{type.icon}</span>
                  <span>{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Date + Responsible */}
          <div className="grid gap-4 sm:grid-cols-2">
            <ActivityDatePicker label={t('activities:common.dateRequired')} date={selectedDate} onDateChange={setSelectedDate} />
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('newGeneralActivity.responsible')}</Label>
              <Input value={responsiblePerson} onChange={(e) => setResponsiblePerson(e.target.value)} placeholder={t('newGeneralActivity.responsiblePlaceholder')} className="h-11" />
            </div>
          </div>

          {/* Activity-specific fields */}
          {selectedActivityType?.fields && (
            <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/30">
              <Label className="text-sm font-semibold">{t('activities:newGeneralActivity.specificInfo')}</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedActivityType.fields.map(field => {
                  const fieldType = getFieldType(field);
                  return (
                    <div key={field} className="space-y-1.5">
                      <Label className="text-xs font-medium">{t(`activityFields.${field}`, field)}</Label>
                      {fieldType === 'select' ? (
                        <Select value={activityData[field] || ""} onValueChange={v => setActivityData(prev => ({ ...prev, [field]: v }))}>
                          <SelectTrigger className="h-10"><SelectValue placeholder={t('activityOptions.selectOption')} /></SelectTrigger>
                          <SelectContent>
                            {getSelectOptions(field).map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={fieldType === 'number' ? 'number' : 'text'}
                          step={fieldType === 'number' ? '0.1' : undefined}
                          value={activityData[field] || ''}
                          onChange={e => setActivityData(prev => ({ ...prev, [field]: e.target.value }))}
                          className="h-10"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Animal Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">
              {t('newGeneralActivity.animalsLabel')} ({animals.length})
            </Label>

            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder={t('newGeneralActivity.searchPlaceholder')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-10" />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={selectAllAnimals} className="shrink-0 gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" />
              </Button>
              {selectedAnimals.length > 0 && (
                <Button type="button" variant="ghost" size="sm" onClick={clearSelection} className="shrink-0 text-muted-foreground">
                  {t('activities:newGeneralActivity.clear')}
                </Button>
              )}
            </div>

            {selectedAnimals.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">{selectedAnimals.length}</span>
                <span className="text-sm text-primary/80">seleccionados</span>
              </div>
            )}

            <div className="max-h-56 overflow-y-auto rounded-xl border border-border divide-y divide-border/50">
              {loadingAnimals ? (
                <div className="text-center py-8 text-sm text-muted-foreground">{t('newGeneralActivity.loadingAnimals')}</div>
              ) : filteredAnimals.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">{t('activities:common.noAnimalsFound')}</div>
              ) : (
                filteredAnimals.map(animal => {
                  const selected = selectedAnimals.includes(animal.id);
                  return (
                    <div
                      key={animal.id}
                      onClick={() => handleAnimalToggle(animal.id)}
                      className={cn("flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors", selected ? "bg-primary/5" : "hover:bg-muted/50")}
                    >
                      <Checkbox checked={selected} onCheckedChange={() => handleAnimalToggle(animal.id)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-semibold">{animal.id_tag}</span>
                          {animal.name && <span className="text-sm text-muted-foreground truncate">{animal.name}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {animal.sex && <span className="text-xs text-muted-foreground">{animal.sex}</span>}
                          {animal.breed && <><span className="text-xs text-muted-foreground/40">·</span><span className="text-xs text-muted-foreground">{animal.breed}</span></>}
                          {animal.corral?.name && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">{animal.corral.name}</Badge>}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t('activities:common.notesAndObservations')}</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder={t('newGeneralActivity.notesPlaceholder')} rows={3} className="resize-none" />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center gap-2">
          <div className="flex-1" />
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            {t('activities:common.cancel')}
          </Button>
          <Button onClick={(e: any) => handleSubmit(e)} disabled={isLoading || !selectedType || selectedAnimals.length === 0} className="gap-1.5">
            <Plus className="h-4 w-4" />
            {isLoading ? t('activities:common.saving') : t('activities:common.registerActivity')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
