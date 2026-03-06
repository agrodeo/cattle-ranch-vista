import { useState } from "react";
import { ChevronDown, Syringe, Heart, Stethoscope, Scale, Activity, User, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';

interface ActivityDetail {
  id: string;
  type: string;
  date: string;
  description?: string;
  user?: string;
  animalCount?: number;
  details?: {
    vacuna?: string;
    lote?: string;
    dosis?: string;
    via?: string;
    toro_nombre?: string;
    raza_toro?: string;
    positivos?: number;
    negativos?: number;
    peso_promedio?: number;
    notas?: string;
    amount?: number;
    buyer_name?: string;
  };
}

interface RecentActivityItemProps {
  activity: ActivityDetail;
}

const activityConfig: Record<string, { icon: any; bg: string; iconBg: string; iconColor: string; badgeBg: string }> = {
  vaccination:   { icon: Syringe,     bg: 'bg-blue-500/5',    iconBg: 'bg-blue-500/10',    iconColor: 'text-blue-600',    badgeBg: 'bg-blue-500/10 text-blue-700' },
  insemination:  { icon: Heart,       bg: 'bg-pink-500/5',    iconBg: 'bg-pink-500/10',    iconColor: 'text-pink-600',    badgeBg: 'bg-pink-500/10 text-pink-700' },
  tacto:         { icon: Stethoscope, bg: 'bg-violet-500/5',  iconBg: 'bg-violet-500/10',  iconColor: 'text-violet-600',  badgeBg: 'bg-violet-500/10 text-violet-700' },
  weighing:      { icon: Scale,       bg: 'bg-primary/5',     iconBg: 'bg-primary/10',     iconColor: 'text-primary',     badgeBg: 'bg-primary/10 text-primary' },
  sale:          { icon: DollarSign,  bg: 'bg-emerald-500/5', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-600', badgeBg: 'bg-emerald-500/10 text-emerald-700' },
  general:       { icon: Activity,    bg: 'bg-muted/50',      iconBg: 'bg-muted',          iconColor: 'text-muted-foreground', badgeBg: 'bg-muted text-muted-foreground' },
};

const getConfig = (type: string) => {
  const key = type.toLowerCase();
  return activityConfig[key] || activityConfig.general;
};

export function RecentActivityItem({ activity }: RecentActivityItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t, i18n } = useTranslation(['dashboard', 'activities', 'common']);
  const config = getConfig(activity.type);
  const Icon = config.icon;
  const hasDetails = activity.details && Object.keys(activity.details).length > 0;

  const locale = i18n.language || 'es';
  const dateStr = new Date(activity.date).toLocaleDateString(locale, {
    day: 'numeric', month: 'short', year: 'numeric'
  });

  return (
    <div className={cn(
      "rounded-xl border-0 shadow-sm transition-all duration-200 overflow-hidden",
      config.bg
    )}>
      <button
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center gap-3 p-4 transition-colors",
          hasDetails && "hover:bg-background/30",
          !hasDetails && "cursor-default"
        )}
      >
        {/* Icon */}
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", config.iconBg)}>
          <Icon className={cn("h-5 w-5", config.iconColor)} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-foreground truncate">
            {t(`dashboard:activityTypes.${activity.type}`, { defaultValue: activity.type })}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <span className="text-xs text-muted-foreground">{dateStr}</span>
            {activity.animalCount !== undefined && activity.animalCount > 0 && (
              <>
                <span className="text-xs text-muted-foreground/50">·</span>
                <span className={cn("text-xs font-medium px-1.5 py-0.5 rounded-md", config.badgeBg)}>
                  {activity.animalCount} {t('dashboard:activity.animals')}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        {hasDetails && (
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground/50 transition-transform shrink-0",
            isExpanded && "rotate-180"
          )} />
        )}
      </button>

      {isExpanded && hasDetails && (
        <div className="px-4 pb-4 pt-0">
          <div className="rounded-lg bg-background/60 p-3 space-y-2">
            {activity.details!.vacuna && (
              <>
                <DetailRow label={t('dashboard:activity.vaccines')} value={activity.details!.vacuna} />
                {activity.details!.lote && <DetailRow label={t('dashboard:activity.lot')} value={activity.details!.lote} />}
                {activity.details!.dosis && <DetailRow label={t('dashboard:activity.dose')} value={activity.details!.dosis} />}
                {activity.details!.via && <DetailRow label={t('dashboard:activity.route')} value={activity.details!.via} />}
              </>
            )}
            {activity.details!.toro_nombre && (
              <>
                <DetailRow label={t('dashboard:activity.bullName')} value={activity.details!.toro_nombre} />
                {activity.details!.raza_toro && <DetailRow label={t('dashboard:activity.breed')} value={activity.details!.raza_toro} />}
              </>
            )}
            {activity.details!.positivos !== undefined && (
              <DetailRow label={t('dashboard:activity.tactileExam')} value={String(activity.details!.positivos)} valueClass="text-primary" />
            )}
            {activity.details!.negativos !== undefined && (
              <DetailRow label={t('dashboard:activity.empty')} value={String(activity.details!.negativos)} />
            )}
            {activity.details!.peso_promedio && (
              <DetailRow label={t('dashboard:activity.averageWeight')} value={`${activity.details!.peso_promedio} kg`} />
            )}
            {activity.details!.amount !== undefined && (
              <>
                <DetailRow label={t('dashboard:activity.amount')} value={`$${activity.details!.amount?.toLocaleString()}`} valueClass="text-primary" />
                {activity.details!.buyer_name && <DetailRow label={t('dashboard:activity.buyer')} value={activity.details!.buyer_name} />}
              </>
            )}
            {activity.details!.notas && (
              <div className="pt-2 border-t border-border/50">
                <p className="text-xs text-muted-foreground mb-0.5">{t('dashboard:activity.notes')}</p>
                <p className="text-xs text-foreground">{activity.details!.notas}</p>
              </div>
            )}
            {activity.user && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                <User className="h-3 w-3" />
                <span>{t('dashboard:activity.registeredBy')}: {activity.user}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <span className={cn("font-medium text-foreground", valueClass)}>{value}</span>
    </div>
  );
}
