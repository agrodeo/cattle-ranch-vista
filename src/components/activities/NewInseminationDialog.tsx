import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Heart, Info, ArrowLeft, Search, CheckSquare, Users } from "lucide-react";
import { format, differenceInMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { ActivityFormHeader } from "./shared/ActivityFormHeader";
import { ActivityDatePicker } from "./shared/ActivityDatePicker";

interface InseminationDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewInseminationDialog({ open: controlledOpen, onOpenChange, onSuccess }: InseminationDialogProps) {
  const { t } = useTranslation(['activities', 'common']);
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [fecha, setFecha] = useState<Date>(new Date());
  const [toroNombre, setToroNombre] = useState("");
  const [razaToro, setRazaToro] = useState("");
  const [extrasToro, setExtrasToro] = useState({
    cuernos: "", pelaje: "", peso_nacimiento: "", peso_destete: "",
    peso_final: "", ce: "", registro: "", adn: false, origen: "",
  });
  const [notas, setNotas] = useState("");

  const { toast } = useToast();
  const { getEligibleAnimals, createEvent } = useActivities();
  const isMobile = useIsMobile();

  useEffect(() => { if (open) loadAnimals(); }, [open]);

  const loadAnimals = async () => {
    try {
      setLoading(true);
      const eligibleAnimals = await getEligibleAnimals('IA');
      setAnimals(eligibleAnimals);
    } catch (error) {
      console.error("Error loading animals:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAnimals = animals.filter(a => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return a.name?.toLowerCase().includes(q) || a.id_tag?.toLowerCase().includes(q);
  });

  const handleAnimalToggle = (id: string) => {
    setSelectedAnimals(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const selectAllAnimals = () => setSelectedAnimals(filteredAnimals.map(a => a.id));
  const clearSelection = () => setSelectedAnimals([]);

  const handleSubmit = async () => {
    try {
      if (!toroNombre.trim()) {
        toast({ variant: "destructive", title: t('activities:newInsemination.errorTitle'), description: t('activities:newInsemination.errorBullName') });
        return;
      }
      if (selectedAnimals.length === 0) {
        toast({ variant: "destructive", title: t('activities:newInsemination.errorTitle'), description: t('activities:newInsemination.errorSelectFemale') });
        return;
      }
      setLoading(true);

      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Usuario no autenticado");
      const { data: userData } = await supabase.from('profiles').select('*').eq('user_id', user.data.user.id).single();
      const cabanaId = (userData as any)?.cabaña_id;
      if (!cabanaId) throw new Error("Usuario sin cabaña asignada");

      const event = await createEvent('IA', fecha, notas);

      for (const femaleId of selectedAnimals) {
        const { error: aiError } = await supabase.from("artificial_inseminations").insert({
          cabaña_id: cabanaId, female_id: femaleId, bull_name: toroNombre.trim(),
          insemination_date: format(fecha, 'yyyy-MM-dd'), notes: notas || null, created_by: user.data.user.id,
        });
        if (aiError) throw aiError;
      }

      for (const animalId of selectedAnimals) {
        const { error: stateError } = await supabase.rpc('register_reproductive_activity', {
          _animal_id: animalId, _tipo_actividad: 'inseminacion_artificial',
          _fecha_actividad: format(fecha, 'yyyy-MM-dd'), _cabana_id: cabanaId, _detalle: extrasToro
        });
        if (stateError) console.error('Error updating reproductive state:', stateError);
      }

      toast({
        title: "✓ " + t('activities:newInsemination.registered'),
        description: `${t('activities:newInsemination.registeredDesc')} ${selectedAnimals.length} ${t('activities:newInsemination.femalesWithBull')} ${toroNombre}`,
      });

      setToroNombre(""); setRazaToro(""); setExtrasToro({ cuernos: "", pelaje: "", peso_nacimiento: "", peso_destete: "", peso_final: "", ce: "", registro: "", adn: false, origen: "" });
      setNotas(""); setSelectedAnimals([]); setOpen(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving insemination:", error);
      toast({ variant: "destructive", title: t('activities:newInsemination.errorTitle'), description: t('activities:newInsemination.errorSaving') });
    } finally {
      setLoading(false);
    }
  };

  const renderBreedSpecificFields = () => {
    if (razaToro === "Braford") {
      return (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t('activities:newInsemination.horns')}</Label>
          <Select value={extrasToro.cuernos} onValueChange={v => setExtrasToro(prev => ({ ...prev, cuernos: v }))}>
            <SelectTrigger className="h-11"><SelectValue placeholder={t('activities:common.selectHornType')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="astado">{t('activities:newInsemination.horned')}</SelectItem>
              <SelectItem value="mocho">{t('activities:newInsemination.polled')}</SelectItem>
              <SelectItem value="mocho_homocigota">{t('activities:newInsemination.homozygousPolled')}</SelectItem>
            </SelectContent>
          </Select>
          {extrasToro.cuernos === "mocho_homocigota" && (
            <div className="flex items-center gap-2 text-xs text-blue-600">
              <Info className="h-3.5 w-3.5" /><span>{t('activities:newInsemination.hornInfo')}</span>
            </div>
          )}
        </div>
      );
    }
    if (["Brangus", "Angus"].includes(razaToro)) {
      return (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">{t('activities:newInsemination.coat')}</Label>
          <Select value={extrasToro.pelaje} onValueChange={v => setExtrasToro(prev => ({ ...prev, pelaje: v }))}>
            <SelectTrigger className="h-11"><SelectValue placeholder={t('activities:common.selectCoatColor')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="negro">{t('activities:newInsemination.black')}</SelectItem>
              <SelectItem value="colorado">{t('activities:newInsemination.red')}</SelectItem>
              <SelectItem value="negro_homocigota">{t('activities:newInsemination.homozygousBlack')}</SelectItem>
              <SelectItem value="colorado_homocigota">{t('activities:newInsemination.homozygousRed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    }
    return null;
  };

  // Mobile full-screen version
  if (isMobile && open) {
    return (
      <div className="fixed inset-0 z-50 bg-background lg:hidden">
        <div className="flex items-center p-4 border-b border-border">
          <Button variant="ghost" size="icon" onClick={() => setOpen(false)} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10">
              <Heart className="h-4 w-4 text-pink-600" />
            </div>
            <h1 className="text-lg font-bold">{t('activities:newInsemination.mobileTitle')}</h1>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto pb-24 space-y-5">
          {animals.length === 0 && !loading && (
            <div className="text-center py-8 space-y-2">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="text-muted-foreground">{t('activities:newInsemination.noEligibleFemales')}</p>
              <p className="text-sm text-muted-foreground">{t('activities:newInsemination.eligibilityRequirements')}</p>
            </div>
          )}

          <div className="space-y-5">
            <ActivityDatePicker label={t('activities:newInsemination.serviceDate')} date={fecha} onDateChange={setFecha} />

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('activities:newInsemination.bullNameLabel')}</Label>
              <Input value={toroNombre} onChange={e => setToroNombre(e.target.value)} placeholder={t('activities:newInsemination.bullNamePlaceholder')} className="h-12 text-base" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('activities:newInsemination.bullBreed')}</Label>
              <Select value={razaToro} onValueChange={setRazaToro}>
                <SelectTrigger className="h-11"><SelectValue placeholder={t('activities:common.selectBreed')} /></SelectTrigger>
                <SelectContent>
                  {["Braford", "Brangus", "Angus", "Hereford", "Limousin", "Charolais", "Otra"].map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {renderBreedSpecificFields()}

            {/* Bull extras */}
            <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/30">
              <Label className="text-sm font-semibold">{t('activities:newInsemination.additionalData')}</Label>
              <div className="grid gap-3 grid-cols-2">
                {[
                  { key: 'peso_nacimiento', label: t('activities:newInsemination.birthWeight'), ph: '35.0' },
                  { key: 'peso_destete', label: t('activities:newInsemination.weaningWeight'), ph: '200.0' },
                  { key: 'peso_final', label: t('activities:newInsemination.finalWeight'), ph: '450.0' },
                  { key: 'ce', label: t('activities:newInsemination.ce'), ph: '34.0' },
                ].map(f => (
                  <div key={f.key} className="space-y-1">
                    <Label className="text-xs">{f.label}</Label>
                    <Input type="number" step="0.1" value={(extrasToro as any)[f.key]} onChange={e => setExtrasToro(prev => ({ ...prev, [f.key]: e.target.value }))} placeholder={f.ph} className="h-10" />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('activities:common.observations')}</Label>
              <Textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder={t('activities:newInsemination.serviceObservations')} rows={2} className="resize-none" />
            </div>

            {/* Animal Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">{t('activities:newInsemination.eligibleFemalesCount', { count: animals.length })}</Label>

              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-10" />
                </div>
                <Button type="button" variant="outline" size="sm" onClick={selectAllAnimals}><CheckSquare className="h-3.5 w-3.5" /></Button>
              </div>

              {selectedAnimals.length > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-500/5 border border-pink-500/20">
                  <Users className="h-4 w-4 text-pink-600" />
                  <span className="text-sm font-semibold text-pink-700">{selectedAnimals.length}</span>
                  <span className="text-sm text-pink-600/80">seleccionadas</span>
                </div>
              )}

              <div className="max-h-64 overflow-y-auto rounded-xl border border-border divide-y divide-border/50">
                {filteredAnimals.map(animal => {
                  const selected = selectedAnimals.includes(animal.id);
                  return (
                    <div key={animal.id} onClick={() => handleAnimalToggle(animal.id)}
                      className={cn("flex items-center gap-3 px-3 py-3 cursor-pointer transition-colors", selected ? "bg-pink-500/5" : "hover:bg-muted/50")}>
                      <Checkbox checked={selected} onCheckedChange={() => handleAnimalToggle(animal.id)} />
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-sm font-semibold">{animal.id_tag}</span>
                        {animal.name && <span className="text-sm text-muted-foreground ml-2">{animal.name}</span>}
                        <div className="flex items-center gap-2 mt-0.5">
                          {animal.birth_date && <span className="text-xs text-muted-foreground">{differenceInMonths(new Date(), new Date(animal.birth_date))}m</span>}
                          {animal.breed && <span className="text-xs text-muted-foreground">{animal.breed}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">{t('activities:common.cancel')}</Button>
            <Button onClick={handleSubmit} disabled={loading || selectedAnimals.length === 0 || !toroNombre.trim()} className="flex-1 gap-1.5">
              <Heart className="h-4 w-4" />
              {loading ? t('activities:newInsemination.saving') : t('activities:newInsemination.registerButton')}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Desktop dialog
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button className="flex items-center gap-2"><Plus className="h-4 w-4" />{t('activities:newInsemination.newInsemination')}</Button>
        </DialogTrigger>
      )}
      <DialogContent className="w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <ActivityFormHeader icon={Heart} iconColor="text-pink-600" title={t('activities:newInsemination.title')} subtitle={t('activities:newInsemination.description')} />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {animals.length === 0 && !loading && (
            <div className="text-center py-8 space-y-2">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <p className="text-muted-foreground">{t('activities:newInsemination.noEligibleAnimals')}</p>
            </div>
          )}

          {/* Service Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <ActivityDatePicker label={t('activities:newInsemination.serviceDate')} date={fecha} onDateChange={setFecha} />
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('activities:newInsemination.bullNameLabel')}</Label>
              <Input value={toroNombre} onChange={e => setToroNombre(e.target.value)} placeholder={t('activities:newInsemination.bullNamePlaceholder')} className="h-11" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('activities:newInsemination.bullBreed')}</Label>
              <Select value={razaToro} onValueChange={setRazaToro}>
                <SelectTrigger className="h-11"><SelectValue placeholder={t('activities:common.selectBreed')} /></SelectTrigger>
                <SelectContent>
                  {["Braford", "Brangus", "Angus", "Hereford", "Limousin", "Charolais", "Otra"].map(b => (
                    <SelectItem key={b} value={b}>{b}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {renderBreedSpecificFields()}
          </div>

          {/* Bull extras */}
          <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/30">
            <Label className="text-sm font-semibold">{t('activities:newInsemination.additionalData')}</Label>
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { key: 'peso_nacimiento', label: t('activities:newInsemination.birthWeight'), ph: '35.0' },
                { key: 'peso_destete', label: t('activities:newInsemination.weaningWeight'), ph: '200.0' },
                { key: 'peso_final', label: t('activities:newInsemination.finalWeight'), ph: '450.0' },
                { key: 'ce', label: t('activities:newInsemination.ce'), ph: '34.0' },
                { key: 'registro', label: t('activities:newInsemination.registration'), ph: t('activities:newInsemination.registrationPlaceholder'), type: 'text' },
                { key: 'origen', label: t('activities:newInsemination.origin'), ph: t('activities:newInsemination.originPlaceholder'), type: 'text' },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Input
                    type={(f as any).type || 'number'}
                    step={(f as any).type === 'text' ? undefined : '0.1'}
                    value={(extrasToro as any)[f.key]}
                    onChange={e => setExtrasToro(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.ph}
                    className="h-10"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-medium">{t('activities:common.observations')}</Label>
            <Textarea value={notas} onChange={e => setNotas(e.target.value)} placeholder={t('activities:newInsemination.serviceObservations')} rows={2} className="resize-none" />
          </div>

          {/* Animal Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">{t('activities:common.eligibleFemales', { count: animals.length })}</Label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-9 h-10" />
              </div>
              <Button variant="outline" size="sm" onClick={selectAllAnimals} className="shrink-0 gap-1.5">
                <CheckSquare className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t('activities:common.selectAllFemale')}</span>
              </Button>
              {selectedAnimals.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearSelection} className="shrink-0 text-muted-foreground">{t('activities:common.clear')}</Button>
              )}
            </div>

            {selectedAnimals.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-pink-500/5 border border-pink-500/20">
                <Users className="h-4 w-4 text-pink-600" />
                <span className="text-sm font-semibold text-pink-700">{selectedAnimals.length}</span>
                <span className="text-sm text-pink-600/80">{t('activities:common.femalesSelected', { count: selectedAnimals.length })}</span>
              </div>
            )}

            <div className="max-h-60 overflow-y-auto rounded-xl border border-border divide-y divide-border/50">
              {filteredAnimals.map(animal => {
                const selected = selectedAnimals.includes(animal.id);
                return (
                  <div key={animal.id} onClick={() => handleAnimalToggle(animal.id)}
                    className={cn("flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors", selected ? "bg-pink-500/5" : "hover:bg-muted/50")}>
                    <Checkbox checked={selected} onCheckedChange={() => handleAnimalToggle(animal.id)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-semibold">{animal.id_tag}</span>
                        {animal.name && <span className="text-sm text-muted-foreground truncate">{animal.name}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {animal.birth_date && <span className="text-xs text-muted-foreground">{differenceInMonths(new Date(), new Date(animal.birth_date))}m</span>}
                        {animal.breed && <><span className="text-xs text-muted-foreground/40">·</span><span className="text-xs text-muted-foreground">{animal.breed}</span></>}
                      </div>
                    </div>
                    {animal.esta_preñada !== undefined && (
                      <Heart className={cn("h-3.5 w-3.5 shrink-0", animal.esta_preñada ? "text-red-500" : "text-muted-foreground/30")} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center gap-2">
          <div className="flex-1" />
          <Button variant="outline" onClick={() => setOpen(false)}>{t('activities:common.cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading || selectedAnimals.length === 0 || !toroNombre.trim()} className="gap-1.5">
            <Heart className="h-4 w-4" />
            {loading ? t('activities:newInsemination.saving') : t('activities:newInsemination.registerButton')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
