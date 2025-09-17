import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatFiltersForDB } from "@/lib/dateFormatters";
import { 
  calculateAgeInMonths, 
  getAnimalCategory, 
  calculatePregnancyRate,
  validateReproductiveData
} from "@/lib/reproductiveCalculations";
import type {
  AnimalReproductiveData,
  OffspringRecord,
  PregnancyRecord,
  ServiceRecord,
  ReproductiveMetric,
  ReproductiveAlert,
  Filters
} from "@/types/reproductive";

export function useReproductiveMetrics(filters: Filters = {}) {
  const [metrics, setMetrics] = useState<ReproductiveMetric[]>([]);
  const [alerts, setAlerts] = useState<ReproductiveAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Memoize filters to prevent unnecessary re-renders
  const stableFilters = useMemo(() => {
    return JSON.stringify(filters);
  }, [filters]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      
      const { data: currentUser } = await supabase.auth.getUser();
      if (!currentUser.user) {
        console.log("No authenticated user found");
        return;
      }

      const parsedFilters = JSON.parse(stableFilters);
      console.log("Fetching reproductive metrics for user:", currentUser.user.id);
      console.log("Filters applied:", parsedFilters);

      // Get user's cabaña_id using the existing function
      const { data: cabanaInfo } = await supabase.rpc('get_current_user_cabana_id');
      
      if (!cabanaInfo) {
        console.log("No cabaña found for user");
        return;
      }

      console.log("Using cabana_id:", cabanaInfo);

      // Use the existing calculate_reproductive_kpis function  
      const { data: reproductiveKpis, error: kpisError } = await supabase.rpc('calculate_reproductive_kpis', {
        _cabana_id: cabanaInfo
      });

      if (kpisError) {
        console.error("Database error fetching KPIs:", kpisError);
        throw kpisError;
      }

      console.log("Reproductive KPIs received:", reproductiveKpis);

      // Transform KPI data to ReproductiveMetric format
      const transformedData: ReproductiveMetric[] = (reproductiveKpis as any[] || []).map((kpi: any) => ({
        animal_id: kpi.animal_id,
        tag: kpi.id_tag || '',
        name: kpi.name || '',
        age_months: kpi.age_months || 0,
        category: kpi.category || 'Desconocida',
        corral_id: kpi.corral_id,
        corral_name: kpi.corral_name || 'Sin corral',
        is_pregnant: kpi.is_pregnant || false,
        pregnancy_date: kpi.pregnancy_date,
        expected_calving_date: kpi.expected_calving_date,
        last_service_date: null, // TODO: Add to KPI function
        days_open: kpi.days_open || 0,
        reproductive_years: kpi.reproductive_years || 1,
        total_offspring: kpi.total_offspring || 0,
        lifetime_services: kpi.lifetime_services || 0,
        lifetime_pregnancies: kpi.lifetime_pregnancies || 0,
        lifetime_calvings: kpi.lifetime_calvings || 0,
        individual_pregnancy_rate: kpi.individual_pregnancy_rate || 0,
        individual_calving_rate: kpi.individual_calving_rate || 0,
        performance_level: kpi.performance_level || 'Sin datos',
        active_alerts: kpi.active_alerts || 0,
        alert_types: kpi.alert_types || []
      }));

      console.log("Transformed metrics with KPI data:", transformedData);

      setMetrics(transformedData);
      
      // Fetch alerts separately
      const { data: alertsData } = await supabase
        .from('reproductive_alerts')
        .select('*')
        .eq('status', 'pending')
        .order('days_overdue', { ascending: false });
      
      setAlerts(alertsData || []);
      console.log("Successfully set metrics:", transformedData.length, "records");
    } catch (error) {
      console.error("Error fetching reproductive metrics:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `No se pudieron cargar las métricas reproductivas: ${error.message || error}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const markAlertAsResolved = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('reproductive_alerts')
        .update({ status: 'resolved' })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      
      toast({
        title: "Alerta resuelta",
        description: "La alerta ha sido marcada como resuelta",
      });
    } catch (error) {
      console.error("Error resolving alert:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo resolver la alerta",
      });
    }
  };

  const checkAndCreateAlerts = async () => {
    try {
      const { error } = await supabase.rpc('check_reproductive_alerts');
      if (error) throw error;
      
      // Refresh alerts after check
      await fetchMetrics();
    } catch (error) {
      console.error("Error checking alerts:", error);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [stableFilters]);

  return {
    metrics,
    alerts,
    loading,
    refresh: fetchMetrics,
    markAlertAsResolved,
    checkAndCreateAlerts,
  };
}