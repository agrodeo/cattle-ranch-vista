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
  const [uniqueAnimalsCount, setUniqueAnimalsCount] = useState(0);
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

      // Fetch temporal analysis data
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

      // Count unique animals with the same filters
      let query = supabase
        .from('animal_weight_history')
        .select('animal_id', { count: 'exact', head: false })
        .eq('cabaña_id', cabanaId);

      if (dateFrom) query = query.gte('fecha', dateFrom);
      if (dateTo) query = query.lte('fecha', dateTo);
      
      if (weightType !== 'all') {
        query = query.eq('tipo_pesaje', weightType);
      }

      if (filters.corral_ids && filters.corral_ids.length > 0) {
        const { data: corralAnimals } = await supabase
          .from('animals')
          .select('id')
          .in('corral_id', filters.corral_ids);
        
        if (corralAnimals) {
          query = query.in('animal_id', corralAnimals.map(a => a.id));
        }
      }

      const { data: uniqueAnimals, error: countError } = await query;

      if (countError) throw countError;

      // Count unique animal_ids
      const uniqueIds = new Set(uniqueAnimals?.map(a => a.animal_id) || []);
      setUniqueAnimalsCount(uniqueIds.size);
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

  return {
    data,
    loading,
    error,
    metrics,
    averageAnnualImprovement,
    totalAnimals: uniqueAnimalsCount,
    refetch: fetchTemporalData
  };
}
