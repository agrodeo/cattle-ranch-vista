import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Users, Baby, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useCorralKPIs } from "@/hooks/useCorralKPIs";
import { ReportFilters } from "./ReportsFilters";

interface CorralReproductiveKPIsProps {
  filters?: ReportFilters;
}

export function CorralReproductiveKPIs({ filters }: CorralReproductiveKPIsProps) {
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

  const totalFemales = kpis.reduce((sum, corral) => sum + corral.female_count, 0);
  const avgPregnancyRate = kpis.length > 0 && totalFemales > 0
    ? kpis.reduce((sum, corral) => sum + (corral.pregnancy_rate * corral.female_count), 0) / totalFemales
    : 0;
  const totalPregnant = kpis.reduce((sum, corral) => 
    sum + Math.round((corral.pregnancy_rate / 100) * corral.female_count), 0);

  const getPregnancyBadgeColor = (rate: number) => {
    if (rate >= 80) return "default";
    if (rate >= 60) return "secondary"; 
    if (rate >= 40) return "outline";
    return "destructive";
  };

  const getPregnancyLabel = (rate: number) => {
    if (rate >= 80) return "Excelente";
    if (rate >= 60) return "Bueno";
    if (rate >= 40) return "Regular";
    return "Mejorable";
  };

  const corralesConBuenaPreñez = kpis.filter(k => k.pregnancy_rate >= 60).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Indicadores Reproductivos por Corrales</h3>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hembras Totales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFemales}</div>
            <p className="text-xs text-muted-foreground">
              En {kpis.length} corrales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Preñez Promedio</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{avgPregnancyRate.toFixed(1)}%</div>
            <div className="flex items-center justify-between">
              <Badge variant={getPregnancyBadgeColor(avgPregnancyRate)}>
                {getPregnancyLabel(avgPregnancyRate)}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hembras Preñadas</CardTitle>
            <Baby className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalPregnant}</div>
            <p className="text-xs text-muted-foreground">
              De {totalFemales} hembras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Corrales Eficientes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{corralesConBuenaPreñez}</div>
            <p className="text-xs text-muted-foreground">
              ≥60% preñez
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}