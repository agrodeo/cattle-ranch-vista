import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Syringe, 
  Weight, 
  Stethoscope, 
  Baby, 
  Heart, 
  Activity,
  Skull,
  AlertTriangle
} from 'lucide-react';
import { UnifiedActivity } from '@/hooks/useAllActivities';

interface ActivityCardProps {
  activity: UnifiedActivity;
  onClick: () => void;
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

const getActivityLabel = (activity: UnifiedActivity, t: any) => {
  switch (activity.tipo) {
    case 'VACUNACION':
      return activity.subtipo || t('activities:activityTypes.vaccination');
    case 'PESAJE':
      return t('activities:activityTypes.weighing');
    case 'TACTO':
      return t('activities:activityTypes.tacto');
    case 'IA':
      return `${t('activities:activityTypes.ia')} - ${activity.detalles.bull_name}`;
    case 'PARTO':
      return t('activities:activityTypes.birth');
    case 'MUERTE':
      return t('activities:activityTypes.death');
    case 'PERDIDA_PREÑEZ':
      return t('activities:activityTypes.pregnancyLoss');
    case 'GENERAL':
      return activity.subtipo || t('activities:activityTypes.general');
    default:
      return t('activities:activityTypes.activity');
  }
};

const formatDate = (fecha: string, t: any, i18n: any) => {
  const date = new Date(fecha);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const locale = i18n.language || 'es';

  if (date.toDateString() === today.toDateString()) {
    return `${t('activities:activityCard.today')}, ${date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
  } else if (date.toDateString() === yesterday.toDateString()) {
    return `${t('activities:activityCard.yesterday')}, ${date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return date.toLocaleDateString(locale, { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
    });
  }
};

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const { t, i18n } = useTranslation();
  const IconComponent = getActivityIcon(activity.tipo);
  const colorClass = getActivityColor(activity.tipo);
  const label = getActivityLabel(activity, t);

  const animalPreview = activity.animales.slice(0, 3);
  const moreCount = activity.animales.length - 3;

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${colorClass}`}>
            <IconComponent className="h-4 w-4" />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-medium truncate">{label}</span>
              <span className="text-xs text-muted-foreground">
                {formatDate(activity.fecha, t, i18n)}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Badge variant="secondary" className="text-xs">
                {activity.animales.length} {activity.animales.length === 1 ? t('activities:activityCard.animal') : t('activities:activityCard.animals')}
              </Badge>
            </div>

            {animalPreview.length > 0 && (
              <div className="flex flex-wrap gap-1 text-xs">
                {animalPreview.map(animal => (
                  <span key={animal.id} className="text-muted-foreground">
                    {animal.id_tag}
                  </span>
                ))}
                {moreCount > 0 && (
                  <span className="text-muted-foreground font-medium">
                    +{moreCount} {t('activities:activityCard.more')}
                  </span>
                )}
              </div>
            )}

            {activity.responsable && (
              <div className="text-xs text-muted-foreground mt-1">
                {t('activities:activityCard.by')} {activity.responsable}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
