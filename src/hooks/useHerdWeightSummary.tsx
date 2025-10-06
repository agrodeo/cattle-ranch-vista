import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HerdWeightSummary {
  total_weighings: number;
  peso_promedio: number;
  ganancia_diaria_promedio: number;
  animales_pesados: number;
  por_categoria?: Record<string, {
    count: number;
    peso_promedio: number;
    adg_promedio: number;
  }>;
  top_performers?: Array<{
    id_tag: string;
    name: string;
    ganancia_diaria: number;
  }>;
  low_performers?: Array<{
    id_tag: string;
    name: string;
    ganancia_diaria: number;
  }>;
}

export function useHerdWeightSummary(cabanaId: string, dateFrom?: Date, dateTo?: Date) {
  const [summary, setSummary] = useState<HerdWeightSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSummary = async () => {
    if (!cabanaId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_herd_weight_summary', {
        _cabana_id: cabanaId,
        _date_from: dateFrom?.toISOString().split('T')[0] || null,
        _date_to: dateTo?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0]
      });

      if (error) throw error;

      if (data && data.length > 0) {
        const record = data[0];
        setSummary({
          total_weighings: record.total_weighings || 0,
          peso_promedio: record.peso_promedio || 0,
          ganancia_diaria_promedio: record.ganancia_diaria_promedio || 0,
          animales_pesados: record.animales_pesados || 0,
          por_categoria: (record.por_categoria || {}) as Record<string, {
            count: number;
            peso_promedio: number;
            adg_promedio: number;
          }>,
          top_performers: (record.top_performers || []) as Array<{
            id_tag: string;
            name: string;
            ganancia_diaria: number;
          }>,
          low_performers: (record.low_performers || []) as Array<{
            id_tag: string;
            name: string;
            ganancia_diaria: number;
          }>
        });
      }
    } catch (error) {
      console.error('Error fetching herd weight summary:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [cabanaId, dateFrom, dateTo]);

  return { summary, isLoading, refresh: fetchSummary };
}
