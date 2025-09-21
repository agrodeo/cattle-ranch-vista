import { useState, useEffect } from "react";
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
import { Plus, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { VaccineSelector } from "./VaccineSelector";
import { useVaccinationLogic } from "@/hooks/useVaccinationLogic";

interface VaccinationDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewVaccinationDialog({ open: externalOpen, onOpenChange, onSuccess }: VaccinationDialogProps) {
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
  const [proximaDosis, setProximaDosis] = useState<Date | undefined>();
  const [notas, setNotas] = useState("");

  const { toast } = useToast();
  const { getEligibleAnimals, createEvent } = useActivities();
  const { recordVaccination, getNextDoseInfo, requirements } = useVaccinationLogic();

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
          title: "Error",
          description: "Debe seleccionar una vacuna",
        });
        return;
      }

      if (selectedAnimals.length === 0) {
        toast({
          variant: "destructive",
          title: "Error", 
          description: "Debe seleccionar al menos un animal",
        });
        return;
      }

      setLoading(true);

      // Check if this is a requirement-based vaccine or custom
      const requirement = requirements.find(r => r.id === vacuna);
      
      if (requirement) {
        // Use the new vaccination logic for requirement-based vaccines
        await recordVaccination(
          selectedAnimals,
          vacuna,
          fecha.toISOString().split('T')[0],
          lote.trim() || undefined,
          dosis.trim() || undefined,
          via.trim() || undefined
        );
      } else {
        // Fallback to old system for custom vaccines
        const event = await createEvent('VACUNACION', fecha, notas);

        const { error } = await supabase
          .from("vacunaciones")
          .insert({
            evento_id: event.id,
            vacuna: vacuna.trim(),
            lote: lote.trim() || null,
            dosis: dosis.trim() || null,
            via: via.trim() || null,
            proxima_dosis: proximaDosis ? proximaDosis.toISOString().split('T')[0] : null,
            animales_ids: selectedAnimals,
          });

        if (error) throw error;

        toast({
          title: "Vacunación registrada",
          description: `Se vacunaron ${selectedAnimals.length} animales`,
        });
      }

      // Reset form
      setVacuna("");
      setLote("");
      setDosis("");
      setVia("");
      setProximaDosis(undefined);
      setNotas("");
      setSelectedAnimals([]);
      setOpen(false);
      onOpenChange?.(false);
      
      onSuccess?.();
    } catch (error) {
      console.error("Error saving vaccination:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la vacunación",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Vacunación</DialogTitle>
          <DialogDescription>
            Registre la aplicación de vacunas a los animales
          </DialogDescription>
        </DialogHeader>
        
        {animals.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">
              No hay animales elegibles para vacunación.
            </p>
            <p className="text-sm text-muted-foreground">
              Verifica que tengas animales activos en tu cabaña.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Vaccination Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha de Vacunación *</Label>
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
              placeholder="Seleccionar vacuna"
              selectedAnimals={selectedAnimals}
            />

            <div className="space-y-2">
              <Label htmlFor="lote">Lote</Label>
              <Input
                id="lote"
                value={lote}
                onChange={(e) => setLote(e.target.value)}
                placeholder="Número de lote"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dosis">Dosis</Label>
              <Input
                id="dosis"
                value={dosis}
                onChange={(e) => setDosis(e.target.value)}
                placeholder="Cantidad de dosis"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="via">Vía de Administración</Label>
              <Input
                id="via"
                value={via}
                onChange={(e) => setVia(e.target.value)}
                placeholder="Intramuscular, subcutánea, etc."
              />
            </div>

            <div className="space-y-2">
              <Label>Próxima Dosis</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {proximaDosis ? format(proximaDosis, "PPP", { locale: es }) : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={proximaDosis}
                    onSelect={setProximaDosis}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Observaciones</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones adicionales..."
              rows={3}
            />
          </div>

          {/* Animal Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Animales ({animals.length} disponibles)
              </Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllAnimals}>
                  Seleccionar Todos
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="border rounded-lg max-h-60 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Animal</TableHead>
                    <TableHead>Sexo</TableHead>
                    <TableHead>Raza</TableHead>
                    <TableHead>Corral</TableHead>
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
                          <div className="font-medium">{animal.name || "Sin nombre"}</div>
                          <div className="text-sm text-muted-foreground">{animal.id_tag}</div>
                        </div>
                      </TableCell>
                      <TableCell>{animal.sex || "No especificado"}</TableCell>
                      <TableCell>{animal.breed || "No especificada"}</TableCell>
                      <TableCell>{animal.corral_id || "Sin asignar"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {selectedAnimals.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedAnimals.length} animal(es) seleccionado(s)
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || selectedAnimals.length === 0 || !vacuna.trim()}
            >
              {loading ? "Guardando..." : "Registrar Vacunación"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}