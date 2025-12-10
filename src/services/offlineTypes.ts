// Offline cache type definitions for all entities
export type SyncStatus = 'pending' | 'failed' | 'failed_permanent' | 'synced';

export interface BaseCachedEntity {
  id: string;
  cabaña_id: string;
  updated_at: string;
  sync_status?: SyncStatus;
}

// Animals
export interface CachedAnimal extends BaseCachedEntity {
  id_tag?: string;
  name?: string;
  sex: 'Macho' | 'Hembra';
  birth_date?: string | null;
  status: 'activo' | 'vendido' | 'muerto';
  breed?: string;
  father_id?: string;
  mother_id?: string;
  corral_id?: string;
  peso_actual_kg?: number;
  peso_nacimiento?: number;
  peso_destete?: number;
  ganancia_diaria_kg?: number;
  esta_preñada?: boolean;
  fecha_probable_parto?: string;
  is_castrated?: boolean;
}

// Corrales
export interface CachedCorral extends BaseCachedEntity {
  name: string;
  capacity?: number;
  hectareas?: number;
  user_id?: string;
}

// Cabañas
export interface CachedCabaña {
  id: string;
  name: string;
  owner_id?: string;
  location?: string;
  country_code?: string;
  province_code?: string;
  language?: string;
}

// Events/Activities
export interface CachedEvento extends BaseCachedEntity {
  tipo: string;
  fecha: string;
  creado_por: string;
  notas?: string;
  payload?: any;
}

// Vaccinations
export interface CachedVaccine extends BaseCachedEntity {
  animal_id: string;
  vaccine_code: string;
  date: string;
  dose?: string;
  dose_number?: number;
  lot?: string;
  route?: string;
  next_due?: string;
  is_complete?: boolean;
  requirement_id?: string;
  created_by: string;
}

// Weight History
export interface CachedWeight extends BaseCachedEntity {
  animal_id: string;
  fecha: string;
  peso_kg: number;
  tipo_pesaje?: string;
  evento_id?: string;
  notas?: string;
  ganancia_diaria?: number;
  peso_anterior?: number;
  dias_desde_ultimo_pesaje?: number;
  edad_dias?: number;
}

// Artificial Inseminations
export interface CachedInsemination extends BaseCachedEntity {
  female_id: string;
  bull_id?: string;
  bull_name: string;
  insemination_date: string;
  is_pregnant?: boolean;
  notes?: string;
  created_by?: string;
}

// Pregnancies
export interface CachedPregnancy extends BaseCachedEntity {
  animal_id: string;
  fecha_inicio: string;
  fecha_estimada_parto?: string;
  estado: string;
  origen: string;
  tipo?: string;
  notas?: string;
  evento_id?: string;
  fecha_deteccion?: string;
  dias_gestacion?: number;
}

// Finances
export interface CachedFinance extends BaseCachedEntity {
  type?: string;
  amount?: number;
  date?: string;
  description?: string;
  category_id?: string;
  buyer_name?: string;
  buyer_document?: string;
  buyer_destination?: string;
}

// Animal Sales
export interface CachedAnimalSale {
  id: string;
  finance_id: string;
  animal_id: string;
  unit_price?: number;
  sync_status?: SyncStatus;
}

// Vaccination Requirements
export interface CachedVaccRequirement extends BaseCachedEntity {
  vaccine_code: string;
  vaccine_name: string;
  vaccine_type: string;
  is_mandatory: boolean;
  is_active: boolean;
  country: string;
  min_age_months?: number;
  max_age_months?: number;
  sex_restriction?: string;
  doses_required?: number;
  frequency_months?: number;
  interval_between_doses_days?: number;
  description?: string;
}

// Death Records
export interface CachedDeathRecord extends BaseCachedEntity {
  animal_id: string;
  fecha_defuncion: string;
  causa_id?: string;
  causa_texto?: string;
  notas?: string;
  registrado_por: string;
  edad_dias?: number;
  edad_meses?: number;
}

// Death Causes
export interface CachedDeathCause extends BaseCachedEntity {
  nombre: string;
  activo: boolean;
  orden?: number;
}

// Custom Benchmarks
export interface CachedBenchmark extends BaseCachedEntity {
  breed?: string;
  birth_weight_excellent: number;
  birth_weight_good: number;
  birth_weight_poor: number;
  weaning_weight_excellent: number;
  weaning_weight_good: number;
  weaning_weight_poor: number;
  daily_gain_excellent: number;
  daily_gain_good: number;
  daily_gain_poor: number;
  final_weight_excellent?: number;
  final_weight_good?: number;
  final_weight_poor?: number;
}

// Corral Movements
export interface CachedCorralMovement extends BaseCachedEntity {
  animal_id: string;
  corral_anterior_id?: string;
  corral_nuevo_id?: string;
  fecha_movimiento: string;
  motivo?: string;
  registrado_por?: string;
}

// Sync Metadata
export interface SyncMetadata {
  id: string;
  table_name: string;
  last_sync_at: string;
  last_full_sync_at?: string;
}

// Outbox Event Types - All supported operations
export type OutboxEventType =
  // Animals
  | 'ANIMAL_INSERT'
  | 'ANIMAL_UPDATE'
  | 'ANIMAL_DELETE'
  // Corrales
  | 'CORRAL_INSERT'
  | 'CORRAL_UPDATE'
  | 'CORRAL_DELETE'
  | 'CORRAL_ASSIGN_ANIMAL'
  | 'CORRAL_REMOVE_ANIMAL'
  // Vaccinations
  | 'VACCINE_INSERT'
  | 'VACCINE_UPDATE'
  | 'VACCINE_DELETE'
  // Weights
  | 'WEIGHT_INSERT'
  | 'WEIGHT_UPDATE'
  | 'WEIGHT_DELETE'
  // Inseminations
  | 'INSEMINATION_INSERT'
  | 'INSEMINATION_UPDATE'
  | 'INSEMINATION_DELETE'
  // Pregnancies
  | 'PREGNANCY_INSERT'
  | 'PREGNANCY_UPDATE'
  // Finances
  | 'FINANCE_INSERT'
  | 'FINANCE_UPDATE'
  | 'FINANCE_DELETE'
  // Animal Sales
  | 'ANIMAL_SALE_INSERT'
  // Deaths
  | 'DEATH_RECORD_INSERT'
  // Events
  | 'EVENTO_INSERT'
  | 'EVENTO_UPDATE'
  // Corral Movements
  | 'CORRAL_MOVEMENT_INSERT';

export interface OutboxEvent {
  id: string;
  type: OutboxEventType;
  payload: any;
  tempIds?: Record<string, string>;
  createdAt: string;
  retries: number;
  status: SyncStatus;
  reason?: string;
}

export interface IdMap {
  tempId: string;
  realId: string;
}
