import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, Heart, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation('activities');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [yearlyStats, setYearlyStats] = useState<Record<string, StatsData>>({});
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useSupabaseAuth();

  useEffect(() => {
    fetchStats();
    fetchYearlyStats();
  }, [refreshKey]);

  const fetchStats = async () => {
    try {
      if (!currentUser?.cabañaId) return;

      const { data, error } = await supabase
        .rpc("calculate_ai_success_rate", {
          filter_cabaña_id: currentUser.cabañaId
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
      if (!currentUser?.cabañaId) return;

      // Get available years
      const { data: yearsData } = await supabase
        .from("artificial_inseminations")
        .select("insemination_date")
        .eq("cabaña_id", currentUser.cabañaId);

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
              filter_cabaña_id: currentUser.cabañaId
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
    return <div className="flex items-center justify-center p-8">{t('artificialInsemination.loadingStats')}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Year selector */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">{t('artificialInsemination.viewStatsBy')}:</label>
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('artificialInsemination.allYears')}</SelectItem>
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
              {t('artificialInsemination.totalInseminations')}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayStats?.total_inseminations || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {selectedYear === "all" ? t('artificialInsemination.historical') : t('artificialInsemination.year', { year: selectedYear })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('artificialInsemination.confirmedPregnancies')}
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayStats?.total_pregnancies || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('artificialInsemination.ofInseminations', { count: displayStats?.total_inseminations || 0 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('artificialInsemination.successPercentage')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayStats?.success_rate || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t('artificialInsemination.conceptionRate')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('artificialInsemination.pendingResults')}
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
              {t('artificialInsemination.noConfirmedResult')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Yearly comparison */}
      {selectedYear === "all" && availableYears.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('artificialInsemination.yearlyComparison')}</CardTitle>
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
                        {yearStats.total_inseminations} {t('artificialInsemination.inseminations')}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm">
                        {yearStats.total_pregnancies} {t('artificialInsemination.pregnancies')}
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