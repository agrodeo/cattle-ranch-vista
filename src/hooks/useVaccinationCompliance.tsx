import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface VaccineCompliance {
  requirement_id: string;
  vaccine_name: string;
  vaccine_type: string;
  is_mandatory: boolean;
  doses_required: number;
  doses_given: number;
  last_vaccination_date: string | null;
  next_due_date: string | null;
  status: 'not_started' | 'incomplete' | 'complete' | 'overdue' | 'due_soon';
  is_overdue: boolean;
  days_overdue: number;
  description: string | null;
}

export interface AnimalVaccinationCompliance {
  animal_id: string;
  animal_tag: string;
  animal_name: string | null;
  age_months: number;
  vaccines: VaccineCompliance[];
}

export interface HerdVaccinationStats {
  total_animals: number;
  fully_compliant: number;
  partially_compliant: number;
  non_compliant: number;
  animals_with_overdue: number;
  animals_due_soon: number;
  overall_compliance_percentage: number;
  vaccine_stats: {
    vaccine_name: string;
    vaccine_type: string;
    is_mandatory: boolean;
    animals_complete: number;
    animals_incomplete: number;
    animals_not_started: number;
    coverage_percentage: number;
  }[];
}

export function useVaccinationCompliance() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const getAnimalCompliance = async (animalId: string): Promise<AnimalVaccinationCompliance | null> => {
    try {
      setLoading(true);
      
      // Get current user's cabaña
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('cabaña_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      const cabanaId = (profile as any)?.cabaña_id;
      if (!cabanaId) throw new Error('No se pudo obtener la cabaña del usuario');

      // Call RPC function
      const { data, error } = await supabase.rpc('get_vaccination_compliance', {
        _animal_id: animalId,
        _cabana_id: cabanaId
      });

      if (error) throw error;
      
      return data as unknown as AnimalVaccinationCompliance;
    } catch (error) {
      console.error('Error fetching animal compliance:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el estado de vacunación del animal"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getHerdStats = async (): Promise<HerdVaccinationStats | null> => {
    try {
      setLoading(true);
      
      // Get current user's cabaña
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('cabaña_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      const cabanaId = (profile as any)?.cabaña_id;
      if (!cabanaId) throw new Error('No se pudo obtener la cabaña del usuario');

      // Call RPC function
      const { data, error } = await supabase.rpc('get_herd_vaccination_stats', {
        _cabana_id: cabanaId
      });

      if (error) throw error;
      
      return data as unknown as HerdVaccinationStats;
    } catch (error) {
      console.error('Error fetching herd stats:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar las estadísticas de vacunación"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const recordVaccination = async (
    animalIds: string[],
    requirementId: string,
    vaccineName: string,
    date: string,
    lot?: string,
    dose?: string,
    route?: string,
    doseNumber: number = 1
  ) => {
    try {
      setLoading(true);

      // Get current user's cabaña
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('cabaña_id')
        .eq('user_id', user.id)
        .single();

      if (profileError) throw profileError;
      const cabanaId = (profile as any)?.cabaña_id;
      if (!cabanaId) throw new Error('No se pudo obtener la cabaña del usuario');

      // Insert vaccination records
      const records = animalIds.map(animalId => ({
        animal_id: animalId,
        cabaña_id: cabanaId,
        vaccine_code: vaccineName,
        date,
        lot,
        dose,
        route,
        dose_number: doseNumber,
        requirement_id: requirementId,
        created_by: user.id
      }));

      const { error } = await supabase
        .from('animal_vaccines')
        .insert(records);

      if (error) throw error;

      toast({
        title: "Vacunación registrada",
        description: `Se registró la vacunación para ${animalIds.length} animales`
      });

      return true;
    } catch (error) {
      console.error('Error recording vaccination:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la vacunación"
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    getAnimalCompliance,
    getHerdStats,
    recordVaccination,
    loading
  };
}
