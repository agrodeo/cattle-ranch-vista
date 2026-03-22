import { useState, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReproductiveSystem } from '@/hooks/useReproductiveSystem';
import { markPregnancyAsFailed } from '@/lib/pregnancyManagement';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, X, CalendarIcon, Save, Baby, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

type ResultType = 'exitoso' | 'aborto' | 'stillbirth' | 'neonatal';

interface CalvingRow {
  id: string;
  mother: { id: string; id_tag: string | null; name: string | null; breed: string | null; corral_id: string | null };
  birthDate: Date;
  result: ResultType;
  calfSex: string;
  calfTag: string;
  birthWeight: string;
  electronicTag: string;
  fatherId: string;
  notes: string;
  errors: Record<string, string>;
}

interface CalvingRegistrationManagerProps {
  isCompact?: boolean;
  onSuccess?: () => void;
}

const RESULT_TO_MOTIVO: Record<ResultType, string> = {
  exitoso: 'parto_exitoso',
  aborto: 'aborto_tardio',
  stillbirth: 'stillbirth',
  neonatal: 'neonatal',
};

export function CalvingRegistrationManager({ isCompact, onSuccess }: CalvingRegistrationManagerProps) {
  const { t } = useTranslation(['reproductive', 'common']);
  const { registerCalvingEvent } = useReproductiveSystem();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [rows, setRows] = useState<CalvingRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [motherSearch, setMotherSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: animals = [] } = useQuery({
    queryKey: ['animals-for-calving'],
    queryFn: async () => {
      const { data: profile } = await supabase.from('profiles' as any).select('cabaña_id').eq('user_id', (await supabase.auth.getUser()).data.user?.id).single();
      const cabanaId = (profile as any)?.cabaña_id;
      if (!cabanaId) return [];
      const { data } = await supabase.from('animals').select('*').eq('cabaña_id', cabanaId);
      return (data || []) as any[];
    },
  });

  const { data: corrales = [] } = useQuery({
    queryKey: ['corrales-for-calving'],
    queryFn: async () => {
      const { data: profile } = await supabase.from('profiles' as any).select('cabaña_id').eq('user_id', (await supabase.auth.getUser()).data.user?.id).single();
      const cabanaId = (profile as any)?.cabaña_id;
      if (!cabanaId) return [];
      const { data } = await supabase.from('corrales').select('id, name').eq('cabaña_id', cabanaId);
      return data || [];
    },
  });

  const males = useMemo(() =>
    animals.filter(a => (a.sex === 'Macho' || a.sex === 'macho') && a.status === 'Activo'),
    [animals]
  );

  const alreadySelectedIds = useMemo(() => rows.map(r => r.mother.id), [rows]);

  const pregnantFemales = useMemo(() => {
    return animals
      .filter(a =>
        (a.sex === 'Hembra' || a.sex === 'hembra') &&
        a.status === 'Activo' &&
        a.esta_preñada &&
        !alreadySelectedIds.includes(a.id)
      )
      .sort((a, b) => {
        if (!a.fecha_probable_parto) return 1;
        if (!b.fecha_probable_parto) return -1;
        return new Date(a.fecha_probable_parto).getTime() - new Date(b.fecha_probable_parto).getTime();
      });
  }, [animals, alreadySelectedIds]);

  const otherFemales = useMemo(() => {
    return animals.filter(a =>
      (a.sex === 'Hembra' || a.sex === 'hembra') &&
      a.status === 'Activo' &&
      !a.esta_preñada &&
      !alreadySelectedIds.includes(a.id)
    );
  }, [animals, alreadySelectedIds]);

  const filteredSuggestions = useMemo(() => {
    const searchLower = motherSearch.toLowerCase().trim();
    const allFemales = [...pregnantFemales, ...otherFemales];
    if (!searchLower) return pregnantFemales.slice(0, 10);
    return allFemales.filter(a =>
      (a.id_tag?.toLowerCase().includes(searchLower)) ||
      (a.name?.toLowerCase().includes(searchLower))
    ).slice(0, 10);
  }, [motherSearch, pregnantFemales, otherFemales]);

  const handleSelectMother = useCallback((animal: any) => {
    const fatherId = animal.toro_servicio_id || '';
    const newRow: CalvingRow = {
      id: crypto.randomUUID(),
      mother: { id: animal.id, id_tag: animal.id_tag, name: animal.name, breed: animal.breed, corral_id: animal.corral_id },
      birthDate: new Date(),
      result: 'exitoso',
      calfSex: '',
      calfTag: '',
      birthWeight: '',
      electronicTag: '',
      fatherId,
      notes: '',
      errors: {},
    };
    setRows(prev => [...prev, newRow]);
  }, []);

  const updateRow = useCallback((id: string, updates: Partial<CalvingRow>) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...updates, errors: {} } : r));
  }, []);

  const removeRow = useCallback((id: string) => {
    setRows(prev => prev.filter(r => r.id !== id));
  }, []);

  const validate = useCallback((): boolean => {
    if (rows.length === 0) {
      toast({ variant: 'destructive', title: t('reproductive:calvingRegistration.validation.noRows') });
      return false;
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const tagsInBatch = rows.filter(r => r.result === 'exitoso').map(r => r.calfTag.trim().toLowerCase());
    let valid = true;
    const updated = rows.map(row => {
      const errors: Record<string, string> = {};
      if (row.birthDate > today) errors.birthDate = t('reproductive:calvingRegistration.validation.dateInFuture');
      if (row.result === 'exitoso') {
        if (!row.calfSex) errors.calfSex = t('reproductive:calvingRegistration.validation.sexRequired');
        if (!row.calfTag.trim()) {
          errors.calfTag = t('reproductive:calvingRegistration.validation.tagRequired');
        } else {
          const tag = row.calfTag.trim().toLowerCase();
          if (tagsInBatch.filter(t2 => t2 === tag).length > 1) errors.calfTag = t('reproductive:calvingRegistration.validation.tagDuplicateInBatch');
          const existing = animals.find(a => a.id_tag?.toLowerCase() === tag);
          if (existing) errors.calfTag = t('reproductive:calvingRegistration.validation.tagDuplicate');
        }
      }
      if (Object.keys(errors).length > 0) valid = false;
      return { ...row, errors };
    });
    setRows(updated);
    return valid;
  }, [rows, animals, t, toast]);

  const handleSaveAll = async () => {
    if (!validate()) return;
    setSaving(true);
    const { data: profile } = await supabase.from('profiles' as any).select('cabaña_id').eq('user_id', (await supabase.auth.getUser()).data.user?.id).single();
    const cabanaId = (profile as any)?.cabaña_id;
    if (!cabanaId) { setSaving(false); return; }

    let successCount = 0;
    let failedCount = 0;

    for (const row of rows) {
      try {
        if (row.result === 'exitoso') {
          const { data: newAnimal, error: animalError } = await supabase.from('animals').insert({
            id_tag: row.calfTag.trim(),
            sex: row.calfSex === 'Macho' ? 'Macho' : 'Hembra',
            breed: row.mother.breed,
            birth_date: format(row.birthDate, 'yyyy-MM-dd'),
            mother_id: row.mother.id,
            father_id: row.fatherId || null,
            peso_nacimiento: row.birthWeight ? parseFloat(row.birthWeight) : null,
            caravana_electronica: row.electronicTag || null,
            corral_id: row.mother.corral_id,
            cabaña_id: cabanaId,
            status: 'Activo',
          }).select('id').single();
          if (animalError) throw animalError;
          await registerCalvingEvent(row.mother.id, newAnimal.id, format(row.birthDate, 'yyyy-MM-dd'), cabanaId, row.notes || undefined);
          successCount++;
        } else {
          const { data: pregnancies } = await supabase
            .from('preñeces' as any).select('id')
            .eq('animal_id', row.mother.id).eq('estado_final', 'activa')
            .order('fecha_inicio', { ascending: false }).limit(1);
          const activePregnancy = (pregnancies as any)?.[0];
          if (activePregnancy) {
            await markPregnancyAsFailed(activePregnancy.id, RESULT_TO_MOTIVO[row.result]);
          } else {
            await supabase.from('animals').update({ esta_preñada: false, fecha_probable_parto: null }).eq('id', row.mother.id);
          }
          failedCount++;
        }
      } catch (error) {
        console.error('Error processing calving row:', error);
        setRows(prev => prev.map(r => r.id === row.id ? { ...r, errors: { _general: String(error) } } : r));
      }
    }
    setSaving(false);
    if (successCount > 0 || failedCount > 0) {
      toast({
        title: `${successCount + failedCount} ${t('reproductive:calvingRegistration.success')}`,
        description: t('reproductive:calvingRegistration.summary', { success: successCount, failed: failedCount }),
      });
      setRows([]);
      queryClient.invalidateQueries({ queryKey: ['animals'] });
      queryClient.invalidateQueries({ queryKey: ['animals-for-calving'] });
      onSuccess?.();
    }
  };

  return (
    <Card>
      <CardHeader className={cn('flex flex-row items-center justify-between space-y-0', isMobile && 'flex-col items-start gap-3')}>
        <CardTitle className={cn('text-lg flex items-center gap-2', isCompact && 'text-base')}>
          <Baby className="h-5 w-5" />
          {t('reproductive:calvingRegistration.title')}
        </CardTitle>
        <div className={cn('flex gap-2', isMobile && 'w-full')}>
          <Button size="sm" variant="outline" onClick={() => setShowMotherDialog(true)} className={cn(isMobile && 'flex-1')}>
            <Plus className="h-4 w-4 mr-1" />
            {t('reproductive:calvingRegistration.addRow')}
          </Button>
          {rows.length > 0 && (
            <Button size="sm" onClick={handleSaveAll} disabled={saving} className={cn(isMobile && 'flex-1')}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? t('reproductive:calvingRegistration.saving') : t('reproductive:calvingRegistration.saveAll')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn(isMobile && 'px-3')}>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t('reproductive:calvingRegistration.noRows')}
          </p>
        ) : isMobile ? (
          <div className="space-y-3">
            {rows.map(row => (
              <MobileCalvingCard
                key={row.id}
                row={row}
                males={males}
                onUpdate={updateRow}
                onRemove={removeRow}
                t={t}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('reproductive:calvingRegistration.columns.mother')}</TableHead>
                  <TableHead>{t('reproductive:calvingRegistration.columns.birthDate')}</TableHead>
                  <TableHead>{t('reproductive:calvingRegistration.columns.result')}</TableHead>
                  <TableHead>{t('reproductive:calvingRegistration.columns.calfSex')}</TableHead>
                  <TableHead>{t('reproductive:calvingRegistration.columns.calfTag')}</TableHead>
                  <TableHead>{t('reproductive:calvingRegistration.columns.birthWeight')}</TableHead>
                  <TableHead>{t('reproductive:calvingRegistration.columns.father')}</TableHead>
                  <TableHead>{t('reproductive:calvingRegistration.columns.notes')}</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map(row => (
                  <DesktopCalvingRow key={row.id} row={row} males={males} onUpdate={updateRow} onRemove={removeRow} t={t} />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <SelectMotherDialog
        open={showMotherDialog}
        onClose={() => setShowMotherDialog(false)}
        onSelect={handleSelectMother}
        animals={animals as any}
        corrales={corrales}
        alreadySelectedIds={alreadySelectedIds}
      />
    </Card>
  );
}

/* ─── Mobile Card View ─── */

interface RowProps {
  row: CalvingRow;
  males: any[];
  onUpdate: (id: string, updates: Partial<CalvingRow>) => void;
  onRemove: (id: string) => void;
  t: any;
}

function MobileCalvingCard({ row, males, onUpdate, onRemove, t }: RowProps) {
  const isSuccess = row.result === 'exitoso';
  const [calOpen, setCalOpen] = useState(false);

  return (
    <div className={cn('rounded-xl border bg-card p-3 space-y-3', row.errors._general && 'border-destructive/50 bg-destructive/5')}>
      {/* Header: Mother + Remove */}
      <div className="flex items-center justify-between">
        <div>
          <span className="font-medium text-sm">{row.mother.id_tag || '-'}</span>
          {row.mother.name && <span className="text-xs text-muted-foreground ml-2">{row.mother.name}</span>}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 -mr-1" onClick={() => onRemove(row.id)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Row 1: Date + Result */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {t('reproductive:calvingRegistration.columns.birthDate')}
          </label>
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn('w-full justify-start text-left font-normal h-9 text-xs', row.errors.birthDate && 'border-destructive')}>
                <CalendarIcon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                {format(row.birthDate, 'dd/MM/yy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={row.birthDate} onSelect={(d) => { if (d) { onUpdate(row.id, { birthDate: d }); setCalOpen(false); } }} disabled={(date) => date > new Date()} />
            </PopoverContent>
          </Popover>
          {row.errors.birthDate && <p className="text-[10px] text-destructive mt-0.5">{row.errors.birthDate}</p>}
        </div>
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {t('reproductive:calvingRegistration.columns.result')}
          </label>
          <Select value={row.result} onValueChange={(v) => onUpdate(row.id, { result: v as ResultType })}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exitoso">{t('reproductive:calvingRegistration.results.successful')}</SelectItem>
              <SelectItem value="aborto">{t('reproductive:calvingRegistration.results.abortion')}</SelectItem>
              <SelectItem value="stillbirth">{t('reproductive:calvingRegistration.results.stillbirth')}</SelectItem>
              <SelectItem value="neonatal">{t('reproductive:calvingRegistration.results.neonatal')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Sex + Tag (only if exitoso) */}
      {isSuccess && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {t('reproductive:calvingRegistration.columns.calfSex')}
            </label>
            <Select value={row.calfSex} onValueChange={(v) => onUpdate(row.id, { calfSex: v })}>
              <SelectTrigger className={cn('h-9 text-xs', row.errors.calfSex && 'border-destructive')}>
                <SelectValue placeholder="-" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Macho">Macho</SelectItem>
                <SelectItem value="Hembra">Hembra</SelectItem>
              </SelectContent>
            </Select>
            {row.errors.calfSex && <p className="text-[10px] text-destructive mt-0.5">{row.errors.calfSex}</p>}
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {t('reproductive:calvingRegistration.columns.calfTag')}
            </label>
            <Input
              value={row.calfTag}
              onChange={(e) => onUpdate(row.id, { calfTag: e.target.value })}
              className={cn('h-9 text-xs', row.errors.calfTag && 'border-destructive')}
              placeholder="-"
            />
            {row.errors.calfTag && <p className="text-[10px] text-destructive mt-0.5">{row.errors.calfTag}</p>}
          </div>
        </div>
      )}

      {/* Row 3: Weight + Father (only if exitoso) */}
      {isSuccess && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {t('reproductive:calvingRegistration.columns.birthWeight')}
            </label>
            <Input
              type="number"
              value={row.birthWeight}
              onChange={(e) => onUpdate(row.id, { birthWeight: e.target.value })}
              className="h-9 text-xs"
              placeholder="-"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {t('reproductive:calvingRegistration.columns.father')}
            </label>
            <Select value={row.fatherId || '_none'} onValueChange={(v) => onUpdate(row.id, { fatherId: v === '_none' ? '' : v })}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder={t('reproductive:calvingRegistration.noFather')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">{t('reproductive:calvingRegistration.noFather')}</SelectItem>
                {males.map(m => (
                  <SelectItem key={m.id} value={m.id}>{m.id_tag || m.name || m.id.slice(0, 8)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {t('reproductive:calvingRegistration.columns.notes')}
        </label>
        <Input
          value={row.notes}
          onChange={(e) => onUpdate(row.id, { notes: e.target.value })}
          className="h-9 text-xs"
          placeholder="-"
        />
      </div>
    </div>
  );
}

/* ─── Desktop Table Row ─── */

function DesktopCalvingRow({ row, males, onUpdate, onRemove, t }: RowProps) {
  const isSuccess = row.result === 'exitoso';
  const [calOpen, setCalOpen] = useState(false);

  return (
    <TableRow className={row.errors._general ? 'bg-destructive/5' : ''}>
      <TableCell className="whitespace-nowrap">
        <div className="font-medium text-sm">{row.mother.id_tag || '-'}</div>
        {row.mother.name && <div className="text-xs text-muted-foreground">{row.mother.name}</div>}
      </TableCell>
      <TableCell>
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('w-[120px] justify-start text-left font-normal', row.errors.birthDate && 'border-destructive')}>
              <CalendarIcon className="h-3.5 w-3.5 mr-1" />
              {format(row.birthDate, 'dd/MM/yy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar mode="single" selected={row.birthDate} onSelect={(d) => { if (d) { onUpdate(row.id, { birthDate: d }); setCalOpen(false); } }} disabled={(date) => date > new Date()} />
          </PopoverContent>
        </Popover>
        {row.errors.birthDate && <p className="text-[10px] text-destructive">{row.errors.birthDate}</p>}
      </TableCell>
      <TableCell>
        <Select value={row.result} onValueChange={(v) => onUpdate(row.id, { result: v as ResultType })}>
          <SelectTrigger className="w-[130px] h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="exitoso">{t('reproductive:calvingRegistration.results.successful')}</SelectItem>
            <SelectItem value="aborto">{t('reproductive:calvingRegistration.results.abortion')}</SelectItem>
            <SelectItem value="stillbirth">{t('reproductive:calvingRegistration.results.stillbirth')}</SelectItem>
            <SelectItem value="neonatal">{t('reproductive:calvingRegistration.results.neonatal')}</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select value={row.calfSex} onValueChange={(v) => onUpdate(row.id, { calfSex: v })} disabled={!isSuccess}>
          <SelectTrigger className={cn('w-[100px] h-8 text-xs', row.errors.calfSex && 'border-destructive', !isSuccess && 'opacity-50')}><SelectValue placeholder="-" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Macho">Macho</SelectItem>
            <SelectItem value="Hembra">Hembra</SelectItem>
          </SelectContent>
        </Select>
        {row.errors.calfSex && <p className="text-[10px] text-destructive">{row.errors.calfSex}</p>}
      </TableCell>
      <TableCell>
        <Input value={row.calfTag} onChange={(e) => onUpdate(row.id, { calfTag: e.target.value })} disabled={!isSuccess} className={cn('w-[100px] h-8 text-xs', row.errors.calfTag && 'border-destructive', !isSuccess && 'opacity-50')} placeholder="-" />
        {row.errors.calfTag && <p className="text-[10px] text-destructive max-w-[100px]">{row.errors.calfTag}</p>}
      </TableCell>
      <TableCell>
        <Input type="number" value={row.birthWeight} onChange={(e) => onUpdate(row.id, { birthWeight: e.target.value })} disabled={!isSuccess} className={cn('w-[70px] h-8 text-xs', !isSuccess && 'opacity-50')} placeholder="-" />
      </TableCell>
      <TableCell>
        <Select value={row.fatherId || '_none'} onValueChange={(v) => onUpdate(row.id, { fatherId: v === '_none' ? '' : v })}>
          <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue placeholder={t('reproductive:calvingRegistration.noFather')} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">{t('reproductive:calvingRegistration.noFather')}</SelectItem>
            {males.map(m => (<SelectItem key={m.id} value={m.id}>{m.id_tag || m.name || m.id.slice(0, 8)}</SelectItem>))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Input value={row.notes} onChange={(e) => onUpdate(row.id, { notes: e.target.value })} className="w-[100px] h-8 text-xs" placeholder="-" />
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(row.id)}><X className="h-3.5 w-3.5" /></Button>
      </TableCell>
    </TableRow>
  );
}
