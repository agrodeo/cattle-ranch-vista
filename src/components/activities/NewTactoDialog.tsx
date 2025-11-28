import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Calendar as CalendarIcon, Stethoscope, CheckCircle, AlertTriangle, Users } from "lucide-react";
import { format, differenceInMonths, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { useTranslation } from "react-i18next";

interface TactoRecord {
  animalId: string;
  resultado: "preñada" | "vacia" | null;
  observaciones: string;
  fechaEstimadaParto?: Date;
}

interface TactoDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewTactoDialog({ open: externalOpen, onOpenChange, onSuccess }: TactoDialogProps) {
  const { t } = useTranslation('activities');
  const [open, setOpen] = useState(externalOpen || false);
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [corrales, setCorrales] = useState<any[]>([]);
  const [selectedCorral, setSelectedCorral] = useState<string>("all");
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [tactoRecords, setTactoRecords] = useState<TactoRecord[]>([]);
  const [defaultResult, setDefaultResult] = useState<"preñada" | "vacia" | null>(null);
  
  // Form data
  const [fecha, setFecha] = useState<Date>(new Date());
  const [notas, setNotas] = useState("");

  const { toast } = useToast();
  const { getEligibleAnimals, createEvent } = useActivities();

  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen);
    }
  }, [externalOpen]);

  useEffect(() => {
    if (open) {
      loadAnimals();
      loadCorrales();
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const loadAnimals = async () => {
    try {
      setLoading(true);
      const eligibleAnimals = await getEligibleAnimals('TACTO');
      setAnimals(eligibleAnimals);
    } catch (error) {
      console.error("Error loading animals:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadCorrales = async () => {
    try {
      const { data: corralesData, error } = await supabase
        .from('corrales')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setCorrales(corralesData || []);
    } catch (error) {
      console.error("Error loading corrales:", error);
    }
  };

  const handleAnimalSelection = (animalId: string, checked: boolean) => {
    if (checked) {
      setSelectedAnimals(prev => [...prev, animalId]);
      setTactoRecords(prev => [...prev, { 
        animalId, 
        resultado: null, 
        observaciones: "",
        fechaEstimadaParto: undefined 
      }]);
    } else {
      setSelectedAnimals(prev => prev.filter(id => id !== animalId));
      setTactoRecords(prev => prev.filter(record => record.animalId !== animalId));
    }
  };

  const updateTactoRecord = (animalId: string, field: keyof TactoRecord, value: any) => {
    setTactoRecords(prev => prev.map(record => {
      if (record.animalId === animalId) {
        const updated = { ...record, [field]: value };
        
        // If marking as pregnant, calculate estimated due date (283 days from detection)
        if (field === 'resultado' && value === 'preñada') {
          updated.fechaEstimadaParto = addDays(fecha, 283);
        } else if (field === 'resultado' && value === 'vacia') {
          updated.fechaEstimadaParto = undefined;
        }
        
        return updated;
      }
      return record;
    }));
  };

  const selectAllAnimals = () => {
    const allIds = filteredAnimals.map(a => a.id);
    setSelectedAnimals(allIds);
    setTactoRecords(allIds.map(id => ({ 
      animalId: id, 
      resultado: defaultResult, 
      observaciones: "",
      fechaEstimadaParto: defaultResult === 'preñada' ? addDays(fecha, 283) : undefined 
    })));
  };

  const selectCorralAnimals = (corralId: string) => {
    const corralAnimals = filteredAnimals.filter(a => a.corral_id === corralId);
    const corralIds = corralAnimals.map(a => a.id);
    const newSelectedAnimals = [...new Set([...selectedAnimals, ...corralIds])];
    
    setSelectedAnimals(newSelectedAnimals);
    
    // Add new records for animals not already selected
    const newRecords = corralIds
      .filter(id => !tactoRecords.some(r => r.animalId === id))
      .map(id => ({ 
        animalId: id, 
        resultado: defaultResult, 
        observaciones: "",
        fechaEstimadaParto: defaultResult === 'preñada' ? addDays(fecha, 283) : undefined 
      }));
    
    setTactoRecords(prev => [...prev, ...newRecords]);
  };

  const clearSelection = () => {
    setSelectedAnimals([]);
    setTactoRecords([]);
  };

  const filteredAnimals = selectedCorral && selectedCorral !== "all"
    ? animals.filter(a => a.corral_id === selectedCorral)
    : animals;

  const markAllAs = (result: "preñada" | "vacia") => {
    setTactoRecords(prev => prev.map(record => ({
      ...record,
      resultado: result,
      fechaEstimadaParto: result === 'preñada' ? addDays(fecha, 283) : undefined
    })));
  };

  const handleSubmit = async () => {
    try {
      if (selectedAnimals.length === 0) {
        toast({
          variant: "destructive",
          title: t('tacto.errorTitle'), 
          description: t('tacto.errorSelectFemale'),
        });
        return;
      }

      // Apply default result to animals without explicit results if set
      const finalRecords = tactoRecords.map(record => ({
        ...record,
        resultado: record.resultado || defaultResult
      }));

      // Validate that all selected animals have results
      const invalidRecords = finalRecords.filter(record => record.resultado === null);

      if (invalidRecords.length > 0) {
        toast({
          variant: "destructive",
          title: t('tacto.errorTitle'),
          description: `${invalidRecords.length} ${t('tacto.errorNoResults')}`,
        });
        return;
      }

      setLoading(true);

      // Create the event
      const event = await createEvent('TACTO', fecha, notas);

      // Prepare results data
      const resultados = finalRecords.map(record => ({
        animal_id: record.animalId,
        resultado: record.resultado,
        observaciones: record.observaciones || null
      }));

      // Create the tacto record
      const { error } = await supabase
        .from("tactos")
        .insert({
          evento_id: event.id,
          resultados,
        });

      if (error) throw error;

      // Get user's cabaña
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Usuario no autenticado");

      const { data: userData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.data.user.id)
        .single();

      const cabanaId = (userData as any)?.cabaña_id;
      if (!cabanaId) throw new Error("Usuario sin cabaña asignada");

      // Process pregnancy detection using new function
      for (const record of finalRecords) {
        const { error: detectionError } = await supabase.rpc('process_pregnancy_detection', {
          _animal_id: record.animalId,
          _fecha_tacto: format(fecha, 'yyyy-MM-dd'),
          _resultado: record.resultado,
          _cabana_id: cabanaId,
          _observaciones: record.observaciones
        });

        if (detectionError) {
          console.error('Error processing pregnancy detection:', detectionError);
          // Don't fail the whole operation, just log the error
        }
      }

      const pregnantCount = finalRecords.filter(r => r.resultado === 'preñada').length;
      const emptyCount = finalRecords.filter(r => r.resultado === 'vacia').length;

      toast({
        title: t('tacto.successTitle'),
        description: t('tacto.successDescription', { pregnant: pregnantCount, empty: emptyCount }),
      });

      // Reset form
      setNotas("");
      setSelectedAnimals([]);
      setTactoRecords([]);
      setOpen(false);
      onOpenChange?.(false);
      
      onSuccess?.();
    } catch (error) {
      console.error("Error saving tacto:", error);
      toast({
        variant: "destructive",
        title: t('tacto.errorTitle'),
        description: t('tacto.errorDescription'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-6xl h-full max-h-[100vh] lg:max-h-[90vh] lg:h-auto overflow-y-auto p-0 lg:p-6 lg:rounded-lg">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-50 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Stethoscope className="h-5 w-5 text-brand-600" />
            <h2 className="font-semibold text-lg">{t('tacto.title')}</h2>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => handleOpenChange(false)}
            className="h-8 w-8 p-0"
          >
            ✕
          </Button>
        </div>

        {/* Content wrapper */}
        <div className="p-4 lg:p-0">
        {/* Desktop Header */}
        <DialogHeader className="hidden lg:block">
          <DialogTitle>{t('tacto.registerTitle')}</DialogTitle>
          <DialogDescription>
            {t('tacto.description')}
          </DialogDescription>
        </DialogHeader>
        
        {animals.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">
              {t('tacto.noEligibleFemales')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('tacto.requiresFemales')}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Filter by Corral */}
          {corrales.length > 0 && (
            <div className="space-y-2">
              <Label>{t('tacto.filterByCorral')}</Label>
              <div className="flex gap-2">
                <Select value={selectedCorral} onValueChange={setSelectedCorral}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t('tacto.allCorrals')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('tacto.allCorrals')}</SelectItem>
                    {corrales.map((corral) => (
                      <SelectItem key={corral.id} value={corral.id}>
                        {corral.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCorral && selectedCorral !== "all" && (
                  <Button
                    variant="outline"
                    onClick={() => selectCorralAnimals(selectedCorral)}
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    {t('tacto.addCorral')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Detection Details & Default Result */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="fecha">{t('tacto.detectionDate')}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(fecha, "PPP", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={fecha}
                    onSelect={(date) => date && setFecha(date)}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>{t('tacto.defaultResult')}</Label>
              <RadioGroup
                value={defaultResult || ""}
                onValueChange={(value) => setDefaultResult(value as "preñada" | "vacia" | null)}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="preñada" id="default-pregnant" />
                  <Label htmlFor="default-pregnant" className="text-sm">{t('tacto.pregnant')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vacia" id="default-empty" />
                  <Label htmlFor="default-empty" className="text-sm">{t('tacto.empty')}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="" id="default-none" />
                  <Label htmlFor="default-none" className="text-sm">{t('tacto.manual')}</Label>
                </div>
              </RadioGroup>
              {defaultResult && (
                <p className="text-xs text-muted-foreground">
                  {t('tacto.autoApply')}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notas">{t('tacto.generalObservations')}</Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder={t('tacto.observationsPlaceholder')}
                rows={3}
              />
            </div>
          </div>

          {/* Animal Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {t('tacto.eligibleFemales')} ({filteredAnimals.length} {selectedCorral !== "all" ? t('tacto.inSelectedCorral') : t('tacto.available')})
              </Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllAnimals}>
                  {t('tacto.selectAll')} {selectedCorral !== "all" ? t('tacto.selectCorral') : t('tacto.selectAllFemales')}
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  {t('tacto.clear')}
                </Button>
              </div>
            </div>

            {/* Mobile: Card List */}
            <div className="lg:hidden space-y-2 max-h-60 overflow-y-auto">
              {filteredAnimals.map((animal) => (
                <div key={animal.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={selectedAnimals.includes(animal.id)}
                    onCheckedChange={(checked) => 
                      handleAnimalSelection(animal.id, checked as boolean)
                    }
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{animal.name || t('tacto.noName')}</div>
                    <div className="text-sm text-muted-foreground">{animal.id_tag}</div>
                    {animal.corral && (
                      <div className="text-xs text-muted-foreground">{t('animalSelector.corral')}: {animal.corral.name}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {animal.birth_date ? 
                        `${differenceInMonths(new Date(), new Date(animal.birth_date))} ${t('tacto.months')}`
                        : t('tacto.notRegistered')
                      } • {animal.breed || t('animalSelector.all')}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop: Table */}
            <div className="hidden lg:block border rounded-lg max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>{t('tacto.animal')}</TableHead>
                    <TableHead>{t('tacto.age')}</TableHead>
                    <TableHead>{t('tacto.breed')}</TableHead>
                    <TableHead>{t('tacto.currentStatus')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnimals.map((animal) => (
                    <TableRow key={animal.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedAnimals.includes(animal.id)}
                          onCheckedChange={(checked) => 
                            handleAnimalSelection(animal.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{animal.name || t('tacto.noName')}</div>
                          <div className="text-sm text-muted-foreground">{animal.id_tag}</div>
                          {animal.corral && (
                            <div className="text-xs text-muted-foreground">{t('animalSelector.corral')}: {animal.corral.name}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {animal.birth_date ? 
                          `${differenceInMonths(new Date(), new Date(animal.birth_date))} ${t('tacto.months')}`
                          : t('tacto.notRegistered')
                        }
                      </TableCell>
                      <TableCell>{animal.breed || t('animalSelector.all')}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {animal.esta_preñada ? t('tacto.pregnant') : t('tacto.empty')}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {selectedAnimals.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedAnimals.length} {t('tacto.animalsCount')}
              </div>
            )}
          </div>

          {/* Tacto Results */}
          {tactoRecords.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {t('tacto.result')} ({tactoRecords.length} {t('tacto.animalsCount')})
                </Label>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => markAllAs('preñada')}
                    className="text-green-600 border-green-200 hover:bg-green-50"
                  >
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t('tacto.pregnant')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => markAllAs('vacia')}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {t('tacto.empty')}
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4 max-h-60 overflow-y-auto">
                {tactoRecords.map((record) => {
                  const animal = animals.find(a => a.id === record.animalId);
                  if (!animal) return null;

                  return (
                    <Card key={record.animalId} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{animal.name || t('tacto.noName')}</div>
                            <div className="text-sm text-muted-foreground">{animal.id_tag}</div>
                          </div>
                          {record.fechaEstimadaParto && (
                            <div className="text-sm text-green-600">
                              {format(record.fechaEstimadaParto, "dd/MM/yyyy")}
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm">{t('tacto.resultForAnimal')}</Label>
                          <RadioGroup
                            value={record.resultado || ""}
                            onValueChange={(value) => 
                              updateTactoRecord(record.animalId, 'resultado', value as "preñada" | "vacia")
                            }
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="preñada" id={`preg-${record.animalId}`} />
                              <Label htmlFor={`preg-${record.animalId}`} className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                {t('tacto.pregnant')}
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="vacia" id={`empty-${record.animalId}`} />
                              <Label htmlFor={`empty-${record.animalId}`} className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                {t('tacto.empty')}
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">{t('tacto.observations')}</Label>
                          <Textarea
                            placeholder={t('tacto.observationsForAnimal')}
                            value={record.observaciones}
                            onChange={(e) => 
                              updateTactoRecord(record.animalId, 'observaciones', e.target.value)
                            }
                            rows={2}
                          />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {t('tacto.cancel')}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || (tactoRecords.length === 0)}
            >
              {loading ? t('tacto.saving') : t('tacto.save')}
            </Button>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}