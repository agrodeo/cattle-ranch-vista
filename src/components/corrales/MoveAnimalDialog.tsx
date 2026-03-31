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
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Move, Search, MapPin, CheckSquare, ArrowRight, ChevronLeft, ChevronRight, Check, Users } from "lucide-react";
import { cn } from "@/lib/utils";

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
  animalCount?: number;
}

interface MoveAnimalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
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
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    if (open) {
      setSelectedAnimals([]);
      setTargetCorralId("");
      setSearchTerm("");
      setStep(1);
      fetchData();
    }
  }, [open, sourceCorralId]);

  const fetchData = async () => {
    if (!currentUser?.cabañaId) return;
    try {
      setLoading(true);
      if (!isOnline()) {
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
            id: a.id, name: a.name || '', id_tag: a.id_tag || '',
            sex: a.sex, breed: a.breed || '',
            corral_id: a.corral_id || null,
            corralName: a.corral_id ? corralMap.get(a.corral_id) : undefined,
          }));
        
        // Count animals per corral
        const corralCounts = new Map<string, number>();
        activeAnimals.forEach(a => {
          if (a.corral_id) corralCounts.set(a.corral_id, (corralCounts.get(a.corral_id) || 0) + 1);
        });
        
        setAnimals(activeAnimals);
        setCorrals(cachedCorrals.map(c => ({ id: c.id, name: c.name, animalCount: corralCounts.get(c.id) || 0 })));
      } else {
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

        const animalData = (animalsResponse.data || []).map(a => ({
          ...a, corralName: (a as any).corrales?.name,
        }));

        const corralCounts = new Map<string, number>();
        animalData.forEach(a => {
          if (a.corral_id) corralCounts.set(a.corral_id, (corralCounts.get(a.corral_id) || 0) + 1);
        });

        setAnimals(animalData);
        setCorrals((corralsResponse.data || []).map(c => ({ ...c, animalCount: corralCounts.get(c.id) || 0 })));
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: t('common:toast.error'), description: t('corrals:move.errorMoving'), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Filter animals by source corral (or all if not set) and search
  const sourceAnimals = sourceCorralId
    ? animals.filter(a => a.corral_id === sourceCorralId)
    : animals;

  const filteredAnimals = sourceAnimals.filter(a => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return a.name?.toLowerCase().includes(q) || a.id_tag?.toLowerCase().includes(q);
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

  const targetCorralName = targetCorralId === "none"
    ? t('corrals:move.noCorralAssigned')
    : corrals.find(c => c.id === targetCorralId)?.name || "";

  const sourceCorralName = sourceCorralId
    ? corrals.find(c => c.id === sourceCorralId)?.name || t('corrals:move.noCorralAssigned')
    : t('corrals:move.multipleCorrals', 'Varios corrales');

  const handleMove = async () => {
    if (selectedAnimals.length === 0 || !targetCorralId) return;
    try {
      setLoading(true);
      const newCorralId = targetCorralId === "none" ? null : targetCorralId;

      if (!isOnline()) {
        const { enqueue } = await import('@/services/syncEngine');
        for (const animalId of selectedAnimals) {
          const animal = animals.find(a => a.id === animalId);
          await db.animals_cache.update(animalId, { corral_id: newCorralId || undefined });
          await enqueue({ type: 'ANIMAL_UPDATE', payload: { id: animalId, corral_id: newCorralId } });
          if (currentUser?.cabañaId && currentUser?.id) {
            await enqueue({
              type: 'CORRAL_MOVEMENT_INSERT',
              payload: {
                animal_id: animalId, cabaña_id: currentUser.cabañaId,
                corral_anterior_id: animal?.corral_id || null, corral_nuevo_id: newCorralId,
                fecha_movimiento: new Date().toISOString().split('T')[0],
                registrado_por: currentUser.id,
              },
            });
          }
        }
      } else {
        const { error } = await supabase
          .from("animals")
          .update({ corral_id: newCorralId })
          .in("id", selectedAnimals);
        if (error) throw error;
        if (currentUser?.cabañaId && currentUser?.id) {
          const movements = selectedAnimals.map(animalId => {
            const animal = animals.find(a => a.id === animalId);
            return {
              animal_id: animalId, cabaña_id: currentUser.cabañaId!,
              corral_anterior_id: animal?.corral_id || null, corral_nuevo_id: newCorralId,
              fecha_movimiento: new Date().toISOString().split('T')[0],
              registrado_por: currentUser.id!,
            };
          });
          await supabase.from("corral_movements").insert(movements);
        }
      }

      toast({
        title: "✓ " + t('common:toast.success'),
        description: `${selectedAnimals.length} ${t('corrals:move.animalsMovedTo')} ${targetCorralName}`,
      });

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

  // Stepper
  const steps = [
    { num: 1, label: t('corrals:move.stepDestination', 'Destino') },
    { num: 2, label: t('corrals:move.stepAnimals', 'Animales') },
    { num: 3, label: t('corrals:move.stepConfirm', 'Confirmar') },
  ];

  const canGoNext = step === 1 ? !!targetCorralId : step === 2 ? selectedAnimals.length > 0 : true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Move className="h-4.5 w-4.5 text-primary" />
              </div>
              {t('corrals:move.dialogTitle')}
            </DialogTitle>
          </DialogHeader>

          {/* Stepper */}
          <div className="flex items-center gap-1 mt-4">
            {steps.map((s, i) => (
              <div key={s.num} className="flex items-center flex-1">
                <div className="flex items-center gap-2 flex-1">
                  <div className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    step >= s.num ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
                  </div>
                  <span className={cn(
                    "text-xs font-medium hidden sm:inline",
                    step >= s.num ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {s.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={cn(
                    "h-0.5 flex-1 mx-2 rounded-full transition-colors",
                    step > s.num ? "bg-primary" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* STEP 1: Select destination */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t('corrals:move.selectDestinationDesc', 'Seleccioná el corral al que querés mover los animales.')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* "Sin corral" option */}
                <button
                  type="button"
                  onClick={() => setTargetCorralId("none")}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                    targetCorralId === "none"
                      ? "border-primary bg-primary/5 shadow-sm"
                      : "border-border hover:border-muted-foreground/30"
                  )}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t('corrals:move.noCorralAssigned')}</p>
                    <p className="text-xs text-muted-foreground">{t('corrals:move.removeFromCorral', 'Quitar asignación')}</p>
                  </div>
                  {targetCorralId === "none" && (
                    <Check className="h-5 w-5 text-primary ml-auto" />
                  )}
                </button>

                {corrals.map(corral => (
                  <button
                    key={corral.id}
                    type="button"
                    onClick={() => setTargetCorralId(corral.id)}
                    className={cn(
                      "flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left",
                      targetCorralId === corral.id
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border hover:border-muted-foreground/30",
                      sourceCorralId === corral.id && "opacity-40 pointer-events-none"
                    )}
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{corral.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {corral.animalCount || 0} {t('corrals:move.animalsLabel', 'animales')}
                      </p>
                    </div>
                    {targetCorralId === corral.id && (
                      <Check className="h-5 w-5 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 2: Select animals */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('corrals:move.selectAnimalsDesc', 'Seleccioná los animales que querés mover.')}
                </p>
              </div>

              {/* Search + actions */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={t('corrals:move.searchAnimals')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={selectAllVisible} className="shrink-0 gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('corrals:move.selectAll', 'Todos')}</span>
                </Button>
                {selectedAnimals.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearSelection} className="shrink-0 text-muted-foreground">
                    {t('corrals:move.clear')}
                  </Button>
                )}
              </div>

              {/* Selection badge */}
              {selectedAnimals.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">{selectedAnimals.length}</span>
                  <span className="text-sm text-primary/80">seleccionados</span>
                </div>
              )}

              {/* Animal list */}
              <div className="max-h-64 overflow-y-auto rounded-xl border border-border divide-y divide-border/50">
                {loading ? (
                  <div className="text-center py-12 text-sm text-muted-foreground">Cargando...</div>
                ) : filteredAnimals.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12 text-sm">
                    {t('corrals:move.noAnimalsFound')}
                  </p>
                ) : (
                  filteredAnimals.map(animal => {
                    const selected = selectedAnimals.includes(animal.id);
                    return (
                      <div
                        key={animal.id}
                        className={cn(
                          "flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors",
                          selected ? "bg-primary/5" : "hover:bg-muted/50"
                        )}
                        onClick={() => handleAnimalToggle(animal.id)}
                      >
                        <Checkbox checked={selected} onCheckedChange={() => handleAnimalToggle(animal.id)} />
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm font-semibold">{animal.id_tag || animal.name || animal.id}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {animal.breed} · {animal.sex}
                          </p>
                        </div>
                        {animal.corralName && (
                          <Badge variant="secondary" className="text-[10px] shrink-0">{animal.corralName}</Badge>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* STEP 3: Confirm */}
          {step === 3 && (
            <div className="space-y-6">
              <p className="text-sm text-muted-foreground">
                {t('corrals:move.confirmDesc', 'Revisá los detalles y confirmá el movimiento.')}
              </p>

              {/* Summary card */}
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
                <div className="flex items-center gap-4 justify-center">
                  {/* From */}
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                      {t('corrals:move.from', 'Origen')}
                    </p>
                    <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-muted">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-semibold mt-1.5 max-w-[100px] truncate">{sourceCorralName}</p>
                  </div>

                  <ArrowRight className="h-5 w-5 text-primary shrink-0" />

                  {/* To */}
                  <div className="text-center">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-primary mb-1">
                      {t('corrals:move.to', 'Destino')}
                    </p>
                    <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-primary/10">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-semibold mt-1.5 max-w-[100px] truncate text-primary">
                      {targetCorralName}
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-primary/10 text-center">
                  <p className="text-2xl font-bold text-foreground">{selectedAnimals.length}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedAnimals.length === 1 ? 'animal' : 'animales'} a mover
                  </p>
                </div>
              </div>

              {/* Animal chips preview */}
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {selectedAnimals.map(id => {
                  const a = animals.find(x => x.id === id);
                  return (
                    <Badge key={id} variant="secondary" className="text-xs font-mono">
                      {a?.id_tag || a?.name || '?'}
                    </Badge>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center gap-2">
          {step > 1 && (
            <Button variant="outline" onClick={() => setStep(s => (s - 1) as any)} disabled={loading} className="gap-1.5">
              <ChevronLeft className="h-4 w-4" />
              {t('common:back', 'Atrás')}
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('corrals:move.cancel', 'Cancelar')}
          </Button>
          {step < 3 ? (
            <Button onClick={() => setStep(s => (s + 1) as any)} disabled={!canGoNext} className="gap-1.5">
              {t('common:next', 'Siguiente')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleMove} disabled={loading || selectedAnimals.length === 0 || !targetCorralId} className="gap-1.5">
              <Move className="h-4 w-4" />
              {loading
                ? t('corrals:move.moving', 'Moviendo...')
                : `${t('corrals:move.moveAction', 'Mover')} ${selectedAnimals.length}`}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
