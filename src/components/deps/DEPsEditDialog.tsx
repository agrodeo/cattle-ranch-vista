import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAnimalDEPs } from '@/hooks/useAnimalDEPs';
import {
  TRAIT_CONFIG,
  TRAIT_SECTIONS,
  getBreedReference,
} from '@/data/breedDEPReferences';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  animalId: string;
  breed?: string | null;
}

type FormState = Record<string, string>;

export function DEPsEditDialog({ open, onOpenChange, animalId, breed }: Props) {
  const { t } = useTranslation(['deps', 'common']);
  const { deps, saveDEPs } = useAnimalDEPs(animalId);
  const breedRef = useMemo(() => getBreedReference(breed), [breed]);

  const [form, setForm] = useState<FormState>({});
  const [showAccuracy, setShowAccuracy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const initial: FormState = {
      source: deps?.source ?? '',
      evaluation_date: deps?.evaluation_date ?? '',
      notes: deps?.notes ?? '',
    };
    TRAIT_CONFIG.forEach((tr) => {
      initial[tr.column] = (deps as any)?.[tr.column] != null ? String((deps as any)[tr.column]) : '';
      initial[tr.accColumn] = (deps as any)?.[tr.accColumn] != null ? String((deps as any)[tr.accColumn]) : '';
    });
    setForm(initial);
  }, [open, deps]);

  const setField = (k: string, v: string) => setForm((s) => ({ ...s, [k]: v }));

  const handleSave = async () => {
    const payload: Record<string, unknown> = {
      source: form.source?.trim() || null,
      evaluation_date: form.evaluation_date || null,
      notes: form.notes?.trim() || null,
    };
    TRAIT_CONFIG.forEach((tr) => {
      const raw = form[tr.column];
      const rawAcc = form[tr.accColumn];
      payload[tr.column] = raw === '' || raw == null ? null : Number(raw);
      payload[tr.accColumn] = rawAcc === '' || rawAcc == null ? null : Number(rawAcc);
    });
    await saveDEPs.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{deps ? t('deps:edit') : t('deps:add')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="source">{t('deps:source')}</Label>
              <Input
                id="source"
                placeholder={t('deps:source_placeholder')}
                value={form.source ?? ''}
                onChange={(e) => setField('source', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evaluation_date">{t('deps:evaluation_date')}</Label>
              <Input
                id="evaluation_date"
                type="date"
                value={form.evaluation_date ?? ''}
                onChange={(e) => setField('evaluation_date', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border p-3">
            <Label htmlFor="show-acc" className="cursor-pointer">
              {t('deps:show_accuracy')}
            </Label>
            <Switch id="show-acc" checked={showAccuracy} onCheckedChange={setShowAccuracy} />
          </div>

          {TRAIT_SECTIONS.map((section) => {
            const traits = TRAIT_CONFIG.filter((tr) => tr.section === section);
            return (
              <div key={section} className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t(`deps:section_${section}` as const)}
                </h4>
                <div className="space-y-3">
                  {traits.map((tr) => {
                    const ref = breedRef
                      ? (breedRef.values as Record<string, { average: number; top25: number } | undefined>)[tr.key]
                      : undefined;
                    return (
                      <div key={tr.key} className="grid grid-cols-12 gap-2 items-end">
                        <div className={showAccuracy ? 'col-span-7' : 'col-span-12 sm:col-span-9'}>
                          <Label className="text-xs">{t(`deps:trait_${tr.key}` as const)}</Label>
                          <div className="relative">
                            <Input
                              type="number"
                              step="0.01"
                              inputMode="decimal"
                              value={form[tr.column] ?? ''}
                              onChange={(e) => setField(tr.column, e.target.value)}
                              className="pr-12"
                            />
                            {tr.unit && (
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                {tr.unit}
                              </span>
                            )}
                          </div>
                          {ref && (
                            <p className="text-[10px] text-muted-foreground mt-1">
                              {t('deps:breed_reference', { avg: ref.average, top25: ref.top25 })}
                            </p>
                          )}
                        </div>
                        {showAccuracy && (
                          <div className="col-span-5">
                            <Label className="text-xs">{t('deps:accuracy')}</Label>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="1"
                              inputMode="decimal"
                              value={form[tr.accColumn] ?? ''}
                              onChange={(e) => setField(tr.accColumn, e.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="space-y-1.5">
            <Label htmlFor="notes">{t('deps:notes')}</Label>
            <Textarea
              id="notes"
              rows={3}
              value={form.notes ?? ''}
              onChange={(e) => setField('notes', e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('deps:cancel')}
          </Button>
          <Button onClick={handleSave} disabled={saveDEPs.isPending}>
            {t('deps:save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
