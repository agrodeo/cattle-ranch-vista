import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatFiltersForDB } from "@/lib/dateFormatters";

interface ReproductiveMetric {
  animal_id: string;
  tag: string;
  name?: string;
  age_months: number;
  category: string;
  corral_id?: string;
  corral_name?: string;
  is_pregnant: boolean;
  pregnancy_date?: string;
  expected_calving_date?: string;
  last_service_date?: string;
  days_open?: number;
  reproductive_years: number;
  total_offspring: number;
  lifetime_services: number;
  lifetime_pregnancies: number;
  lifetime_calvings: number;
  individual_pregnancy_rate: number;
  individual_calving_rate: number;
  performance_level: string;
  active_alerts: number;
  alert_types: string[];
}

interface ReproductiveAlert {
  id: string;
  animal_id: string;
  alert_type: string;
  alert_date: string;
  expected_date?: string;
  days_overdue: number;
  status: string;
  notes?: string;
}

interface Filters {
  [key: string]: any;
  corral_ids?: string[];
  performance?: string;
  alert_status?: string;
  include_sold_dead?: boolean;
}

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

      // Format dates properly for database
      const formattedFilters = formatFiltersForDB(parsedFilters);
      console.log("Formatted filters for DB:", formattedFilters);

      // Fetch reproductive metrics
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('rpc_reproductive_detailed_metrics', {
          _user_id: currentUser.user.id,
          filters_json: formattedFilters
        });

      if (metricsError) {
        console.error("Database error:", metricsError);
        throw metricsError;
      }

      console.log("Metrics data received:", metricsData);

      // Fetch active alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('reproductive_alerts')
        .select('*')
        .eq('status', 'pending')
        .order('days_overdue', { ascending: false });

      if (alertsError) {
        console.log("Alerts error (not critical):", alertsError);
        // Don't throw for alerts error since table might not exist yet
      }

      setMetrics(metricsData || []);
      setAlerts(alertsData || []);
      console.log("Successfully set metrics:", metricsData?.length || 0, "records");
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