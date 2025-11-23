// Simplified vaccine library - only interfaces and types
// All logic is now handled by database RPC functions

export interface VaccineRequirement {
  id: string;
  cabaña_id: string;
  vaccine_code: string;
  vaccine_name: string;
  vaccine_type: string;
  description?: string;
  is_mandatory: boolean;
  sex_restriction?: 'Macho' | 'Hembra' | null;
  min_age_months?: number;
  max_age_months?: number;
  frequency_months?: number;
  doses_required: number;
  interval_between_doses_days?: number;
  country: string;
  is_active: boolean;
}

export interface AnimalVaccine {
  id: string;
  animal_id: string;
  cabaña_id: string;
  requirement_id?: string;
  vaccine_code: string;
  date: string;
  dose_number: number;
  lot?: string;
  dose?: string;
  route?: string;
  next_due?: string;
  is_complete: boolean;
  created_by: string;
  created_at: string;
}

export interface VaccinationAlert {
  id: string;
  animal_id: string;
  cabaña_id: string;
  requirement_id: string;
  alert_type: 'overdue' | 'due_soon' | 'missing';
  alert_date: string;
  days_overdue?: number;
  resolved_at?: string;
}
