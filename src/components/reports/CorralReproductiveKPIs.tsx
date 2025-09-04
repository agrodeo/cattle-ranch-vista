import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MetricCard } from "@/components/ui/metric-card";
import { Heart, Users, TrendingUp, Activity } from "lucide-react";
import type { CorralKPI } from "@/hooks/useCorralKPIs";
import type { ReportFilters } from "./ReportsFilters";
import { useCorralKPIs } from "@/hooks/useCorralKPIs";

interface CorralReproductiveKPIsProps {
  filters?: ReportFilters;
}

export function CorralReproductiveKPIs({ filters }: CorralReproductiveKPIsProps) {
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
          <CardTitle>Indicadores Reproductivos por Corrales</CardTitle>
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
  const totalFemales = filteredKpis.reduce((sum, kpi) => sum + kpi.female_count, 0);
  const totalCorrals = filteredKpis.length;
  
  // Calculate weighted average pregnancy rate
  const averagePregnancyRate = totalFemales > 0 ? 
    filteredKpis.reduce((sum, kpi) => sum + (kpi.pregnancy_rate * kpi.female_count), 0) / totalFemales : 0;

  const getPregnancyBadgeColor = (rate: number) => {
    if (rate >= 80) return 'bg-emerald-100 text-emerald-800';
    if (rate >= 60) return 'bg-blue-100 text-blue-800';
    if (rate >= 40) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  const formatPercentage = (rate: number) => `${rate.toFixed(1)}%`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Indicadores Reproductivos por Corrales
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            title="Total Corrales"
            value={totalCorrals}
            icon={Activity}
          />
          <MetricCard
            title="Total Hembras"
            value={totalFemales}
            icon={Users}
          />
          <MetricCard
            title="% Preñez Promedio"
            value={formatPercentage(averagePregnancyRate)}
            icon={Heart}
          />
          <MetricCard
            title="Total Animales"
            value={totalAnimals}
            icon={TrendingUp}
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
                  <th className="text-center p-2">Total</th>
                  <th className="text-center p-2">Machos</th>
                  <th className="text-center p-2">Hembras</th>
                  <th className="text-center p-2">% Preñez</th>
                  <th className="text-center p-2">Hectáreas</th>
                </tr>
              </thead>
              <tbody>
                {filteredKpis.map((kpi) => (
                  <tr key={kpi.corral_id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{kpi.corral_name}</td>
                    <td className="text-center p-2">{kpi.animal_count}</td>
                    <td className="text-center p-2">{kpi.male_count}</td>
                    <td className="text-center p-2">{kpi.female_count}</td>
                    <td className="text-center p-2">
                      <div className="flex flex-col items-center gap-1">
                        <span className="font-medium">{formatPercentage(kpi.pregnancy_rate)}</span>
                        <Badge className={`text-xs px-2 py-1 ${getPregnancyBadgeColor(kpi.pregnancy_rate)}`}>
                          {kpi.pregnancy_rate >= 80 ? 'Excelente' : 
                           kpi.pregnancy_rate >= 60 ? 'Bueno' : 
                           kpi.pregnancy_rate >= 40 ? 'Regular' : 'Bajo'}
                        </Badge>
                      </div>
                    </td>
                    <td className="text-center p-2">
                      {kpi.hectareas ? `${kpi.hectareas} ha` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Additional Info */}
        <div className="mt-4 text-sm text-muted-foreground">
          <p>* El % de preñez se calcula usando hembras reproductivas (≥15 meses) y el estado actual de preñez.</p>
        </div>
      </CardContent>
    </Card>
  );
}