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
import { Plus, Calendar as CalendarIcon, Scale } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface WeighingRecord {
  animalId: string;
  weight: string;
}

interface WeighingDialogProps {
  onSuccess?: () => void;
}

export function NewWeighingDialog({ onSuccess }: WeighingDialogProps) {
  const [open, setOpen] = useState(false);
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
    if (open) {
      loadAnimals();
    }
  }, [open]);

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
          description: "Debe seleccionar al menos un animal",
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
          title: "Error",
          description: "Todos los animales seleccionados deben tener un peso válido",
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
        title: "Pesaje registrado",
        description: `Se registraron ${selectedAnimals.length} pesajes`,
      });

      // Reset form
      setNotas("");
      setSelectedAnimals([]);
      setWeighingRecords([]);
      setOpen(false);
      
      onSuccess?.();
    } catch (error) {
      console.error("Error saving weighing:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el pesaje",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Pesaje
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Pesaje</DialogTitle>
          <DialogDescription>
            Registre el peso de los animales
          </DialogDescription>
        </DialogHeader>
        
        {animals.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">
              No hay animales elegibles para pesaje.
            </p>
            <p className="text-sm text-muted-foreground">
              Verifica que tengas animales activos en tu cabaña.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Weighing Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha de Pesaje</Label>
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
              <Label htmlFor="notas">Observaciones</Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones del pesaje..."
                rows={3}
              />
            </div>
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
                    <TableHead>Peso Actual</TableHead>
                    <TableHead>Nuevo Peso (kg)</TableHead>
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
                            <div className="font-medium">{animal.name || "Sin nombre"}</div>
                            <div className="text-sm text-muted-foreground">{animal.id_tag}</div>
                          </div>
                        </TableCell>
                        <TableCell>{animal.sex || "No especificado"}</TableCell>
                        <TableCell>
                          {animal.peso_actual_kg ? `${animal.peso_actual_kg} kg` : "No registrado"}
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
                                placeholder="Peso en kg"
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
                {selectedAnimals.length} animal(es) seleccionado(s)
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || selectedAnimals.length === 0}
            >
              {loading ? "Guardando..." : "Registrar Pesaje"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}