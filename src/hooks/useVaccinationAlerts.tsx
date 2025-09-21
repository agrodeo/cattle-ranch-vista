import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VaccinationAlert {
  requirement_id: string;
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

export function useVaccinationAlerts(animalId: string) {
  const [alerts, setAlerts] = useState<VaccinationAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchAlerts = async () => {
    if (!animalId) return;
    
    try {
      setLoading(true);
      console.log('🔍 Fetching vaccination alerts for animal:', animalId);
      
      // Get user's cabana_id to fetch only user-configured alerts
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('❌ No authenticated user');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profileError || !profile) {
        console.error('❌ No profile found for user:', profileError);
        return;
      }

      const cabanaId = profile.cabaña_id;
      if (!cabanaId) {
        console.error('❌ No cabaña found for user');
        return;
      }

      console.log('✅ Using cabaña_id:', cabanaId);
      
      const { data, error } = await supabase.rpc('get_vaccination_alerts_for_animal', {
        _animal_id: animalId,
        _cabaña_id: cabanaId
      });

      if (error) {
        console.error('❌ RPC error:', error);
        throw error;
      }

      console.log('✅ Received alerts:', data?.length || 0);

      // Type assertion to ensure status is correctly typed
      const typedAlerts = (data || []).map(alert => ({
        ...alert,
        status: alert.status as 'missing' | 'overdue' | 'due_soon' | 'up_to_date'
      }));
      
      setAlerts(typedAlerts);
    } catch (error) {
      console.error("💥 Error fetching vaccination alerts:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las alertas de vacunación",
      });
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [animalId]);

  return {
    alerts,
    loading,
    refresh: fetchAlerts,
  };
}