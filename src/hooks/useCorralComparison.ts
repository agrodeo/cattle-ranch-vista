import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { getWeightedBenchmarksWithCustom } from "@/lib/breedBenchmarks";

export type GroupBy = "year" | "semester" | "quarter";
export type RankingMetric = "adg" | "peso_destete" | "peso_final";

export interface CorralSeasonData {
  corral_id: string;
  corral_name: string;
  season_label: string;
  season_start: string;
  season_end: string;
  animal_count: number;
  avg_peso_kg: number | null;
  avg_peso_destete: number | null;
  avg_peso_final: number | null;
  avg_adg: number | null;
  avg_adg_benchmark_pct: number | null;
  breed_distribution: { breed: string; count: number }[];
  mejora_vs_anterior: number | null;
}

export interface CorralRanking {
  corral_id: string;
  corral_name: string;
  animal_count: number;
  avg_adg: number | null;
  avg_peso_destete: number | null;
  avg_peso_final: number | null;
  hectareas: number | null;
  breed_mix: string | null;
  rank_position: number;
  benchmark_pct: number | null;
}

export interface CorralComparisonFilters {
  date_from?: string;
  date_to?: string;
  corral_ids?: string[];
  group_by?: GroupBy;
  min_days_in_corral?: number;
  ranking_metric?: RankingMetric;
}

const todayISO = () => new Date().toISOString().split("T")[0];
const yearsAgoISO = (years: number) => new Date(Date.now() - years * 365 * 86400000).toISOString().split("T")[0];

function parseBreedDistribution(value: unknown): { breed: string; count: number }[] {
  if (!Array.isArray(value)) return [];
  return value.map((item: any) => ({
    breed: item?.breed || "Sin especificar",
    count: Number(item?.count || 1),
  }));
}

async function calculateBenchmarkPct(
  avgAdg: number | null | undefined,
  distribution: { breed: string; count: number }[],
  cabañaId: string
) {
  if (!avgAdg || !distribution.length) return null;
  const benchmarks = await getWeightedBenchmarksWithCustom(distribution, cabañaId);
  return benchmarks.dailyGain.good > 0 ? Math.round((avgAdg / benchmarks.dailyGain.good) * 100) : null;
}

export function useCorralComparison(filters: CorralComparisonFilters = {}) {
  const { currentUser } = useSupabaseAuth();
  const cabañaId = currentUser?.cabañaId;

  const seasonQuery = useQuery({
    queryKey: ["corral-season-comparison", cabañaId, filters],
    queryFn: async (): Promise<CorralSeasonData[]> => {
      if (!cabañaId) return [];

      const { data, error } = await (supabase as any).rpc("get_corral_season_comparison", {
        _cabana_id: cabañaId,
        _date_from: filters.date_from || yearsAgoISO(5),
        _date_to: filters.date_to || todayISO(),
        _group_by: filters.group_by || "year",
        _min_days_in_corral: filters.min_days_in_corral ?? 60,
        _corral_ids: filters.corral_ids?.length ? filters.corral_ids : null,
      });

      if (error) throw error;

      return Promise.all(
        (data || []).map(async (row: any) => {
          const breedDistribution = parseBreedDistribution(row.breed_distribution);
          const benchmarkPct = await calculateBenchmarkPct(row.avg_adg, breedDistribution, cabañaId);
          return {
            ...row,
            breed_distribution: breedDistribution,
            avg_adg_benchmark_pct: benchmarkPct,
          } as CorralSeasonData;
        })
      );
    },
    enabled: !!cabañaId,
    staleTime: 5 * 60 * 1000,
  });

  const rankingQuery = useQuery({
    queryKey: ["corral-ranking", cabañaId, filters.date_from, filters.date_to, filters.min_days_in_corral, filters.ranking_metric],
    queryFn: async (): Promise<CorralRanking[]> => {
      if (!cabañaId) return [];

      const { data, error } = await (supabase as any).rpc("get_corral_ranking", {
        _cabana_id: cabañaId,
        _date_from: filters.date_from || yearsAgoISO(1),
        _date_to: filters.date_to || todayISO(),
        _min_days_in_corral: filters.min_days_in_corral ?? 60,
        _metric: filters.ranking_metric || "adg",
      });

      if (error) throw error;

      return Promise.all(
        (data || []).map(async (row: any) => {
          const distribution = String(row.breed_mix || "")
            .split(",")
            .map((breed) => breed.trim())
            .filter(Boolean)
            .map((breed) => ({ breed, count: 1 }));
          const benchmarkPct = await calculateBenchmarkPct(row.avg_adg, distribution, cabañaId);
          return { ...row, benchmark_pct: benchmarkPct } as CorralRanking;
        })
      );
    },
    enabled: !!cabañaId,
    staleTime: 5 * 60 * 1000,
  });

  const seasonData = seasonQuery.data || [];
  const rankingData = rankingQuery.data || [];

  const computed = useMemo(() => {
    const sortedRanking = [...rankingData].sort((a, b) => a.rank_position - b.rank_position);
    const bestCorral = sortedRanking[0] || null;
    const worstCorral = sortedRanking.length > 1 ? sortedRanking[sortedRanking.length - 1] : null;
    const corralNames = [...new Set(seasonData.map((d) => d.corral_name))].sort();
    const seasonLabels = [...new Set(seasonData.map((d) => d.season_label))].sort();
    const heatmapMatrix = corralNames.map((corral) => ({
      corral,
      seasons: seasonLabels.map((season) => {
        const cell = seasonData.find((d) => d.corral_name === corral && d.season_label === season);
        return {
          season,
          adg: cell?.avg_adg ?? null,
          benchmarkPct: cell?.avg_adg_benchmark_pct ?? null,
          animalCount: cell?.animal_count ?? 0,
          pesoDestete: cell?.avg_peso_destete ?? null,
          pesoFinal: cell?.avg_peso_final ?? null,
          mejora: cell?.mejora_vs_anterior ?? null,
        };
      }),
    }));
    const adgSpread = bestCorral?.avg_adg && worstCorral?.avg_adg
      ? Math.round((bestCorral.avg_adg - worstCorral.avg_adg) * 1000) / 1000
      : null;

    return { sortedRanking, bestCorral, worstCorral, corralNames, seasonLabels, heatmapMatrix, adgSpread };
  }, [rankingData, seasonData]);

  return {
    seasonData,
    rankingData: computed.sortedRanking,
    bestCorral: computed.bestCorral,
    worstCorral: computed.worstCorral,
    adgSpread: computed.adgSpread,
    heatmapMatrix: computed.heatmapMatrix,
    corralNames: computed.corralNames,
    seasonLabels: computed.seasonLabels,
    isLoading: seasonQuery.isLoading || rankingQuery.isLoading,
    error: seasonQuery.error || rankingQuery.error,
  };
}
