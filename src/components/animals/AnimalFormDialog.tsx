import { useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { isOnline } from "@/services/connectivity";
import { db, generateTempId } from "@/services/db";
import { enqueue } from "@/services/outbox";
import { trySync } from "@/services/sync";
import { toast as sonnerToast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Animal } from "@/types/animal";
import { cleanupInactiveAnimalsFromCorrals } from "@/lib/animalCleanup";
import { calculateBrafordRegistration, type RegistrationLevel, type ParentInfo } from "@/lib/brafordRegistration";

// Argentine cattle breeds
const ARGENTINE_BREEDS = [
  "Angus", "Hereford", "Shorthorn", "Charolais", "Limousin", "Simmental",
  "Brahman", "Nelore", "Braford", "Brangus", "Santa Gertrudis", "Senepol",
  "Bonsmara", "Holando Argentino", "Jersey", "Criollo", "Wagyu", "Corriente", "Otro"
];

const HORNED_BREEDS = ["Hereford", "Braford", "Charolais", "Limousin", "Simmental", "Brahman", "Nelore", "Santa Gertrudis", "Criollo", "Corriente"];
const BODY_CONDITION_SCORES = ["1", "2", "3", "4", "5"];

const REGISTRATION_OPTIONS: Record<string, string[]> = {
  "Braford": ["Avanzado", "Avanzado Definitivo", "Controlado", "Puro de Pedigree", "Puro Registrado", "Sin Registro"],
  "Brangus": ["Puro por Cruza", "Puro Registrado", "Puro de Pedigree", "Terneros Registrados", "Sin Registro"],
  "Angus": ["PC (Puro Controlado)", "PR (Puro Registrado)", "PP (Puro de Pedigree)", "Sin Registro"]
};

const getRegistrationOptions = (breed: string) => REGISTRATION_OPTIONS[breed] || ["Sin Registro"];
const breedRequiresRegistration = (breed: string) => Object.keys(REGISTRATION_OPTIONS).includes(breed);
const getMochoOptions = (t: any) => [
  { value: "Mocho", label: t('animals:hornOptions.polled') },
  { value: "Con Cuernos", label: t('animals:hornOptions.horned') },
  { value: "Desconocido", label: t('animals:hornOptions.unknown') }
];

const INITIAL_FORM = {
  name: "", id_tag: "", caravana_electronica: "", sex: "", breed: "", birth_date: "",
  status: "Activo", mother_id: "", father_id: "", mother_name: "", father_name: "",
  mother_breed: "", father_breed: "", mother_registration: "", father_registration: "",
  cabaña_id: "", peso_nacimiento: "", mocho: "", color: "", condicion_corporal: "",
  observaciones: "", registration_level: ""
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAnimal: Animal | null;
  userCabaña: string;
  parentAnimals: { id: string; name?: string; id_tag: string; sex: string }[];
  onSuccess: () => void;
}

export function AnimalFormDialog({ open, onOpenChange, editingAnimal, userCabaña, parentAnimals, onSuccess }: Props) {
  const { t } = useTranslation(['animals', 'common', 'forms']);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);

  const resetForm = () => {
    setFormData(INITIAL_FORM);
    setShowOptionalFields(false);
  };

  // Populate form when editing
  const populateForEdit = (animal: Animal) => {
    setFormData({
      name: animal.name || "", id_tag: animal.id_tag, caravana_electronica: animal.caravana_electronica || "",
      sex: animal.sex, breed: animal.breed, birth_date: animal.birth_date || "", status: animal.status,
      mother_id: animal.mother_name || "", father_id: animal.father_name || "",
      mother_name: animal.mother_name || "", father_name: animal.father_name || "",
      mother_breed: animal.mother_breed || "", father_breed: animal.father_breed || "",
      mother_registration: animal.mother_registration || "", father_registration: animal.father_registration || "",
      cabaña_id: animal.cabaña_id, peso_nacimiento: animal.peso_nacimiento?.toString() || "",
      mocho: animal.mocho || "", color: animal.color || "",
      condicion_corporal: animal.condicion_corporal || "", observaciones: animal.observaciones || "",
      registration_level: animal.registration_level || ""
    });
  };

  // Expose populateForEdit via effect
  useState(() => {
    if (editingAnimal) populateForEdit(editingAnimal);
    else resetForm();
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnimal && !userCabaña) {
      toast({ title: t('animals:errors.configRequired'), description: t('animals:errors.noCabana'), variant: "destructive" });
      return;
    }
    if (formData.birth_date && new Date(formData.birth_date) > new Date()) {
      toast({ title: t('common:errors.validation'), description: t('animals:errors.futureBirthDate'), variant: "destructive" });
      return;
    }
    if (formData.mother_id && formData.father_id && formData.mother_id === formData.father_id) {
      toast({ title: t('common:errors.validation'), description: t('animals:errors.sameParents'), variant: "destructive" });
      return;
    }

    try {
      const cabId = editingAnimal ? formData.cabaña_id : userCabaña;

      // Build submit data — skip parent lookups when offline
      let motherUUID = null;
      let fatherUUID = null;
      let registrationData = {};

      if (isOnline()) {
        if (formData.mother_id) {
          const { data } = await supabase.from("animals").select("id").eq("id_tag", formData.mother_id).eq("cabaña_id", cabId).eq("sex", "Hembra").maybeSingle();
          motherUUID = data?.id || null;
        }
        if (formData.father_id) {
          const { data } = await supabase.from("animals").select("id").eq("id_tag", formData.father_id).eq("cabaña_id", cabId).eq("sex", "Macho").maybeSingle();
          fatherUUID = data?.id || null;
        }
        if (formData.breed === 'Braford') {
          let fatherInfo: ParentInfo | undefined;
          let motherInfo: ParentInfo | undefined;
          if (fatherUUID) {
            const { data } = await supabase.from("animals").select("registration_level, registration_level_override, birth_date, dna_verified").eq("id", fatherUUID).single();
            if (data) fatherInfo = { level: (data.registration_level_override || data.registration_level) as RegistrationLevel, hasDNA: data.dna_verified || false };
          }
          if (motherUUID) {
            const { data } = await supabase.from("animals").select("registration_level, registration_level_override, birth_date, breed").eq("id", motherUUID).single();
            if (data) {
              const birthYear = data.birth_date ? new Date(data.birth_date).getFullYear() : undefined;
              motherInfo = { level: (data.registration_level_override || data.registration_level) as RegistrationLevel, isBoMother: data.breed === 'Bo', birthYear };
            }
          }
          const result = calculateBrafordRegistration(formData.breed, fatherInfo, motherInfo, false);
          registrationData = { registration_level: result.level, registration_father_level: fatherInfo?.level || null, registration_mother_level: motherInfo?.level || null };
        }
      } else {
        // Offline: try to resolve parents from local cache
        if (formData.mother_id) {
          const cached = await db.animals_cache.where('cabaña_id').equals(cabId || '').filter(a => a.id_tag === formData.mother_id && a.sex === 'Hembra').first();
          motherUUID = cached?.id || null;
        }
        if (formData.father_id) {
          const cached = await db.animals_cache.where('cabaña_id').equals(cabId || '').filter(a => a.id_tag === formData.father_id && a.sex === 'Macho').first();
          fatherUUID = cached?.id || null;
        }
      }

      const submitData = {
        name: formData.name || null, id_tag: formData.id_tag, sex: formData.sex, breed: formData.breed,
        birth_date: formData.birth_date || null, status: formData.status, mother_id: motherUUID, father_id: fatherUUID,
        mother_name: !motherUUID && formData.mother_id ? formData.mother_id : null,
        father_name: !fatherUUID && formData.father_id ? formData.father_id : null,
        mother_breed: formData.mother_breed || null, father_breed: formData.father_breed || null,
        mother_registration: formData.mother_registration || null, father_registration: formData.father_registration || null,
        cabaña_id: cabId, peso_nacimiento: formData.peso_nacimiento ? parseFloat(formData.peso_nacimiento) : null,
        mocho: formData.mocho || null, color: formData.color || null,
        condicion_corporal: formData.condicion_corporal || null, observaciones: formData.observaciones || null,
        registration_level: formData.registration_level || null, ...registrationData,
      };

      if (isOnline()) {
        // Online: write directly to Supabase
        if (editingAnimal) {
          const { error } = await supabase.from("animals").update(submitData).eq("id", editingAnimal.id);
          if (error) throw error;
          toast({ title: t('common:status.success'), description: t('animals:messages.updated') });
          if (submitData.status === "vendido" || submitData.status === "muerto" || submitData.status === "Vendido" || submitData.status === "Muerto") {
            await cleanupInactiveAnimalsFromCorrals(editingAnimal.cabaña_id || userCabaña);
          }
        } else {
          const { error } = await supabase.from("animals").insert([submitData]);
          if (error) throw error;
          toast({ title: t('common:status.success'), description: t('animals:messages.created') });
        }
      } else {
        // Offline: save to IndexedDB + outbox
        const now = new Date().toISOString();
        if (editingAnimal) {
          await db.animals_cache.update(editingAnimal.id, { ...submitData, updated_at: now, sync_status: 'pending' });
          await enqueue({ type: 'ANIMAL_UPDATE', payload: { id: editingAnimal.id, ...submitData } });
        } else {
          const tempId = generateTempId();
          await db.animals_cache.add({ ...submitData, id: tempId, updated_at: now, sync_status: 'pending' } as any);
          await enqueue({ type: 'ANIMAL_INSERT', payload: submitData, tempIds: { animalId: tempId } });
        }
        sonnerToast.info('Guardado localmente - se sincronizará cuando vuelvas a tener conexión');
      }

      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      console.error("Error saving animal:", error);
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        toast({ title: t('common:errors.generic'), description: t('animals:errors.duplicateId'), variant: "destructive" });
      } else {
        toast({ title: t('common:errors.generic'), description: t('animals:errors.saveFailed'), variant: "destructive" });
      }
    }
  };

  const f = formData;
  const setF = (patch: Partial<typeof formData>) => setFormData(prev => ({ ...prev, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-background">
        <DialogHeader>
          <DialogTitle>{editingAnimal ? t('animals:editAnimal') : t('animals:addAnimal')}</DialogTitle>
          <DialogDescription>{t('animals:subtitle')}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id_tag">{t('animals:form.identification')} *</Label>
                <Input id="id_tag" value={f.id_tag} onChange={e => setF({ id_tag: e.target.value })} placeholder={t('animals:form.identification')} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="caravana_electronica">{t('animals:form.electronicTag')} ({t('forms:placeholders.optional')})</Label>
                <Input id="caravana_electronica" value={f.caravana_electronica} onChange={e => setF({ caravana_electronica: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">{t('animals:fields.name')} ({t('forms:placeholders.optional')})</Label>
                <Input id="name" value={f.name} onChange={e => setF({ name: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('animals:fields.sex')} *</Label>
                <Select value={f.sex} onValueChange={v => setF({ sex: v })} required>
                  <SelectTrigger className="bg-background"><SelectValue placeholder={t('animals:form.selectSex')} /></SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    <SelectItem value="Macho">{t('animals:sex.male')}</SelectItem>
                    <SelectItem value="Hembra">{t('animals:sex.female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('animals:fields.breed')} *</Label>
                <Select value={f.breed} onValueChange={v => setF({ breed: v })} required>
                  <SelectTrigger className="bg-background"><SelectValue placeholder={t('animals:form.selectBreed')} /></SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50 max-h-60">
                    {ARGENTINE_BREEDS.map(breed => <SelectItem key={breed} value={breed}>{breed}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {f.breed && HORNED_BREEDS.includes(f.breed) && (
              <div className="space-y-2">
                <Label>{t('animals:form.hornCondition')}</Label>
                <Select value={f.mocho || "Desconocido"} onValueChange={v => setF({ mocho: v })}>
                  <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    {getMochoOptions(t).map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {f.breed && breedRequiresRegistration(f.breed) && (
              <div className="space-y-2">
                <Label>{t('animals:form.registration')}</Label>
                <Select value={f.registration_level} onValueChange={v => setF({ registration_level: v })}>
                  <SelectTrigger className="bg-background"><SelectValue placeholder={t('animals:form.selectRegistration')} /></SelectTrigger>
                  <SelectContent className="bg-background border shadow-md z-50">
                    {getRegistrationOptions(f.breed).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('animals:fields.birthDate')}</Label>
                <Input type="date" value={f.birth_date} onChange={e => setF({ birth_date: e.target.value })} max={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="space-y-2">
                <Label>{t('animals:form.birthWeight')} (kg)</Label>
                <Input type="number" step="0.1" min="0" value={f.peso_nacimiento} onChange={e => setF({ peso_nacimiento: e.target.value })} placeholder="32.5" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('animals:form.motherNameOrId')}</Label>
                <Input value={f.mother_id} onChange={e => setF({ mother_id: e.target.value })} list="mother-suggestions" />
                <datalist id="mother-suggestions">
                  {parentAnimals.filter(a => a.sex === "Hembra" && a.id_tag !== f.father_id).map(a => (
                    <option key={a.id} value={a.id_tag}>{a.name ? `${a.name} (${a.id_tag})` : a.id_tag}</option>
                  ))}
                </datalist>
                {f.mother_id && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('animals:form.motherBreed')}</Label>
                      <Select value={f.mother_breed} onValueChange={v => setF({ mother_breed: v })}>
                        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder={t('animals:fields.breed')} /></SelectTrigger>
                        <SelectContent className="bg-background border shadow-md z-50">
                          {ARGENTINE_BREEDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {f.mother_breed && breedRequiresRegistration(f.mother_breed) && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('animals:form.motherRegistration')}</Label>
                        <Select value={f.mother_registration} onValueChange={v => setF({ mother_registration: v })}>
                          <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder={t('animals:form.registration')} /></SelectTrigger>
                          <SelectContent className="bg-background border shadow-md z-50">
                            {getRegistrationOptions(f.mother_breed).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>{t('animals:form.fatherNameOrId')}</Label>
                <Input value={f.father_id} onChange={e => setF({ father_id: e.target.value })} list="father-suggestions" />
                <datalist id="father-suggestions">
                  {parentAnimals.filter(a => a.sex === "Macho" && a.id_tag !== f.mother_id).map(a => (
                    <option key={a.id} value={a.id_tag}>{a.name ? `${a.name} (${a.id_tag})` : a.id_tag}</option>
                  ))}
                </datalist>
                {f.father_id && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">{t('animals:form.fatherBreed')}</Label>
                      <Select value={f.father_breed} onValueChange={v => setF({ father_breed: v })}>
                        <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder={t('animals:fields.breed')} /></SelectTrigger>
                        <SelectContent className="bg-background border shadow-md z-50">
                          {ARGENTINE_BREEDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {f.father_breed && breedRequiresRegistration(f.father_breed) && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{t('animals:form.fatherRegistration')}</Label>
                        <Select value={f.father_registration} onValueChange={v => setF({ father_registration: v })}>
                          <SelectTrigger className="h-8 text-xs bg-background"><SelectValue placeholder={t('animals:form.registration')} /></SelectTrigger>
                          <SelectContent className="bg-background border shadow-md z-50">
                            {getRegistrationOptions(f.father_breed).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('animals:fields.status')}</Label>
              <Select value={f.status} onValueChange={v => setF({ status: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-background border shadow-md z-50">
                  <SelectItem value="Activo">{t('animals:status.active')}</SelectItem>
                  <SelectItem value="Vendido">{t('animals:status.sold')}</SelectItem>
                  <SelectItem value="Muerto">{t('animals:status.dead')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Collapsible open={showOptionalFields} onOpenChange={setShowOptionalFields}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-2">
                <span>{t('animals:form.additionalFields')}</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showOptionalFields ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('animals:fields.color')}</Label>
                  <Input value={f.color} onChange={e => setF({ color: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>{t('animals:form.bodyCondition')} (1-5)</Label>
                  <Select value={f.condicion_corporal} onValueChange={v => setF({ condicion_corporal: v })}>
                    <SelectTrigger className="bg-background"><SelectValue placeholder={t('animals:form.selectCondition')} /></SelectTrigger>
                    <SelectContent className="bg-background border shadow-md z-50">
                      {BODY_CONDITION_SCORES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('animals:form.generalObservations')}</Label>
                <Textarea value={f.observaciones} onChange={e => setF({ observaciones: e.target.value })} placeholder={t('animals:form.additionalNotes')} rows={3} />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('forms:buttons.cancel')}</Button>
            <Button type="submit">{editingAnimal ? t('forms:buttons.save') : t('common:add')}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
