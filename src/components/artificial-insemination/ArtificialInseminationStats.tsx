import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Heart, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useHybridAuth } from "@/hooks/useHybridAuth";

interface StatsData {
  total_inseminations: number;
  total_pregnancies: number;
  success_rate: number;
  pending_results: number;
}

interface ArtificialInseminationStatsProps {
  refreshKey: number;
}

export function ArtificialInseminationStats({ refreshKey }: ArtificialInseminationStatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [yearlyStats, setYearlyStats] = useState<Record<string, StatsData>>({});
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useHybridAuth();

  useEffect(() => {
    fetchStats();
    fetchYearlyStats();
  }, [refreshKey]);

  const fetchStats = async () => {
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", currentUser?.id)
        .single();

      if (!userData?.cabaña_id) return;

      const { data, error } = await supabase
        .rpc("calculate_ai_success_rate", {
          filter_cabaña_id: userData.cabaña_id
        });

      if (error) throw error;
      if (data && data.length > 0) {
        setStats(data[0]);
      }
    } catch (error) {
      console.error("Error fetching AI stats:", error);
    }
  };

  const fetchYearlyStats = async () => {
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", currentUser?.id)
        .single();

      if (!userData?.cabaña_id) return;

      // Get available years
      const { data: yearsData } = await supabase
        .from("artificial_inseminations")
        .select("insemination_date")
        .eq("cabaña_id", userData.cabaña_id);

      if (yearsData) {
        const years = [...new Set(
          yearsData.map(record => 
            new Date(record.insemination_date).getFullYear().toString()
          )
        )].sort((a, b) => parseInt(b) - parseInt(a));
        
        setAvailableYears(years);

        // Fetch stats for each year
        const yearlyStatsData: Record<string, StatsData> = {};
        
        for (const year of years) {
          const { data, error } = await supabase
            .rpc("calculate_ai_success_rate", {
              filter_year: parseInt(year),
              filter_cabaña_id: userData.cabaña_id
            });

          if (!error && data && data.length > 0) {
            yearlyStatsData[year] = data[0];
          }
        }
        
        setYearlyStats(yearlyStatsData);
      }
    } catch (error) {
      console.error("Error fetching yearly stats:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const displayStats = selectedYear === "all" ? stats : yearlyStats[selectedYear];

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Cargando estadísticas...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Year selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Ver estadísticas por:</label>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los años</SelectItem>
            {availableYears.map(year => (
              <SelectItem key={year} value={year}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Inseminaciones
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayStats?.total_inseminations || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedYear === "all" ? "Histórico" : `Año ${selectedYear}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Preñeces Confirmadas
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayStats?.total_pregnancies || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              De {displayStats?.total_inseminations || 0} inseminaciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Porcentaje de Éxito
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayStats?.success_rate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Tasa de concepción
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Resultados Pendientes
            </CardTitle>
            <Badge variant="secondary" className="h-4">
              ?
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayStats?.pending_results || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Sin resultado confirmado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Yearly comparison */}
      {selectedYear === "all" && availableYears.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Comparación por Año</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {availableYears.map(year => {
                const yearStats = yearlyStats[year];
                if (!yearStats) return null;
                
                return (
                  <div key={year} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <span className="font-medium">{year}</span>
                      <span className="text-sm text-muted-foreground">
                        {yearStats.total_inseminations} inseminaciones
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        {yearStats.total_pregnancies} preñeces
                      </span>
                      <Badge 
                        variant={yearStats.success_rate >= 50 ? "default" : "secondary"}
                        className={yearStats.success_rate >= 50 ? "bg-green-500" : ""}
                      >
                        {yearStats.success_rate}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}