export interface AnimalReproductiveData {
  id: string;
  id_tag: string;
  name?: string;
  birth_date?: string;
  esta_preñada: boolean;
  fecha_ultima_preñez?: string;
  fecha_probable_parto?: string;
  sex: string;
  status: string;
  corral_id?: string;
}

export interface OffspringRecord {
  id: string;
  mother_id?: string;
  father_id?: string;
  status: string;
}

export interface PregnancyRecord {
  animal_id: string;
  estado: string;
  fecha_inicio: string;
}

export interface ServiceRecord {
  id: string;
  animales_ids: string[];
  evento_id: string;
}

export interface ReproductiveYearData {
  year: number;
  age_at_start: number;
  was_active: boolean;
  services_count: number;
  pregnancies_confirmed: number;
  calving_occurred: boolean;
  current_pregnancy?: boolean;
}

export interface ReproductiveCalculationResult {
  pregnancy_rate: number;
  calving_rate: number;
  reproductive_years: number;
  total_services: number;
  total_pregnancies: number;
  total_calvings: number;
  performance_level: string;
  calculation_method: string;
}

export interface ReproductiveMetric {
  animal_id: string;
  tag: string;
  name?: string;
  age_months: number;
  category: string;
  corral_id?: string;
  corral_name?: string;
  is_pregnant: boolean;
  pregnancy_date?: string;
  expected_calving_date?: string;
  last_service_date?: string;
  days_open?: number;
  reproductive_years: number;
  total_offspring: number;
  lifetime_services: number;
  lifetime_pregnancies: number;
  lifetime_calvings: number;
  individual_pregnancy_rate: number;
  individual_calving_rate: number;
  performance_level: string;
  active_alerts: number;
  alert_types: string[];
}

export interface ReproductiveAlert {
  id: string;
  animal_id: string;
  alert_type: string;
  alert_date: string;
  expected_date?: string;
  days_overdue: number;
  status: string;
  notes?: string;
}

export interface Filters {
  [key: string]: any;
  corral_ids?: string[];
  performance?: string;
  alert_status?: string;
  include_sold_dead?: boolean;
}