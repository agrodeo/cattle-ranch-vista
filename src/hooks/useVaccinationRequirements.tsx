import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface VaccinationRequirement {
  id: string;
  vaccine_name: string;
  vaccine_type: string;
  description?: string;
  is_mandatory: boolean;
  sex_restriction?: string | null;
  min_age_months?: number;
  max_age_months?: number;
  frequency_months?: number;
  doses_required?: number;
  interval_between_doses_days?: number;
  country: string;
  is_active: boolean;
}

export interface VaccinationStatus {
  requirement_id: string;
  vaccine_name: string;
  vaccine_type: string;
  is_mandatory: boolean;
  status: string;
  last_vaccination_date?: string;
  next_due_date?: string;
  days_overdue?: number;
}

const getCurrentCabanaId = async (): Promise<string> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.error('❌ No authenticated user found');
      throw new Error('Usuario no autenticado');
    }

    console.log('👤 Getting cabaña for user:', user.id);

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('cabaña_id')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('❌ Error fetching profile:', error);
      throw error;
    }
    
    if (!profile || !profile['cabaña_id']) {
      console.error('❌ No cabaña_id found for user profile');
      throw new Error('No se pudo obtener la cabaña del usuario');
    }
    
    console.log('✅ Found cabaña_id:', profile['cabaña_id']);
    return profile['cabaña_id'];
  } catch (error) {
    console.error('💥 Error in getCurrentCabanaId:', error);
    throw error;
  }
};

export function useVaccinationRequirements() {
  const [requirements, setRequirements] = useState<VaccinationRequirement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching vaccination requirements...');
      
      const cabanaId = await getCurrentCabanaId();
      
      const { data, error } = await supabase
        .from('cabaña_vaccination_requirements')
        .select('*')
        .eq('cabaña_id', cabanaId)
        .eq('is_active', true)
        .order('is_mandatory', { ascending: false })
        .order('vaccine_name');

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      }
      
      console.log(`✅ [VaccinationRequirements] Loaded ${data?.length || 0} requirements for cabaña ${cabanaId}`);
      setRequirements(data || []);
    } catch (error) {
      console.error('💥 Error fetching vaccination requirements:', error);
      if (error.message.includes('Usuario no autenticado')) {
        toast.error('Debes iniciar sesión para acceder a las vacunas');
      } else if (error.message.includes('No se pudo obtener la cabaña')) {
        toast.error('No se pudo encontrar tu cabaña. Contacta al administrador.');
      } else {
        toast.error('Error al cargar los requisitos de vacunación');
      }
      setRequirements([]);
    } finally {
      setLoading(false);
    }
  };

  const createRequirement = async (requirementData: Omit<VaccinationRequirement, 'id' | 'is_active'>) => {
    try {
      const cabanaId = await getCurrentCabanaId();
      
      const { error } = await supabase
        .from('cabaña_vaccination_requirements')
        .insert({
          'cabaña_id': cabanaId,
          vaccine_name: requirementData.vaccine_name,
          vaccine_type: requirementData.vaccine_type,
          description: requirementData.description || null,
          is_mandatory: requirementData.is_mandatory,
          sex_restriction: requirementData.sex_restriction || null,
          min_age_months: requirementData.min_age_months || null,
          max_age_months: requirementData.max_age_months || null,
          frequency_months: requirementData.frequency_months || null,
          country: requirementData.country,
          is_active: true
        });

      if (error) throw error;
      toast.success('Requisito de vacunación creado');
      fetchRequirements();
      return true;
    } catch (error) {
      console.error('Error creating vaccination requirement:', error);
      toast.error('Error al crear el requisito de vacunación');
      return false;
    }
  };

  const updateRequirement = async (id: string, requirementData: Partial<VaccinationRequirement>) => {
    try {
      const { error } = await supabase
        .from('cabaña_vaccination_requirements')
        .update(requirementData)
        .eq('id', id);

      if (error) throw error;
      toast.success('Requisito de vacunación actualizado');
      fetchRequirements();
      return true;
    } catch (error) {
      console.error('Error updating vaccination requirement:', error);
      toast.error('Error al actualizar el requisito de vacunación');
      return false;
    }
  };

  const deleteRequirement = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cabaña_vaccination_requirements')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;
      toast.success('Requisito de vacunación eliminado');
      fetchRequirements();
      return true;
    } catch (error) {
      console.error('Error deleting vaccination requirement:', error);
      toast.error('Error al eliminar el requisito de vacunación');
      return false;
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  return {
    requirements,
    loading,
    fetchRequirements,
    createRequirement,
    updateRequirement,
    deleteRequirement,
  };
}

export function useAnimalVaccinationStatus(animalId?: string) {
  const [status, setStatus] = useState<VaccinationStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVaccinationStatus = async (id: string) => {
    if (!id) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_animal_vaccination_status', {
          _animal_id: id,
          _cabaña_id: await getCurrentCabanaId()
        });

      if (error) throw error;
      setStatus(data || []);
    } catch (error) {
      console.error('Error fetching vaccination status:', error);
      toast.error('Error al obtener el estado de vacunación');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    if (animalId) {
      fetchVaccinationStatus(animalId);
    }
  }, [animalId]);

  return {
    status,
    loading,
    fetchVaccinationStatus,
  };
}