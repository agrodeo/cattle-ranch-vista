import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Activity, AlertTriangle } from "lucide-react";
import type { CorralKPI } from "@/hooks/useCorralKPIs";

interface CorralReproductiveCardProps {
  corral: CorralKPI;
}

export function CorralReproductiveCard({ corral }: CorralReproductiveCardProps) {
  const getPregnancyTrend = () => {
    if (corral.pregnancy_rate >= 80) return { icon: Heart, color: 'text-emerald-600', label: 'Excelente' };
    if (corral.pregnancy_rate >= 60) return { icon: Heart, color: 'text-blue-600', label: 'Bueno' };
    if (corral.pregnancy_rate >= 40) return { icon: AlertTriangle, color: 'text-amber-600', label: 'Regular' };
    return { icon: AlertTriangle, color: 'text-red-600', label: 'Bajo' };
  };

  const trend = getPregnancyTrend();
  const TrendIcon = trend.icon;

  const getVaccinationStatus = () => {
    const statusConfig = {
      excellent: { color: 'text-emerald-600', label: 'Excelente' },
      good: { color: 'text-blue-600', label: 'Bueno' },
      warning: { color: 'text-amber-600', label: 'Atención' },
      critical: { color: 'text-red-600', label: 'Crítico' },
      unknown: { color: 'text-slate-600', label: 'Desconocido' }
    };
    return statusConfig[corral.vaccination_status] || statusConfig.unknown;
  };

  const vaccinationStatus = getVaccinationStatus();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Heart className="h-4 w-4" />
          Estado Reproductivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pregnancy Rate */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-slate-600">% Preñez</p>
            <p className="text-lg font-semibold">{corral.pregnancy_rate.toFixed(1)}%</p>
          </div>
          <div className="flex items-center gap-1">
            <TrendIcon className={`h-4 w-4 ${trend.color}`} />
            <Badge variant="outline" className={trend.color}>
              {trend.label}
            </Badge>
          </div>
        </div>

        {/* Animal Distribution */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Total Animales</span>
            <span className="font-medium">{corral.animal_count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Machos</span>
            <span className="font-medium">{corral.male_count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">Hembras</span>
            <span className="font-medium">{corral.female_count}</span>
          </div>
        </div>

        {/* Vaccination Status */}
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-600" />
            <span className="text-sm text-slate-600">Estado de Vacunación</span>
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-sm font-medium ${vaccinationStatus.color}`}>
              {vaccinationStatus.label}
            </span>
            {corral.vaccination_alerts > 0 && (
              <Badge variant="destructive" className="text-xs">
                {corral.vaccination_alerts} pendientes
              </Badge>
            )}
          </div>
        </div>

        {/* Coverage Info */}
        <div className="text-xs text-slate-500 pt-2 border-t">
          Cobertura vacunal: {corral.vaccination_percentage.toFixed(1)}%
        </div>
      </CardContent>
    </Card>
  );
}