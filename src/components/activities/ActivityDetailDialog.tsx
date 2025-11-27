import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Syringe, 
  Weight, 
  Stethoscope, 
  Baby, 
  Heart, 
  Activity,
  Skull,
  AlertTriangle,
  ExternalLink,
  User
} from 'lucide-react';
import { UnifiedActivity } from '@/hooks/useAllActivities';
import { useNavigate } from 'react-router-dom';

interface ActivityDetailDialogProps {
  activity: UnifiedActivity | null;
  open: boolean;
  onClose: () => void;
}

const getActivityIcon = (tipo: UnifiedActivity['tipo']) => {
  switch (tipo) {
    case 'VACUNACION': return Syringe;
    case 'PESAJE': return Weight;
    case 'TACTO': return Stethoscope;
    case 'IA': return Heart;
    case 'PARTO': return Baby;
    case 'MUERTE': return Skull;
    case 'PERDIDA_PREÑEZ': return AlertTriangle;
    default: return Activity;
  }
};

const getActivityColor = (tipo: UnifiedActivity['tipo']) => {
  switch (tipo) {
    case 'VACUNACION': return 'bg-blue-100 text-blue-700';
    case 'PESAJE': return 'bg-green-100 text-green-700';
    case 'TACTO': return 'bg-purple-100 text-purple-700';
    case 'IA': return 'bg-pink-100 text-pink-700';
    case 'PARTO': return 'bg-emerald-100 text-emerald-700';
    case 'MUERTE': return 'bg-red-100 text-red-700';
    case 'PERDIDA_PREÑEZ': return 'bg-orange-100 text-orange-700';
    default: return 'bg-slate-100 text-slate-700';
  }
};

const getActivityLabel = (activity: UnifiedActivity) => {
  switch (activity.tipo) {
    case 'VACUNACION':
      return activity.subtipo || 'Vacunación';
    case 'PESAJE':
      return 'Pesaje';
    case 'TACTO':
      return 'Tacto';
    case 'IA':
      return 'Inseminación Artificial';
    case 'PARTO':
      return 'Parto';
    case 'MUERTE':
      return 'Muerte';
    case 'PERDIDA_PREÑEZ':
      return 'Pérdida de Preñez';
    case 'GENERAL':
      return activity.subtipo || 'Actividad General';
    default:
      return 'Actividad';
  }
};

const formatDate = (fecha: string) => {
  const date = new Date(fecha);
  return date.toLocaleDateString('es-ES', { 
    weekday: 'long',
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
};

const renderDetails = (activity: UnifiedActivity) => {
  const details: { label: string; value: string }[] = [];

  switch (activity.tipo) {
    case 'VACUNACION':
      if (activity.detalles.vaccine_name) {
        details.push({ label: 'Vacuna', value: activity.detalles.vaccine_name });
      }
      if (activity.detalles.dose) {
        details.push({ label: 'Dosis', value: activity.detalles.dose });
      }
      if (activity.detalles.lot) {
        details.push({ label: 'Lote', value: activity.detalles.lot });
      }
      if (activity.detalles.route) {
        details.push({ label: 'Vía', value: activity.detalles.route });
      }
      break;

    case 'PESAJE':
      if (activity.detalles.peso_promedio) {
        details.push({ label: 'Peso Promedio', value: `${activity.detalles.peso_promedio} kg` });
      }
      if (activity.detalles.total_animals) {
        details.push({ label: 'Total Animales', value: String(activity.detalles.total_animals) });
      }
      break;

    case 'TACTO':
      if (activity.detalles.prenadas !== undefined) {
        details.push({ label: 'Preñadas', value: String(activity.detalles.prenadas) });
      }
      if (activity.detalles.vacias !== undefined) {
        details.push({ label: 'Vacías', value: String(activity.detalles.vacias) });
      }
      break;

    case 'IA':
      if (activity.detalles.bull_name) {
        details.push({ label: 'Toro', value: activity.detalles.bull_name });
      }
      break;

    case 'PARTO':
      if (activity.detalles.tipo_parto) {
        details.push({ label: 'Tipo', value: activity.detalles.tipo_parto });
      }
      if (activity.detalles.crias) {
        details.push({ label: 'Crías', value: String(activity.detalles.crias) });
      }
      break;

    case 'MUERTE':
    case 'PERDIDA_PREÑEZ':
      if (activity.detalles.causa) {
        details.push({ label: 'Causa', value: activity.detalles.causa });
      }
      break;

    case 'GENERAL':
      // For general activities, show all non-system details
      Object.entries(activity.detalles).forEach(([key, value]) => {
        if (key !== 'animales_ids' && value != null) {
          details.push({ 
            label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), 
            value: String(value) 
          });
        }
      });
      break;
  }

  return details;
};

export function ActivityDetailDialog({ activity, open, onClose }: ActivityDetailDialogProps) {
  const navigate = useNavigate();

  if (!activity) return null;

  const IconComponent = getActivityIcon(activity.tipo);
  const colorClass = getActivityColor(activity.tipo);
  const label = getActivityLabel(activity);
  const details = renderDetails(activity);

  const handleAnimalClick = (animalId: string) => {
    onClose();
    navigate(`/animales/${animalId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-full ${colorClass}`}>
              <IconComponent className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{label}</DialogTitle>
              <DialogDescription>
                {formatDate(activity.fecha)}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Animals List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">
                Animales ({activity.animales.length})
              </h3>
            </div>
            
            <div className="grid gap-2 max-h-[300px] overflow-y-auto">
              {activity.animales.map(animal => (
                <Card 
                  key={animal.id} 
                  className="hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => handleAnimalClick(animal.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">
                          {animal.id_tag}
                        </Badge>
                        {animal.name && (
                          <span className="text-sm text-foreground">
                            {animal.name}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Details */}
          {details.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">
                  Detalles
                </h3>
                <div className="space-y-2">
                  {details.map((detail, index) => (
                    <div key={index} className="flex justify-between py-2 border-b last:border-0">
                      <span className="text-sm text-muted-foreground">{detail.label}</span>
                      <span className="text-sm font-medium text-foreground">{detail.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Responsible Person */}
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
                <h3 className="text-sm font-semibold text-foreground mb-2">
                  Notas
                </h3>
                <p className="text-sm text-muted-foreground">
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
