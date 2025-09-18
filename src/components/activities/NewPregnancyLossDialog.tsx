import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon, AlertTriangle } from "lucide-react";

interface NewPregnancyLossDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

interface PregnantAnimal {
  id: string;
  animal_id: string;
  animal_tag: string;
  animal_name: string;
  fecha_inicio: string;
}

interface LossCause {
  id: string;
  tipo: string;
  causa: string;
  descripcion: string;
  categoria: string;
}

const LOSS_TYPES = [
  { value: 'aborto_temprano', label: 'Aborto Temprano (< 6 meses)', description: 'Pérdida antes de los 180 días' },
  { value: 'aborto_tardio', label: 'Aborto Tardío (> 6 meses)', description: 'Pérdida después de los 180 días' },
  { value: 'stillbirth', label: 'Mortinato', description: 'Cría nace muerta' },
  { value: 'neonatal', label: 'Pérdida Neonatal', description: 'Cría muere en primeros días' },
  { value: 'no_detectada', label: 'No Detectada/Falso Positivo', description: 'Error en detección inicial' }
];

export function NewPregnancyLossDialog({ open: externalOpen, onOpenChange, onSuccess }: NewPregnancyLossDialogProps) {
  const [open, setOpen] = useState(externalOpen || false);
  const [loading, setLoading] = useState(false);
  const [pregnantAnimals, setPregnantAnimals] = useState<PregnantAnimal[]>([]);
  const [selectedPregnancy, setSelectedPregnancy] = useState<string>("");
  const [lossDate, setLossDate] = useState<Date>(new Date());
  const [lossType, setLossType] = useState<string>("");
  const [lossReason, setLossReason] = useState<string>("");
  const [observations, setObservations] = useState("");
  const [lossCauses, setLossCauses] = useState<LossCause[]>([]);
  
  const { toast } = useToast();

  useEffect(() => {
    if (externalOpen !== undefined) {
      setOpen(externalOpen);
    }
  }, [externalOpen]);

  useEffect(() => {
    if (open) {
      loadPregnantAnimals();
      loadLossCauses();
    }
  }, [open]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const loadPregnantAnimals = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: cabanaData } = await supabase.rpc('get_current_user_cabana_id');
      if (!cabanaData) return;

      const { data, error } = await supabase
        .from('preñeces')
        .select(`
          id,
          animal_id,
          fecha_inicio,
          animals!inner(id_tag, name)
        `)
        .eq('cabaña_id', cabanaData)
        .eq('estado_final', 'activa')
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;

      const formattedData = data?.map(p => ({
        id: p.id,
        animal_id: p.animal_id,
        animal_tag: p.animals.id_tag,
        animal_name: p.animals.name || '',
        fecha_inicio: p.fecha_inicio
      })) || [];

      setPregnantAnimals(formattedData);
    } catch (error) {
      console.error("Error loading pregnant animals:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los animales preñados",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadLossCauses = async () => {
    try {
      const { data, error } = await supabase
        .from('reproductive_loss_causes')
        .select('*')
        .eq('is_active', true)
        .order('tipo, causa');

      if (error) throw error;
      setLossCauses(data || []);
    } catch (error) {
      console.error('Error loading loss causes:', error);
    }
  };

  useEffect(() => {
    // Auto-determine loss type based on gestational days
    if (lossDate && selectedPregnancy) {
      const pregnancy = pregnantAnimals.find(p => p.id === selectedPregnancy);
      if (pregnancy) {
        const startDate = new Date(pregnancy.fecha_inicio);
        const gestationalDays = Math.floor((lossDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (gestationalDays < 180) {
          setLossType('aborto_temprano');
        } else if (gestationalDays < 283) {
          setLossType('aborto_tardio');
        } else {
          setLossType('stillbirth');
        }
      }
    }
  }, [lossDate, selectedPregnancy, pregnantAnimals]);

  const handleSubmit = async () => {
    if (!selectedPregnancy || !lossType || !lossReason) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debe completar todos los campos obligatorios",
      });
      return;
    }

    setLoading(true);
    try {
      const pregnancy = pregnantAnimals.find(p => p.id === selectedPregnancy);
      if (!pregnancy) throw new Error("Preñez no encontrada");

      const startDate = new Date(pregnancy.fecha_inicio);
      const gestationalDays = Math.floor((lossDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Update pregnancy record
      const { error: updateError } = await supabase
        .from('preñeces')
        .update({
          estado_final: 'fallida',
          fecha_finalizacion: format(lossDate, 'yyyy-MM-dd'),
          fecha_perdida: format(lossDate, 'yyyy-MM-dd'),
          tipo_perdida: lossType,
          causa_perdida: lossReason,
          dias_gestacion_perdida: gestationalDays,
          observaciones_perdida: observations,
          motivo_finalizacion: `${LOSS_TYPES.find(t => t.value === lossType)?.label}: ${lossReason}`
        })
        .eq('id', selectedPregnancy);

      if (updateError) throw updateError;

      // Update animal status
      const { error: animalError } = await supabase
        .from('animals')
        .update({
          esta_preñada: false,
          fecha_probable_parto: null
        })
        .eq('id', pregnancy.animal_id);

      if (animalError) throw animalError;

      toast({
        title: "Pérdida registrada",
        description: `Se registró la pérdida reproductiva para ${pregnancy.animal_name || pregnancy.animal_tag}`,
      });

      // Reset form
      setSelectedPregnancy("");
      setLossDate(new Date());
      setLossType("");
      setLossReason("");
      setObservations("");
      setOpen(false);
      onOpenChange?.(false);
      onSuccess?.();

    } catch (error) {
      console.error('Error registering pregnancy loss:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la pérdida reproductiva",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedAnimal = pregnantAnimals.find(p => p.id === selectedPregnancy);
  const gestationalDays = selectedAnimal 
    ? Math.floor((lossDate.getTime() - new Date(selectedAnimal.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const filteredCauses = lossType 
    ? lossCauses.filter(cause => cause.tipo === lossType)
    : [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Registrar Pérdida de Preñez
          </DialogTitle>
          <DialogDescription>
            Registre una pérdida reproductiva para una hembra preñada
          </DialogDescription>
        </DialogHeader>

        {pregnantAnimals.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-2">
              No hay animales con preñeces activas.
            </p>
            <p className="text-sm text-muted-foreground">
              Solo puedes registrar pérdidas para animales con preñeces confirmadas.
            </p>
          </div>
        )}

        <div className="space-y-6">
          {/* Animal Selection */}
          <div className="space-y-2">
            <Label>Animal Preñado *</Label>
            <Select value={selectedPregnancy} onValueChange={setSelectedPregnancy}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar animal preñado" />
              </SelectTrigger>
              <SelectContent>
                {pregnantAnimals.map((animal) => (
                  <SelectItem key={animal.id} value={animal.id}>
                    <div>
                      <div className="font-medium">
                        {animal.animal_name || "Sin nombre"} - {animal.animal_tag}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Preñez desde: {format(new Date(animal.fecha_inicio), 'dd/MM/yyyy', { locale: es })}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pregnancy Info */}
          {selectedAnimal && (
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Información de la Preñez</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Inicio:</span> {format(new Date(selectedAnimal.fecha_inicio), 'dd/MM/yyyy', { locale: es })}
                </div>
                <div>
                  <span className="text-muted-foreground">Días de gestación:</span> {gestationalDays} días
                </div>
              </div>
            </div>
          )}

          {/* Loss Date */}
          <div className="space-y-2">
            <Label>Fecha de Pérdida *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(lossDate, "PPP", { locale: es })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={lossDate}
                  onSelect={(date) => date && setLossDate(date)}
                  disabled={(date) => 
                    selectedAnimal 
                      ? date < new Date(selectedAnimal.fecha_inicio) || date > new Date()
                      : date > new Date()
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Loss Type */}
          <div className="space-y-2">
            <Label>Tipo de Pérdida *</Label>
            <Select value={lossType} onValueChange={setLossType}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar tipo de pérdida" />
              </SelectTrigger>
              <SelectContent>
                {LOSS_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-xs text-muted-foreground">{type.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Specific Cause */}
          {lossType && (
            <div className="space-y-2">
              <Label>Causa Específica *</Label>
              <Select value={lossReason} onValueChange={setLossReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar causa" />
                </SelectTrigger>
                <SelectContent>
                  {filteredCauses.map((cause) => (
                    <SelectItem key={cause.id} value={cause.causa}>
                      <div>
                        <div className="font-medium">{cause.causa}</div>
                        {cause.descripcion && (
                          <div className="text-xs text-muted-foreground">{cause.descripcion}</div>
                        )}
                        <div className="text-xs text-blue-600">{cause.categoria}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Observations */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              placeholder="Detalles adicionales sobre la pérdida reproductiva..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !selectedPregnancy || !lossType || !lossReason}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? "Registrando..." : "Registrar Pérdida"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}