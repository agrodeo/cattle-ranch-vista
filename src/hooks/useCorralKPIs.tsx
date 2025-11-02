import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useToast } from '@/hooks/use-toast';

export interface CorralKPI {
  corral_id: string;
  corral_name: string;
  animal_count: number;
  male_count: number;
  female_count: number;
  hectareas: number | null;
  consanguinity_risk_count: number;
  highest_severity: string | null;
  vaccination_percentage: number;
  vaccination_alerts: number;
  avg_daily_gain: number;
  recent_weighings_count: number;
  last_weighing_date: string | null;
  vaccination_status: 'excellent' | 'good' | 'warning' | 'critical' | 'unknown';
  pregnancy_rate: number;
  avg_weight: number;
}

export function useCorralKPIs() {
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();
  const [kpis, setKpis] = useState<CorralKPI[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchKPIs = async () => {
    if (!currentUser?.id) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('rpc_corral_complete_kpis', {
        _user_id: currentUser.id
      });

      if (error) throw error;

      setKpis((data || []).map((item: any) => ({
        ...item,
        // Convert bigint values to numbers for React compatibility
        animal_count: Number(item.animal_count),
        male_count: Number(item.male_count),
        female_count: Number(item.female_count),
        vaccination_alerts: Number(item.vaccination_alerts),
        recent_weighings_count: Number(item.recent_weighings_count),
        vaccination_status: item.vaccination_status as 'excellent' | 'good' | 'warning' | 'critical' | 'unknown'
      })));
    } catch (error) {
      console.error('Error fetching corral KPIs:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las métricas de corrales",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKPIs();
  }, [currentUser?.id]);

  const getVaccinationStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-emerald-600';
      case 'good': return 'text-blue-600';
      case 'warning': return 'text-amber-600';
      case 'critical': return 'text-red-600';
      default: return 'text-slate-600';
    }
  };

  const getVaccinationStatusLabel = (status: string) => {
    switch (status) {
      case 'excellent': return 'Excelente';
      case 'good': return 'Bueno';
      case 'warning': return 'Atención';
      case 'critical': return 'Crítico';
      default: return 'Desconocido';
    }
  };

  return {
    kpis,
    loading,
    refresh: fetchKPIs,
    getVaccinationStatusColor,
    getVaccinationStatusLabel,
  };
}