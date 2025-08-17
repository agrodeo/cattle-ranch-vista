import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VaccinationAlert {
  scheme_id: string;
  vaccine_name: string;
  vaccine_type: string;
  is_mandatory: boolean;
  status: 'missing' | 'overdue' | 'due_soon' | 'up_to_date';
  days_since_last?: number;
  days_until_due?: number;
  last_vaccination_date?: string;
  next_due_date?: string;
  description: string;
}

export function useVaccinationAlerts(animalId: string, country: string = 'Argentina') {
  const [alerts, setAlerts] = useState<VaccinationAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAlerts = async () => {
    if (!animalId) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase.rpc('get_vaccination_alerts_for_animal', {
        _animal_id: animalId,
        _country: country
      });

      if (error) throw error;

      // Type assertion to ensure status is correctly typed
      const typedAlerts = (data || []).map(alert => ({
        ...alert,
        status: alert.status as 'missing' | 'overdue' | 'due_soon' | 'up_to_date'
      }));
      
      setAlerts(typedAlerts);
    } catch (error) {
      console.error("Error fetching vaccination alerts:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las alertas de vacunación",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [animalId, country]);

  return {
    alerts,
    loading,
    refresh: fetchAlerts,
  };
}