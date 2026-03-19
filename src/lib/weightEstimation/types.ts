export interface WeightEstimation {
  estimatedWeight: number;
  confidencePercent: number;
  confidenceRange: number; // ± kg
  daysSinceLastWeigh: number | null;
  needsWeighing: boolean;
  dataSources: string[];
  layer1Available: boolean;
  hasAnomaly: boolean;
  pregnancyOffset: number;
}

export interface BreedGrowthParams {
  A: number;       // asymptotic weight (kg)
  K: number;       // growth rate constant
  t_inflection: number; // inflection point (days)
}

export interface WeightRecord {
  id: string;
  fecha: string;
  peso: number;
  ganancia_diaria?: number;
  edad_dias?: number;
  tipo_pesaje?: string;
  peso_anterior?: number;
  dias_desde_ultimo?: number;
}

export interface AnimalWeightInput {
  id: string;
  peso_actual_kg?: number | null;
  peso_nacimiento?: number | null;
  birth_date?: string | null;
  breed?: string | null;
  sex?: string | null;
  fecha_ultimo_pesaje?: string | null;
  esta_preñada?: boolean | null;
  fecha_probable_parto?: string | null;
  ganancia_diaria_kg?: number | null;
}
