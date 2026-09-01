import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Baby } from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, format } from 'date-fns';

interface Animal {
  id: string;
  id_tag: string | null;
  name: string | null;
  sex: string | null;
  esta_preñada: boolean | null;
  fecha_probable_parto: string | null;
  corral_id: string | null;
  breed: string | null;
  birth_date: string | null;
  status: string | null;
  toro_servicio_id: string | null;
}

interface Corral {
  id: string;
  name: string;
}

interface SelectMotherDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (animal: Animal) => void;
  animals: Animal[];
  corrales: Corral[];
  alreadySelectedIds: string[];
}

export function SelectMotherDialog({ open, onClose, onSelect, animals, corrales, alreadySelectedIds }: SelectMotherDialogProps) {
  const { t } = useTranslation(['reproductive']);
  const [search, setSearch] = useState('');
  const [corralFilter, setCorralFilter] = useState<string>('all');
  const [showAll, setShowAll] = useState(false);

  const today = new Date();

  const females = useMemo(() => {
    return animals.filter(a =>
      (a.sex === 'Hembra' || a.sex === 'hembra') &&
      String(a.status || '').trim().toLowerCase() === 'activo' &&
      !alreadySelectedIds.includes(a.id)
    );
  }, [animals, alreadySelectedIds]);

  const pregnantFemales = useMemo(() => {
    return females
      .filter(a => a.esta_preñada)
      .sort((a, b) => {
        if (!a.fecha_probable_parto) return 1;
        if (!b.fecha_probable_parto) return -1;
        return new Date(a.fecha_probable_parto).getTime() - new Date(b.fecha_probable_parto).getTime();
      });
  }, [females]);

  const otherFemales = useMemo(() => {
    return females.filter(a => !a.esta_preñada);
  }, [females]);

  const displayList = showAll ? [...pregnantFemales, ...otherFemales] : pregnantFemales;

  const filtered = useMemo(() => {
    return displayList.filter(a => {
      const matchesSearch = !search ||
        (a.id_tag?.toLowerCase().includes(search.toLowerCase())) ||
        (a.name?.toLowerCase().includes(search.toLowerCase()));
      const matchesCorral = corralFilter === 'all' || a.corral_id === corralFilter;
      return matchesSearch && matchesCorral;
    });
  }, [displayList, search, corralFilter]);

  const getCorralName = (corralId: string | null) => {
    if (!corralId) return t('reproductive:manager.noCorral');
    return corrales.find(c => c.id === corralId)?.name || '-';
  };

  const getDueDateInfo = (fpp: string | null) => {
    if (!fpp) return null;
    const dueDate = new Date(fpp);
    const days = differenceInDays(dueDate, today);
    return { days, date: format(dueDate, 'dd/MM/yyyy') };
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col w-[calc(100%-1.5rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Baby className="h-5 w-5" />
            {t('reproductive:calvingRegistration.selectMother')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('reproductive:calvingRegistration.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={corralFilter} onValueChange={setCorralFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder={t('reproductive:calvingRegistration.filterByCorral')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('reproductive:calvingRegistration.allCorrals')}</SelectItem>
              {corrales.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {!showAll && (
            <p className="text-xs font-medium text-muted-foreground px-1 mb-1">
              {t('reproductive:calvingRegistration.pregnantFemales')} ({pregnantFemales.length})
            </p>
          )}

          {filtered.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('reproductive:calvingRegistration.noPregnantFemales')}
            </p>
          )}

          {filtered.map(animal => {
            const dueInfo = getDueDateInfo(animal.fecha_probable_parto);
            return (
              <button
                key={animal.id}
                onClick={() => { onSelect(animal); onClose(); }}
                className="w-full flex items-center justify-between gap-2 p-2.5 rounded-md hover:bg-accent active:bg-accent/80 text-left transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{animal.id_tag || '-'}</span>
                    {animal.name && <span className="text-sm text-muted-foreground truncate">{animal.name}</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                    <span>{getCorralName(animal.corral_id)}</span>
                    {animal.esta_preñada && <Badge variant="secondary" className="text-[10px] h-4">{t('reproductive:pregnancy.pregnant')}</Badge>}
                  </div>
                </div>
                {dueInfo && (
                  <div className={cn(
                    'text-xs text-right whitespace-nowrap shrink-0',
                    dueInfo.days < 0 ? 'text-destructive font-medium' : 'text-muted-foreground'
                  )}>
                    <div>{dueInfo.date}</div>
                    <div>
                      {dueInfo.days < 0
                        ? `${Math.abs(dueInfo.days)} ${t('reproductive:calvingRegistration.daysOverdue')}`
                        : `${dueInfo.days} ${t('reproductive:calvingRegistration.daysUntilDue')}`
                      }
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {!showAll && (
          <Button variant="outline" size="sm" onClick={() => setShowAll(true)} className="mt-1">
            {t('reproductive:calvingRegistration.showAllFemales')}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
