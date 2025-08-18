import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, Calendar as CalendarIcon, Heart, AlertTriangle, CheckCircle } from "lucide-react";
import { NewTactoDialog } from "./NewTactoDialog";
import { format, addDays, differenceInMonths, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useHybridAuth } from "@/hooks/useHybridAuth";

interface Animal {
  id: string;
  name: string;
  id_tag: string;
  sex: string;
  birth_date: string;
  status: string;
  breed: string;
  corral_id: string;
  cabaña_id: string;
}

interface PregnancyRecord {
  animal: Animal;
  isPregnant: "yes" | "no" | null;
  detectionDate: Date;
  observations: string;
  estimatedDueDate: Date | null;
}

export function PregnancyDetectionManager() {
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [pregnancyRecords, setPregnancyRecords] = useState<PregnancyRecord[]>([]);
  const [detectionDate, setDetectionDate] = useState<Date>(new Date());
  const [observations, setObservations] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const { currentUser } = useHybridAuth();

  useEffect(() => {
    fetchEligibleAnimals();
  }, []);

  const fetchEligibleAnimals = async () => {
    try {
      setLoading(true);
      
      if (!currentUser?.cabañaId) return;

      // Obtener hembras elegibles: activas, >15 meses, no vendidas ni muertas
      const { data: animalsData, error } = await supabase
        .from("animals")
        .select("*")
        .eq("cabaña_id", currentUser.cabañaId)
        .eq("sex", "Hembra")
        .neq("status", "vendido")
        .neq("status", "muerto")
        .neq("status", "Vendido")
        .neq("status", "Muerto")
        .or("status.is.null,status.eq.activo,status.eq.Activo");

      if (error) throw error;

      // Filtrar por edad (mayores a 15 meses)
      const eligibleAnimals = animalsData?.filter(animal => {
        if (!animal.birth_date) return false;
        const ageInMonths = differenceInMonths(new Date(), new Date(animal.birth_date));
        return ageInMonths >= 15;
      }) || [];

      setAnimals(eligibleAnimals);
    } catch (error) {
      console.error("Error fetching animals:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los animales elegibles",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnimalSelection = (animalId: string, checked: boolean) => {
    if (checked) {
      setSelectedAnimals(prev => [...prev, animalId]);
      // Agregar registro inicial
      const animal = animals.find(a => a.id === animalId);
      if (animal) {
        setPregnancyRecords(prev => [...prev, {
          animal,
          isPregnant: null,
          detectionDate: detectionDate,
          observations: "",
          estimatedDueDate: null
        }]);
      }
    } else {
      setSelectedAnimals(prev => prev.filter(id => id !== animalId));
      setPregnancyRecords(prev => prev.filter(record => record.animal.id !== animalId));
    }
  };

  const updatePregnancyRecord = (animalId: string, field: keyof PregnancyRecord, value: any) => {
    setPregnancyRecords(prev => prev.map(record => {
      if (record.animal.id === animalId) {
        const updated = { ...record, [field]: value };
        
        // Si marca como preñada, calcular fecha estimada de parto (283 días)
        if (field === 'isPregnant' && value === 'yes') {
          updated.estimatedDueDate = addDays(updated.detectionDate, 283);
        } else if (field === 'isPregnant' && value === 'no') {
          updated.estimatedDueDate = null;
        }
        
        return updated;
      }
      return record;
    }));
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      
      const validRecords = pregnancyRecords.filter(record => record.isPregnant !== null);
      
      if (validRecords.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Debe marcar el estado de preñez para al menos un animal",
        });
        return;
      }

      if (!currentUser?.cabañaId) return;

      // Preparar registros para insertar en reproductive_events
      const reproductiveEvents = validRecords.map(record => ({
        animal_id: record.animal.id,
        year: new Date(record.detectionDate).getFullYear(),
        pregnancy_status: record.isPregnant === 'yes' ? 'pregnant' : 'not_pregnant',
        pregnancy_outcome: null, // Se actualizará cuando nazca la cría
        calving_date: record.isPregnant === 'yes' ? format(record.estimatedDueDate!, 'yyyy-MM-dd') : null,
        linked_calf_id: null,
        notes: record.observations || `Detección de preñez: ${record.isPregnant === 'yes' ? 'Positiva' : 'Negativa'}. ${record.observations}`.trim(),
        cabaña_id: currentUser.cabañaId
      }));

      const { error } = await supabase
        .from("reproductive_events")
        .insert(reproductiveEvents);

      if (error) throw error;

      toast({
        title: "Registro exitoso",
        description: `Se registraron ${validRecords.length} detecciones de preñez`,
      });

      // Limpiar formulario
      setSelectedAnimals([]);
      setPregnancyRecords([]);
      setDialogOpen(false);
      
    } catch (error) {
      console.error("Error saving pregnancy detections:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron guardar las detecciones de preñez",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectAllAnimals = () => {
    const allIds = animals.map(a => a.id);
    setSelectedAnimals(allIds);
    setPregnancyRecords(animals.map(animal => ({
      animal,
      isPregnant: null,
      detectionDate: detectionDate,
      observations: "",
      estimatedDueDate: null
    })));
  };

  const clearSelection = () => {
    setSelectedAnimals([]);
    setPregnancyRecords([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Detección de Preñez</h3>
          <p className="text-muted-foreground">
            Registro de tacto rectal para detección de preñez en hembras
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <NewTactoDialog onSuccess={fetchEligibleAnimals} />
          </DialogTrigger>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Registro de Detección de Preñez</DialogTitle>
              <DialogDescription>
                Seleccione las hembras y registre el resultado del tacto rectal
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Configuración general */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Fecha de Detección</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(detectionDate, "PPP", { locale: es })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={detectionDate}
                        onSelect={(date) => date && setDetectionDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Observaciones Generales</Label>
                  <Textarea
                    placeholder="Observaciones que aplican a todas las detecciones..."
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                  />
                </div>
              </div>

              {/* Selección de animales */}
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
                        <TableHead>Estado</TableHead>
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
                            <Badge variant="outline">
                              {animal.status || "Activo"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Registro de resultados */}
              {pregnancyRecords.length > 0 && (
                <div className="space-y-4">
                  <Label className="text-sm font-medium">
                    Resultado de Detección ({pregnancyRecords.length} animales seleccionados)
                  </Label>
                  
                  <div className="space-y-4 max-h-60 overflow-y-auto border rounded-lg p-4">
                    {pregnancyRecords.map((record) => (
                      <Card key={record.animal.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">{record.animal.name || "Sin nombre"}</div>
                              <div className="text-sm text-muted-foreground">{record.animal.id_tag}</div>
                            </div>
                            {record.estimatedDueDate && (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                Parto esperado: {format(record.estimatedDueDate, "dd/MM/yyyy")}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <Label className="text-sm">¿Está preñada?</Label>
                            <RadioGroup
                              value={record.isPregnant || ""}
                              onValueChange={(value) => 
                                updatePregnancyRecord(record.animal.id, 'isPregnant', value as "yes" | "no")
                              }
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="yes" id={`yes-${record.animal.id}`} />
                                <Label htmlFor={`yes-${record.animal.id}`} className="flex items-center gap-2">
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  Sí - Preñada
                                </Label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem value="no" id={`no-${record.animal.id}`} />
                                <Label htmlFor={`no-${record.animal.id}`} className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                  No - Vacía
                                </Label>
                              </div>
                            </RadioGroup>
                          </div>

                          <div className="space-y-2">
                            <Label className="text-sm">Observaciones</Label>
                            <Textarea
                              placeholder="Observaciones específicas para este animal..."
                              value={record.observations}
                              onChange={(e) => 
                                updatePregnancyRecord(record.animal.id, 'observations', e.target.value)
                              }
                              rows={2}
                            />
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={loading || pregnancyRecords.filter(r => r.isPregnant !== null).length === 0}
                >
                  {loading ? "Guardando..." : "Guardar Detecciones"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Estadísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hembras Elegibles</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{animals.length}</div>
            <p className="text-xs text-muted-foreground">
              Mayores a 15 meses
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Detecciones Hoy</CardTitle>
            <Heart className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Registros del día
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preñadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Resultado positivo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partos Esperados</CardTitle>
            <CalendarIcon className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Próximos 30 días
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Historial de detecciones */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Detecciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h4 className="text-lg font-medium mb-2">Sistema de Detección de Preñez</h4>
            <p className="mb-4">
              Registra y monitorea el estado reproductivo de tu ganado
            </p>
            <div className="text-sm space-y-2">
              <p>• Detección masiva por tacto rectal</p>
              <p>• Cálculo automático de fechas de parto</p>
              <p>• Seguimiento de preñeces</p>
              <p>• Alertas de partos próximos</p>
              <p>• Estadísticas reproductivas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}