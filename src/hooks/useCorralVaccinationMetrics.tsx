import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CorralVaccinationMetrics {
  total_animals: number;
  total_requirements: number;
  total_vaccinations_given: number;
  total_vaccinations_needed: number;
  overall_compliance_percentage: number;
  mandatory_compliance_percentage: number;
  animals_fully_compliant: number;
  animals_partially_compliant: number;
  animals_non_compliant: number;
  animals_with_overdue: number;
}

export function useCorralVaccinationMetrics(corralId?: string) {
  const [metrics, setMetrics] = useState<CorralVaccinationMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async (id: string) => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('calculate_corral_vaccination_metrics' as any, {
          _corral_id: id
        });

      if (error) throw error;
      
      // RPC returns array with single result
      if (data && Array.isArray(data) && data.length > 0) {
        setMetrics(data[0] as CorralVaccinationMetrics);
      } else {
        setMetrics(null);
      }
    } catch (error) {
      console.error('Error fetching corral vaccination metrics:', error);
      toast.error('Error al obtener métricas de vacunación del corral');
      setMetrics(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (corralId) {
      fetchMetrics(corralId);
    }
  }, [corralId]);

  return {
    metrics,
    loading,
    fetchMetrics,
  };
}
