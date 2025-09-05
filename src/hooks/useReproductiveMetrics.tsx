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

      // TEMPORARY: Call the function directly with the hardcoded cabaña ID until we fix the root issue
      console.log("Calling direct query as workaround...");
      const { data: metricsData, error: metricsError } = await supabase
        .from('animals')
        .select('id, id_tag, name, birth_date, esta_preñada, fecha_ultima_preñez, fecha_probable_parto, sex, status, corral_id')
        .eq('cabaña_id', '26a4288b-0ab5-4abf-b88c-25de5dca0273')
        .eq('sex', 'Hembra')
        .neq('status', 'vendido')
        .neq('status', 'muerto');

      if (metricsError) {
        console.error("Database error:", metricsError);
        throw metricsError;
      }

      console.log("Raw animal data received:", metricsData);

      // Fetch offspring data for all animals in one query
      const animalIds = metricsData?.map((animal: any) => animal.id) || [];
      let offspringData = {};
      
      if (animalIds.length > 0) {
        console.log("Fetching offspring for", animalIds.length, "animals");
        const { data: offspringQuery, error: offspringError } = await supabase
          .from('animals')
          .select('id, mother_id, father_id, status')
          .or(animalIds.map(id => `mother_id.eq.${id}`).join(','));

        if (offspringError) {
          console.error("Error fetching offspring:", offspringError);
        } else {
          // Group offspring by mother
          offspringData = (offspringQuery || []).reduce((acc, child) => {
            if (child.mother_id) {
              if (!acc[child.mother_id]) acc[child.mother_id] = [];
              acc[child.mother_id].push(child);
            }
            return acc;
          }, {});
          console.log("Offspring data fetched:", Object.keys(offspringData).length, "mothers have offspring");
        }
      }

      // Transform the data to match the expected format
      const transformedData = metricsData
        ?.filter((animal: any) => {
          if (!animal.birth_date) return true; // Include animals without birth date
          const ageMonths = (new Date().getFullYear() - new Date(animal.birth_date).getFullYear()) * 12 + 
                           (new Date().getMonth() - new Date(animal.birth_date).getMonth());
          return ageMonths >= 15;
        })
        .map((animal: any) => {
          const ageMonths = animal.birth_date 
            ? (new Date().getFullYear() - new Date(animal.birth_date).getFullYear()) * 12 + 
              (new Date().getMonth() - new Date(animal.birth_date).getMonth())
            : 24;

          // Calculate offspring data
          const animalOffspring = offspringData[animal.id] || [];
          const totalOffspring = animalOffspring.length;
          const liveOffspring = animalOffspring.filter(child => child.status !== 'muerto').length;

          return {
            animal_id: animal.id,
            tag: animal.id_tag || '',
            name: animal.name || '',
            age_months: ageMonths,
            category: ageMonths < 12 ? 'Ternera' : ageMonths < 24 ? 'Vaquillona' : 'Vaca',
            corral_id: animal.corral_id,
            corral_name: 'Sin corral',
            is_pregnant: animal.esta_preñada || false,
            pregnancy_date: animal.fecha_ultima_preñez,
            expected_calving_date: animal.fecha_probable_parto,
            last_service_date: null,
            days_open: 0,
            reproductive_years: Math.max(1, Math.ceil(ageMonths / 12)),
            total_offspring: totalOffspring,
            lifetime_services: 0,
            lifetime_pregnancies: animal.esta_preñada ? 1 : 0,
            lifetime_calvings: liveOffspring, // Live offspring as calvings
            individual_pregnancy_rate: animal.esta_preñada ? 100.0 : 0.0,
            individual_calving_rate: totalOffspring > 0 ? Math.round((liveOffspring / totalOffspring) * 100) : 0.0,
            performance_level: totalOffspring >= 3 ? 'Excelente' : totalOffspring >= 1 ? 'Bueno' : 'Bajo',
            active_alerts: 0,
            alert_types: []
          };
        }) || [];

      console.log("Transformed metrics data with offspring:", transformedData);

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

      setMetrics(transformedData || []);
      setAlerts(alertsData || []);
      console.log("Successfully set metrics:", transformedData?.length || 0, "records");
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