import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { 
  Syringe, Weight, Stethoscope, Baby, Heart, Activity, Skull, AlertTriangle,
  ExternalLink, User, Calendar
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { UnifiedActivity } from '@/hooks/useAllActivities';
import { useNavigate } from 'react-router-dom';

interface ActivityDetailDialogProps {
  activity: UnifiedActivity | null;
  open: boolean;
  onClose: () => void;
}

const activityConfig: Record<string, { icon: any; bg: string; iconColor: string }> = {
  VACUNACION: { icon: Syringe, bg: 'bg-blue-500/10', iconColor: 'text-blue-600' },
  PESAJE:     { icon: Weight, bg: 'bg-primary/10', iconColor: 'text-primary' },
  TACTO:      { icon: Stethoscope, bg: 'bg-violet-500/10', iconColor: 'text-violet-600' },
  IA:         { icon: Heart, bg: 'bg-pink-500/10', iconColor: 'text-pink-600' },
  PARTO:      { icon: Baby, bg: 'bg-emerald-500/10', iconColor: 'text-emerald-600' },
  MUERTE:     { icon: Skull, bg: 'bg-destructive/10', iconColor: 'text-destructive' },
  PERDIDA_PREÑEZ: { icon: AlertTriangle, bg: 'bg-amber-500/10', iconColor: 'text-amber-600' },
  GENERAL:    { icon: Activity, bg: 'bg-muted', iconColor: 'text-muted-foreground' },
};

const getActivityLabel = (activity: UnifiedActivity) => {
  switch (activity.tipo) {
    case 'VACUNACION': return activity.subtipo || 'Vacunación';
    case 'PESAJE': return 'Pesaje';
    case 'TACTO': return 'Tacto';
    case 'IA': return 'Inseminación Artificial';
    case 'PARTO': return 'Parto';
    case 'MUERTE': return 'Muerte';
    case 'PERDIDA_PREÑEZ': return 'Pérdida de Preñez';
    case 'GENERAL': return activity.subtipo || 'Actividad General';
    default: return 'Actividad';
  }
};

const formatDate = (fecha: string) => {
  const date = new Date(fecha);
  return date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};

const renderDetails = (activity: UnifiedActivity) => {
  const details: { label: string; value: string }[] = [];
  switch (activity.tipo) {
    case 'VACUNACION':
      if (activity.detalles.vaccine_name) details.push({ label: 'Vacuna', value: activity.detalles.vaccine_name });
      if (activity.detalles.dose) details.push({ label: 'Dosis', value: activity.detalles.dose });
      if (activity.detalles.lot) details.push({ label: 'Lote', value: activity.detalles.lot });
      if (activity.detalles.route) details.push({ label: 'Vía', value: activity.detalles.route });
      break;
    case 'PESAJE':
      if (activity.detalles.peso_promedio) details.push({ label: 'Peso Promedio', value: `${activity.detalles.peso_promedio} kg` });
      if (activity.detalles.total_animals) details.push({ label: 'Total Animales', value: String(activity.detalles.total_animals) });
      break;
    case 'TACTO':
      if (activity.detalles.prenadas !== undefined) details.push({ label: 'Preñadas', value: String(activity.detalles.prenadas) });
      if (activity.detalles.vacias !== undefined) details.push({ label: 'Vacías', value: String(activity.detalles.vacias) });
      break;
    case 'IA':
      if (activity.detalles.bull_name) details.push({ label: 'Toro', value: activity.detalles.bull_name });
      break;
    case 'PARTO':
      if (activity.detalles.tipo_parto) details.push({ label: 'Tipo', value: activity.detalles.tipo_parto });
      if (activity.detalles.crias) details.push({ label: 'Crías', value: String(activity.detalles.crias) });
      break;
    case 'MUERTE':
    case 'PERDIDA_PREÑEZ':
      if (activity.detalles.causa) details.push({ label: 'Causa', value: activity.detalles.causa });
      break;
    case 'GENERAL':
      Object.entries(activity.detalles).forEach(([key, value]) => {
        if (key !== 'animales_ids' && value != null) {
          details.push({ label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), value: String(value) });
        }
      });
      break;
  }
  return details;
};

export function ActivityDetailDialog({ activity, open, onClose }: ActivityDetailDialogProps) {
  const { t } = useTranslation(['activities']);
  const navigate = useNavigate();

  if (!activity) return null;

  const config = activityConfig[activity.tipo] || activityConfig.GENERAL;
  const IconComponent = config.icon;
  const label = getActivityLabel(activity);
  const details = renderDetails(activity);

  const handleAnimalClick = (animalId: string) => {
    onClose();
    navigate(`/animales/${animalId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* Header with tinted background */}
        <div className={cn("px-6 pt-6 pb-4 rounded-t-lg", config.bg)}>
          <DialogHeader className="space-y-2">
            <div className="flex items-center gap-3">
              <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", config.bg.replace('/10', '/20'))}>
                <IconComponent className={cn("h-5 w-5", config.iconColor)} />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-lg font-bold">{label}</DialogTitle>
                <DialogDescription className="flex items-center gap-1.5 mt-0.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(activity.fecha)}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 pb-6 space-y-5">
          {/* Animals List */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Animales ({activity.animales.length})
            </h3>
            <div className="grid gap-1.5 max-h-[300px] overflow-y-auto">
              {activity.animales.map(animal => (
                <button
                  key={animal.id}
                  type="button"
                  onClick={() => handleAnimalClick(animal.id)}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-accent transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="font-mono text-xs">
                      {animal.id_tag}
                    </Badge>
                    {animal.name && (
                      <span className="text-sm text-foreground">{animal.name}</span>
                    )}
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          {details.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Detalles
                </h3>
                <div className="space-y-0">
                  {details.map((detail, index) => (
                    <div key={index} className="flex justify-between py-2.5 border-b border-border/50 last:border-0">
                      <span className="text-sm text-muted-foreground">{detail.label}</span>
                      <span className="text-sm font-medium text-foreground">{detail.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Responsible */}
          {activity.responsable && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Responsable:</span>
                <span className="font-medium text-foreground">{activity.responsable}</span>
              </div>
            </>
          )}

          {/* Notes */}
          {activity.notas && (
            <>
              <Separator />
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  {t('activities:common.notes')}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {activity.notas}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
