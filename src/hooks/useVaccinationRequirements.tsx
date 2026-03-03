import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isOnline } from "@/services/connectivity";

export interface VaccinationRequirement {
  id: string;
  vaccine_code: string;
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
  vaccine_code: string;
  vaccine_name: string;
  vaccine_type: string;
  is_mandatory: boolean;
  status: 'completa' | 'pendiente' | 'vencida' | 'no_aplicada';
  doses_given: number;
  doses_required: number;
  last_vaccination_date?: string;
  next_due_date?: string;
  days_overdue?: number;
  compliance_percentage: number;
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
  const { t } = useTranslation(['common']);
  const [requirements, setRequirements] = useState<VaccinationRequirement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequirements = async () => {
    if (!isOnline()) {
      console.log('📴 Offline — skipping vaccination requirements fetch');
      setLoading(false);
      return;
    }
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
      setRequirements((data || []) as VaccinationRequirement[]);
    } catch (error: any) {
      console.error('💥 Error fetching vaccination requirements:', error);
      // Silently fail — this is a background fetch, no need to interrupt the user
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
          vaccine_code: requirementData.vaccine_code,
          vaccine_name: requirementData.vaccine_name,
          vaccine_type: requirementData.vaccine_type,
          description: requirementData.description || null,
          is_mandatory: requirementData.is_mandatory,
          sex_restriction: requirementData.sex_restriction || null,
          min_age_months: requirementData.min_age_months || null,
          max_age_months: requirementData.max_age_months || null,
          frequency_months: requirementData.frequency_months || null,
          doses_required: requirementData.doses_required || 1,
          interval_between_doses_days: requirementData.interval_between_doses_days || null,
          country: requirementData.country,
          is_active: true
        });

      if (error) throw error;
      toast.success(t('common:success.created'));
      fetchRequirements();
      return true;
    } catch (error) {
      console.error('Error creating vaccination requirement:', error);
      toast.error(t('common:error.createFailed'));
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
      toast.success(t('common:success.updated'));
      fetchRequirements();
      return true;
    } catch (error) {
      console.error('Error updating vaccination requirement:', error);
      toast.error(t('common:error.updateFailed'));
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
      toast.success(t('common:success.deleted'));
      fetchRequirements();
      return true;
    } catch (error) {
      console.error('Error deleting vaccination requirement:', error);
      toast.error(t('common:error.deleteFailed'));
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
  const { t } = useTranslation(['common']);
  const [status, setStatus] = useState<VaccinationStatus[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchVaccinationStatus = async (id: string) => {
    if (!id) return;
    if (!isOnline()) {
      console.log('📴 Offline — skipping animal vaccination status fetch');
      return;
    }
    try {
      const cabanaId = await getCurrentCabanaId();
      const { data, error } = await supabase
        .rpc('calculate_vaccination_status' as any, {
          _animal_id: id,
          _cabana_id: cabanaId
        });

      if (error) throw error;
      setStatus((data || []) as VaccinationStatus[]);
    } catch (error: any) {
      console.error('Error fetching vaccination status:', error);
      // Silently fail for background fetches
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
