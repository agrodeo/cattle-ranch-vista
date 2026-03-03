import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isOnline } from "@/services/connectivity";

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
  const { t } = useTranslation(['common']);
  const [metrics, setMetrics] = useState<CorralVaccinationMetrics | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = async (id: string) => {
    if (!id) return;
    if (!isOnline()) {
      console.log('📴 Offline — skipping corral vaccination metrics fetch');
      return;
    }
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
      toast.error(t('common:error.loadFailed'));
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
