import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Users, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface AnimalItem {
  id: string;
  name?: string;
  id_tag: string;
  sex?: string;
  breed?: string;
  corral_id?: string | null;
  corralName?: string;
  corral?: { name: string };
  peso_actual_kg?: number | null;
  birth_date?: string | null;
  esta_preñada?: boolean;
}

interface ActivityAnimalSelectorProps {
  animals: AnimalItem[];
  selectedAnimals: string[];
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onClear: () => void;
  loading?: boolean;
  emptyMessage?: string;
  maxHeight?: string;
  /** Render extra content to the right of each animal row */
  renderExtra?: (animal: AnimalItem) => React.ReactNode;
}

export function ActivityAnimalSelector({
  animals,
  selectedAnimals,
  onToggle,
  onSelectAll,
  onClear,
  loading,
  emptyMessage,
  maxHeight = "max-h-72",
  renderExtra,
}: ActivityAnimalSelectorProps) {
  const { t } = useTranslation(['activities', 'common']);
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    if (!searchTerm) return animals;
    const q = searchTerm.toLowerCase();
    return animals.filter(a =>
      a.id_tag?.toLowerCase().includes(q) ||
      a.name?.toLowerCase().includes(q) ||
      a.breed?.toLowerCase().includes(q)
    );
  }, [animals, searchTerm]);

  const corralName = (a: AnimalItem) => a.corralName || a.corral?.name;

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('activities:common.search') + "..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onSelectAll} className="shrink-0 gap-1.5">
          <CheckSquare className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{t('activities:common.selectAll')}</span>
        </Button>
        {selectedAnimals.length > 0 && (
          <Button type="button" variant="ghost" size="sm" onClick={onClear} className="shrink-0 text-muted-foreground">
            {t('activities:common.clear')}
          </Button>
        )}
      </div>

      {/* Selection summary */}
      {selectedAnimals.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-primary">
            {selectedAnimals.length}
          </span>
          <span className="text-sm text-primary/80">
            {selectedAnimals.length === 1 ? t('activities:activityCard.animal') : t('activities:activityCard.animals')} seleccionados
          </span>
        </div>
      )}

      {/* Animal list */}
      <div className={cn("overflow-y-auto rounded-xl border border-border divide-y divide-border/50", maxHeight)}>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {t('common:loading', 'Cargando...')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            {emptyMessage || t('activities:common.noAnimalsFound')}
          </div>
        ) : (
          filtered.map(animal => {
            const selected = selectedAnimals.includes(animal.id);
            return (
              <div
                key={animal.id}
                onClick={() => onToggle(animal.id)}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors duration-150",
                  selected ? "bg-primary/5" : "hover:bg-muted/50"
                )}
              >
                <Checkbox
                  checked={selected}
                  onCheckedChange={() => onToggle(animal.id)}
                  className="shrink-0"
                />
                {/* Animal info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {animal.id_tag || '—'}
                    </span>
                    {animal.name && (
                      <span className="text-sm text-muted-foreground truncate">
                        {animal.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {animal.breed && (
                      <span className="text-xs text-muted-foreground">{animal.breed}</span>
                    )}
                    {animal.sex && (
                      <>
                        <span className="text-xs text-muted-foreground/40">·</span>
                        <span className="text-xs text-muted-foreground">{animal.sex}</span>
                      </>
                    )}
                    {corralName(animal) && (
                      <>
                        <span className="text-xs text-muted-foreground/40">·</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {corralName(animal)}
                        </Badge>
                      </>
                    )}
                  </div>
                </div>
                {/* Extra content (e.g. weight input) */}
                {renderExtra && renderExtra(animal)}
              </div>
            );
          })
        )}
      </div>

      <p className="text-xs text-muted-foreground px-1">
        {filtered.length} {t('activities:activityCard.animals')} · {selectedAnimals.length} seleccionados
      </p>
    </div>
  );
}
