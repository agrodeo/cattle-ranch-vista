import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { VaccineSelector } from "./VaccineSelector";

interface VaccinationDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewVaccinationDialog({ open: externalOpen, onOpenChange, onSuccess }: VaccinationDialogProps) {
  const { t } = useTranslation(['activities', 'common']);
  const [open, setOpen] = useState(externalOpen || false);
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  
  // Form data
  const [fecha, setFecha] = useState<Date>(new Date());
  const [vacuna, setVacuna] = useState("");
  const [lote, setLote] = useState("");
  const [dosis, setDosis] = useState("");
  const [via, setVia] = useState("");
  const [notas, setNotas] = useState("");

  const { toast } = useToast();
  const { getEligibleAnimals } = useActivities();

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
      const eligibleAnimals = await getEligibleAnimals('VACUNACION');
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
    } else {
      setSelectedAnimals(prev => prev.filter(id => id !== animalId));
    }
  };

  const selectAllAnimals = () => {
    setSelectedAnimals(animals.map(a => a.id));
  };

  const clearSelection = () => {
    setSelectedAnimals([]);
  };

  const handleSubmit = async () => {
    try {
      if (!vacuna.trim()) {
        toast({
          variant: "destructive",
          title: t('activities:newVaccination.errorTitle'),
          description: t('activities:newVaccination.errorSelectVaccine'),
        });
        return;
      }

      if (selectedAnimals.length === 0) {
        toast({
          variant: "destructive",
          title: t('activities:newVaccination.errorTitle'), 
          description: t('activities:newVaccination.errorSelectAnimal'),
        });
        return;
      }

      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Record vaccination for each selected animal using the new system
      const vaccinationPromises = selectedAnimals.map(animalId =>
        supabase.rpc('record_animal_vaccination', {
          _animal_id: animalId,
          _requirement_id: vacuna, // Can be requirement ID or custom vaccine name
          _date: fecha.toISOString().split('T')[0],
          _lot: lote.trim() || null,
          _dose: dosis.trim() || null,
          _route: via.trim() || null,
          _created_by: user.id
        })
      );

      await Promise.all(vaccinationPromises);

      toast({
        title: t('activities:newVaccination.registered'),
        description: `${t('activities:newVaccination.registeredDesc')} ${selectedAnimals.length} ${t('activities:newVaccination.animalsVaccinated')}`,
      });

      // Reset form
      setVacuna("");
      setLote("");
      setDosis("");
      setVia("");
      setNotas("");
      setSelectedAnimals([]);
      setOpen(false);
      onOpenChange?.(false);
      
      onSuccess?.();
    } catch (error) {
      console.error("Error saving vaccination:", error);
      toast({
        variant: "destructive",
        title: t('activities:newVaccination.errorTitle'),
        description: t('activities:newVaccination.errorSaving'),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('activities:newVaccination.title')}</DialogTitle>
          <DialogDescription>
            {t('activities:newVaccination.description')}
          </DialogDescription>
        </DialogHeader>
        
        {animals.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">
              {t('activities:newVaccination.noEligibleAnimals')}
            </p>
            <p className="text-sm text-muted-foreground">
              {t('activities:newVaccination.checkActiveAnimals')}
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Vaccination Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fecha">{t('newVaccination.dateLabel')}</Label>
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

            <VaccineSelector
              value={vacuna}
              onChange={setVacuna}
              placeholder={t('activities:vaccination.selectVaccine')}
              selectedAnimals={selectedAnimals}
            />

            <div className="space-y-2">
              <Label htmlFor="lote">{t('activities:newVaccination.lot')}</Label>
              <Input
                id="lote"
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                placeholder={t('activities:newVaccination.lotNumber')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dosis">{t('activities:newVaccination.dose')}</Label>
              <Input
                id="dosis"
                value={dosis}
                onChange={(e) => setDosis(e.target.value)}
                placeholder={t('activities:newVaccination.doseAmount')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="via">{t('activities:newVaccination.route')}</Label>
              <Input
                id="via"
                value={via}
                onChange={(e) => setVia(e.target.value)}
                placeholder={t('activities:newVaccination.routePlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">{t('activities:newVaccination.observations')}</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder={t('activities:newVaccination.additionalObservations')}
              rows={3}
            />
          </div>

          {/* Animal Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                {t('newVaccination.animalsLabel')} ({animals.length} {t('common:available')})
              </Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllAnimals}>
                  {t('newVaccination.selectAll')}
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  {t('newVaccination.clear')}
                </Button>
              </div>
            </div>

            <div className="border rounded-lg max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>{t('newVaccination.tableHeaders.animal')}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t('newVaccination.tableHeaders.sex')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('newVaccination.tableHeaders.breed')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('newVaccination.tableHeaders.corral')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {animals.map((animal) => (
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
                          <div className="font-medium text-sm">{animal.name || t('common:noName')}</div>
                          <div className="text-xs text-muted-foreground">{animal.id_tag}</div>
                          <div className="sm:hidden text-xs text-muted-foreground mt-0.5">
                            {animal.sex || t('newVaccination.notSpecifiedShort')} • {animal.breed || t('newVaccination.notSpecifiedShort')}
                          </div>
                        </div>
                      </TableCell>
                       <TableCell className="hidden sm:table-cell text-sm">{animal.sex || t('newVaccination.notSpecified')}</TableCell>
                       <TableCell className="hidden md:table-cell text-sm">{animal.breed || t('newVaccination.notSpecified')}</TableCell>
                       <TableCell className="hidden lg:table-cell text-sm">
                         {animal.corral_name || t('newVaccination.notAssigned')}
                       </TableCell>
                    </TableRow>
                  ))}
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
              {t('common:cancel')}
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || selectedAnimals.length === 0 || !vacuna.trim()}
            >
              {loading ? t('newVaccination.saving') : t('newVaccination.registerButton')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
