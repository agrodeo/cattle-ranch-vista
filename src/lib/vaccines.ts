import { supabase } from '@/integrations/supabase/client';

export interface VaccineRule {
  vaccine_code: string;
  vaccine_name: string;
  mandatory: boolean;
  one_time: boolean;
  booster_interval_days: number | null;
  coverage_window_days: number;
  sex: string;
  min_age_days: number;
  max_age_days: number | null;
  category: string;
  pregnancy_ok: boolean;
  notes: string;
  campaign_windows: any;
}

export interface AnimalSnapshot {
  id: string;
  sex: 'Macho' | 'Hembra';
  birth_date: string;
  ageMonths: number;
  status: 'activo' | 'vendido' | 'muerto';
  category?: 'ternero' | 'ternera' | 'vaquillona' | 'vaca' | 'toro' | 'novillo';
  lastVaccines?: Record<string, string | null>;
  esta_preñada?: boolean;
}

/**
 * Get compiled vaccine rules for a specific ranch
 */
export async function getVaccineRulesForRanch(cabanaId: string): Promise<VaccineRule[]> {
  try {
    const { data, error } = await supabase.rpc('compile_rules_for_ranch', {
      _cabana_id: cabanaId
    });

    if (error) {
      console.error('Error fetching vaccine rules:', error);
      return [];
    }

    return (data || []).map((rule: any) => ({
      ...rule,
      campaign_windows: Array.isArray(rule.campaign_windows) 
        ? rule.campaign_windows 
        : rule.campaign_windows ? [rule.campaign_windows] : []
    }));
  } catch (error) {
    console.error('Error in getVaccineRulesForRanch:', error);
    return [];
  }
}

/**
 * Get due vaccines for a specific animal
 */
export async function getDueVaccinesForAnimal(animalId: string) {
  try {
    const { data, error } = await supabase.rpc('compute_due_vaccines_for_animal', {
      _animal_id: animalId
    });

    if (error) {
      console.error('Error fetching due vaccines:', error);
      return { due_vaccines: [], animal_status: 'error' };
    }

    return data || { due_vaccines: [], animal_status: 'unknown' };
  } catch (error) {
    console.error('Error in getDueVaccinesForAnimal:', error);
    return { due_vaccines: [], animal_status: 'error' };
  }
}

/**
 * Check if a vaccine is applicable to an animal based on rules
 */
export function isVaccineApplicable(animal: AnimalSnapshot, rule: VaccineRule): boolean {
  const animalSex = animal.sex === 'Hembra' ? 'F' : animal.sex === 'Macho' ? 'M' : 'ANY';
  
  // Check sex restriction
  if (rule.sex !== 'ANY' && rule.sex !== animalSex) {
    return false;
  }
  
  // Check age restrictions
  const ageDays = animal.ageMonths * 30.44; // approximate conversion
  if (ageDays < rule.min_age_days) {
    return false;
  }
  
  if (rule.max_age_days && ageDays > rule.max_age_days) {
    return false;
  }
  
  // Check pregnancy restriction
  if (!rule.pregnancy_ok && animal.esta_preñada) {
    return false;
  }
  
  // Check status
  if (animal.status !== 'activo') {
    return false;
  }
  
  return true;
}

/**
 * Calculate next due date for a vaccine based on last vaccination and rule
 */
export function calculateNextDueDate(
  lastVaccinationDate: Date | null, 
  rule: VaccineRule, 
  animalBirthDate: Date
): Date | null {
  if (rule.one_time && lastVaccinationDate) {
    return null; // One-time vaccines don't have a next due date if already given
  }
  
  if (!rule.booster_interval_days) {
    return null; // No booster schedule defined
  }
  
  const baseDate = lastVaccinationDate || animalBirthDate;
  const nextDue = new Date(baseDate);
  nextDue.setDate(nextDue.getDate() + rule.booster_interval_days);
  
  return nextDue;
}