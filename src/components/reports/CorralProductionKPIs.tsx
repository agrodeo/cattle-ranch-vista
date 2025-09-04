import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/ui/metric-card";
import { Scale, TrendingUp, Calendar, BarChart3 } from "lucide-react";
import type { CorralKPI } from "@/hooks/useCorralKPIs";
import type { ReportFilters } from "./ReportsFilters";
import { useCorralKPIs } from "@/hooks/useCorralKPIs";

interface CorralProductionKPIsProps {
  filters?: ReportFilters;
}

export function CorralProductionKPIs({ filters }: CorralProductionKPIsProps) {
  const { kpis, loading } = useCorralKPIs();

  // Apply filters to KPIs
  const filteredKpis = kpis.filter(kpi => {
    if (filters?.corral_ids && filters.corral_ids.length > 0) {
      return filters.corral_ids.includes(kpi.corral_id);
    }
    return true;
  });

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Indicadores de Producción por Corrales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-48" />
        </CardContent>
      </Card>
    );
  }

  // Calculate summary metrics
  const totalAnimals = filteredKpis.reduce((sum, kpi) => sum + kpi.animal_count, 0);
  const totalCorrals = filteredKpis.length;
  const averageADG = filteredKpis.length > 0 ? 
    filteredKpis.reduce((sum, kpi) => sum + kpi.avg_daily_gain, 0) / filteredKpis.length : 0;
  const averageWeight = filteredKpis.length > 0 ? 
    filteredKpis.reduce((sum, kpi) => sum + kpi.avg_weight, 0) / filteredKpis.length : 0;

  const getAdgBadgeColor = (adg: number) => {
    if (adg >= 0.8) return 'bg-emerald-100 text-emerald-800';
    if (adg >= 0.6) return 'bg-blue-100 text-blue-800';
    if (adg >= 0.4) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  const formatWeight = (weight: number) => `${weight.toFixed(0)} kg`;
  const formatAdg = (adg: number) => `${adg.toFixed(3)} kg/d`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Indicadores de Producción por Corrales
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Total Corrales"
            value={totalCorrals}
            icon={BarChart3}
          />
          <MetricCard
            title="Total Animales"
            value={totalAnimals}
            icon={Scale}
          />
          <MetricCard
            title="GDP Promedio"
            value={formatAdg(averageADG)}
            icon={TrendingUp}
          />
          <MetricCard
            title="Peso Promedio"
            value={formatWeight(averageWeight)}
            icon={Scale}
          />
        </div>

        {/* Corral Details Table */}
        {filteredKpis.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No se encontraron corrales con animales.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Corral</th>
                  <th className="text-center p-2">Animales</th>
                  <th className="text-center p-2">GDP Promedio</th>
                  <th className="text-center p-2">Peso Promedio</th>
                  <th className="text-center p-2">Último Pesaje</th>
                  <th className="text-center p-2">Pesajes (90d)</th>
                </tr>
              </thead>
              <tbody>
                {filteredKpis.map((kpi) => (
                  <tr key={kpi.corral_id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{kpi.corral_name}</td>
                    <td className="text-center p-2">{kpi.animal_count}</td>
                    <td className="text-center p-2">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-medium">{formatAdg(kpi.avg_daily_gain)}</span>
                        <Badge className={`text-xs px-2 py-1 ${getAdgBadgeColor(kpi.avg_daily_gain)}`}>
                          {kpi.avg_daily_gain >= 0.8 ? 'Excelente' : 
                           kpi.avg_daily_gain >= 0.6 ? 'Bueno' : 
                           kpi.avg_daily_gain >= 0.4 ? 'Regular' : 'Bajo'}
                        </Badge>
                      </div>
                    </td>
                    <td className="text-center p-2">{formatWeight(kpi.avg_weight)}</td>
                    <td className="text-center p-2">
                      {kpi.last_weighing_date ? 
                        new Date(kpi.last_weighing_date).toLocaleDateString('es-ES') : 
                        'Sin datos'
                      }
                    </td>
                    <td className="text-center p-2">{kpi.recent_weighings_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}