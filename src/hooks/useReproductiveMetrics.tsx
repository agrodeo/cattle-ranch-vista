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

      // Fetch female animals
      const { data: animalData, error: animalError } = await supabase
        .from('animals')
        .select('id, id_tag, name, birth_date, esta_preñada, fecha_ultima_preñez, fecha_probable_parto, sex, status, corral_id')
        .eq('cabaña_id', cabanaInfo)
        .eq('sex', 'Hembra')
        .neq('status', 'vendido')
        .neq('status', 'muerto');

      if (animalError) {
        console.error("Database error:", animalError);
        throw animalError;
      }

      console.log("Raw animal data received:", animalData);

      // Fetch all related data in parallel
      const animalIds = animalData?.map((animal: any) => animal.id) || [];
      
      if (animalIds.length === 0) {
        setMetrics([]);
        setAlerts([]);
        return;
      }

      const [offspringResponse, pregnancyResponse, serviceResponse, alertsResponse] = await Promise.all([
        // Fetch offspring data
        supabase
          .from('animals')
          .select('id, mother_id, father_id, status')
          .or(animalIds.map(id => `mother_id.eq.${id}`).join(',')),
        
        // Fetch pregnancy history
        supabase
          .from('preñeces')
          .select('animal_id, estado, fecha_inicio')
          .in('animal_id', animalIds),
        
        // Fetch service history
        supabase
          .from('ia')
          .select('id, animales_ids, evento_id')
          .not('animales_ids', 'is', null),
        
        // Fetch active alerts
        supabase
          .from('reproductive_alerts')
          .select('*')
          .eq('status', 'pending')
          .order('days_overdue', { ascending: false })
      ]);

      // Process offspring data
      const offspringData: Record<string, OffspringRecord[]> = {};
      if (!offspringResponse.error && offspringResponse.data) {
        offspringResponse.data.forEach((child: any) => {
          if (child.mother_id) {
            if (!offspringData[child.mother_id]) offspringData[child.mother_id] = [];
            offspringData[child.mother_id].push(child);
          }
        });
      }

      // Process pregnancy data
      const pregnancyData: Record<string, PregnancyRecord[]> = {};
      if (!pregnancyResponse.error && pregnancyResponse.data) {
        pregnancyResponse.data.forEach((preg: any) => {
          if (!pregnancyData[preg.animal_id]) pregnancyData[preg.animal_id] = [];
          pregnancyData[preg.animal_id].push(preg);
        });
      }

      // Process service data
      const serviceData: Record<string, ServiceRecord[]> = {};
      if (!serviceResponse.error && serviceResponse.data) {
        serviceResponse.data.forEach((service: any) => {
          if (service.animales_ids) {
            service.animales_ids.forEach((animalId: string) => {
              if (animalIds.includes(animalId)) {
                if (!serviceData[animalId]) serviceData[animalId] = [];
                serviceData[animalId].push(service);
              }
            });
          }
        });
      }

      // Transform data using new calculation logic
      const transformedData = animalData
        ?.filter((animal: any) => {
          const ageMonths = calculateAgeInMonths(animal.birth_date);
          return ageMonths >= 15; // Only include animals in reproductive age
        })
        .map((animal: any) => {
          const ageMonths = calculateAgeInMonths(animal.birth_date);
          const category = getAnimalCategory(ageMonths);
          
          // Get related data for this animal
          const animalOffspring = offspringData[animal.id] || [];
          const animalPregnancies = pregnancyData[animal.id] || [];
          const animalServices = serviceData[animal.id] || [];
          
          // Calculate reproductive metrics using new logic
          const reproductiveResult = calculatePregnancyRate(
            animal,
            animalPregnancies,
            animalServices,
            animalOffspring
          );
          
          // Validate data and log warnings
          const warnings = validateReproductiveData(
            animal,
            animalPregnancies,
            animalServices,
            animalOffspring
          );
          
          if (warnings.length > 0) {
            console.warn(`Data warnings for animal ${animal.id_tag}:`, warnings);
          }

          const metric: ReproductiveMetric = {
            animal_id: animal.id,
            tag: animal.id_tag || '',
            name: animal.name || '',
            age_months: ageMonths,
            category: category,
            corral_id: animal.corral_id,
            corral_name: 'Sin corral', // TODO: Fetch actual corral names
            is_pregnant: animal.esta_preñada || false,
            pregnancy_date: animal.fecha_ultima_preñez,
            expected_calving_date: animal.fecha_probable_parto,
            last_service_date: null, // TODO: Calculate from service records
            days_open: 0, // TODO: Calculate based on last calving
            reproductive_years: reproductiveResult.reproductive_years,
            total_offspring: animalOffspring.length,
            lifetime_services: reproductiveResult.total_services,
            lifetime_pregnancies: reproductiveResult.total_pregnancies,
            lifetime_calvings: reproductiveResult.total_calvings,
            individual_pregnancy_rate: reproductiveResult.pregnancy_rate,
            individual_calving_rate: reproductiveResult.calving_rate,
            performance_level: reproductiveResult.performance_level,
            active_alerts: 0, // TODO: Count alerts for this animal
            alert_types: [] // TODO: Get alert types for this animal
          };

          return metric;
        }) || [];

      console.log("Transformed metrics with new calculation logic:", transformedData);

      setMetrics(transformedData);
      setAlerts(alertsResponse.data || []);
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