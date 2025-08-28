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
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Calendar as CalendarIcon, Stethoscope, CheckCircle, AlertTriangle } from "lucide-react";
import { format, differenceInMonths, addDays } from "date-fns";
import { es } from "date-fns/locale";

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
  const [open, setOpen] = useState(externalOpen || false);
  const [loading, setLoading] = useState(false);
  const [animals, setAnimals] = useState<any[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [tactoRecords, setTactoRecords] = useState<TactoRecord[]>([]);
  
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
      const eligibleAnimals = await getEligibleAnimals('TACTO');
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
    const allIds = animals.map(a => a.id);
    setSelectedAnimals(allIds);
    setTactoRecords(allIds.map(id => ({ 
      animalId: id, 
      resultado: null, 
      observaciones: "",
      fechaEstimadaParto: undefined 
    })));
  };

  const clearSelection = () => {
    setSelectedAnimals([]);
    setTactoRecords([]);
  };

  const handleSubmit = async () => {
    try {
      if (selectedAnimals.length === 0) {
        toast({
          variant: "destructive",
          title: "Error", 
          description: "Debe seleccionar al menos una hembra",
        });
        return;
      }

      // Validate that all selected animals have results
      const invalidRecords = tactoRecords.filter(record => record.resultado === null);

      if (invalidRecords.length > 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Todas las hembras seleccionadas deben tener un resultado",
        });
        return;
      }

      setLoading(true);

      // Create the event
      const event = await createEvent('TACTO', fecha, notas);

      // Prepare results data
      const resultados = tactoRecords.map(record => ({
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

      const pregnantCount = tactoRecords.filter(r => r.resultado === 'preñada').length;
      const emptyCount = tactoRecords.filter(r => r.resultado === 'vacia').length;

      toast({
        title: "Tacto registrado",
        description: `${pregnantCount} preñada(s), ${emptyCount} vacía(s)`,
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
        title: "Error",
        description: "No se pudo registrar el tacto",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Detección de Preñez</DialogTitle>
          <DialogDescription>
            Registre el resultado del tacto rectal para detección de preñez
          </DialogDescription>
        </DialogHeader>
        
        {animals.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">
              No hay hembras elegibles para tacto.
            </p>
            <p className="text-sm text-muted-foreground">
              Se requieren hembras ≥15 meses.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Detection Details */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fecha">Fecha de Detección</Label>
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
              <Label htmlFor="notas">Observaciones Generales</Label>
              <Textarea
                id="notas"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Observaciones del tacto..."
                rows={3}
              />
            </div>
          </div>

          {/* Animal Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Hembras Elegibles ({animals.length} disponibles)
              </Label>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllAnimals}>
                  Seleccionar Todas
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
                    <TableHead>Edad</TableHead>
                    <TableHead>Raza</TableHead>
                    <TableHead>Estado Actual</TableHead>
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
                      <TableCell>
                        {animal.birth_date ? 
                          `${differenceInMonths(new Date(), new Date(animal.birth_date))} meses`
                          : "No registrada"
                        }
                      </TableCell>
                      <TableCell>{animal.breed || "No especificada"}</TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {animal.esta_preñada ? 'Preñada' : 'No preñada'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {selectedAnimals.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedAnimals.length} hembra(s) seleccionada(s)
              </div>
            )}
          </div>

          {/* Tacto Results */}
          {tactoRecords.length > 0 && (
            <div className="space-y-4">
              <Label className="text-sm font-medium">
                Resultados de Detección ({tactoRecords.length} animales)
              </Label>
              
              <div className="space-y-4 max-h-60 overflow-y-auto">
                {tactoRecords.map((record) => {
                  const animal = animals.find(a => a.id === record.animalId);
                  if (!animal) return null;

                  return (
                    <Card key={record.animalId} className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{animal.name || "Sin nombre"}</div>
                            <div className="text-sm text-muted-foreground">{animal.id_tag}</div>
                          </div>
                          {record.fechaEstimadaParto && (
                            <div className="text-sm text-green-600">
                              Parto esperado: {format(record.fechaEstimadaParto, "dd/MM/yyyy")}
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label className="text-sm">¿Está preñada?</Label>
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
                                Sí - Preñada
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="vacia" id={`empty-${record.animalId}`} />
                              <Label htmlFor={`empty-${record.animalId}`} className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                No - Vacía
                              </Label>
                            </div>
                          </RadioGroup>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm">Observaciones</Label>
                          <Textarea
                            placeholder="Observaciones específicas..."
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
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || tactoRecords.filter(r => r.resultado !== null).length === 0}
            >
              {loading ? "Guardando..." : "Registrar Detecciones"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}