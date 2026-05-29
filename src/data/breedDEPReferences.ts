export interface BreedDEPRange {
  average: number;
  top25: number;
  top10: number;
}

export interface BreedDEPReference {
  breed: string;
  breedKey: string;
  source: string;
  year: number;
  values: {
    peso_nacer: BreedDEPRange;
    peso_destete: BreedDEPRange;
    peso_final: BreedDEPRange;
    leche: BreedDEPRange;
    circunferencia_escrotal: BreedDEPRange;
    area_ojo_bife?: BreedDEPRange;
    grasa_dorsal?: BreedDEPRange;
  };
}

/**
 * Approximate breed-average DEP references for common Argentine cattle breeds.
 * These are placeholder values intended to be replaced with official published
 * evaluations (ERA, Hereford Argentina, Brangus, etc.).
 */
export const BREED_DEP_REFERENCES: BreedDEPReference[] = [
  {
    breed: 'Angus',
    breedKey: 'angus',
    source: 'ERA - Evaluación de Reproductores Angus (INTA/AAA)',
    year: 2024,
    values: {
      peso_nacer: { average: 0, top25: -1.5, top10: -2.5 },
      peso_destete: { average: 0, top25: 12, top10: 18 },
      peso_final: { average: 0, top25: 18, top10: 28 },
      leche: { average: 0, top25: 5, top10: 8 },
      circunferencia_escrotal: { average: 0, top25: 1.0, top10: 1.8 },
      area_ojo_bife: { average: 0, top25: 2.5, top10: 4.0 },
      grasa_dorsal: { average: 0, top25: 0.3, top10: 0.5 },
    },
  },
  {
    breed: 'Hereford',
    breedKey: 'hereford',
    source: 'Evaluación Genética Hereford Argentina',
    year: 2024,
    values: {
      peso_nacer: { average: 0, top25: -1.2, top10: -2.0 },
      peso_destete: { average: 0, top25: 10, top10: 16 },
      peso_final: { average: 0, top25: 16, top10: 25 },
      leche: { average: 0, top25: 4, top10: 7 },
      circunferencia_escrotal: { average: 0, top25: 0.8, top10: 1.5 },
      area_ojo_bife: { average: 0, top25: 2.0, top10: 3.5 },
      grasa_dorsal: { average: 0, top25: 0.2, top10: 0.4 },
    },
  },
  {
    breed: 'Braford',
    breedKey: 'braford',
    source: 'Asociación Braford Argentina',
    year: 2024,
    values: {
      peso_nacer: { average: 0, top25: -1.0, top10: -1.8 },
      peso_destete: { average: 0, top25: 11, top10: 17 },
      peso_final: { average: 0, top25: 15, top10: 24 },
      leche: { average: 0, top25: 4, top10: 6 },
      circunferencia_escrotal: { average: 0, top25: 0.7, top10: 1.3 },
    },
  },
  {
    breed: 'Brangus',
    breedKey: 'brangus',
    source: 'Asociación Argentina de Brangus',
    year: 2024,
    values: {
      peso_nacer: { average: 0, top25: -1.3, top10: -2.2 },
      peso_destete: { average: 0, top25: 11, top10: 17 },
      peso_final: { average: 0, top25: 17, top10: 26 },
      leche: { average: 0, top25: 4.5, top10: 7 },
      circunferencia_escrotal: { average: 0, top25: 0.9, top10: 1.6 },
    },
  },
  {
    breed: 'Limousin',
    breedKey: 'limousin',
    source: 'Asociación Argentina de Limousin',
    year: 2024,
    values: {
      peso_nacer: { average: 0, top25: -1.0, top10: -1.8 },
      peso_destete: { average: 0, top25: 13, top10: 20 },
      peso_final: { average: 0, top25: 20, top10: 30 },
      leche: { average: 0, top25: 3, top10: 5 },
      circunferencia_escrotal: { average: 0, top25: 0.6, top10: 1.2 },
      area_ojo_bife: { average: 0, top25: 3.0, top10: 5.0 },
    },
  },
];

export function getBreedReference(breed?: string | null): BreedDEPReference | null {
  if (!breed) return null;
  const normalized = breed.trim().toLowerCase();
  return (
    BREED_DEP_REFERENCES.find(
      (r) => r.breed.toLowerCase() === normalized || r.breedKey === normalized,
    ) ?? null
  );
}

export type TraitKey =
  | 'peso_nacer'
  | 'peso_destete'
  | 'peso_final'
  | 'leche'
  | 'circunferencia_escrotal'
  | 'largo_gestacion'
  | 'area_ojo_bife'
  | 'grasa_dorsal'
  | 'grasa_cadera'
  | 'grasa_intramuscular'
  | 'docilidad';

export type TraitSection = 'growth' | 'maternal' | 'reproduction' | 'carcass' | 'behavior';

export interface TraitConfig {
  key: TraitKey;
  unit: string;
  lowerIsBetter: boolean;
  section: TraitSection;
  /** Column name in DB for the value */
  column: string;
  /** Column name in DB for the accuracy */
  accColumn: string;
}

export const TRAIT_CONFIG: TraitConfig[] = [
  { key: 'peso_nacer', unit: 'kg', lowerIsBetter: true, section: 'growth', column: 'dep_peso_nacer', accColumn: 'dep_peso_nacer_acc' },
  { key: 'peso_destete', unit: 'kg', lowerIsBetter: false, section: 'growth', column: 'dep_peso_destete', accColumn: 'dep_peso_destete_acc' },
  { key: 'peso_final', unit: 'kg', lowerIsBetter: false, section: 'growth', column: 'dep_peso_final', accColumn: 'dep_peso_final_acc' },
  { key: 'leche', unit: 'kg', lowerIsBetter: false, section: 'maternal', column: 'dep_leche', accColumn: 'dep_leche_acc' },
  { key: 'circunferencia_escrotal', unit: 'cm', lowerIsBetter: false, section: 'reproduction', column: 'dep_circunferencia_escrotal', accColumn: 'dep_circunferencia_escrotal_acc' },
  { key: 'largo_gestacion', unit: 'días', lowerIsBetter: true, section: 'reproduction', column: 'dep_largo_gestacion', accColumn: 'dep_largo_gestacion_acc' },
  { key: 'area_ojo_bife', unit: 'cm²', lowerIsBetter: false, section: 'carcass', column: 'dep_area_ojo_bife', accColumn: 'dep_area_ojo_bife_acc' },
  { key: 'grasa_dorsal', unit: 'mm', lowerIsBetter: false, section: 'carcass', column: 'dep_grasa_dorsal', accColumn: 'dep_grasa_dorsal_acc' },
  { key: 'grasa_cadera', unit: 'mm', lowerIsBetter: false, section: 'carcass', column: 'dep_grasa_cadera', accColumn: 'dep_grasa_cadera_acc' },
  { key: 'grasa_intramuscular', unit: '%', lowerIsBetter: false, section: 'carcass', column: 'dep_grasa_intramuscular', accColumn: 'dep_grasa_intramuscular_acc' },
  { key: 'docilidad', unit: '', lowerIsBetter: false, section: 'behavior', column: 'dep_docilidad', accColumn: 'dep_docilidad_acc' },
];

export const TRAIT_SECTIONS: TraitSection[] = ['growth', 'maternal', 'reproduction', 'carcass', 'behavior'];
