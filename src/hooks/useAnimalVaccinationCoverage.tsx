import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VaccinationCoverageDetail {
  requirement_id: string;
  vaccine_name: string;
  status: 'pendiente' | 'al_dia' | 'vencida' | 'por_vencer';
  last_date: string | null;
  next_due: string | null;
}

interface VaccinationCoverage {
  animal_id: string;
  applicable_requirements: number;
  fulfilled_requirements: number;
  overdue_requirements: number;
  pending_requirements: number;
  percentage: number;
  status: 'unknown' | 'excellent' | 'good' | 'warning' | 'critical';
  details: VaccinationCoverageDetail[];
  error?: string;
}

export function useAnimalVaccinationCoverage() {
  const [loading, setLoading] = useState(false);

  const getCoverage = async (animalId: string): Promise<VaccinationCoverage | null> => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('calculate_animal_vaccination_coverage', {
        _animal_id: animalId
      });

      if (error) {
        console.error('Error fetching vaccination coverage:', error);
        return null;
      }

      return data as unknown as VaccinationCoverage;
    } catch (error) {
      console.error('Error in getCoverage:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    getCoverage
  };
}
