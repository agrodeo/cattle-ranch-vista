import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { analyzeTrend, calculateAcceleration, findBestPeriod, generateInsights, type TemporalDataPoint } from '@/lib/temporalAnalysis';

export type GroupByPeriod = 'year' | 'semester' | 'quarter' | 'month';
export type WeightType = 'destete' | 'final' | 'all';

interface UseTemporalProductionDataProps {
  cabanaId: string | null;
  groupBy?: GroupByPeriod;
  weightType?: WeightType;
  dateFrom?: string | null;
  dateTo?: string | null;
  filters?: {
    corral_ids?: string[];
    category?: string;
    breed?: string;
  };
}

export function useTemporalProductionData({
  cabanaId,
  groupBy = 'year',
  weightType = 'destete',
  dateFrom = null,
  dateTo = null,
  filters = {}
}: UseTemporalProductionDataProps) {
  const [data, setData] = useState<TemporalDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!cabanaId) {
      setLoading(false);
      return;
    }

    fetchTemporalData();
  }, [cabanaId, groupBy, weightType, dateFrom, dateTo, JSON.stringify(filters)]);

  const fetchTemporalData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: result, error: rpcError } = await supabase.rpc(
        'get_temporal_production_analysis',
        {
          _cabana_id: cabanaId,
          _group_by: groupBy,
          _date_from: dateFrom,
          _date_to: dateTo,
          _tipo_pesaje: weightType,
          _filters: filters
        }
      );

      if (rpcError) throw rpcError;

      setData(result || []);
    } catch (err) {
      console.error('Error fetching temporal data:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudieron cargar los datos temporales'
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculated metrics
  const metrics = useMemo(() => {
    if (data.length === 0) {
      return {
        trend: { direction: 'stable' as const, slope: 0, r2: 0, averageChange: 0 },
        acceleration: 0,
        bestPeriod: null,
        insights: []
      };
    }

    const metric = weightType === 'final' ? 'final' : 'destete';
    const trend = analyzeTrend(data, metric);
    const acceleration = calculateAcceleration(data);
    const bestPeriod = findBestPeriod(data, metric);
    const insights = generateInsights(data, trend, acceleration);

    return {
      trend,
      acceleration,
      bestPeriod,
      insights
    };
  }, [data, weightType]);

  // Average annual improvement
  const averageAnnualImprovement = useMemo(() => {
    const improvements = data
      .map(d => d.mejora_vs_anterior)
      .filter((m): m is number => m !== null && !isNaN(m));
    
    if (improvements.length === 0) return 0;
    return improvements.reduce((sum, m) => sum + m, 0) / improvements.length;
  }, [data]);

  // Total animals analyzed
  const totalAnimals = useMemo(() => {
    return data.reduce((sum, d) => sum + d.cantidad_animales, 0);
  }, [data]);

  return {
    data,
    loading,
    error,
    metrics,
    averageAnnualImprovement,
    totalAnimals,
    refetch: fetchTemporalData
  };
}
