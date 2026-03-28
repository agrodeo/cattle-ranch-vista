import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatFiltersForDB } from "@/lib/dateFormatters";
import { isOnline } from "@/services/connectivity";
import type {
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
    // Skip network calls when offline
    if (!isOnline()) {
      setLoading(false);
      return;
    }
    
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

      // Format dates properly for database
      const formattedFilters = formatFiltersForDB(parsedFilters);
      console.log("Formatted filters for DB:", formattedFilters);

      // Get user's cabaña_id using the existing function
      const { data: cabanaInfo } = await supabase.rpc('get_current_user_cabana_id');
      
      if (!cabanaInfo) {
        console.log("No cabaña found for user");
        return;
      }

      console.log("Using cabana_id:", cabanaInfo);

      // Use the new enhanced reproductive metrics function
      const { data: reproductiveFemalesData, error: femalesError } = await supabase.rpc('get_enhanced_reproductive_metrics', {
        _cabana_id: cabanaInfo,
        _filters: formattedFilters
      });

      if (femalesError) {
        console.error("Database error:", femalesError);
        throw femalesError;
      }

      console.log("Raw reproductive data received:", reproductiveFemalesData);

      // Transform the data to match our ReproductiveMetric interface
      const transformedData = (reproductiveFemalesData as any[] || []).map((item: any) => {
        const metric: ReproductiveMetric = {
          animal_id: item.animal_id,
          tag: item.id_tag || '',
          name: item.name || '',
          age_months: item.age_months,
          category: item.category,
          corral_id: item.corral_id,
          corral_name: item.corral_name || 'Sin corral',
          is_pregnant: item.is_pregnant || false,
          pregnancy_date: item.pregnancy_date,
          expected_calving_date: item.expected_calving_date,
          last_service_date: item.last_service_date,
          days_open: item.days_open || 0,
          reproductive_years: item.reproductive_years || 1,
          total_offspring: item.total_offspring || 0,
          lifetime_services: item.lifetime_services || 0,
          lifetime_pregnancies: item.lifetime_pregnancies || 0,
          lifetime_calvings: item.lifetime_calvings || 0,
          individual_pregnancy_rate: item.individual_pregnancy_rate || 0,
          individual_calving_rate: item.individual_calving_rate || 0,
          performance_level: item.performance_level || 'Sin servicios',
          active_alerts: item.active_alerts || 0,
          alert_types: item.alert_types || []
        };
        return metric;
      });

      console.log("Transformed metrics with new calculation logic:", transformedData);

      // Fetch alerts separately
      const { data: alertsData } = await supabase
        .from('reproductive_alerts')
        .select('*')
        .eq('status', 'pending')
        .order('days_overdue', { ascending: false });

      setMetrics(transformedData);
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