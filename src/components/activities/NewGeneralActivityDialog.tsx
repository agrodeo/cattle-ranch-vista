import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarIcon, Plus } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";

interface NewGeneralActivityDialogProps {
  children: React.ReactNode;
  preselectedType?: string;
  onClose?: () => void;
  onSuccess?: () => void;
}

interface Animal {
  id: string;
  name?: string;
  id_tag: string;
  sex: string;
  breed: string;
  birth_date?: string;
  corral_id?: string;
  corral?: { name: string };
}

const activityTypes = [
  { 
    value: "destete", 
    label: "Destete", 
    icon: "🐄",
    description: "Separación de crías de sus madres",
    fields: ["peso_destete", "edad_destete", "metodo"]
  },
  { 
    value: "marcacion", 
    label: "Marcación", 
    icon: "🔥",
    description: "Identificación con hierro candente",
    fields: ["ubicacion_marca", "tipo_hierro", "numero_marca"]
  },
  { 
    value: "castracion", 
    label: "Castración", 
    icon: "✂️",
    description: "Procedimiento quirúrgico de castración",
    fields: ["metodo_castracion", "anestesia", "antibiotico"]
  },
  { 
    value: "descorne", 
    label: "Descorne", 
    icon: "🦏",
    description: "Remoción de cuernos",
    fields: ["metodo_descorne", "edad_animal", "cicatrizante"]
  },
  { 
    value: "traslado", 
    label: "Traslado", 
    icon: "📦",
    description: "Movimiento entre corrales o potreros",
    fields: ["corral_origen", "corral_destino", "motivo_traslado"]
  },
  { 
    value: "tratamiento", 
    label: "Tratamiento", 
    icon: "💊",
    description: "Administración de medicamentos",
    fields: ["medicamento", "dosis", "via_administracion", "diagnostico"]
  },
  { 
    value: "revision", 
    label: "Revisión", 
    icon: "🔍",
    description: "Control general de salud",
    fields: ["temperatura", "frecuencia_cardiaca", "estado_general", "hallazgos"]
  },
  { 
    value: "apareamiento", 
    label: "Apareamiento", 
    icon: "💕",
    description: "Servicio natural con toro",
    fields: ["toro_id", "toro_nombre", "metodo_monta"]
  },
  { 
    value: "parto", 
    label: "Parto", 
    icon: "👶",
    description: "Registro de nacimientos",
    fields: ["tipo_parto", "dificultad", "peso_cria", "sexo_cria", "vitalidad"]
  },
];

export function NewGeneralActivityDialog({ children, preselectedType, onClose, onSuccess }: NewGeneralActivityDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingAnimals, setLoadingAnimals] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedType, setSelectedType] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [responsiblePerson, setResponsiblePerson] = useState("");
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  
  // Activity-specific fields
  const [activityData, setActivityData] = useState<Record<string, any>>({});
  
  const { toast } = useToast();
  const { createEvent } = useActivities();

  useEffect(() => {
    if (open) {
      loadAnimals();
      if (preselectedType) {
        setSelectedType(preselectedType);
      }
    }
  }, [open, preselectedType]);

  const loadAnimals = async () => {
    setLoadingAnimals(true);
    try {
      const { data, error } = await supabase
        .from('animals')
        .select(`
          id,
          name,
          id_tag,
          sex,
          breed,
          birth_date,
          status,
          corral_id,
          corral:corrales(name)
        `)
        .eq('status', 'activo')
        .order('id_tag');

      if (error) throw error;
      setAnimals(data || []);
    } catch (error) {
      console.error('Error loading animals:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los animales",
        variant: "destructive",
      });
    } finally {
      setLoadingAnimals(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate || !selectedType) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    if (selectedAnimals.length === 0) {
      toast({
        title: "Error", 
        description: "Debe seleccionar al menos un animal",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const eventPayload = {
        tipo_actividad: selectedType,
        responsable: responsiblePerson,
        animales_ids: selectedAnimals,
        detalles: activityData,
      };

      await createEvent("GENERAL", selectedDate, notes, eventPayload);
      
      toast({
        title: "Actividad registrada",
        description: `${selectedType} registrado exitosamente para ${selectedAnimals.length} animal(es)`,
      });
      
      // Call success callback
      onSuccess?.();
      
      // Reset form
      setSelectedDate(undefined);
      setSelectedType("");
      setNotes("");
      setResponsiblePerson("");
      setSelectedAnimals([]);
      setActivityData({});
      setOpen(false);
      onClose?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la actividad",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedActivityType = activityTypes.find(type => type.value === selectedType);

  const renderActivitySpecificFields = () => {
    if (!selectedActivityType?.fields) return null;

    return (
      <div className="space-y-4 p-4 border rounded-lg">
        <Label className="text-sm font-medium">Información Específica - {selectedActivityType.label}</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedActivityType.fields.map((field) => (
            <div key={field} className="space-y-2">
              <Label htmlFor={field}>{getFieldLabel(field)}</Label>
              {getFieldInput(field)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      peso_destete: "Peso al Destete (kg)",
      edad_destete: "Edad al Destete (días)",
      metodo: "Método Utilizado",
      ubicacion_marca: "Ubicación de la Marca",
      tipo_hierro: "Tipo de Hierro",
      numero_marca: "Número de Marca",
      metodo_castracion: "Método de Castración",
      anestesia: "Anestesia Utilizada",
      antibiotico: "Antibiótico Aplicado",
      metodo_descorne: "Método de Descorne",
      edad_animal: "Edad del Animal",
      cicatrizante: "Cicatrizante Aplicado",
      corral_origen: "Corral de Origen",
      corral_destino: "Corral de Destino",
      motivo_traslado: "Motivo del Traslado",
      medicamento: "Medicamento",
      dosis: "Dosis",
      via_administracion: "Vía de Administración",
      diagnostico: "Diagnóstico",
      temperatura: "Temperatura (°C)",
      frecuencia_cardiaca: "Frecuencia Cardíaca",
      estado_general: "Estado General",
      hallazgos: "Hallazgos",
      toro_id: "ID del Toro",
      toro_nombre: "Nombre del Toro",
      metodo_monta: "Método de Monta",
      tipo_parto: "Tipo de Parto",
      dificultad: "Dificultad",
      peso_cria: "Peso de la Cría (kg)",
      sexo_cria: "Sexo de la Cría",
      vitalidad: "Vitalidad de la Cría",
    };
    return labels[field] || field;
  };

  const getFieldInput = (field: string) => {
    const fieldType = getFieldType(field);
    
    if (fieldType === 'select') {
      return (
        <Select 
          value={activityData[field] || ""} 
          onValueChange={(value) => setActivityData(prev => ({ ...prev, [field]: value }))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar..." />
          </SelectTrigger>
          <SelectContent>
            {getSelectOptions(field).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    
    if (fieldType === 'number') {
      return (
        <Input
          type="number"
          step="0.1"
          value={activityData[field] || ""}
          onChange={(e) => setActivityData(prev => ({ ...prev, [field]: e.target.value }))}
          placeholder="0.0"
        />
      );
    }
    
    return (
      <Input
        value={activityData[field] || ""}
        onChange={(e) => setActivityData(prev => ({ ...prev, [field]: e.target.value }))}
        placeholder={`Ingrese ${getFieldLabel(field).toLowerCase()}`}
      />
    );
  };

  const getFieldType = (field: string): 'text' | 'number' | 'select' => {
    const numberFields = ['peso_destete', 'edad_destete', 'peso_cria', 'temperatura', 'frecuencia_cardiaca', 'dosis'];
    const selectFields = ['metodo', 'tipo_hierro', 'metodo_castracion', 'metodo_descorne', 'via_administracion', 'tipo_parto', 'dificultad', 'sexo_cria', 'vitalidad', 'estado_general', 'metodo_monta'];
    
    if (numberFields.includes(field)) return 'number';
    if (selectFields.includes(field)) return 'select';
    return 'text';
  };

  const getSelectOptions = (field: string) => {
    const options: Record<string, Array<{value: string, label: string}>> = {
      metodo: [
        { value: 'tradicional', label: 'Tradicional' },
        { value: 'gradual', label: 'Gradual' },
        { value: 'temporal', label: 'Temporal' }
      ],
      tipo_hierro: [
        { value: 'electrico', label: 'Eléctrico' },
        { value: 'fuego', label: 'A Fuego' },
        { value: 'frio', label: 'En Frío' }
      ],
      metodo_castracion: [
        { value: 'quirurgico', label: 'Quirúrgico' },
        { value: 'elastico', label: 'Elástico' },
        { value: 'pinza', label: 'Pinza' }
      ],
      metodo_descorne: [
        { value: 'cauterizacion', label: 'Cauterización' },
        { value: 'pasta', label: 'Pasta Cáustica' },
        { value: 'quirurgico', label: 'Quirúrgico' }
      ],
      via_administracion: [
        { value: 'oral', label: 'Oral' },
        { value: 'intramuscular', label: 'Intramuscular' },
        { value: 'subcutanea', label: 'Subcutánea' },
        { value: 'intravenosa', label: 'Intravenosa' }
      ],
      tipo_parto: [
        { value: 'normal', label: 'Normal' },
        { value: 'distocico', label: 'Distócico' },
        { value: 'cesarea', label: 'Cesárea' }
      ],
      dificultad: [
        { value: 'sin_dificultad', label: 'Sin Dificultad' },
        { value: 'leve', label: 'Leve' },
        { value: 'moderada', label: 'Moderada' },
        { value: 'severa', label: 'Severa' }
      ],
      sexo_cria: [
        { value: 'macho', label: 'Macho' },
        { value: 'hembra', label: 'Hembra' }
      ],
      vitalidad: [
        { value: 'vivo', label: 'Vivo' },
        { value: 'muerto', label: 'Muerto' },
        { value: 'debil', label: 'Débil' }
      ],
      estado_general: [
        { value: 'excelente', label: 'Excelente' },
        { value: 'bueno', label: 'Bueno' },
        { value: 'regular', label: 'Regular' },
        { value: 'malo', label: 'Malo' }
      ],
      metodo_monta: [
        { value: 'libre', label: 'Monta Libre' },
        { value: 'controlada', label: 'Monta Controlada' },
        { value: 'dirigida', label: 'Monta Dirigida' }
      ]
    };
    
    return options[field] || [];
  };

  return (
    <Dialog open={open || !!preselectedType} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        onClose?.();
      }
    }}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Nueva Actividad General
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="activity-type">Tipo de Actividad *</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <span>{type.icon}</span>
                        <div>
                          <div>{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="responsible">Responsable</Label>
            <Input
              id="responsible"
              value={responsiblePerson}
              onChange={(e) => setResponsiblePerson(e.target.value)}
              placeholder="Nombre del responsable"
            />
          </div>

          {/* Animal Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Animales ({animals.length} disponibles)
              </Label>
              <div className="flex gap-2">
                <Button type="button" variant="outline" size="sm" onClick={selectAllAnimals}>
                  Seleccionar Todos
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={clearSelection}>
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="border rounded-lg max-h-60 overflow-y-auto">
              {loadingAnimals ? (
                <div className="p-4 text-center">Cargando animales...</div>
              ) : (
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
                        <TableCell>{animal.sex}</TableCell>
                        <TableCell>{animal.breed}</TableCell>
                        <TableCell>
                          {animal.corral?.name || "Sin corral"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            {selectedAnimals.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {selectedAnimals.length} animal(es) seleccionado(s)
              </div>
            )}
          </div>

          {/* Activity-specific fields */}
          {renderActivitySpecificFields()}

          <div className="space-y-2">
            <Label htmlFor="notes">Notas y Observaciones</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Describe los detalles de ${selectedActivityType?.label || 'la actividad'}...`}
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Guardando..." : "Registrar Actividad"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}