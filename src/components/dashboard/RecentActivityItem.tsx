import { useState } from "react";
import { ChevronDown, User } from "lucide-react";
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

const getActivityDotColor = (type: string) => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('vacun') || lowerType === 'vaccination') return 'bg-blue-500';
  if (lowerType.includes('inseminacion') || lowerType.includes('ia') || lowerType === 'insemination') return 'bg-pink-500';
  if (lowerType.includes('tacto') || lowerType.includes('preñ') || lowerType === 'tacto') return 'bg-purple-500';
  if (lowerType.includes('pesa') || lowerType === 'weighing') return 'bg-amber-500';
  if (lowerType === 'sale' || lowerType.includes('venta')) return 'bg-emerald-500';
  return 'bg-muted-foreground';
};

const getTranslatedActivityType = (type: string, t: any): string => {
  return t(`dashboard:activityTypes.${type}`, { defaultValue: type });
};

export function RecentActivityItem({ activity }: RecentActivityItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { t } = useTranslation(['dashboard', 'activities', 'common']);
  const dotColor = getActivityDotColor(activity.type);
  const hasDetails = activity.details && Object.keys(activity.details).length > 0;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors",
          !hasDetails && "cursor-default"
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", dotColor)} />
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-foreground truncate">
              {getTranslatedActivityType(activity.type, t)}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-xs text-muted-foreground">
                {new Date(activity.date).toLocaleDateString('es-ES', { 
                  day: 'numeric', 
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
              {activity.animalCount !== undefined && activity.animalCount > 0 && (
                <>
                  <span className="text-border">·</span>
                  <p className="text-xs text-muted-foreground">
                    {activity.animalCount} {t('dashboard:activity.animals')}
                  </p>
                </>
              )}
            </div>
          </div>
          {hasDetails && (
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform flex-shrink-0",
                isExpanded && "rotate-180"
              )}
            />
          )}
        </div>
      </button>

      {isExpanded && hasDetails && (
        <ExpandedDetails activity={activity} t={t} />
      )}
    </div>
  );
}

function ExpandedDetails({ activity, t }: { activity: ActivityDetail; t: any }) {
  const details = activity.details!;
  return (
    <div className="px-3 pb-3 pt-0 border-t border-border">
      <div className="mt-3 space-y-2">
        {details.vacuna && (
          <>
            <DetailRow label={t('dashboard:activity.vaccines')} value={details.vacuna} />
            {details.lote && <DetailRow label={t('dashboard:activity.lot')} value={details.lote} />}
            {details.dosis && <DetailRow label={t('dashboard:activity.dose')} value={details.dosis} />}
            {details.via && <DetailRow label={t('dashboard:activity.route')} value={details.via} />}
          </>
        )}
        {details.toro_nombre && (
          <>
            <DetailRow label={t('dashboard:activity.bullName')} value={details.toro_nombre} />
            {details.raza_toro && <DetailRow label={t('dashboard:activity.breed')} value={details.raza_toro} />}
          </>
        )}
        {(details.positivos !== undefined || details.negativos !== undefined) && (
          <>
            {details.positivos !== undefined && (
              <DetailRow label={t('dashboard:activity.tactileExam')} value={String(details.positivos)} valueClass="text-primary" />
            )}
            {details.negativos !== undefined && (
              <DetailRow label={t('dashboard:activity.empty')} value={String(details.negativos)} />
            )}
          </>
        )}
        {details.peso_promedio && (
          <DetailRow label={t('dashboard:activity.averageWeight')} value={`${details.peso_promedio} kg`} />
        )}
        {details.amount !== undefined && (
          <>
            <DetailRow label={t('dashboard:activity.amount')} value={`$${details.amount?.toLocaleString()}`} valueClass="text-primary" />
            {details.buyer_name && <DetailRow label={t('dashboard:activity.buyer')} value={details.buyer_name} />}
          </>
        )}
        {details.notas && (
          <div className="mt-3 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground mb-1">{t('dashboard:activity.notes')}:</p>
            <p className="text-xs text-foreground">{details.notas}</p>
          </div>
        )}
        {activity.user && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-2">
            <User className="h-3 w-3" />
            <span>{t('dashboard:activity.registeredBy')}: {activity.user}</span>
          </div>
        )}
      </div>
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
