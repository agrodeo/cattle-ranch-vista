import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import type { CorralKPI } from "@/hooks/useCorralKPIs";

interface CorralProductionCardProps {
  corral: CorralKPI;
}

export function CorralProductionCard({ corral }: CorralProductionCardProps) {
  const getGDPTrend = () => {
    if (corral.avg_daily_gain >= 0.8) return { icon: TrendingUp, color: 'text-emerald-600', label: 'Excelente' };
    if (corral.avg_daily_gain >= 0.6) return { icon: TrendingUp, color: 'text-blue-600', label: 'Bueno' };
    if (corral.avg_daily_gain >= 0.4) return { icon: TrendingDown, color: 'text-amber-600', label: 'Regular' };
    return { icon: TrendingDown, color: 'text-red-600', label: 'Bajo' };
  };

  const trend = getGDPTrend();
  const TrendIcon = trend.icon;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin datos';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4" />
          Rendimiento Productivo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* GDP */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-slate-600">GDP Promedio</p>
            <p className="text-lg font-semibold">{corral.avg_daily_gain.toFixed(3)} kg/día</p>
          </div>
          <div className="flex items-center gap-1">
            <TrendIcon className={`h-4 w-4 ${trend.color}`} />
            <Badge variant="outline" className={trend.color}>
              {trend.label}
            </Badge>
          </div>
        </div>

        {/* Average Weight */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Peso Promedio</span>
          <span className="font-medium">{corral.avg_weight.toFixed(0)} kg</span>
        </div>

        {/* Recent Weighings */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-600">Pesajes Recientes (90d)</span>
          <span className="font-medium">{corral.recent_weighings_count}</span>
        </div>

        {/* Last Weighing */}
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-slate-600" />
            <span className="text-sm text-slate-600">Último Pesaje</span>
          </div>
          <span className="text-sm font-medium">
            {formatDate(corral.last_weighing_date)}
          </span>
        </div>

        {/* Efficiency Indicator */}
        <div className="text-xs text-slate-500 pt-2 border-t">
          Basado en {corral.animal_count} animales
        </div>
      </CardContent>
    </Card>
  );
}