import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, TrendingUp, Calendar, Target } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCorralKPIs } from "@/hooks/useCorralKPIs";
import { ReportFilters } from "./ReportsFilters";

interface CorralProductionKPIsProps {
  filters?: ReportFilters;
}

export function CorralProductionKPIs({ filters }: CorralProductionKPIsProps) {
  const { kpis, loading } = useCorralKPIs();

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const totalAnimals = kpis.reduce((sum, corral) => sum + corral.animal_count, 0);
  const avgDailyGain = kpis.length > 0 
    ? kpis.reduce((sum, corral) => sum + (corral.avg_daily_gain * corral.animal_count), 0) / totalAnimals
    : 0;
  const avgWeight = kpis.length > 0 
    ? kpis.reduce((sum, corral) => sum + (corral.avg_weight * corral.animal_count), 0) / totalAnimals
    : 0;
  const totalRecentWeighings = kpis.reduce((sum, corral) => sum + corral.recent_weighings_count, 0);

  const getAdgBadgeColor = (adg: number) => {
    if (adg >= 0.8) return "default";
    if (adg >= 0.6) return "secondary";
    return "destructive";
  };

  const getAdgLabel = (adg: number) => {
    if (adg >= 0.8) return "Excelente";
    if (adg >= 0.6) return "Bueno";
    return "Mejorable";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Indicadores de Producción por Corrales</h3>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Animales</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAnimals}</div>
            <p className="text-xs text-muted-foreground">
              En {kpis.length} corrales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GDP Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgDailyGain.toFixed(3)} kg/día</div>
            <div className="flex items-center justify-between">
              <Badge variant={getAdgBadgeColor(avgDailyGain)}>
                {getAdgLabel(avgDailyGain)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peso Promedio</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgWeight.toFixed(0)} kg</div>
            <p className="text-xs text-muted-foreground">
              Peso actual promedio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pesajes Recientes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRecentWeighings}</div>
            <p className="text-xs text-muted-foreground">
              Últimos 90 días
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}