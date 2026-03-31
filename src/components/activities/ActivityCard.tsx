import { useTranslation } from 'react-i18next';
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
  ChevronRight,
  Calendar
} from 'lucide-react';
import { UnifiedActivity } from '@/hooks/useAllActivities';

interface ActivityCardProps {
  activity: UnifiedActivity;
  onClick: () => void;
}

const activityConfig: Record<string, { icon: any; accent: string; badge: string; iconBg: string }> = {
  VACUNACION:     { icon: Syringe,       accent: 'border-l-emerald-500', badge: 'bg-emerald-500/10 text-emerald-700',  iconBg: 'bg-emerald-500/10 text-emerald-600' },
  PESAJE:         { icon: Weight,        accent: 'border-l-blue-500',    badge: 'bg-blue-500/10 text-blue-700',        iconBg: 'bg-blue-500/10 text-blue-600' },
  TACTO:          { icon: Stethoscope,   accent: 'border-l-violet-500',  badge: 'bg-violet-500/10 text-violet-700',    iconBg: 'bg-violet-500/10 text-violet-600' },
  IA:             { icon: Heart,         accent: 'border-l-pink-500',    badge: 'bg-pink-500/10 text-pink-700',        iconBg: 'bg-pink-500/10 text-pink-600' },
  PARTO:          { icon: Baby,          accent: 'border-l-amber-500',   badge: 'bg-amber-500/10 text-amber-700',      iconBg: 'bg-amber-500/10 text-amber-600' },
  MUERTE:         { icon: Skull,         accent: 'border-l-red-500',     badge: 'bg-red-500/10 text-red-700',          iconBg: 'bg-red-500/10 text-red-600' },
  PERDIDA_PREÑEZ: { icon: AlertTriangle, accent: 'border-l-orange-500',  badge: 'bg-orange-500/10 text-orange-700',    iconBg: 'bg-orange-500/10 text-orange-600' },
  GENERAL:        { icon: Activity,      accent: 'border-l-slate-400',   badge: 'bg-muted text-muted-foreground',      iconBg: 'bg-muted text-muted-foreground' },
};

const getActivityLabel = (activity: UnifiedActivity, t: any) => {
  switch (activity.tipo) {
    case 'VACUNACION': return activity.subtipo || t('activities:activityTypes.vaccination');
    case 'PESAJE': return t('activities:activityTypes.weighing');
    case 'TACTO': return t('activities:activityTypes.tacto');
    case 'IA': return t('activities:activityTypes.ia');
    case 'PARTO': return t('activities:activityTypes.birth');
    case 'MUERTE': return t('activities:activityTypes.death');
    case 'PERDIDA_PREÑEZ': return t('activities:activityTypes.pregnancyLoss');
    case 'GENERAL': return activity.subtipo || t('activities:activityTypes.general');
    default: return t('activities:activityTypes.activity');
  }
};

const formatDate = (fecha: string, i18n: any) => {
  const date = new Date(fecha);
  const locale = i18n.language || 'es';
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
};

const getRelativeDate = (fecha: string, t: any) => {
  const date = new Date(fecha);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return t('activities:activityCard.today');
  if (date.toDateString() === yesterday.toDateString()) return t('activities:activityCard.yesterday');
  return null;
};

export function ActivityCard({ activity, onClick }: ActivityCardProps) {
  const { t, i18n } = useTranslation();
  const config = activityConfig[activity.tipo] || activityConfig.GENERAL;
  const IconComponent = config.icon;
  const label = getActivityLabel(activity, t);
  const relativeDate = getRelativeDate(activity.fecha, t);
  const formattedDate = formatDate(activity.fecha, i18n);

  const animalPreview = activity.animales.slice(0, 4);
  const moreCount = activity.animales.length - 4;

  // Extra detail line
  let detail: string | null = null;
  if (activity.tipo === 'IA' && activity.detalles.bull_name) {
    detail = `Toro: ${activity.detalles.bull_name}`;
  } else if (activity.tipo === 'PESAJE' && activity.detalles.peso_promedio) {
    detail = `Prom: ${activity.detalles.peso_promedio} kg`;
  } else if (activity.tipo === 'TACTO') {
    const p = activity.detalles.prenadas ?? 0;
    const v = activity.detalles.vacias ?? 0;
    if (p || v) detail = `Preñadas: ${p} · Vacías: ${v}`;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full text-left rounded-xl border border-border/50 bg-card shadow-sm",
        "transition-all duration-200 ease-out",
        "hover:shadow-md hover:border-border hover:-translate-y-0.5",
        "active:scale-[0.995] active:shadow-sm",
        "border-l-[3px]",
        config.accent,
        "p-4"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105",
          config.iconBg
        )}>
          <IconComponent className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Row 1: Type badge + date */}
          <div className="flex items-center justify-between gap-2">
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", config.badge)}>
              {label}
            </span>
            <div className="flex items-center gap-1.5 shrink-0 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span className="font-medium">
                {relativeDate || formattedDate}
              </span>
            </div>
          </div>

          {/* Row 2: Detail line (if any) */}
          {detail && (
            <p className="text-sm text-foreground/80 font-medium truncate">{detail}</p>
          )}

          {/* Row 3: Animal count pill + animal chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-muted/80 px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {activity.animales.length} {activity.animales.length === 1 ? t('activities:activityCard.animal') : t('activities:activityCard.animals')}
            </span>

            {animalPreview.map(animal => (
              <span key={animal.id} className="inline-flex items-center rounded-md bg-background border border-border/60 px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground">
                {animal.id_tag}
              </span>
            ))}
            {moreCount > 0 && (
              <span className="text-[11px] text-muted-foreground font-medium">
                +{moreCount}
              </span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-3 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
      </div>
    </button>
  );
}
