import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  Syringe, 
  Weight, 
  Stethoscope, 
  Baby, 
  Heart, 
  Activity,
  Skull,
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { UnifiedActivity } from '@/hooks/useAllActivities';

interface ActivityCardProps {
  activity: UnifiedActivity;
  onClick: () => void;
}

const activityConfig: Record<string, { icon: any; bg: string; iconColor: string; badgeBg: string }> = {
  VACUNACION: { icon: Syringe, bg: 'bg-blue-500/5', iconColor: 'text-blue-600', badgeBg: 'bg-blue-500/10 text-blue-700' },
  PESAJE:     { icon: Weight, bg: 'bg-primary/5', iconColor: 'text-primary', badgeBg: 'bg-primary/10 text-primary' },
  TACTO:      { icon: Stethoscope, bg: 'bg-violet-500/5', iconColor: 'text-violet-600', badgeBg: 'bg-violet-500/10 text-violet-700' },
  IA:         { icon: Heart, bg: 'bg-pink-500/5', iconColor: 'text-pink-600', badgeBg: 'bg-pink-500/10 text-pink-700' },
  PARTO:      { icon: Baby, bg: 'bg-emerald-500/5', iconColor: 'text-emerald-600', badgeBg: 'bg-emerald-500/10 text-emerald-700' },
  MUERTE:     { icon: Skull, bg: 'bg-destructive/5', iconColor: 'text-destructive', badgeBg: 'bg-destructive/10 text-destructive' },
  PERDIDA_PREÑEZ: { icon: AlertTriangle, bg: 'bg-amber-500/5', iconColor: 'text-amber-600', badgeBg: 'bg-amber-500/10 text-amber-700' },
  GENERAL:    { icon: Activity, bg: 'bg-muted/50', iconColor: 'text-muted-foreground', badgeBg: 'bg-muted text-muted-foreground' },
};

const getActivityLabel = (activity: UnifiedActivity, t: any) => {
  switch (activity.tipo) {
    case 'VACUNACION': return activity.subtipo || t('activities:activityTypes.vaccination');
    case 'PESAJE': return t('activities:activityTypes.weighing');
    case 'TACTO': return t('activities:activityTypes.tacto');
    case 'IA': return `${t('activities:activityTypes.ia')} — ${activity.detalles.bull_name}`;
    case 'PARTO': return t('activities:activityTypes.birth');
    case 'MUERTE': return t('activities:activityTypes.death');
    case 'PERDIDA_PREÑEZ': return t('activities:activityTypes.pregnancyLoss');
    case 'GENERAL': return activity.subtipo || t('activities:activityTypes.general');
    default: return t('activities:activityTypes.activity');
  }
};

const formatDate = (fecha: string, t: any, i18n: any) => {
  const date = new Date(fecha);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const locale = i18n.language || 'es';

  if (date.toDateString() === today.toDateString()) {
    return t('activities:activityCard.today');
  } else if (date.toDateString() === yesterday.toDateString()) {
    return t('activities:activityCard.yesterday');
  } else {
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
  }
};

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const { t, i18n } = useTranslation();
  const config = activityConfig[activity.tipo] || activityConfig.GENERAL;
  const IconComponent = config.icon;
  const label = getActivityLabel(activity, t);

  const animalPreview = activity.animales.slice(0, 3);
  const moreCount = activity.animales.length - 3;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border-0 shadow-sm transition-all duration-200",
        "hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
        "p-4 flex items-center gap-3",
        config.bg
      )}
    >
      {/* Icon */}
      <div className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
        config.bg === 'bg-muted/50' ? 'bg-muted' : config.bg.replace('/5', '/10')
      )}>
        <IconComponent className={cn("h-5 w-5", config.iconColor)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-foreground truncate">{label}</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {formatDate(activity.fecha, t, i18n)}
          </span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-md", config.badgeBg)}>
            {activity.animales.length} {activity.animales.length === 1 ? t('activities:activityCard.animal') : t('activities:activityCard.animals')}
          </span>
        </div>

        {animalPreview.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {animalPreview.map(animal => (
              <span key={animal.id} className="text-xs text-muted-foreground font-mono bg-background/60 px-1.5 py-0.5 rounded">
                {animal.id_tag}
              </span>
            ))}
            {moreCount > 0 && (
              <span className="text-xs text-muted-foreground font-medium">
                +{moreCount}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Chevron */}
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
    </button>
  );
}
