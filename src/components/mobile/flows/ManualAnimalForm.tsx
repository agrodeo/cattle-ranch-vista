import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Copy, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { ARGENTINE_BREEDS } from "@/components/animals/AnimalFormDialog";

interface ManualAnimalFormProps { onBack: () => void; onSuccess: () => void; }
const INITIAL_ROW = { id_tag: "", caravana_electronica: "", name: "", sex: "", breed: "", birth_date: "", peso_nacimiento: "", peso_destete: "", peso_final: "", peso_actual_kg: "", father_id: "", mother_id: "", corral_id: "", color: "", mocho: "", is_castrated: false, condicion_corporal: "", circunferencia_escrotal: "", fecha_destete: "", observaciones: "", status: "activo", esta_preñada: false, fecha_probable_parto: "", registration_level: "", mother_breed: "", father_breed: "", mother_registration: "", father_registration: "", dna_verified: false };
type Row = typeof INITIAL_ROW & { localId: string };
const newRow = (defaults: Partial<typeof INITIAL_ROW> = {}): Row => ({ ...INITIAL_ROW, ...defaults, localId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}` });
const clean = (v?: string) => (v || "").trim();
const num = (v?: string) => clean(v) ? Number(v) : null;
const nil = (v?: string) => clean(v) && v !== 'none' ? clean(v) : null;

export function ManualAnimalForm({ onBack, onSuccess }: ManualAnimalFormProps) {
  const { t } = useTranslation(['animals', 'common', 'forms']);
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [corrales, setCorrales] = useState<any[]>([]);
  const [rows, setRows] = useState<Row[]>([newRow()]);
  const [defaults, setDefaults] = useState<Partial<typeof INITIAL_ROW>>({ status: "activo" });
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => { loadAnimalsAndCorrales(); }, []);
  const loadAnimalsAndCorrales = async () => {
    try {
      const { data: cabanaId } = await supabase.rpc('get_current_user_cabana_id');
      if (!cabanaId) return;
      const [{ data: animalsData }, { data: corralesData }] = await Promise.all([
        supabase.from('animals').select('id, id_tag, name, sex').filter('cabaña_id', 'eq', cabanaId).in('status', ['activo']).order('id_tag'),
        supabase.from('corrales').select('id, name').filter('cabaña_id', 'eq', cabanaId).order('name')
      ]);
      setAnimals(animalsData || []); setCorrales(corralesData || []);
    } catch (error) { console.error('Error loading data:', error); }
  };
  const updateRow = (id: string, patch: Partial<Row>) => setRows(prev => prev.map(r => r.localId === id ? { ...r, ...patch } : r));
  const addRow = () => setRows(prev => [...prev, newRow(defaults)]);
  const duplicate = (row: Row) => setRows(prev => [...prev, { ...row, localId: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, id_tag: "", caravana_electronica: "" }]);
  const remove = (id: string) => setRows(prev => prev.length === 1 ? prev : prev.filter(r => r.localId !== id));
  const fatherOptions = animals.filter(a => a.sex === 'Macho');
  const motherOptions = animals.filter(a => a.sex === 'Hembra');
  const animalById = useMemo(() => new Map(animals.map(a => [a.id, a])), [animals]);

  const validate = async (cabanaId: string, validRows: Row[]) => {
    const ids = validRows.map(r => clean(r.id_tag)).filter(Boolean);
    const duplicateIds = ids.filter((id, i) => ids.indexOf(id) !== i);
    if (duplicateIds.length) return `${t('animals:manualBulk.duplicateRows')}: ${[...new Set(duplicateIds)].join(', ')}`;
    for (const [i, r] of validRows.entries()) {
      if (!clean(r.id_tag) || !r.sex || !r.breed) return `${t('animals:manualBulk.row')} ${i + 1}: ${t('animals:messages.requiredFields')}`;
      if (r.birth_date && new Date(r.birth_date) > new Date()) return `${t('animals:manualBulk.row')} ${i + 1}: ${t('animals:errors.futureBirthDate')}`;
      if (r.mother_id && r.father_id && r.mother_id === r.father_id) return `${t('animals:manualBulk.row')} ${i + 1}: ${t('animals:errors.sameParents')}`;
    }
    if (ids.length) {
      const { data, error } = await supabase.from('animals').select('id_tag').eq('cabaña_id', cabanaId).in('id_tag', ids);
      if (error) throw error;
      if (data?.length) return `${t('animals:manualBulk.existingIds')}: ${data.map(d => d.id_tag).join(', ')}`;
    }
    return null;
  };

  const toPayload = (r: Row, cabanaId: string) => ({
    id_tag: clean(r.id_tag), caravana_electronica: nil(r.caravana_electronica), name: nil(r.name), sex: r.sex, breed: r.breed, birth_date: nil(r.birth_date), status: r.status || 'activo',
    peso_nacimiento: num(r.peso_nacimiento), peso_destete: num(r.peso_destete), peso_final: num(r.peso_final), peso_actual_kg: num(r.peso_actual_kg), fecha_destete: nil(r.fecha_destete),
    father_id: nil(r.father_id), mother_id: nil(r.mother_id), corral_id: nil(r.corral_id), color: nil(r.color), mocho: nil(r.mocho), is_castrated: r.sex === 'Macho' ? r.is_castrated : false,
    condicion_corporal: nil(r.condicion_corporal), circunferencia_escrotal: num(r.circunferencia_escrotal), observaciones: nil(r.observaciones), esta_preñada: r.sex === 'Hembra' ? r.esta_preñada : false,
    fecha_probable_parto: r.sex === 'Hembra' ? nil(r.fecha_probable_parto) : null, registration_level: nil(r.registration_level), mother_breed: nil(r.mother_breed), father_breed: nil(r.father_breed),
    mother_registration: nil(r.mother_registration), father_registration: nil(r.father_registration), dna_verified: r.dna_verified, cabaña_id: cabanaId
  });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const validRows = rows.filter(r => clean(r.id_tag) || r.sex || r.breed || clean(r.name));
      const { data: cabanaData, error: cabanaError } = await supabase.rpc('get_current_user_cabana_id');
      if (cabanaError || !cabanaData) throw new Error(t('animals:form.errorNoCabana'));
      const validationError = await validate(cabanaData, validRows);
      if (validationError) { toast.error(validationError); return; }
      const { error } = await supabase.from('animals').insert(validRows.map(r => toPayload(r, cabanaData)));
      if (error) throw error;
      toast.success(t('animals:manualBulk.createdCount', { count: validRows.length }));
      onSuccess();
    } catch (error) { console.error('Error creating animals:', error); toast.error(t('animals:messages.errorCreating')); }
    finally { setLoading(false); }
  };

  const SelectBox = ({ value, onChange, placeholder, children }: any) => (
    <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? '' : v)}><SelectTrigger><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent><SelectItem value="none">{placeholder}</SelectItem>{children}</SelectContent></Select>
  );

  return (
    <div className="fixed inset-0 z-50 bg-background lg:hidden flex flex-col overflow-x-hidden" onTouchMove={(e) => e.stopPropagation()} style={{ touchAction: 'auto' }}>
      <div className="flex items-center justify-between gap-2 p-3 border-b border-border flex-shrink-0 min-w-0">
        <div className="flex items-center min-w-0 flex-1"><Button variant="ghost" size="icon" onClick={onBack} className="mr-1 shrink-0"><ArrowLeft className="h-5 w-5" /></Button><h1 className="text-base font-semibold truncate min-w-0">{t('animals:manualBulk.title')}</h1></div>
        <Button onClick={handleSubmit} disabled={loading} size="sm" className="shrink-0 max-w-[46vw] px-2"><Save className="h-4 w-4 shrink-0 sm:mr-2" /><span className="truncate">{loading ? t('common:forms.saving') : t('animals:manualBulk.loadAnimals', { count: rows.length })}</span></Button>
      </div>
      <div className="flex-1 p-3 sm:p-4 space-y-4 overflow-y-auto overflow-x-hidden pb-24 min-w-0" style={{ touchAction: 'pan-y' }}>
        <Card className="min-w-0 overflow-hidden"><CardHeader><CardTitle className="text-base truncate">{t('animals:manualBulk.commonDefaults')}</CardTitle></CardHeader><CardContent className="grid grid-cols-1 gap-3 min-w-0">
          <SelectBox value={defaults.sex} onChange={(v: string) => setDefaults(d => ({ ...d, sex: v }))} placeholder={t('animals:form.selectSex')}><SelectItem value="Macho">Macho</SelectItem><SelectItem value="Hembra">Hembra</SelectItem></SelectBox>
          <SelectBox value={defaults.breed} onChange={(v: string) => setDefaults(d => ({ ...d, breed: v }))} placeholder={t('animals:form.selectBreed')}>{ARGENTINE_BREEDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectBox>
          <Input type="date" value={defaults.birth_date || ''} onChange={e => setDefaults(d => ({ ...d, birth_date: e.target.value }))} />
        </CardContent></Card>
        {rows.map((row, idx) => <Card key={row.localId} className="overflow-hidden min-w-0"><CardHeader className="pb-3"><div className="flex items-center justify-between gap-2 min-w-0"><CardTitle className="text-base truncate min-w-0">{clean(row.id_tag) || `${t('animals:manualBulk.row')} ${idx + 1}`}</CardTitle><div className="flex gap-1 shrink-0"><Button variant="ghost" size="icon" onClick={() => setExpanded(expanded === row.localId ? null : row.localId)}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => duplicate(row)}><Copy className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => remove(row.localId)}><Trash2 className="h-4 w-4" /></Button></div></div></CardHeader><CardContent className="space-y-3 min-w-0">
          <div><Label>{t('animals:form.identificationRequired')}</Label><Input value={row.id_tag} onChange={e => updateRow(row.localId, { id_tag: e.target.value })} placeholder={t('animals:form.identificationPlaceholder')} /></div>
          <div><Label>{t('common:name')}</Label><Input value={row.name} onChange={e => updateRow(row.localId, { name: e.target.value })} placeholder={t('animals:form.animalName')} /></div>
          <div><Label>{t('animals:form.sexRequired')}</Label><SelectBox value={row.sex} onChange={(v: string) => updateRow(row.localId, { sex: v })} placeholder={t('animals:form.selectSex')}><SelectItem value="Macho">Macho</SelectItem><SelectItem value="Hembra">Hembra</SelectItem></SelectBox></div>
          <div><Label>{t('animals:form.breedRequired')}</Label><SelectBox value={row.breed} onChange={(v: string) => updateRow(row.localId, { breed: v })} placeholder={t('animals:form.selectBreed')}>{ARGENTINE_BREEDS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectBox></div>
          <div><Label>{t('animals:form.birthDate')}</Label><Input type="date" value={row.birth_date} onChange={e => updateRow(row.localId, { birth_date: e.target.value })} /></div>
          {expanded === row.localId && <div className="space-y-3 border-t pt-3">
            <div><Label>{t('animals:form.electronicTag')}</Label><Input value={row.caravana_electronica} onChange={e => updateRow(row.localId, { caravana_electronica: e.target.value })} /></div>
            <div><Label>{t('animals:form.father')}</Label><SelectBox value={row.father_id} onChange={(v: string) => updateRow(row.localId, { father_id: v })} placeholder={t('animals:form.noFather')}>{fatherOptions.map(a => <SelectItem key={a.id} value={a.id}>{a.id_tag} {a.name ? `- ${a.name}` : ''}</SelectItem>)}</SelectBox></div>
            <div><Label>{t('animals:form.mother')}</Label><SelectBox value={row.mother_id} onChange={(v: string) => updateRow(row.localId, { mother_id: v })} placeholder={t('animals:form.noMother')}>{motherOptions.map(a => <SelectItem key={a.id} value={a.id}>{a.id_tag} {a.name ? `- ${a.name}` : ''}</SelectItem>)}</SelectBox></div>
            <div><Label>{t('animals:form.corral')}</Label><SelectBox value={row.corral_id} onChange={(v: string) => updateRow(row.localId, { corral_id: v })} placeholder={t('animals:form.noCorral')}>{corrales.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectBox></div>
            <div><Label>{t('animals:form.birthWeightKg')}</Label><Input type="number" step="0.1" value={row.peso_nacimiento} onChange={e => updateRow(row.localId, { peso_nacimiento: e.target.value })} /></div>
            <div><Label>{t('animals:form.weaningWeightKg')}</Label><Input type="number" step="0.1" value={row.peso_destete} onChange={e => updateRow(row.localId, { peso_destete: e.target.value })} /></div>
            <div><Label>{t('animals:form.finalWeightKg')}</Label><Input type="number" step="0.1" value={row.peso_final} onChange={e => updateRow(row.localId, { peso_final: e.target.value })} /></div>
            <div><Label>{t('animals:form.currentWeightKg')}</Label><Input type="number" step="0.1" value={row.peso_actual_kg} onChange={e => updateRow(row.localId, { peso_actual_kg: e.target.value })} /></div>
            <div><Label>{t('common:color')}</Label><Input value={row.color} onChange={e => updateRow(row.localId, { color: e.target.value })} /></div>
            {row.sex === 'Macho' && <div className="flex items-center justify-between"><Label>{t('animals:form.castrated')}</Label><Switch checked={row.is_castrated} onCheckedChange={checked => updateRow(row.localId, { is_castrated: checked })} /></div>}
            {row.sex === 'Hembra' && <><div className="flex items-center justify-between"><Label>{t('animals:profile.pregnant')}</Label><Switch checked={row.esta_preñada} onCheckedChange={checked => updateRow(row.localId, { esta_preñada: checked })} /></div><div><Label>{t('animals:profile.expectedCalving')}</Label><Input type="date" value={row.fecha_probable_parto} onChange={e => updateRow(row.localId, { fecha_probable_parto: e.target.value })} /></div></>}
            <div><Label>{t('animals:form.observations')}</Label><Textarea value={row.observaciones} onChange={e => updateRow(row.localId, { observaciones: e.target.value })} rows={3} /></div>
          </div>}
        </CardContent></Card>)}
        <Button variant="outline" className="w-full" onClick={addRow}><Plus className="h-4 w-4" />{t('animals:manualBulk.addRow')}</Button>
      </div>
    </div>
  );
}
