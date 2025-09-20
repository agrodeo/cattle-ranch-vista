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

export function useVaccinationRequirements() {
  const [requirements, setRequirements] = useState<VaccinationRequirement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequirements = async () => {
    try {
      const { data, error } = await supabase
        .from('cabaña_vaccination_requirements')
        .select('*')
        .eq('is_active', true)
        .order('is_mandatory', { ascending: false })
        .order('vaccine_name');

      if (error) throw error;
      setRequirements(data || []);
    } catch (error) {
      console.error('Error fetching vaccination requirements:', error);
      toast.error('Error al cargar los requisitos de vacunación');
    } finally {
      setLoading(false);
    }
  };

  const createRequirement = async (requirementData: Omit<VaccinationRequirement, 'id' | 'is_active'>) => {
    try {
      // Use RPC function to insert requirement
      const { error } = await supabase.rpc('create_vaccination_requirement', {
        p_vaccine_name: requirementData.vaccine_name,
        p_vaccine_type: requirementData.vaccine_type,
        p_description: requirementData.description || null,
        p_is_mandatory: requirementData.is_mandatory,
        p_sex_restriction: requirementData.sex_restriction || null,
        p_min_age_months: requirementData.min_age_months || null,
        p_max_age_months: requirementData.max_age_months || null,
        p_frequency_months: requirementData.frequency_months || null,
        p_country: requirementData.country
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

  const getCurrentCabanaId = async (): Promise<string> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Usuario no autenticado');

    const { data: cabanaInfo, error } = await supabase
      .rpc('get_user_cabana_info', { user_uuid: user.id });

    if (error) throw error;
    if (!cabanaInfo || cabanaInfo.length === 0) throw new Error('No se pudo obtener la cabaña del usuario');
    
    return cabanaInfo[0].cabana_id;
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