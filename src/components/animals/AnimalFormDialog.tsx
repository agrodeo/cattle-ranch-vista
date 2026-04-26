import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Copy, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Animal } from "@/types/animal";
import { cleanupInactiveAnimalsFromCorrals } from "@/lib/animalCleanup";
import { useSubscription } from "@/hooks/useSubscription";

export const ARGENTINE_BREEDS = [
  "Angus", "Hereford", "Shorthorn", "Charolais", "Limousin", "Simmental",
  "Brahman", "Nelore", "Braford", "Brangus", "Santa Gertrudis", "Senepol",
  "Bonsmara", "Holando Argentino", "Jersey", "Criollo", "Wagyu", "Corriente", "Cruza", "Aberdeen Angus", "Otro"
];
const HORNED_BREEDS = ["Hereford", "Braford", "Charolais", "Limousin", "Simmental", "Brahman", "Nelore", "Santa Gertrudis", "Criollo", "Corriente"];
const COAT_COLOR_OPTIONS = ["Negro", "Colorado", "Negro homocigota", "Colorado homocigota", "Bayo", "Blanco", "Overo", "Gateado"];
const BODY_CONDITION_SCORES = ["1", "2", "3", "4", "5", "6"];
const REGISTRATION_OPTIONS: Record<string, string[]> = {
  Braford: ["Avanzado", "Avanzado Definitivo", "Controlado", "Puro de Pedigree", "Puro Registrado", "Sin Registro"],
  Brangus: ["Puro por Cruza", "Puro Registrado", "Puro de Pedigree", "Terneros Registrados", "Sin Registro"],
  Angus: ["PC (Puro Controlado)", "PR (Puro Registrado)", "PP (Puro de Pedigree)", "Sin Registro"],
  "Aberdeen Angus": ["PC (Puro Controlado)", "PR (Puro Registrado)", "PP (Puro de Pedigree)", "Sin Registro"]
};
const getRegistrationOptions = (breed: string) => REGISTRATION_OPTIONS[breed] || ["Sin Registro"];
const breedRequiresRegistration = (breed: string) => Object.keys(REGISTRATION_OPTIONS).includes(breed);

const INITIAL_FORM = {
  name: "", id_tag: "", caravana_electronica: "", sex: "", breed: "", birth_date: "",
  status: "activo", mother_id: "", father_id: "", mother_name: "", father_name: "",
  mother_breed: "", father_breed: "", mother_registration: "", father_registration: "",
  cabaña_id: "", peso_nacimiento: "", peso_destete: "", peso_final: "", peso_actual_kg: "",
  fecha_destete: "", circunferencia_escrotal: "", mocho: "", color: "", condicion_corporal: "",
  observaciones: "", registration_level: "", is_castrated: false, esta_preñada: false, fecha_probable_parto: "",
  fecha_servicio: "", fecha_ultima_preñez: "", tipo_servicio: "", resultado_preñez: "", tipo_parto: "", dna_verified: false
};
type AnimalDraft = typeof INITIAL_FORM & { localId: string };

type ParentAnimal = { id: string; name?: string; id_tag: string; sex: string };
interface Props { open: boolean; onOpenChange: (open: boolean) => void; editingAnimal: Animal | null; userCabaña: string; parentAnimals: ParentAnimal[]; onSuccess: () => void; }

const newDraft = (defaults: Partial<typeof INITIAL_FORM> = {}): AnimalDraft => ({ ...INITIAL_FORM, ...defaults, localId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}` });
const clean = (value?: string | null) => (value || "").trim();
const nullable = (value?: string | boolean) => typeof value === "string" ? (clean(value) || null) : value;
const numberOrNull = (value?: string) => clean(value) ? Number(value) : null;
const normalizeStatusForForm = (status?: string | null) => {
  const lower = (status || "activo").toLowerCase();
  return lower === "vendido" || lower === "muerto" ? lower : "activo";
};

export function AnimalFormDialog({ open, onOpenChange, editingAnimal, userCabaña, parentAnimals, onSuccess }: Props) {
  const { t } = useTranslation(['animals', 'common', 'forms']);
  const { checkAnimalLimit, subscriptionStatus, planNames } = useSubscription();
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [drafts, setDrafts] = useState<AnimalDraft[]>([newDraft()]);
  const [defaults, setDefaults] = useState<Partial<typeof INITIAL_FORM>>({ status: "activo" });
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => { setFormData(INITIAL_FORM); setShowOptionalFields(false); setDrafts([newDraft(defaults)]); setExpandedId(null); };
  const parentByTag = useMemo(() => new Map(parentAnimals.map(a => [a.id_tag, a])), [parentAnimals]);

  useEffect(() => {
    if (!open) return;
    if (editingAnimal) {
      const motherTag = editingAnimal.mother_id ? (parentAnimals.find(p => p.id === editingAnimal.mother_id)?.id_tag || editingAnimal.mother_name || "") : (editingAnimal.mother_name || "");
      const fatherTag = editingAnimal.father_id ? (parentAnimals.find(p => p.id === editingAnimal.father_id)?.id_tag || editingAnimal.father_name || "") : (editingAnimal.father_name || "");
      setFormData({
        ...INITIAL_FORM,
        name: editingAnimal.name || "", id_tag: editingAnimal.id_tag || "", caravana_electronica: editingAnimal.caravana_electronica || "",
        sex: editingAnimal.sex || "", breed: editingAnimal.breed || "", birth_date: editingAnimal.birth_date || "", status: normalizeStatusForForm(editingAnimal.status),
        mother_id: motherTag, father_id: fatherTag, mother_name: editingAnimal.mother_name || "", father_name: editingAnimal.father_name || "",
        mother_breed: editingAnimal.mother_breed || "", father_breed: editingAnimal.father_breed || "", mother_registration: editingAnimal.mother_registration || "", father_registration: editingAnimal.father_registration || "",
        cabaña_id: editingAnimal.cabaña_id || "", peso_nacimiento: editingAnimal.peso_nacimiento?.toString() || "", peso_actual_kg: editingAnimal.peso_actual_kg?.toString() || "",
        mocho: editingAnimal.mocho || "", color: editingAnimal.color || "", condicion_corporal: editingAnimal.condicion_corporal || "", observaciones: editingAnimal.observaciones || "",
        registration_level: editingAnimal.registration_level || "", is_castrated: !!editingAnimal.is_castrated, esta_preñada: !!editingAnimal.esta_preñada, fecha_probable_parto: editingAnimal.fecha_probable_parto || ""
      });
    } else resetForm();
  }, [open, editingAnimal?.id]);

  const updateDraft = (id: string, patch: Partial<AnimalDraft>) => setDrafts(prev => prev.map(d => d.localId === id ? { ...d, ...patch } : d));
  const addDraft = () => setDrafts(prev => [...prev, newDraft(defaults)]);
  const duplicateDraft = (draft: AnimalDraft) => setDrafts(prev => [...prev, { ...draft, localId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, id_tag: "", caravana_electronica: "" }]);
  const removeDraft = (id: string) => setDrafts(prev => prev.length === 1 ? prev : prev.filter(d => d.localId !== id));

  const validateDrafts = async (cabId: string, rows: AnimalDraft[]) => {
    const errors: string[] = [];
    const ids = rows.map(r => clean(r.id_tag)).filter(Boolean);
    const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
    rows.forEach((r, i) => {
      const n = i + 1;
      if (!clean(r.id_tag) || !r.sex || !r.breed) errors.push(`${t('animals:manualBulk.row')} ${n}: ${t('animals:messages.requiredFields')}`);
      if (r.birth_date && new Date(r.birth_date) > new Date()) errors.push(`${t('animals:manualBulk.row')} ${n}: ${t('animals:errors.futureBirthDate')}`);
      if (r.mother_id && r.father_id && r.mother_id === r.father_id) errors.push(`${t('animals:manualBulk.row')} ${n}: ${t('animals:errors.sameParents')}`);
      ["peso_nacimiento", "peso_destete", "peso_final", "peso_actual_kg", "circunferencia_escrotal"].forEach(field => {
        const value = r[field as keyof AnimalDraft] as string;
        if (clean(value) && (!Number.isFinite(Number(value)) || Number(value) < 0)) errors.push(`${t('animals:manualBulk.row')} ${n}: ${t('animals:manualBulk.invalidNumber')}`);
      });
    });
    if (duplicateIds.length) errors.push(`${t('animals:manualBulk.duplicateRows')}: ${[...new Set(duplicateIds)].join(', ')}`);
    if (subscriptionStatus) {
      const activeToAdd = rows.filter(r => normalizeStatusForForm(r.status) === 'activo').length;
      if (subscriptionStatus.currentAnimalsCount + activeToAdd > subscriptionStatus.maxAnimals) {
        errors.push(t('animals:manualBulk.planLimitExceeded', { count: activeToAdd, max: subscriptionStatus.maxAnimals, plan: planNames[subscriptionStatus.plan] }));
      }
    }
    if (ids.length && isOnline()) {
      const { data, error } = await supabase.from('animals').select('id_tag').eq('cabaña_id', cabId).in('id_tag', ids);
      if (error) throw error;
      if (data?.length) errors.push(`${t('animals:manualBulk.existingIds')}: ${data.map(d => d.id_tag).join(', ')}`);
    } else if (ids.length) {
      const cached = await db.animals_cache.where('cabaña_id').equals(cabId).filter(a => !!a.id_tag && ids.includes(a.id_tag)).toArray();
      if (cached.length) errors.push(`${t('animals:manualBulk.existingIds')}: ${cached.map(d => d.id_tag).join(', ')}`);
    }
    return errors;
  };

  const buildSubmitData = (row: AnimalDraft, cabId: string, forUpdate = false) => {
    const mother = row.mother_id ? parentByTag.get(row.mother_id) : undefined;
    const father = row.father_id ? parentByTag.get(row.father_id) : undefined;
    const base: any = {
      name: nullable(row.name), id_tag: clean(row.id_tag), caravana_electronica: nullable(row.caravana_electronica), sex: row.sex, breed: row.breed,
      birth_date: nullable(row.birth_date), status: normalizeStatusForForm(row.status), mother_id: mother?.id || null, father_id: father?.id || null,
      mother_name: !mother && row.mother_id ? row.mother_id : null, father_name: !father && row.father_id ? row.father_id : null,
      mother_breed: nullable(row.mother_breed), father_breed: nullable(row.father_breed), mother_registration: nullable(row.mother_registration), father_registration: nullable(row.father_registration),
      peso_nacimiento: numberOrNull(row.peso_nacimiento), peso_destete: numberOrNull(row.peso_destete), peso_final: numberOrNull(row.peso_final), peso_actual_kg: numberOrNull(row.peso_actual_kg),
      fecha_destete: nullable(row.fecha_destete), circunferencia_escrotal: numberOrNull(row.circunferencia_escrotal), mocho: nullable(row.mocho), color: nullable(row.color),
      condicion_corporal: nullable(row.condicion_corporal), observaciones: nullable(row.observaciones), registration_level: nullable(row.registration_level), is_castrated: row.sex === 'Macho' ? !!row.is_castrated : false,
      esta_preñada: row.sex === 'Hembra' ? !!row.esta_preñada : false, fecha_probable_parto: row.sex === 'Hembra' ? nullable(row.fecha_probable_parto) : null,
      fecha_servicio: nullable(row.fecha_servicio), fecha_ultima_preñez: nullable(row.fecha_ultima_preñez), tipo_servicio: nullable(row.tipo_servicio), resultado_preñez: nullable(row.resultado_preñez), tipo_parto: nullable(row.tipo_parto), dna_verified: !!row.dna_verified
    };
    return forUpdate ? base : { ...base, cabaña_id: cabId };
  };

  const handleBatchSubmit = async () => {
    if (!userCabaña) { toast({ title: t('animals:errors.configRequired'), description: t('animals:errors.noCabana'), variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const rows = drafts.filter(d => clean(d.id_tag) || d.sex || d.breed || clean(d.name));
      const errors = await validateDrafts(userCabaña, rows);
      if (errors.length) { toast({ title: t('animals:manualBulk.validationTitle'), description: errors.slice(0, 4).join('\n'), variant: 'destructive' }); return; }
      const payload = rows.map(r => buildSubmitData(r, userCabaña));
      if (isOnline()) {
        const { error } = await supabase.from('animals').insert(payload);
        if (error) throw error;
        toast({ title: t('common:status.success'), description: t('animals:manualBulk.createdCount', { count: payload.length }) });
      } else {
        const now = new Date().toISOString();
        for (const animal of payload) {
          const tempId = generateTempId();
          await db.animals_cache.add({ ...animal, id: tempId, updated_at: now, sync_status: 'pending' as const });
          await enqueue({ type: 'ANIMAL_INSERT', payload: animal, tempIds: { animalId: tempId } });
        }
        sonnerToast.info(t('animals:manualBulk.savedOffline'));
        trySync().catch(console.error);
      }
      onOpenChange(false); resetForm(); onSuccess();
    } catch (error: any) {
      console.error('Error saving animals:', error);
      toast({ title: t('common:errors.generic'), description: error.code === '23505' ? t('animals:errors.duplicateId') : t('animals:errors.saveFailed'), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnimal) return handleBatchSubmit();
    if (!checkAnimalLimit() && !editingAnimal) return;
    if (formData.birth_date && new Date(formData.birth_date) > new Date()) { toast({ title: t('common:errors.validation'), description: t('animals:errors.futureBirthDate'), variant: 'destructive' }); return; }
    if (formData.mother_id && formData.father_id && formData.mother_id === formData.father_id) { toast({ title: t('common:errors.validation'), description: t('animals:errors.sameParents'), variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const cabId = formData.cabaña_id || userCabaña;
      const baseSubmitData = buildSubmitData({ ...formData, localId: editingAnimal.id }, cabId, true);
      if (isOnline()) {
        const { error } = await supabase.from('animals').update(baseSubmitData).eq('id', editingAnimal.id);
        if (error) throw error;
        if (baseSubmitData.status === 'vendido' || baseSubmitData.status === 'muerto') await cleanupInactiveAnimalsFromCorrals(editingAnimal.cabaña_id || userCabaña);
      } else {
        await db.animals_cache.update(editingAnimal.id, { ...baseSubmitData, cabaña_id: cabId, updated_at: new Date().toISOString(), sync_status: 'pending' as const });
        await enqueue({ type: 'ANIMAL_UPDATE', payload: { id: editingAnimal.id, ...baseSubmitData } });
      }
      toast({ title: t('common:status.success'), description: t('animals:messages.updated') });
      onOpenChange(false); resetForm(); onSuccess();
    } catch (error: any) {
      console.error('Error saving animal:', error);
      toast({ title: t('common:errors.generic'), description: error.code === '23505' ? t('animals:errors.duplicateId') : t('animals:errors.saveFailed'), variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const f = formData;
  const setF = (patch: Partial<typeof formData>) => setFormData(prev => ({ ...prev, ...patch }));
  const renderSelect = (value: string, onValueChange: (v: string) => void, placeholder: string, options: { value: string; label: string }[], className = "") => (
    <Select value={value || 'none'} onValueChange={v => onValueChange(v === 'none' ? '' : v)}>
      <SelectTrigger className={`bg-background ${className}`}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent className="bg-background border shadow-md z-50 max-h-64"><SelectItem value="none">{placeholder}</SelectItem>{options.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
  const breedOptions = ARGENTINE_BREEDS.map(b => ({ value: b, label: b }));
  const sexOptions = [{ value: 'Macho', label: t('animals:sex.male') }, { value: 'Hembra', label: t('animals:sex.female') }];
  const statusOptions = [{ value: 'activo', label: t('animals:status.active') }, { value: 'vendido', label: t('animals:status.sold') }, { value: 'muerto', label: t('animals:status.dead') }];
  const parentOptions = (sex: string) => parentAnimals.filter(a => a.sex === sex).map(a => ({ value: a.id_tag, label: a.name ? `${a.name} (${a.id_tag})` : a.id_tag }));

  const DetailFields = ({ row, onChange }: { row: AnimalDraft; onChange: (patch: Partial<AnimalDraft>) => void }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-muted/30 rounded-lg border">
      <div className="space-y-1"><Label>{t('animals:form.electronicTag')}</Label><Input value={row.caravana_electronica} maxLength={80} onChange={e => onChange({ caravana_electronica: e.target.value })} /></div>
      <div className="space-y-1"><Label>{t('animals:form.weaningDate')}</Label><Input type="date" value={row.fecha_destete} onChange={e => onChange({ fecha_destete: e.target.value })} /></div>
      <div className="space-y-1"><Label>{t('animals:form.weaningWeightKg')}</Label><Input type="number" min="0" step="0.1" value={row.peso_destete} onChange={e => onChange({ peso_destete: e.target.value })} /></div>
      <div className="space-y-1"><Label>{t('animals:form.finalWeightKg')}</Label><Input type="number" min="0" step="0.1" value={row.peso_final} onChange={e => onChange({ peso_final: e.target.value })} /></div>
      <div className="space-y-1"><Label>{t('animals:form.currentWeightKg')}</Label><Input type="number" min="0" step="0.1" value={row.peso_actual_kg} onChange={e => onChange({ peso_actual_kg: e.target.value })} /></div>
      <div className="space-y-1"><Label>{t('animals:form.hornCondition')}</Label>{renderSelect(row.mocho, v => onChange({ mocho: v }), t('animals:form.unspecified'), [{ value: 'Mocho', label: t('animals:hornOptions.polled') }, { value: 'Con Cuernos', label: t('animals:hornOptions.horned') }, { value: 'Desconocido', label: t('animals:hornOptions.unknown') }])}</div>
      <div className="space-y-1"><Label>{t('animals:fields.color')}</Label>{renderSelect(row.color, v => onChange({ color: v }), t('animals:form.unspecified'), COAT_COLOR_OPTIONS.map(c => ({ value: c, label: c })))}</div>
      <div className="space-y-1"><Label>{t('animals:form.bodyCondition')}</Label>{renderSelect(row.condicion_corporal, v => onChange({ condicion_corporal: v }), t('animals:form.selectCondition'), BODY_CONDITION_SCORES.map(s => ({ value: s, label: t(`animals:form.conditionScores.${s}`) })))}</div>
      <div className="space-y-1"><Label>{t('animals:form.registration')}</Label>{renderSelect(row.registration_level, v => onChange({ registration_level: v }), t('animals:form.selectRegistration'), getRegistrationOptions(row.breed).map(r => ({ value: r, label: r })))}</div>
      <div className="space-y-1"><Label>{t('animals:form.motherBreed')}</Label>{renderSelect(row.mother_breed, v => onChange({ mother_breed: v }), t('animals:fields.breed'), breedOptions)}</div>
      <div className="space-y-1"><Label>{t('animals:form.motherRegistration')}</Label>{renderSelect(row.mother_registration, v => onChange({ mother_registration: v }), t('animals:form.registration'), getRegistrationOptions(row.mother_breed).map(r => ({ value: r, label: r })))}</div>
      <div className="space-y-1"><Label>{t('animals:form.fatherBreed')}</Label>{renderSelect(row.father_breed, v => onChange({ father_breed: v }), t('animals:fields.breed'), breedOptions)}</div>
      <div className="space-y-1"><Label>{t('animals:form.fatherRegistration')}</Label>{renderSelect(row.father_registration, v => onChange({ father_registration: v }), t('animals:form.registration'), getRegistrationOptions(row.father_breed).map(r => ({ value: r, label: r })))}</div>
      {row.sex === 'Macho' && <><div className="space-y-1"><Label>{t('animals:form.scrotalCircumference')}</Label><Input type="number" min="0" step="0.1" value={row.circunferencia_escrotal} onChange={e => onChange({ circunferencia_escrotal: e.target.value })} /></div><div className="space-y-1"><Label>{t('animals:form.castrated')}</Label>{renderSelect(row.is_castrated ? 'yes' : 'no', v => onChange({ is_castrated: v === 'yes' }), t('common:common.no'), [{ value: 'yes', label: t('common:common.yes') }, { value: 'no', label: t('common:common.no') }])}</div></>}
      {row.sex === 'Hembra' && <><div className="space-y-1"><Label>{t('animals:profile.pregnant')}</Label>{renderSelect(row.esta_preñada ? 'yes' : 'no', v => onChange({ esta_preñada: v === 'yes' }), t('common:common.no'), [{ value: 'yes', label: t('common:common.yes') }, { value: 'no', label: t('common:common.no') }])}</div><div className="space-y-1"><Label>{t('animals:profile.expectedCalving')}</Label><Input type="date" value={row.fecha_probable_parto} onChange={e => onChange({ fecha_probable_parto: e.target.value })} /></div></>}
      <div className="space-y-1"><Label>ADN</Label>{renderSelect(row.dna_verified ? 'yes' : 'no', v => onChange({ dna_verified: v === 'yes' }), t('common:common.no'), [{ value: 'yes', label: t('common:common.yes') }, { value: 'no', label: t('common:common.no') }])}</div>
      <div className="md:col-span-3 space-y-1"><Label>{t('animals:form.observations')}</Label><Textarea value={row.observaciones} maxLength={1000} onChange={e => onChange({ observaciones: e.target.value })} rows={2} /></div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={editingAnimal ? "sm:max-w-[600px] max-h-[90vh] overflow-y-auto bg-background" : "max-w-[calc(100vw-2rem)] xl:max-w-7xl max-h-[90vh] overflow-y-auto bg-background"}>
        <DialogHeader><DialogTitle>{editingAnimal ? t('animals:editAnimal') : t('animals:manualBulk.title')}</DialogTitle><DialogDescription>{editingAnimal ? t('animals:subtitle') : t('animals:manualBulk.description')}</DialogDescription></DialogHeader>
        {editingAnimal ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2"><Label>{t('animals:form.identification')} *</Label><Input value={f.id_tag} onChange={e => setF({ id_tag: e.target.value })} required /></div>
              <div className="space-y-2"><Label>{t('animals:form.electronicTag')}</Label><Input value={f.caravana_electronica} onChange={e => setF({ caravana_electronica: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('animals:fields.name')}</Label><Input value={f.name} onChange={e => setF({ name: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('animals:fields.sex')} *</Label>{renderSelect(f.sex, v => setF({ sex: v }), t('animals:form.selectSex'), sexOptions)}</div>
              <div className="space-y-2"><Label>{t('animals:fields.breed')} *</Label>{renderSelect(f.breed, v => setF({ breed: v }), t('animals:form.selectBreed'), breedOptions)}</div>
              <div className="space-y-2"><Label>{t('animals:fields.birthDate')}</Label><Input type="date" value={f.birth_date} onChange={e => setF({ birth_date: e.target.value })} max={new Date().toISOString().split('T')[0]} /></div>
              <div className="space-y-2"><Label>{t('animals:form.birthWeight')} (kg)</Label><Input type="number" step="0.1" min="0" value={f.peso_nacimiento} onChange={e => setF({ peso_nacimiento: e.target.value })} /></div>
              <div className="space-y-2"><Label>{t('animals:fields.status')}</Label>{renderSelect(f.status, v => setF({ status: v }), t('animals:form.selectStatus'), statusOptions)}</div>
              <div className="space-y-2"><Label>{t('animals:form.motherNameOrId')}</Label><Input value={f.mother_id} onChange={e => setF({ mother_id: e.target.value })} list="mother-suggestions" /></div>
              <div className="space-y-2"><Label>{t('animals:form.fatherNameOrId')}</Label><Input value={f.father_id} onChange={e => setF({ father_id: e.target.value })} list="father-suggestions" /></div>
            </div>
            <datalist id="mother-suggestions">{parentAnimals.filter(a => a.sex === 'Hembra').map(a => <option key={a.id} value={a.id_tag}>{a.name ? `${a.name} (${a.id_tag})` : a.id_tag}</option>)}</datalist>
            <datalist id="father-suggestions">{parentAnimals.filter(a => a.sex === 'Macho').map(a => <option key={a.id} value={a.id_tag}>{a.name ? `${a.name} (${a.id_tag})` : a.id_tag}</option>)}</datalist>
            <Collapsible open={showOptionalFields} onOpenChange={setShowOptionalFields}><CollapsibleTrigger asChild><Button type="button" variant="ghost" className="w-full justify-between">{t('animals:form.additionalFields')}</Button></CollapsibleTrigger><CollapsibleContent className="mt-4"><DetailFields row={{ ...f, localId: editingAnimal.id }} onChange={setF as any} /></CollapsibleContent></Collapsible>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('forms:buttons.cancel')}</Button><Button type="submit" disabled={saving}>{t('forms:buttons.save')}</Button></div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/20 p-3 space-y-3"><div className="font-medium text-sm">{t('animals:manualBulk.commonDefaults')}</div><div className="grid grid-cols-1 md:grid-cols-6 gap-2">
              {renderSelect(defaults.sex || '', v => setDefaults(d => ({ ...d, sex: v })), t('animals:form.selectSex'), sexOptions)}
              {renderSelect(defaults.breed || '', v => setDefaults(d => ({ ...d, breed: v })), t('animals:form.selectBreed'), breedOptions)}
              <Input type="date" value={defaults.birth_date || ''} onChange={e => setDefaults(d => ({ ...d, birth_date: e.target.value }))} />
              {renderSelect(defaults.status || 'activo', v => setDefaults(d => ({ ...d, status: v })), t('animals:form.selectStatus'), statusOptions)}
              <Input value={defaults.mother_id || ''} onChange={e => setDefaults(d => ({ ...d, mother_id: e.target.value }))} placeholder={t('animals:fields.mother')} list="bulk-mothers" />
              <Input value={defaults.father_id || ''} onChange={e => setDefaults(d => ({ ...d, father_id: e.target.value }))} placeholder={t('animals:fields.father')} list="bulk-fathers" />
            </div></div>
            <datalist id="bulk-mothers">{parentAnimals.filter(a => a.sex === 'Hembra').map(a => <option key={a.id} value={a.id_tag}>{a.name ? `${a.name} (${a.id_tag})` : a.id_tag}</option>)}</datalist>
            <datalist id="bulk-fathers">{parentAnimals.filter(a => a.sex === 'Macho').map(a => <option key={a.id} value={a.id_tag}>{a.name ? `${a.name} (${a.id_tag})` : a.id_tag}</option>)}</datalist>
            <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="min-w-32">{t('animals:fields.id')} *</TableHead><TableHead className="min-w-32">{t('animals:fields.name')}</TableHead><TableHead className="min-w-32">{t('animals:fields.sex')} *</TableHead><TableHead className="min-w-44">{t('animals:fields.breed')} *</TableHead><TableHead className="min-w-36">{t('animals:fields.birthDate')}</TableHead><TableHead className="min-w-28">{t('animals:form.birthWeightKg')}</TableHead><TableHead className="min-w-32">{t('animals:fields.status')}</TableHead><TableHead className="min-w-32">{t('animals:fields.mother')}</TableHead><TableHead className="min-w-32">{t('animals:fields.father')}</TableHead><TableHead className="w-36">{t('animals:manualBulk.actions')}</TableHead></TableRow></TableHeader><TableBody>
              {drafts.map(row => <>
                <TableRow key={row.localId}><TableCell><Input value={row.id_tag} maxLength={80} onChange={e => updateDraft(row.localId, { id_tag: e.target.value })} /></TableCell><TableCell><Input value={row.name} maxLength={120} onChange={e => updateDraft(row.localId, { name: e.target.value })} /></TableCell><TableCell>{renderSelect(row.sex, v => updateDraft(row.localId, { sex: v }), t('animals:form.selectSex'), sexOptions, 'min-w-28')}</TableCell><TableCell>{renderSelect(row.breed, v => updateDraft(row.localId, { breed: v }), t('animals:form.selectBreed'), breedOptions, 'min-w-40')}</TableCell><TableCell><Input type="date" value={row.birth_date} onChange={e => updateDraft(row.localId, { birth_date: e.target.value })} /></TableCell><TableCell><Input type="number" min="0" step="0.1" value={row.peso_nacimiento} onChange={e => updateDraft(row.localId, { peso_nacimiento: e.target.value })} /></TableCell><TableCell>{renderSelect(row.status, v => updateDraft(row.localId, { status: v }), t('animals:form.selectStatus'), statusOptions, 'min-w-28')}</TableCell><TableCell><Input value={row.mother_id} onChange={e => updateDraft(row.localId, { mother_id: e.target.value })} list="bulk-mothers" /></TableCell><TableCell><Input value={row.father_id} onChange={e => updateDraft(row.localId, { father_id: e.target.value })} list="bulk-fathers" /></TableCell><TableCell><div className="flex gap-1"><Button type="button" variant="ghost" size="icon" onClick={() => setExpandedId(expandedId === row.localId ? null : row.localId)} title={t('animals:manualBulk.completeDetail')}><Pencil className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" onClick={() => duplicateDraft(row)} title={t('animals:manualBulk.duplicate')}><Copy className="h-4 w-4" /></Button><Button type="button" variant="ghost" size="icon" onClick={() => removeDraft(row.localId)} title={t('animals:manualBulk.deleteRow')}><Trash2 className="h-4 w-4" /></Button></div></TableCell></TableRow>
                {expandedId === row.localId && <TableRow key={`${row.localId}-detail`}><TableCell colSpan={10}><DetailFields row={row} onChange={patch => updateDraft(row.localId, patch)} /></TableCell></TableRow>}
              </>)}
            </TableBody></Table></div>
            <div className="flex flex-col sm:flex-row justify-between gap-2"><Button type="button" variant="outline" onClick={addDraft}><Plus className="h-4 w-4" />{t('animals:manualBulk.addRow')}</Button><div className="flex gap-2 justify-end"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('forms:buttons.cancel')}</Button><Button type="button" onClick={handleBatchSubmit} disabled={saving}>{t('animals:manualBulk.loadAnimals', { count: drafts.length })}</Button></div></div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
