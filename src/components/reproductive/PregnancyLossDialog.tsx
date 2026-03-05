import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import { es, enUS, pt } from 'date-fns/locale';
import { getCurrentLanguage } from '@/hooks/useLanguage';
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

const getDateLocale = () => {
  const lang = getCurrentLanguage();
  if (lang === 'en') return enUS;
  if (lang === 'pt') return pt;
  return es;
};

export function PregnancyLossDialog({
  open,
  onOpenChange,
  pregnancyId,
  animalName,
  animalTag,
  pregnancyStartDate,
  onSuccess
}: PregnancyLossDialogProps) {
  const { t } = useTranslation(['reproductive', 'common']);
  const [lossDate, setLossDate] = useState<Date>(new Date());
  const [lossType, setLossType] = useState<string>('');
  const [lossReason, setLossReason] = useState<string>('');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [lossCauses, setLossCauses] = useState<LossCause[]>([]);
  const { toast } = useToast();

  const LOSS_TYPES = [
    { value: 'aborto_temprano', label: t('reproductive:pregnancyLoss.lossTypes.aborto_temprano.label'), description: t('reproductive:pregnancyLoss.lossTypes.aborto_temprano.description') },
    { value: 'aborto_tardio', label: t('reproductive:pregnancyLoss.lossTypes.aborto_tardio.label'), description: t('reproductive:pregnancyLoss.lossTypes.aborto_tardio.description') },
    { value: 'stillbirth', label: t('reproductive:pregnancyLoss.lossTypes.stillbirth.label'), description: t('reproductive:pregnancyLoss.lossTypes.stillbirth.description') },
    { value: 'neonatal', label: t('reproductive:pregnancyLoss.lossTypes.neonatal.label'), description: t('reproductive:pregnancyLoss.lossTypes.neonatal.description') },
    { value: 'no_detectada', label: t('reproductive:pregnancyLoss.lossTypes.no_detectada.label'), description: t('reproductive:pregnancyLoss.lossTypes.no_detectada.description') }
  ];

  useEffect(() => {
    if (open) loadLossCauses();
  }, [open]);

  useEffect(() => {
    if (lossDate && pregnancyStartDate) {
      const startDate = new Date(pregnancyStartDate);
      const gestationalDays = Math.floor((lossDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      if (gestationalDays < 180) setLossType('aborto_temprano');
      else if (gestationalDays < 283) setLossType('aborto_tardio');
      else setLossType('stillbirth');
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
      toast({ title: t('common:error'), description: t('reproductive:pregnancyLoss.errorRequired'), variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const startDate = new Date(pregnancyStartDate);
      const gestationalDays = Math.floor((lossDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

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

      const { data: pregnancyData, error: pregnancyError } = await supabase
        .from('preñeces')
        .select('animal_id')
        .eq('id', pregnancyId)
        .single();

      if (!pregnancyError && pregnancyData) {
        await supabase
          .from('animals')
          .update({ esta_preñada: false, fecha_probable_parto: null })
          .eq('id', pregnancyData.animal_id);
      }

      toast({
        title: t('reproductive:pregnancyLoss.successTitle'),
        description: t('reproductive:pregnancyLoss.successDesc', { animal: animalName || animalTag }),
      });

      onSuccess?.();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error registering pregnancy loss:', error);
      toast({ title: t('common:error'), description: t('reproductive:pregnancyLoss.errorSaving'), variant: "destructive" });
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

  const filteredCauses = lossType ? lossCauses.filter(cause => cause.tipo === lossType) : [];
  const dateLocale = getDateLocale();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            {t('reproductive:pregnancyLoss.title')}
          </DialogTitle>
          <DialogDescription>
            {t('reproductive:pregnancyLoss.description', { animal: animalName || animalTag })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">{t('reproductive:pregnancyLoss.pregnancyInfo')}</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">{t('reproductive:pregnancyLoss.startDate')}:</span> {format(new Date(pregnancyStartDate), 'dd/MM/yyyy', { locale: dateLocale })}
              </div>
              <div>
                <span className="text-muted-foreground">{t('reproductive:pregnancyLoss.gestationDays')}:</span> {gestationalDays} {t('reproductive:pregnancyLoss.days')}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('reproductive:pregnancyLoss.lossDate')} *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(lossDate, "PPP", { locale: dateLocale })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={lossDate}
                  onSelect={(date) => date && setLossDate(date)}
                  disabled={(date) => date < new Date(pregnancyStartDate) || date > new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label>{t('reproductive:pregnancyLoss.lossType')} *</Label>
            <Select value={lossType} onValueChange={setLossType}>
              <SelectTrigger>
                <SelectValue placeholder={t('reproductive:pregnancyLoss.selectLossType')} />
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

          {lossType && (
            <div className="space-y-2">
              <Label>{t('reproductive:pregnancyLoss.specificCause')} *</Label>
              <Select value={lossReason} onValueChange={setLossReason}>
                <SelectTrigger>
                  <SelectValue placeholder={t('reproductive:pregnancyLoss.selectCause')} />
                </SelectTrigger>
                <SelectContent>
                  {filteredCauses.map((cause) => (
                    <SelectItem key={cause.id} value={cause.causa}>
                      <div>
                        <div className="font-medium">{cause.causa}</div>
                        {cause.descripcion && <div className="text-xs text-muted-foreground">{cause.descripcion}</div>}
                        <div className="text-xs text-blue-600">{cause.categoria}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t('reproductive:pregnancyLoss.observations')}</Label>
            <Textarea
              placeholder={t('reproductive:pregnancyLoss.observationsPlaceholder')}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t('reproductive:pregnancyLoss.cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !lossType || !lossReason}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {loading ? t('reproductive:pregnancyLoss.registering') : t('reproductive:pregnancyLoss.registerLoss')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}