import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, AlertTriangle } from 'lucide-react';

interface PregnancyLossDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pregnancyId: string;
  animalName: string;
  animalTag: string;
  pregnancyStartDate: string;
  onSuccess?: () => void;
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

export function PregnancyLossDialog({
  open,
  onOpenChange,
  pregnancyId,
  animalName,
  animalTag,
  pregnancyStartDate,
  onSuccess
}: PregnancyLossDialogProps) {
  const [lossDate, setLossDate] = useState<Date>(new Date());
  const [lossType, setLossType] = useState<string>('');
  const [lossReason, setLossReason] = useState<string>('');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [lossCauses, setLossCauses] = useState<LossCause[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadLossCauses();
    }
  }, [open]);

  useEffect(() => {
    // Auto-determine loss type based on gestational days
    if (lossDate && pregnancyStartDate) {
      const startDate = new Date(pregnancyStartDate);
      const gestationalDays = Math.floor((lossDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (gestationalDays < 180) {
        setLossType('aborto_temprano');
      } else if (gestationalDays < 283) {
        setLossType('aborto_tardio');
      } else {
        setLossType('stillbirth');
      }
    }
  }, [lossDate, pregnancyStartDate]);

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

  const handleSubmit = async () => {
    if (!lossType || !lossReason) {
      toast({
        title: "Error",
        description: "Debe seleccionar el tipo y causa de la pérdida",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const startDate = new Date(pregnancyStartDate);
      const gestationalDays = Math.floor((lossDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

      // Update pregnancy record to mark as failed with detailed loss information
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
        .eq('id', pregnancyId);

      if (updateError) throw updateError;

      // Update animal status if currently pregnant
      const { error: animalError } = await supabase
        .from('animals')
        .update({
          esta_preñada: false,
          fecha_probable_parto: null
        })
        .eq('id', pregnancyId); // This should be animal_id, but we'll need to get it from pregnancy

      // Get animal ID from pregnancy record first
      const { data: pregnancyData, error: pregnancyError } = await supabase
        .from('preñeces')
        .select('animal_id')
        .eq('id', pregnancyId)
        .single();

      if (!pregnancyError && pregnancyData) {
        await supabase
          .from('animals')
          .update({
            esta_preñada: false,
            fecha_probable_parto: null
          })
          .eq('id', pregnancyData.animal_id);
      }

      toast({
        title: "Pérdida registrada",
        description: `Se registró la pérdida reproductiva para ${animalName || animalTag}`,
      });

      onSuccess?.();
      onOpenChange(false);
      resetForm();

    } catch (error) {
      console.error('Error registering pregnancy loss:', error);
      toast({
        title: "Error",
        description: "No se pudo registrar la pérdida reproductiva",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setLossDate(new Date());
    setLossType('');
    setLossReason('');
    setObservations('');
  };

  const gestationalDays = pregnancyStartDate 
    ? Math.floor((lossDate.getTime() - new Date(pregnancyStartDate).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const filteredCauses = lossType 
    ? lossCauses.filter(cause => cause.tipo === lossType)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Registrar Pérdida Reproductiva
          </DialogTitle>
          <DialogDescription>
            Registrar pérdida de preñez para {animalName || animalTag}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información de la preñez */}
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Información de la Preñez</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Inicio:</span> {format(new Date(pregnancyStartDate), 'dd/MM/yyyy', { locale: es })}
              </div>
              <div>
                <span className="text-muted-foreground">Días de gestación:</span> {gestationalDays} días
              </div>
            </div>
          </div>

          {/* Fecha de pérdida */}
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
                    date < new Date(pregnancyStartDate) || date > new Date()
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Tipo de pérdida */}
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

          {/* Causa específica */}
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

          {/* Observaciones */}
          <div className="space-y-2">
            <Label>Observaciones</Label>
            <Textarea
              placeholder="Detalles adicionales sobre la pérdida reproductiva..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !lossType || !lossReason}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? 'Registrando...' : 'Registrar Pérdida'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}