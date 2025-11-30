import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Calendar as CalendarIcon, Scale } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface WeighingRecord {
  animalId: string;
  weight: string;
}

interface WeighingDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewWeighingDialog({ open: externalOpen, onOpenChange, onSuccess }: WeighingDialogProps) {
  const { t } = useTranslation(['activities']);
  const [open, setOpen] = useState(externalOpen || false);
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [weighingRecords, setWeighingRecords] = useState<WeighingRecord[]>([]);
  
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
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const loadAnimals = async () => {
    try {
      setLoading(true);
      const eligibleAnimals = await getEligibleAnimals('PESAJE');
      setAnimals(eligibleAnimals);
    } catch (error) {
      console.error("Error loading animals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnimalSelection = (animalId: string, checked: boolean) => {
    if (checked) {
      setSelectedAnimals(prev => [...prev, animalId]);
      setWeighingRecords(prev => [...prev, { animalId, weight: "" }]);
    } else {
      setSelectedAnimals(prev => prev.filter(id => id !== animalId));
      setWeighingRecords(prev => prev.filter(record => record.animalId !== animalId));
    }
  };

  const updateWeight = (animalId: string, weight: string) => {
    setWeighingRecords(prev => 
      prev.map(record => 
        record.animalId === animalId 
          ? { ...record, weight }
          : record
      )
    );
  };

  const selectAllAnimals = () => {
    const allIds = animals.map(a => a.id);
    setSelectedAnimals(allIds);
    setWeighingRecords(allIds.map(id => ({ animalId: id, weight: "" })));
  };

  const clearSelection = () => {
    setSelectedAnimals([]);
    setWeighingRecords([]);
  };

  const handleSubmit = async () => {
    try {
        if (selectedAnimals.length === 0) {
          toast({
            variant: "destructive",
            title: "Error", 
            description: t('activities:newGeneralActivity.errorSelectAnimal'),
          });
          return;
        }

      // Validate that all selected animals have weights
      const invalidRecords = weighingRecords.filter(record => 
        !record.weight || isNaN(Number(record.weight)) || Number(record.weight) <= 0
      );

      if (invalidRecords.length > 0) {
        toast({
          variant: "destructive",
          title: t('activities:newWeighing.errorTitle'),
          description: t('activities:newWeighing.errorInvalidWeight'),
        });
        return;
      }

      setLoading(true);

      // Create the event
      const event = await createEvent('PESAJE', fecha, notas);

      // Prepare measurements data
      const mediciones = weighingRecords.map(record => ({
        animal_id: record.animalId,
        peso_kg: Number(record.weight)
      }));

      // Create the weighing record
      const { error } = await supabase
        .from("pesajes")
        .insert({
          evento_id: event.id,
          mediciones,
        });

      if (error) throw error;

      toast({
        title: t('activities:newWeighing.successTitle'),
        description: t('activities:newWeighing.successDesc', { count: selectedAnimals.length }),
      });

      // Reset form
      setNotas("");
      setSelectedAnimals([]);
      setWeighingRecords([]);
      setOpen(false);
      onOpenChange?.(false);
      
      onSuccess?.();
    } catch (error) {
      console.error("Error saving weighing:", error);
      toast({
        variant: "destructive",
        title: t('activities:newWeighing.errorTitle'),
        description: t('activities:newWeighing.errorSaving'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('activities:newWeighing.title')}</DialogTitle>
          <DialogDescription>
            {t('activities:newWeighing.description')}
          </DialogDescription>
        </DialogHeader>
        
        {animals.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">
              {t('activities:newWeighing.noEligibleAnimals')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('activities:newWeighing.checkActiveAnimals')}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Weighing Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fecha">{t('activities:newWeighing.dateLabel')}</Label>
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
              <Label htmlFor="notas">{t('activities:newWeighing.observations')}</Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder={t('activities:newWeighing.observationsPlaceholder')}
                rows={3}
              />
            </div>
          </div>

          {/* Animal Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {t('activities:newWeighing.animalsLabel')} ({animals.length} {t('activities:common.available')})
              </Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllAnimals}>
                  {t('activities:newWeighing.selectAll')}
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  {t('activities:newWeighing.clear')}
                </Button>
              </div>
            </div>

            {/* Mobile: Card List */}
            <div className="lg:hidden space-y-3 max-h-60 overflow-y-auto">
              {animals.map((animal) => {
                const record = weighingRecords.find(r => r.animalId === animal.id);
                const isSelected = selectedAnimals.includes(animal.id);
                return (
                  <div key={animal.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => 
                          handleAnimalSelection(animal.id, checked as boolean)
                        }
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{animal.name || t('activities:newWeighing.noName')}</div>
                        <div className="text-xs text-muted-foreground">{animal.id_tag}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {animal.sex || t('activities:newWeighing.notSpecifiedShort')} • {animal.peso_actual_kg ? `${animal.peso_actual_kg} kg` : t('activities:newWeighing.notRecorded')}
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-2 pl-9">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          inputMode="decimal"
                          value={record?.weight || ""}
                          onChange={(e) => updateWeight(animal.id, e.target.value)}
                          placeholder={t('activities:newWeighing.weightPlaceholder')}
                          className="text-base h-12 flex-1"
                        />
                        <Scale className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop: Table */}
            <div className="hidden lg:block border rounded-lg max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>{t('activities:newWeighing.tableHeaders.animal')}</TableHead>
                    <TableHead>{t('activities:newWeighing.tableHeaders.sex')}</TableHead>
                    <TableHead>{t('activities:newWeighing.tableHeaders.currentWeight')}</TableHead>
                    <TableHead>{t('activities:newWeighing.tableHeaders.newWeight')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {animals.map((animal) => {
                    const record = weighingRecords.find(r => r.animalId === animal.id);
                    return (
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
                            <div className="font-medium text-sm">{animal.name || t('activities:newWeighing.noName')}</div>
                            <div className="text-xs text-muted-foreground">{animal.id_tag}</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{animal.sex || t('activities:newWeighing.notSpecified')}</TableCell>
                        <TableCell className="text-sm">
                          {animal.peso_actual_kg ? `${animal.peso_actual_kg} kg` : t('activities:newWeighing.notRecorded')}
                        </TableCell>
                        <TableCell>
                          {selectedAnimals.includes(animal.id) && (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number"
                                step="0.1"
                                min="0"
                                value={record?.weight || ""}
                                onChange={(e) => updateWeight(animal.id, e.target.value)}
                                placeholder={t('activities:newWeighing.weightPlaceholder')}
                                className="w-32"
                              />
                              <Scale className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {selectedAnimals.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {t('activities:common.animalsSelected', { count: selectedAnimals.length })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {t('activities:newWeighing.cancel')}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || selectedAnimals.length === 0}
            >
              {loading ? t('activities:newWeighing.saving') : t('activities:newWeighing.registerButton')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}