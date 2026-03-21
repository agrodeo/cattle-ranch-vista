import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useReproductiveSystem } from '@/hooks/useReproductiveSystem';
import { markPregnancyAsFailed } from '@/lib/pregnancyManagement';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, X, CalendarIcon, Save, Baby } from 'lucide-react';
import { SelectMotherDialog } from './SelectMotherDialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
}

const RESULT_TO_MOTIVO: Record<ResultType, string> = {
  exitoso: 'parto_exitoso',
  aborto: 'aborto_tardio',
  stillbirth: 'stillbirth',
  neonatal: 'neonatal',
};

export function CalvingRegistrationManager({ isCompact }: CalvingRegistrationManagerProps) {
  const { t } = useTranslation(['reproductive', 'common']);
  const { registerCalvingEvent } = useReproductiveSystem();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rows, setRows] = useState<CalvingRow[]>([]);
  const [showMotherDialog, setShowMotherDialog] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch animals
  const { data: animals = [] } = useQuery({
    queryKey: ['animals-for-calving'],
    queryFn: async () => {
      const { data: profile } = await supabase.from('profiles' as any).select('cabaña_id').eq('user_id', (await supabase.auth.getUser()).data.user?.id).single();
      const cabanaId = (profile as any)?.cabaña_id;
      if (!cabanaId) return [];
      const { data } = await supabase.from('animals').select('id, id_tag, name, sex, esta_preñada, fecha_probable_parto, corral_id, breed, birth_date, status, toro_servicio_id, cabaña_id').eq('cabaña_id', cabanaId);
      return data || [];
    },
  });

  // Fetch corrales
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

      if (row.birthDate > today) {
        errors.birthDate = t('reproductive:calvingRegistration.validation.dateInFuture');
      }

      if (row.result === 'exitoso') {
        if (!row.calfSex) errors.calfSex = t('reproductive:calvingRegistration.validation.sexRequired');
        if (!row.calfTag.trim()) {
          errors.calfTag = t('reproductive:calvingRegistration.validation.tagRequired');
        } else {
          // Check duplicate in batch
          const tag = row.calfTag.trim().toLowerCase();
          if (tagsInBatch.filter(t => t === tag).length > 1) {
            errors.calfTag = t('reproductive:calvingRegistration.validation.tagDuplicateInBatch');
          }
          // Check existing in DB
          const existing = animals.find(a => a.id_tag?.toLowerCase() === tag);
          if (existing) {
            errors.calfTag = t('reproductive:calvingRegistration.validation.tagDuplicate');
          }
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
          // Create new calf animal
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

          // Call registerCalvingEvent
          await registerCalvingEvent(
            row.mother.id,
            newAnimal.id,
            format(row.birthDate, 'yyyy-MM-dd'),
            cabanaId,
            row.notes || undefined
          );
          successCount++;
        } else {
          // Failed pregnancy — find active pregnancy and mark as failed
          const { data: pregnancies } = await supabase
            .from('preñeces' as any)
            .select('id')
            .eq('animal_id', row.mother.id)
            .eq('estado_final', 'activa')
            .order('fecha_inicio', { ascending: false })
            .limit(1);

          const activePregnancy = (pregnancies as any)?.[0];

          if (activePregnancy) {
            await markPregnancyAsFailed(activePregnancy.id, RESULT_TO_MOTIVO[row.result]);
          } else {
            // No active pregnancy — update mother directly
            await supabase.from('animals').update({
              esta_preñada: false,
              fecha_probable_parto: null,
            }).eq('id', row.mother.id);
          }
          failedCount++;
        }
      } catch (error) {
        console.error('Error processing calving row:', error);
        // Mark row with error
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
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className={cn('text-lg flex items-center gap-2', isCompact && 'text-base')}>
          <Baby className="h-5 w-5" />
          {t('reproductive:calvingRegistration.title')}
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowMotherDialog(true)}>
            <Plus className="h-4 w-4 mr-1" />
            {t('reproductive:calvingRegistration.addRow')}
          </Button>
          {rows.length > 0 && (
            <Button size="sm" onClick={handleSaveAll} disabled={saving}>
              <Save className="h-4 w-4 mr-1" />
              {saving ? t('reproductive:calvingRegistration.saving') : t('reproductive:calvingRegistration.saveAll')}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {t('reproductive:calvingRegistration.noRows')}
          </p>
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
                  <CalvingRow
                    key={row.id}
                    row={row}
                    males={males}
                    onUpdate={updateRow}
                    onRemove={removeRow}
                    t={t}
                  />
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

interface CalvingRowProps {
  row: CalvingRow;
  males: any[];
  onUpdate: (id: string, updates: Partial<CalvingRow>) => void;
  onRemove: (id: string) => void;
  t: any;
}

function CalvingRow({ row, males, onUpdate, onRemove, t }: CalvingRowProps) {
  const isSuccess = row.result === 'exitoso';
  const [calOpen, setCalOpen] = useState(false);

  return (
    <TableRow className={row.errors._general ? 'bg-destructive/5' : ''}>
      {/* Mother */}
      <TableCell className="whitespace-nowrap">
        <div className="font-medium text-sm">{row.mother.id_tag || '-'}</div>
        {row.mother.name && <div className="text-xs text-muted-foreground">{row.mother.name}</div>}
      </TableCell>

      {/* Birth Date */}
      <TableCell>
        <Popover open={calOpen} onOpenChange={setCalOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('w-[120px] justify-start text-left font-normal', row.errors.birthDate && 'border-destructive')}>
              <CalendarIcon className="h-3.5 w-3.5 mr-1" />
              {format(row.birthDate, 'dd/MM/yy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={row.birthDate}
              onSelect={(d) => { if (d) { onUpdate(row.id, { birthDate: d }); setCalOpen(false); } }}
              disabled={(date) => date > new Date()}
            />
          </PopoverContent>
        </Popover>
        {row.errors.birthDate && <p className="text-[10px] text-destructive">{row.errors.birthDate}</p>}
      </TableCell>

      {/* Result */}
      <TableCell>
        <Select value={row.result} onValueChange={(v) => onUpdate(row.id, { result: v as ResultType })}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="exitoso">{t('reproductive:calvingRegistration.results.successful')}</SelectItem>
            <SelectItem value="aborto">{t('reproductive:calvingRegistration.results.abortion')}</SelectItem>
            <SelectItem value="stillbirth">{t('reproductive:calvingRegistration.results.stillbirth')}</SelectItem>
            <SelectItem value="neonatal">{t('reproductive:calvingRegistration.results.neonatal')}</SelectItem>
          </SelectContent>
        </Select>
      </TableCell>

      {/* Calf Sex */}
      <TableCell>
        <Select
          value={row.calfSex}
          onValueChange={(v) => onUpdate(row.id, { calfSex: v })}
          disabled={!isSuccess}
        >
          <SelectTrigger className={cn('w-[100px] h-8 text-xs', row.errors.calfSex && 'border-destructive', !isSuccess && 'opacity-50')}>
            <SelectValue placeholder="-" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Macho">Macho</SelectItem>
            <SelectItem value="Hembra">Hembra</SelectItem>
          </SelectContent>
        </Select>
        {row.errors.calfSex && <p className="text-[10px] text-destructive">{row.errors.calfSex}</p>}
      </TableCell>

      {/* Calf Tag */}
      <TableCell>
        <Input
          value={row.calfTag}
          onChange={(e) => onUpdate(row.id, { calfTag: e.target.value })}
          disabled={!isSuccess}
          className={cn('w-[100px] h-8 text-xs', row.errors.calfTag && 'border-destructive', !isSuccess && 'opacity-50')}
          placeholder="-"
        />
        {row.errors.calfTag && <p className="text-[10px] text-destructive max-w-[100px]">{row.errors.calfTag}</p>}
      </TableCell>

      {/* Birth Weight */}
      <TableCell>
        <Input
          type="number"
          value={row.birthWeight}
          onChange={(e) => onUpdate(row.id, { birthWeight: e.target.value })}
          disabled={!isSuccess}
          className={cn('w-[70px] h-8 text-xs', !isSuccess && 'opacity-50')}
          placeholder="-"
        />
      </TableCell>

      {/* Father */}
      <TableCell>
        <Select value={row.fatherId || '_none'} onValueChange={(v) => onUpdate(row.id, { fatherId: v === '_none' ? '' : v })}>
          <SelectTrigger className="w-[120px] h-8 text-xs">
            <SelectValue placeholder={t('reproductive:calvingRegistration.noFather')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">{t('reproductive:calvingRegistration.noFather')}</SelectItem>
            {males.map(m => (
              <SelectItem key={m.id} value={m.id}>
                {m.id_tag || m.name || m.id.slice(0, 8)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Notes */}
      <TableCell>
        <Input
          value={row.notes}
          onChange={(e) => onUpdate(row.id, { notes: e.target.value })}
          className="w-[100px] h-8 text-xs"
          placeholder="-"
        />
      </TableCell>

      {/* Remove */}
      <TableCell>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onRemove(row.id)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
}
