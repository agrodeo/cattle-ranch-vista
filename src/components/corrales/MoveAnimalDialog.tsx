import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { isOnline } from "@/services/connectivity";
import { db } from "@/services/db";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Move, Search, MapPin, CheckSquare } from "lucide-react";

interface Animal {
  id: string;
  name: string;
  id_tag: string;
  sex: string;
  breed: string;
  corral_id: string | null;
  corralName?: string;
}

interface Corral {
  id: string;
  name: string;
}

interface MoveAnimalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  /** Pre-filter to only show animals from this corral */
  sourceCorralId?: string;
}

export function MoveAnimalDialog({ open, onOpenChange, onSuccess, sourceCorralId }: MoveAnimalDialogProps) {
  const { t } = useTranslation(['corrals', 'common']);
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [corrals, setCorrals] = useState<Corral[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [targetCorralId, setTargetCorralId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceCorralFilter, setSourceCorralFilter] = useState<string>(sourceCorralId || "all");

  useEffect(() => {
    if (open) {
      setSelectedAnimals([]);
      setTargetCorralId("");
      setSearchTerm("");
      setSourceCorralFilter(sourceCorralId || "all");
      fetchData();
    }
  }, [open, sourceCorralId]);

  const fetchData = async () => {
    if (!currentUser?.cabañaId) return;

    try {
      setLoading(true);

      if (!isOnline()) {
        // ── OFFLINE: load from IndexedDB ──
        const [cachedAnimals, cachedCorrals] = await Promise.all([
          db.animals_cache.where('cabaña_id').equals(currentUser.cabañaId).toArray(),
          db.corrales_cache.where('cabaña_id').equals(currentUser.cabañaId).toArray(),
        ]);
        const corralMap = new Map(cachedCorrals.map(c => [c.id, c.name]));
        const activeAnimals = cachedAnimals
          .filter(a => {
            const s = (a.status || '').toLowerCase();
            return s !== 'vendido' && s !== 'muerto';
          })
          .map(a => ({
            id: a.id,
            name: a.name || '',
            id_tag: a.id_tag || '',
            sex: a.sex,
            breed: a.breed || '',
            corral_id: a.corral_id || null,
            corralName: a.corral_id ? corralMap.get(a.corral_id) : undefined,
          }));
        setAnimals(activeAnimals);
        setCorrals(cachedCorrals.map(c => ({ id: c.id, name: c.name })));
      } else {
        // ── ONLINE ──
        const [animalsResponse, corralsResponse] = await Promise.all([
          supabase
            .from("animals")
            .select("id, name, id_tag, sex, breed, corral_id, corrales:corral_id(name)")
            .eq("cabaña_id", currentUser.cabañaId)
            .not("status", "ilike", "vendido")
            .not("status", "ilike", "muerto"),
          supabase
            .from("corrales")
            .select("id, name")
            .eq("cabaña_id", currentUser.cabañaId)
            .order("name"),
        ]);
        if (animalsResponse.error) throw animalsResponse.error;
        if (corralsResponse.error) throw corralsResponse.error;

        setAnimals(
          (animalsResponse.data || []).map(a => ({
            ...a,
            corralName: (a as any).corrales?.name,
          }))
        );
        setCorrals(corralsResponse.data || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: t('common:toast.error'), description: t('corrals:move.errorMoving'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredAnimals = animals.filter(animal => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      animal.name?.toLowerCase().includes(searchLower) ||
      animal.id_tag?.toLowerCase().includes(searchLower) ||
      animal.breed?.toLowerCase().includes(searchLower);

    const matchesCorralFilter =
      sourceCorralFilter === "all" ||
      (sourceCorralFilter === "unassigned" && !animal.corral_id) ||
      sourceCorralFilter === animal.corral_id;

    return matchesSearch && matchesCorralFilter;
  });

  const handleAnimalToggle = (animalId: string) => {
    setSelectedAnimals(prev =>
      prev.includes(animalId) ? prev.filter(id => id !== animalId) : [...prev, animalId]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = filteredAnimals.map(a => a.id);
    setSelectedAnimals(prev => [...new Set([...prev, ...visibleIds])]);
  };

  const clearSelection = () => setSelectedAnimals([]);

  const canMove = selectedAnimals.length > 0 && targetCorralId !== "";

  const handleMove = async () => {
    if (!canMove) return;

    try {
      setLoading(true);
      const targetCorralName = corrals.find(c => c.id === targetCorralId)?.name || "";
      const newCorralId = targetCorralId === "none" ? null : targetCorralId;

      if (!isOnline()) {
        // ── OFFLINE: update cache + queue to outbox ──
        const { enqueue } = await import('@/services/syncEngine');
        for (const animalId of selectedAnimals) {
          const animal = animals.find(a => a.id === animalId);
          await db.animals_cache.update(animalId, { corral_id: newCorralId || undefined });
          await enqueue({
            type: 'ANIMAL_UPDATE',
            payload: { id: animalId, corral_id: newCorralId },
          });
          if (currentUser?.cabañaId && currentUser?.id) {
            await enqueue({
              type: 'CORRAL_MOVEMENT_INSERT',
              payload: {
                animal_id: animalId,
                cabaña_id: currentUser.cabañaId,
                corral_anterior_id: animal?.corral_id || null,
                corral_nuevo_id: newCorralId,
                fecha_movimiento: new Date().toISOString().split('T')[0],
                registrado_por: currentUser.id,
              },
            });
          }
        }
        toast({
          title: t('common:toast.success'),
          description: `${selectedAnimals.length} ${t('corrals:move.animalsMovedTo')} ${targetCorralId === "none" ? t('corrals:move.noCorralAssigned') : targetCorralName}`,
        });
      } else {
        // ── ONLINE ──
        const { error } = await supabase
          .from("animals")
          .update({ corral_id: newCorralId })
          .in("id", selectedAnimals);
        if (error) throw error;

        // Record corral movements
        if (currentUser?.cabañaId && currentUser?.id) {
          const movements = selectedAnimals.map(animalId => {
            const animal = animals.find(a => a.id === animalId);
            return {
              animal_id: animalId,
              cabaña_id: currentUser.cabañaId!,
              corral_anterior_id: animal?.corral_id || null,
              corral_nuevo_id: newCorralId,
              fecha_movimiento: new Date().toISOString().split('T')[0],
              registrado_por: currentUser.id!,
            };
          });
          await supabase.from("corral_movements").insert(movements);
        }

        toast({
          title: t('common:toast.success'),
          description: `${selectedAnimals.length} ${t('corrals:move.animalsMovedTo')} ${targetCorralId === "none" ? t('corrals:move.noCorralAssigned') : targetCorralName}`,
        });
      }

      setSelectedAnimals([]);
      setTargetCorralId("");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error moving animals:", error);
      toast({ title: t('common:toast.error'), description: t('corrals:move.errorMoving'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Move className="h-5 w-5 text-primary" />
            {t('corrals:move.dialogTitle')}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Step 1 — Destination Corral */}
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              {t('corrals:move.destination')}
            </label>
            <Select value={targetCorralId} onValueChange={setTargetCorralId}>
              <SelectTrigger className={!targetCorralId ? "border-destructive" : ""}>
                <SelectValue placeholder={t('corrals:move.selectDestination')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('corrals:move.noCorralAssigned')}</SelectItem>
                {corrals.map(corral => (
                  <SelectItem key={corral.id} value={corral.id}>{corral.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!targetCorralId && (
              <p className="text-xs text-destructive">{t('corrals:move.destinationRequired', 'Debes seleccionar un corral destino')}</p>
            )}
          </div>

          {/* Step 2 — Select Animals */}
          <div className="space-y-2">
            <label className="text-sm font-semibold flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              {t('corrals:move.selectAnimalsLabel', 'Seleccionar animales')} ({selectedAnimals.length})
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('corrals:move.searchAnimals')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={sourceCorralFilter} onValueChange={setSourceCorralFilter}>
                <SelectTrigger>
                  <SelectValue placeholder={t('corrals:move.filterByCorral')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('corrals:move.allCorrals')}</SelectItem>
                  <SelectItem value="unassigned">{t('corrals:move.unassigned')}</SelectItem>
                  {corrals.map(corral => (
                    <SelectItem key={corral.id} value={corral.id}>{corral.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bulk actions */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {filteredAnimals.length} {t('corrals:move.animalsShown', 'animales')}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllVisible}>
                  {t('corrals:move.selectAll', 'Seleccionar todos')}
                </Button>
                {selectedAnimals.length > 0 && (
                  <Button variant="outline" size="sm" onClick={clearSelection}>
                    {t('corrals:move.clear')}
                  </Button>
                )}
              </div>
            </div>

            {/* Selected chips */}
            {selectedAnimals.length > 0 && (
              <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto p-2 border border-border rounded-lg bg-muted/30">
                {selectedAnimals.slice(0, 15).map(id => {
                  const a = animals.find(x => x.id === id);
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground text-xs"
                      onClick={() => handleAnimalToggle(id)}
                    >
                      {a?.name || a?.id_tag || '?'} ×
                    </Badge>
                  );
                })}
                {selectedAnimals.length > 15 && (
                  <Badge variant="outline" className="text-xs">+{selectedAnimals.length - 15} más</Badge>
                )}
              </div>
            )}

            {/* Animal list */}
            <div className="max-h-64 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground text-sm">{t('common:loading', 'Cargando...')}</div>
              ) : filteredAnimals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">
                  {t('corrals:move.noAnimalsFound')}
                </p>
              ) : (
                filteredAnimals.map(animal => (
                  <div
                    key={animal.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleAnimalToggle(animal.id)}
                  >
                    <Checkbox
                      checked={selectedAnimals.includes(animal.id)}
                      onCheckedChange={() => handleAnimalToggle(animal.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {animal.name || animal.id_tag || animal.id}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {animal.breed} · {animal.sex}
                      </p>
                    </div>
                    {animal.corralName ? (
                      <Badge variant="secondary" className="text-xs shrink-0">{animal.corralName}</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs shrink-0">{t('corrals:move.unassigned')}</Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('corrals:move.cancel', 'Cancelar')}
          </Button>
          <Button onClick={handleMove} disabled={!canMove || loading}>
            {loading
              ? t('corrals:move.moving', 'Moviendo...')
              : `${t('corrals:move.moveAction', 'Mover')} ${selectedAnimals.length} ${t('corrals:move.animalsLabel', 'animales')}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
