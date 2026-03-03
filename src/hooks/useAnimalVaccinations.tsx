import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { isOnline } from '@/services/connectivity';

export interface VaccinationStatus {
  requirement_id: string;
  vaccine_code: string;
  vaccine_name: string;
  is_mandatory: boolean;
  status: 'completa' | 'pendiente' | 'vencida' | 'no_aplica';
  doses_given: number;
  doses_required: number;
  last_vaccination_date: string | null;
  next_due_date: string | null;
  days_overdue: number | null;
  compliance_percentage: number;
}

export interface VaccinationHistory {
  id: string;
  vaccine_code: string;
  vaccine_name: string;
  date: string;
  dose_number: number;
  lot: string | null;
  dose: string | null;
  route: string | null;
  next_due: string | null;
  is_complete: boolean;
}

export function useAnimalVaccinations(animalId: string | null) {
  const { t } = useTranslation(['common']);
  const [status, setStatus] = useState<VaccinationStatus[]>([]);
  const [history, setHistory] = useState<VaccinationHistory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    if (!animalId) return;
    if (!isOnline()) {
      console.log('📴 Offline — skipping vaccination status fetch');
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      // Use RPC to get cabana_id
      const { data: cabanaId } = await supabase.rpc('get_current_user_cabana_id');
      if (!cabanaId) throw new Error('No cabaña found');

      // Get vaccination status
      const { data: statusData, error: statusError } = await supabase
        .rpc('calculate_vaccination_status', {
          _animal_id: animalId,
          _cabana_id: cabanaId
        });

      if (statusError) throw statusError;
      setStatus((statusData as any) || []);

      // Get vaccination history
      const { data: historyData, error: historyError } = await supabase
        .from('animal_vaccines')
        .select(`
          id,
          vaccine_code,
          date,
          dose_number,
          lot,
          dose,
          route,
          next_due,
          is_complete,
          requirement_id
        `)
        .eq('animal_id', animalId)
        .order('date', { ascending: false });

      if (historyError) throw historyError;

      // Get requirement names for history
      const requirementIds = [...new Set(historyData?.map(v => v.requirement_id).filter(Boolean) || [])];
      const { data: requirements } = await supabase
        .from('cabaña_vaccination_requirements')
        .select('id, vaccine_name')
        .in('id', requirementIds);

      const requirementMap = new Map(requirements?.map(r => [r.id, r.vaccine_name]) || []);

      const enrichedHistory: VaccinationHistory[] = (historyData || []).map(v => ({
        ...v,
        vaccine_name: requirementMap.get(v.requirement_id) || v.vaccine_code
      }));

      setHistory(enrichedHistory);

    } catch (error: any) {
      console.error('Error fetching vaccination data:', error);
      toast.error(t('common:error.loadFailed'));
      setStatus([]);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const recordVaccination = async (
    requirementId: string,
    date: string,
    lot?: string,
    dose?: string,
    route?: string
  ) => {
    if (!animalId) throw new Error('No animal ID provided');

    try {
      const { data, error } = await supabase.rpc('record_animal_vaccination', {
        _animal_id: animalId,
        _requirement_id: requirementId,
        _date: date,
        _lot: lot,
        _dose: dose,
        _route: route,
        _created_by: (await supabase.auth.getUser()).data.user?.id
      });

      if (error) throw error;

      toast.success(t('common:toast.vaccinationRecorded'));
      await fetchStatus(); // Refresh data
      return data;
    } catch (error: any) {
      console.error('Error recording vaccination:', error);
      toast.error(t('common:toast.vaccinationError'));
      throw error;
    }
  };

  useEffect(() => {
    if (animalId) {
      fetchStatus();
    }
  }, [animalId]);

  return {
    status,
    history,
    loading,
    recordVaccination,
    refresh: fetchStatus
  };
}
