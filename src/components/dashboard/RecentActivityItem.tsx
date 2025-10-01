import { useState } from "react";
import { ChevronDown, Syringe, Heart, Stethoscope, Scale, Activity, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { BadgePill } from "@/components/ui/badge-pill";

interface ActivityDetail {
  id: string;
  type: string;
  date: string;
  description?: string;
  user?: string;
  animalCount?: number;
  details?: {
    // Vaccination
    vacuna?: string;
    lote?: string;
    dosis?: string;
    via?: string;
    // AI
    toro_nombre?: string;
    raza_toro?: string;
    // Tacto
    positivos?: number;
    negativos?: number;
    // Weighing
    peso_promedio?: number;
    // General
    notas?: string;
  };
}

interface RecentActivityItemProps {
  activity: ActivityDetail;
}

const getActivityIcon = (type: string) => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('vacun')) return Syringe;
  if (lowerType.includes('inseminacion') || lowerType.includes('ia')) return Heart;
  if (lowerType.includes('tacto') || lowerType.includes('preñ')) return Stethoscope;
  if (lowerType.includes('pesa')) return Scale;
  return Activity;
};

const getActivityColor = (type: string) => {
  const lowerType = type.toLowerCase();
  if (lowerType.includes('vacun')) return 'text-blue-600';
  if (lowerType.includes('inseminacion') || lowerType.includes('ia')) return 'text-pink-600';
  if (lowerType.includes('tacto') || lowerType.includes('preñ')) return 'text-purple-600';
  if (lowerType.includes('pesa')) return 'text-amber-600';
  return 'text-slate-600';
};

export function RecentActivityItem({ activity }: RecentActivityItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const Icon = getActivityIcon(activity.type);
  const colorClass = getActivityColor(activity.type);
  const hasDetails = activity.details && Object.keys(activity.details).length > 0;

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        className={cn(
          "w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-colors",
          !hasDetails && "cursor-default"
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn("flex-shrink-0", colorClass)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-sm font-medium text-slate-900 truncate">
              {activity.type}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-slate-500">
                {new Date(activity.date).toLocaleDateString('es-ES', { 
                  day: 'numeric', 
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
              {activity.animalCount !== undefined && activity.animalCount > 0 && (
                <>
                  <span className="text-slate-300">•</span>
                  <p className="text-xs text-slate-500">
                    {activity.animalCount} {activity.animalCount === 1 ? 'animal' : 'animales'}
                  </p>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <BadgePill variant="neutral">
              {activity.type}
            </BadgePill>
            {hasDetails && (
              <ChevronDown 
                className={cn(
                  "h-4 w-4 text-slate-400 transition-transform flex-shrink-0",
                  isExpanded && "rotate-180"
                )}
              />
            )}
          </div>
        </div>
      </button>

      {isExpanded && hasDetails && (
        <div className="px-3 pb-3 pt-0 border-t border-slate-100">
          <div className="mt-3 space-y-2">
            {/* Vaccination Details */}
            {activity.details.vacuna && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Vacuna:</span>
                  <span className="font-medium text-slate-900">{activity.details.vacuna}</span>
                </div>
                {activity.details.lote && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Lote:</span>
                    <span className="font-medium text-slate-900">{activity.details.lote}</span>
                  </div>
                )}
                {activity.details.dosis && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Dosis:</span>
                    <span className="font-medium text-slate-900">{activity.details.dosis}</span>
                  </div>
                )}
                {activity.details.via && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Vía:</span>
                    <span className="font-medium text-slate-900">{activity.details.via}</span>
                  </div>
                )}
              </>
            )}

            {/* AI Details */}
            {activity.details.toro_nombre && (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Toro:</span>
                  <span className="font-medium text-slate-900">{activity.details.toro_nombre}</span>
                </div>
                {activity.details.raza_toro && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Raza:</span>
                    <span className="font-medium text-slate-900">{activity.details.raza_toro}</span>
                  </div>
                )}
              </>
            )}

            {/* Tacto Details */}
            {(activity.details.positivos !== undefined || activity.details.negativos !== undefined) && (
              <>
                {activity.details.positivos !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Preñadas:</span>
                    <span className="font-medium text-emerald-600">{activity.details.positivos}</span>
                  </div>
                )}
                {activity.details.negativos !== undefined && (
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Vacías:</span>
                    <span className="font-medium text-slate-600">{activity.details.negativos}</span>
                  </div>
                )}
              </>
            )}

            {/* Weighing Details */}
            {activity.details.peso_promedio && (
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Peso Promedio:</span>
                <span className="font-medium text-slate-900">{activity.details.peso_promedio} kg</span>
              </div>
            )}

            {/* Notes */}
            {activity.details.notas && (
              <div className="mt-3 pt-2 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Notas:</p>
                <p className="text-xs text-slate-700">{activity.details.notas}</p>
              </div>
            )}

            {/* User */}
            {activity.user && (
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                <User className="h-3 w-3" />
                <span>{activity.user}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
