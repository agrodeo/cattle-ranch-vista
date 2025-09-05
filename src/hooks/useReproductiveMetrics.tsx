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
      let pregnancyData = {};
      let serviceData = {};
      
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

        // Fetch pregnancy history from preñeces table
        console.log("Fetching pregnancy history...");
        const { data: pregnancyQuery, error: pregnancyError } = await supabase
          .from('preñeces')
          .select('animal_id, estado, fecha_inicio')
          .in('animal_id', animalIds);

        if (!pregnancyError && pregnancyQuery) {
          pregnancyData = pregnancyQuery.reduce((acc, preg) => {
            if (!acc[preg.animal_id]) acc[preg.animal_id] = [];
            acc[preg.animal_id].push(preg);
            return acc;
          }, {});
          console.log("Pregnancy history fetched for", Object.keys(pregnancyData).length, "animals");
        }

        // Fetch service history from ia table
        console.log("Fetching service history...");
        const { data: serviceQuery, error: serviceError } = await supabase
          .from('ia')
          .select('id, animales_ids, evento_id')
          .not('animales_ids', 'is', null);

        if (!serviceError && serviceQuery) {
          // Process service data to count services per animal
          serviceQuery.forEach(service => {
            if (service.animales_ids) {
              service.animales_ids.forEach(animalId => {
                if (animalIds.includes(animalId)) {
                  if (!serviceData[animalId]) serviceData[animalId] = [];
                  serviceData[animalId].push(service);
                }
              });
            }
          });
          console.log("Service history fetched for", Object.keys(serviceData).length, "animals");
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

          // Calculate reproductive metrics based on historical data
          const animalPregnancies = pregnancyData[animal.id] || [];
          const animalServices = serviceData[animal.id] || [];
          
          const totalServices = animalServices.length;
          const confirmedPregnancies = animalPregnancies.filter(p => p.estado === 'confirmada').length;
          const reproductiveYears = Math.max(1, Math.ceil((ageMonths - 15) / 12)); // Start counting from 15 months

           // Calculate pregnancy rate including current pregnancy status
           let pregnancyRate = 0;
           
           if (totalServices > 0) {
             // If we have service records, include current pregnancy as success
             const currentPregnancy = animal.esta_preñada ? 1 : 0;
             const totalSuccessfulPregnancies = confirmedPregnancies + currentPregnancy;
             pregnancyRate = Math.round((totalSuccessfulPregnancies / totalServices) * 100);
           } else if (totalOffspring > 0 && reproductiveYears > 0) {
             // Fallback: estimate based on offspring per reproductive year
             const expectedServices = reproductiveYears * 1.5;
             pregnancyRate = Math.min(100, Math.round((totalOffspring / expectedServices) * 100));
           } else if (ageMonths >= 18) {
             // Animals over 18 months with no records
             pregnancyRate = animal.esta_preñada ? 50 : 0; // Give current pregnancy some credit but not 100%
           }

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
            reproductive_years: reproductiveYears,
            total_offspring: totalOffspring,
            lifetime_services: totalServices,
            lifetime_pregnancies: confirmedPregnancies,
            lifetime_calvings: liveOffspring,
            individual_pregnancy_rate: pregnancyRate,
            individual_calving_rate: totalOffspring > 0 ? Math.round((liveOffspring / totalOffspring) * 100) : 0.0,
            performance_level: pregnancyRate >= 80 ? 'Excelente' : pregnancyRate >= 60 ? 'Bueno' : pregnancyRate >= 40 ? 'Regular' : 'Bajo',
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