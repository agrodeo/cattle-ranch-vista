import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
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
import { useTranslation } from 'react-i18next';

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

      // Get animals marked as pregnant from animals table
      const { data: animalData, error: animalError } = await supabase
        .from('animals')
        .select('id, id_tag, name, fecha_ultima_preñez')
        .eq('cabaña_id', cabanaData)
        .eq('esta_preñada', true)
        .eq('status', 'activo')
        .order('fecha_ultima_preñez', { ascending: false });

      if (animalError) throw animalError;

      const formattedData = (animalData || []).map((a: any) => ({
        id: `animal_${a.id}`, // Use a prefix to distinguish from pregnancy IDs
        animal_id: a.id,
        animal_tag: a.id_tag || '',
        animal_name: a.name || '',
        fecha_inicio: a.fecha_ultima_preñez || new Date().toISOString().split('T')[0]
      }));

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
        description: t('activities:newPregnancyLoss.errorRequired'),
      });
      return;
    }

    setLoading(true);
    try {
      const pregnancy = pregnantAnimals.find(p => p.id === selectedPregnancy);
      if (!pregnancy) throw new Error("Animal preñado no encontrado");

      const startDate = new Date(pregnancy.fecha_inicio);
      const gestationalDays = Math.floor((lossDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // If this is from animals table (prefixed with "animal_"), create a pregnancy record first
      if (selectedPregnancy.startsWith('animal_')) {
        // Get cabaña_id first
        const { data: cabanaData } = await supabase.rpc('get_current_user_cabana_id');
        
        // Create pregnancy record for the loss
        const { data: newPregnancy, error: pregnancyCreateError } = await supabase
          .from('preñeces')
          .insert({
            animal_id: pregnancy.animal_id,
            cabaña_id: cabanaData,
            fecha_inicio: pregnancy.fecha_inicio,
            origen: 'TACTO',
            estado: 'perdida',
            estado_final: 'fallida',
            fecha_finalizacion: format(lossDate, 'yyyy-MM-dd'),
            fecha_perdida: format(lossDate, 'yyyy-MM-dd'),
            tipo_perdida: lossType,
            causa_perdida: lossReason,
            dias_gestacion_perdida: gestationalDays,
            observaciones_perdida: observations,
            motivo_finalizacion: `${LOSS_TYPES.find(t => t.value === lossType)?.label}: ${lossReason}`
          })
          .select('id')
          .single();

        if (pregnancyCreateError) throw pregnancyCreateError;
      } else {
        // Update existing pregnancy record
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
      }

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
      <DialogContent className="w-full max-w-2xl h-full max-h-[100vh] lg:max-h-[90vh] lg:h-auto overflow-y-auto p-0 lg:p-6 lg:rounded-lg">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-50 bg-background border-b border-border p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <h2 className="font-semibold text-lg">Pérdida de Preñez</h2>
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

        <div className="space-y-4 lg:space-y-6">
          {/* Animal Selection */}
          <div className="space-y-2">
            <Label className="text-base font-medium">{t('activities:newPregnancyLoss.pregnantAnimal')}</Label>
            <Select value={selectedPregnancy} onValueChange={setSelectedPregnancy}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder={t('activities:newPregnancyLoss.selectPregnantAnimal')} />
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
            <Label className="text-base font-medium">Fecha de Pérdida *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full h-12 justify-start text-left font-normal">
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
            <Label className="text-base font-medium">{t('activities:newPregnancyLoss.lossType')}</Label>
            <Select value={lossType} onValueChange={setLossType}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder={t('activities:newPregnancyLoss.selectLossType')} />
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
              <Label className="text-base font-medium">{t('activities:newPregnancyLoss.specificCause')}</Label>
              <Select value={lossReason} onValueChange={setLossReason}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder={t('activities:newPregnancyLoss.selectCause')} />
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
            <Label className="text-base font-medium">Observaciones</Label>
            <Textarea
              placeholder="Detalles adicionales sobre la pérdida reproductiva..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
              className="min-h-[80px]"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 lg:flex-row lg:justify-end lg:gap-2 mt-6 lg:mt-4">
            <Button 
              variant="outline" 
              onClick={() => handleOpenChange(false)}
              className="h-12 lg:h-10 w-full lg:w-auto"
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={loading || !selectedPregnancy || !lossType || !lossReason}
              className="h-12 lg:h-10 w-full lg:w-auto bg-orange-600 hover:bg-orange-700"
            >
              {loading ? "Registrando..." : "Registrar Pérdida"}
            </Button>
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}