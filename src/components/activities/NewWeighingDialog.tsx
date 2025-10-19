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
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Calendar as CalendarIcon, Scale } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";

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
  const isMobile = useIsMobile();

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
      onOpenChange?.(false);
      
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-4xl h-full max-h-[100vh] lg:max-h-[90vh] lg:h-auto p-0 lg:p-6 lg:rounded-lg">
        <div className="flex flex-col h-full">
          <DialogHeader className="p-4 lg:p-0 pb-4 border-b lg:border-0">
            <DialogTitle>Registrar Pesaje</DialogTitle>
            <DialogDescription>
              Registre el peso de los animales
            </DialogDescription>
          </DialogHeader>
        
          <div className="flex-1 overflow-y-auto p-4 lg:p-0">
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

            {/* Mobile: Card List */}
            {isMobile ? (
              <div className="space-y-3">
                {animals.map((animal) => {
                  const record = weighingRecords.find(r => r.animalId === animal.id);
                  const isSelected = selectedAnimals.includes(animal.id);
                  
                  return (
                    <Card key={animal.id} className={`p-4 ${isSelected ? 'border-emerald-500 bg-emerald-50/50' : ''}`}>
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => 
                              handleAnimalSelection(animal.id, checked as boolean)
                            }
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{animal.name || "Sin nombre"}</div>
                            <div className="text-sm text-muted-foreground">{animal.id_tag}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {animal.sex} • Peso actual: {animal.peso_actual_kg ? `${animal.peso_actual_kg} kg` : "No registrado"}
                            </div>
                          </div>
                        </div>
                        
                        {isSelected && (
                          <div className="space-y-2 pl-9">
                            <Label htmlFor={`weight-${animal.id}`} className="text-sm">
                              Nuevo Peso (kg) *
                            </Label>
                            <div className="flex items-center gap-2">
                              <Input
                                id={`weight-${animal.id}`}
                                type="number"
                                inputMode="decimal"
                                step="0.1"
                                min="0"
                                value={record?.weight || ""}
                                onChange={(e) => updateWeight(animal.id, e.target.value)}
                                placeholder="0.0"
                                className="h-12 text-base"
                              />
                              <Scale className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              /* Desktop: Table */
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
            )}

            {selectedAnimals.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedAnimals.length} animal(es) seleccionado(s)
              </div>
            )}
          </div>

            </div>
          </div>

          {/* Fixed Bottom Actions */}
          <div className="sticky bottom-0 left-0 right-0 bg-background border-t p-4 lg:static lg:border-0 lg:pt-6 lg:pb-0">
            <div className="flex flex-col gap-3 lg:flex-row lg:justify-end lg:gap-2">
              <Button 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
                className="h-12 lg:h-10 w-full lg:w-auto"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={loading || selectedAnimals.length === 0}
                className="h-12 lg:h-10 w-full lg:w-auto"
              >
                {loading ? "Guardando..." : "Registrar Pesaje"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}