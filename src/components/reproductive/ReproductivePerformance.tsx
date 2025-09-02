import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ReproductiveMetrics {
  porcentaje_preñez: number;
  porcentaje_paricion: number;
  total_reproductive_years: number;
  confirmed_pregnancies: number;
  live_calves: number;
}

interface ReproductivePerformanceProps {
  animalId: string;
  animalSex?: string;
}

export function ReproductivePerformance({ animalId, animalSex }: ReproductivePerformanceProps) {
  const [metrics, setMetrics] = useState<ReproductiveMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (animalSex !== "Hembra") {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .rpc("calculate_reproductive_performance", { _animal_id: animalId });

        if (error) throw error;
        if (data && typeof data === 'object' && data !== null) {
          const result = data as any;
          if (!result.error) {
            // Map the returned jsonb structure to our interface
            setMetrics({
              porcentaje_preñez: result.pregnancy_percentage || 0,
              porcentaje_paricion: result.calving_percentage || 0,
              total_reproductive_years: result.total_reproductive_years || 0,
              confirmed_pregnancies: result.confirmed_pregnancies || 0,
              live_calves: result.live_calves || 0
            });
          }
        }
      } catch (error) {
        console.error("Error fetching reproductive metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [animalId, animalSex]);

  if (animalSex !== "Hembra") {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento Reproductivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento Reproductivo</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No hay datos disponibles</p>
        </CardContent>
      </Card>
    );
  }

  const getPerformanceBadge = (percentage: number, type: "pregnancy" | "calving") => {
    if (percentage >= 90) return <Badge className="bg-green-500">Excelente</Badge>;
    if (percentage >= 75) return <Badge className="bg-blue-500">Bueno</Badge>;
    if (percentage >= 50) return <Badge className="bg-yellow-500">Regular</Badge>;
    return <Badge variant="destructive">Bajo</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rendimiento Reproductivo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Porcentaje de Preñez</span>
              {getPerformanceBadge(metrics.porcentaje_preñez || 0, "pregnancy")}
            </div>
            <div className="text-2xl font-bold">
              {metrics.porcentaje_preñez?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.confirmed_pregnancies} de {metrics.total_reproductive_years} años reproductivos
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Porcentaje de Parición</span>
              {getPerformanceBadge(metrics.porcentaje_paricion || 0, "calving")}
            </div>
            <div className="text-2xl font-bold">
              {metrics.porcentaje_paricion?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.live_calves} terneros vivos de {metrics.confirmed_pregnancies} preñeces
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium">Años Reproductivos</span>
            <div className="text-xl font-semibold">{metrics.total_reproductive_years}</div>
          </div>

          <div className="space-y-1">
            <span className="text-sm font-medium">Terneros Vivos</span>
            <div className="text-xl font-semibold">{metrics.live_calves}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}