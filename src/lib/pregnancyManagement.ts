import { supabase } from "@/integrations/supabase/client";

export interface PregnancyState {
  id: string;
  animal_id: string;
  estado_final: 'activa' | 'exitosa' | 'fallida';
  fecha_inicio: string;
  fecha_estimada_parto?: string;
  fecha_finalizacion?: string;
  motivo_finalizacion?: string;
  cria_id?: string;
}

export const markPregnancyAsFailed = async (pregnancyId: string, reason: string = 'perdida_prenez') => {
  const { data, error } = await supabase.rpc('mark_pregnancy_failed', {
    _pregnancy_id: pregnancyId,
    _reason: reason
  });
  
  if (error) {
    console.error('Error marking pregnancy as failed:', error);
    throw error;
  }
  
  return data;
};

export const getPregnancyHistoryForAnimal = async (animalId: string) => {
  const { data, error } = await supabase
    .from('preñeces')
    .select('*')
    .eq('animal_id', animalId)
    .order('fecha_inicio', { ascending: false });
    
  if (error) {
    console.error('Error fetching pregnancy history:', error);
    throw error;
  }
  
  const pregnancies = data || [];
  
  return {
    active_pregnancies: pregnancies.filter(p => p.estado_final === 'activa').length,
    successful_pregnancies: pregnancies.filter(p => p.estado_final === 'exitosa').length,
    failed_pregnancies: pregnancies.filter(p => p.estado_final === 'fallida').length,
    total_pregnancies: pregnancies.length,
    pregnancies
  };
};

export const checkOverduePregnancies = async () => {
  const { error } = await supabase.rpc('check_overdue_pregnancies');
  
  if (error) {
    console.error('Error checking overdue pregnancies:', error);
    throw error;
  }
};

// Calculate reproductive rates based on pregnancy history
export const calculateReproductiveRates = (pregnancyHistory: any, reproductiveYears: number) => {
  const { successful_pregnancies, failed_pregnancies } = pregnancyHistory;
  
  // Pregnancy rate = (successful + failed) / reproductive years * 100
  const pregnancyRate = reproductiveYears > 0 
    ? Math.round(((successful_pregnancies + failed_pregnancies) / reproductiveYears) * 100)
    : 0;
    
  // Calving rate = successful / (successful + failed) * 100
  const totalCompletedPregnancies = successful_pregnancies + failed_pregnancies;
  const calvingRate = totalCompletedPregnancies > 0 
    ? Math.round((successful_pregnancies / totalCompletedPregnancies) * 100)
    : 0;
    
  return {
    pregnancyRate,
    calvingRate,
    completedPregnancies: totalCompletedPregnancies
  };
};