import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Pencil, Plus, GitCompareArrows } from 'lucide-react';
import { useAnimalDEPs, AnimalDEPs } from '@/hooks/useAnimalDEPs';
import {
  TRAIT_CONFIG,
  TRAIT_SECTIONS,
  TraitConfig,
  TraitSection,
  getBreedReference,
  BreedDEPReference,
} from '@/data/breedDEPReferences';
import { DEPsEditDialog } from './DEPsEditDialog';
import { DEPComparisonView } from './DEPComparisonView';
import { cn } from '@/lib/utils';

interface Props {
  animalId: string;
  breed?: string | null;
}

function accuracyColor(acc: number | null | undefined): string {
  if (acc == null) return 'bg-muted';
  if (acc >= 0.7) return 'bg-emerald-500';
  if (acc >= 0.4) return 'bg-amber-500';
  return 'bg-destructive';
}

function getBreedRange(
  trait: TraitConfig,
  ref: BreedDEPReference | null,
): { top10: number; average: number } | null {
  if (!ref) return null;
  const v = (ref.values as Record<string, { average: number; top10: number } | undefined>)[trait.key];
  if (!v) return null;
  return { top10: v.top10, average: v.average };
}

/** Map a value (relative to breed average) to a 0..100 position on the bar.
 *  For lowerIsBetter, lower values move right (better). */
function valueToPercent(
  value: number,
  trait: TraitConfig,
  range: { top10: number; average: number } | null,
): number {
  if (!range) return 50;
  const span = Math.abs(range.top10 - range.average) * 1.5 || 1;
  const delta = value - range.average;
  const signed = trait.lowerIsBetter ? -delta : delta;
  const ratio = signed / span; // -1..1 ideally
  return Math.max(0, Math.min(100, 50 + ratio * 50));
}

export function AnimalDEPsSection({ animalId, breed }: Props) {
  const { t } = useTranslation(['deps', 'common']);
  const { deps, isLoading } = useAnimalDEPs(animalId);
  const [editOpen, setEditOpen] = useState(false);
  const [compareOpen, setCompareOpen] = useState(false);

  const breedRef = useMemo(() => getBreedReference(breed), [breed]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasDeps = !!deps;

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
          <div className="min-w-0">
            <CardTitle className="text-lg">{t('deps:title')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t('deps:subtitle')}</p>
            {hasDeps && (deps?.source || deps?.evaluation_date) && (
              <p className="text-xs text-muted-foreground mt-1">
                {[deps?.source, deps?.evaluation_date].filter(Boolean).join(' · ')}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {hasDeps && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCompareOpen(true)}
                className="hidden sm:inline-flex"
              >
                <GitCompareArrows className="h-4 w-4 mr-2" />
                {t('deps:compare')}
              </Button>
            )}
            <Button size="sm" onClick={() => setEditOpen(true)}>
              {hasDeps ? (
                <>
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('deps:edit')}
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('deps:add')}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!hasDeps ? (
            <p className="text-sm text-muted-foreground py-8 text-center">{t('deps:no_deps')}</p>
          ) : (
            <DEPsBody deps={deps!} breedRef={breedRef} />
          )}
          {hasDeps && breedRef && (
            <p className="text-xs text-muted-foreground mt-4">
              {t('deps:breed_reference_source', { source: breedRef.source, year: breedRef.year })}
            </p>
          )}
        </CardContent>
      </Card>

      <DEPsEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        animalId={animalId}
        breed={breed}
      />

      {hasDeps && (
        <DEPComparisonView
          open={compareOpen}
          onOpenChange={setCompareOpen}
          baseAnimalId={animalId}
          baseDeps={deps!}
        />
      )}
    </>
  );
}

function DEPsBody({ deps, breedRef }: { deps: AnimalDEPs; breedRef: BreedDEPReference | null }) {
  const { t } = useTranslation('deps');

  return (
    <div className="space-y-6">
      {TRAIT_SECTIONS.map((section) => {
        const traits = TRAIT_CONFIG.filter((tr) => tr.section === section);
        const hasAny = traits.some((tr) => (deps as any)[tr.column] != null);
        if (!hasAny) return null;
        return (
          <div key={section}>
            <h4 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">
              {t(`section_${section}` as const)}
            </h4>
            <div className="space-y-4">
              {traits.map((tr) => {
                const value = (deps as any)[tr.column] as number | null;
                if (value == null) return null;
                const acc = (deps as any)[tr.accColumn] as number | null;
                const range = getBreedRange(tr, breedRef);
                const pct = valueToPercent(Number(value), tr, range);
                return (
                  <div key={tr.key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium">{t(`trait_${tr.key}` as const)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">
                          {Number(value) > 0 ? '+' : ''}
                          {Number(value)} {tr.unit}
                        </span>
                        {acc != null && (
                          <span
                            className={cn('h-2 w-2 rounded-full', accuracyColor(acc))}
                            title={`${t('accuracy')}: ${acc}`}
                          />
                        )}
                      </div>
                    </div>
                    <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                      <div className="absolute inset-y-0 left-1/2 w-px bg-border" />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-primary border-2 border-background shadow"
                        style={{ left: `calc(${pct}% - 6px)` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                      <span>{t('worse')}</span>
                      <span>{t('average')}</span>
                      <span>{t('better')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
