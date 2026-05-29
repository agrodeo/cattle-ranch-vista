import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useQuery } from '@tanstack/react-query';
import { AnimalDEPs } from '@/hooks/useAnimalDEPs';
import { TRAIT_CONFIG, TRAIT_SECTIONS } from '@/data/breedDEPReferences';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  baseAnimalId: string;
  baseDeps: AnimalDEPs;
}

export function DEPComparisonView({ open, onOpenChange, baseAnimalId, baseDeps }: Props) {
  const { t } = useTranslation(['deps', 'common']);
  const { currentUser } = useSupabaseAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setSelectedId(null);
  }, [open]);

  const { data: bulls = [] } = useQuery({
    queryKey: ['deps-comparable-bulls', currentUser?.cabañaId, baseAnimalId],
    queryFn: async () => {
      if (!currentUser?.cabañaId) return [];
      const { data, error } = await supabase
        .from('animals')
        .select('id, id_tag, name')
        .eq('cabaña_id', currentUser.cabañaId)
        .eq('sex', 'macho')
        .neq('id', baseAnimalId)
        .order('id_tag', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: open && !!currentUser?.cabañaId,
  });

  const { data: otherDeps } = useQuery({
    queryKey: ['animal-deps', selectedId],
    queryFn: async () => {
      if (!selectedId) return null;
      const { data, error } = await (supabase as any)
        .from('animal_deps')
        .select('*')
        .eq('animal_id', selectedId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as AnimalDEPs | null;
    },
    enabled: !!selectedId,
  });

  const selectedLabel = useMemo(() => {
    const b = bulls.find((x: any) => x.id === selectedId);
    return b ? b.id_tag || b.name || '—' : '';
  }, [bulls, selectedId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('deps:compare')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('deps:compare_select')}</Label>
            {bulls.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t('deps:compare_no_bulls')}</p>
            ) : (
              <Select value={selectedId ?? ''} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder={t('deps:compare_select')} />
                </SelectTrigger>
                <SelectContent>
                  {bulls.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.id_tag || b.name || b.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedId && (
            <div className="space-y-5">
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <div className="col-span-6">{t('deps:title')}</div>
                <div className="col-span-3 text-right">A</div>
                <div className="col-span-3 text-right">{selectedLabel || 'B'}</div>
              </div>

              {TRAIT_SECTIONS.map((section) => {
                const traits = TRAIT_CONFIG.filter((tr) => tr.section === section);
                const anyValue = traits.some(
                  (tr) =>
                    (baseDeps as any)[tr.column] != null ||
                    (otherDeps && (otherDeps as any)[tr.column] != null),
                );
                if (!anyValue) return null;
                return (
                  <div key={section}>
                    <h4 className="text-sm font-semibold mb-2">
                      {t(`deps:section_${section}` as const)}
                    </h4>
                    <div className="space-y-1.5">
                      {traits.map((tr) => {
                        const a = (baseDeps as any)[tr.column] as number | null;
                        const b = otherDeps ? ((otherDeps as any)[tr.column] as number | null) : null;
                        if (a == null && b == null) return null;
                        let aBetter = false;
                        let bBetter = false;
                        if (a != null && b != null && Number(a) !== Number(b)) {
                          const aWins = tr.lowerIsBetter ? Number(a) < Number(b) : Number(a) > Number(b);
                          aBetter = aWins;
                          bBetter = !aWins;
                        }
                        return (
                          <div key={tr.key} className="grid grid-cols-12 gap-2 items-center py-1.5 border-b border-border/40 text-sm">
                            <div className="col-span-6 text-muted-foreground">
                              {t(`deps:trait_${tr.key}` as const)}
                            </div>
                            <div
                              className={cn(
                                'col-span-3 text-right tabular-nums px-2 py-0.5 rounded',
                                aBetter && 'bg-primary/10 text-primary font-semibold',
                              )}
                            >
                              {a != null ? `${Number(a) > 0 ? '+' : ''}${a} ${tr.unit}` : '—'}
                            </div>
                            <div
                              className={cn(
                                'col-span-3 text-right tabular-nums px-2 py-0.5 rounded',
                                bBetter && 'bg-primary/10 text-primary font-semibold',
                              )}
                            >
                              {b != null ? `${Number(b) > 0 ? '+' : ''}${b} ${tr.unit}` : '—'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
