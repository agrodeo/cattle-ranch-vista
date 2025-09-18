import { 
  AnimalReproductiveData, 
  OffspringRecord, 
  PregnancyRecord, 
  ServiceRecord, 
  ReproductiveYearData,
  ReproductiveCalculationResult 
} from "@/types/reproductive";

/**
 * Calculate age in months from birth date
 */
export function calculateAgeInMonths(birthDate?: string): number {
  if (!birthDate) return 24; // Default age for animals without birth date
  
  const birth = new Date(birthDate);
  const now = new Date();
  
  return (now.getFullYear() - birth.getFullYear()) * 12 + 
         (now.getMonth() - birth.getMonth());
}

/**
 * Determine animal category based on age
 */
export function getAnimalCategory(ageMonths: number): string {
  if (ageMonths < 12) return 'Ternera';
  if (ageMonths < 24) return 'Vaquillona';
  return 'Vaca';
}

/**
 * Calculate reproductive years based on age
 * Reproductive life starts at 15 months
 */
export function calculateReproductiveYears(ageMonths: number): number {
  if (ageMonths < 15) return 0;
  return Math.max(1, Math.ceil((ageMonths - 15) / 12));
}

/**
 * Build reproductive year data for an animal
 */
export function buildReproductiveHistory(
  animal: AnimalReproductiveData,
  pregnancies: PregnancyRecord[],
  services: ServiceRecord[],
  offspring: OffspringRecord[]
): ReproductiveYearData[] {
  const ageMonths = calculateAgeInMonths(animal.birth_date);
  const reproductiveYears = calculateReproductiveYears(ageMonths);
  
  if (reproductiveYears === 0) return [];
  
  const currentYear = new Date().getFullYear();
  const birthYear = animal.birth_date ? new Date(animal.birth_date).getFullYear() : currentYear - 2;
  const firstReproductiveYear = birthYear + 1; // Started reproducing at 15 months
  
  const yearData: ReproductiveYearData[] = [];
  
  for (let i = 0; i < reproductiveYears; i++) {
    const year = firstReproductiveYear + i;
    const ageAtYearStart = (year - birthYear) * 12;
    
    // Count services in this year
    const yearServices = services.filter(service => {
      // In a real system, we'd need the service date from the eventos table
      // For now, we'll distribute services evenly across years
      return true;
    }).length;
    
    // Count pregnancies confirmed in this year
    const yearPregnancies = pregnancies.filter(preg => {
      const pregYear = new Date(preg.fecha_inicio).getFullYear();
      return pregYear === year && preg.estado === 'confirmada';
    }).length;
    
    // Count calvings in this year (offspring born)
    const yearCalvings = offspring.filter(child => {
      // In a real system, we'd need birth dates for offspring
      // For now, we'll estimate based on total offspring
      return true;
    }).length;
    
    yearData.push({
      year,
      age_at_start: ageAtYearStart,
      was_active: ageAtYearStart >= 15,
      services_count: Math.floor(yearServices / reproductiveYears), // Distribute evenly
      pregnancies_confirmed: yearPregnancies,
      calving_occurred: Math.floor(yearCalvings / reproductiveYears) > 0,
      current_pregnancy: i === reproductiveYears - 1 ? animal.esta_preñada : false
    });
  }
  
  return yearData;
}

/**
 * Calculate pregnancy rate using the most appropriate method
 */
export function calculatePregnancyRate(
  animal: AnimalReproductiveData,
  pregnancies: PregnancyRecord[],
  services: ServiceRecord[],
  offspring: OffspringRecord[]
): ReproductiveCalculationResult {
  const ageMonths = calculateAgeInMonths(animal.birth_date);
  const reproductiveYears = calculateReproductiveYears(ageMonths);
  
  const totalServices = services.length;
  const totalOffspring = offspring.length;
  const liveOffspring = offspring.filter(child => child.status !== 'muerto').length;
  
  // CRITICAL: Ensure we have successful pregnancies for each offspring
  // If animal has offspring but no corresponding successful pregnancies, 
  // we need to account for missing pregnancy records
  let adjustedPregnancies = [...pregnancies];
  const successfulPregnancies = pregnancies.filter(p => p.estado_final === 'exitosa').length;
  
  // If we have more offspring than successful pregnancies, add missing successful pregnancies
  if (totalOffspring > successfulPregnancies) {
    const missingPregnancies = totalOffspring - successfulPregnancies;
    for (let i = 0; i < missingPregnancies; i++) {
      adjustedPregnancies.push({
        id: `auto-generated-${i}`,
        animal_id: animal.id,
        estado: 'confirmada',
        estado_final: 'exitosa',
        fecha_inicio: new Date(Date.now() - (283 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0], // 283 days ago
        fecha_estimada_parto: new Date().toISOString().split('T')[0],
        fecha_finalizacion: new Date().toISOString().split('T')[0],
        motivo_finalizacion: 'parto_exitoso',
        cria_id: offspring[successfulPregnancies + i]?.id
      });
    }
  }
  
  const confirmedPregnancies = adjustedPregnancies.filter(p => p.estado === 'confirmada' || p.estado_final === 'exitosa').length;
  const totalPregnancies = adjustedPregnancies.length;
  const finalSuccessfulPregnancies = adjustedPregnancies.filter(p => p.estado_final === 'exitosa').length;
  
  console.log(`DEBUG calculatePregnancyRate for ${animal.id_tag}:`, {
    ageMonths,
    reproductiveYears,
    totalServices,
    originalPregnancies: pregnancies.length,
    adjustedPregnancies: totalPregnancies,
    confirmedPregnancies,
    finalSuccessfulPregnancies,
    totalOffspring,
    liveOffspring
  });
  
  let pregnancyRate = 0;
  let calvingRate = 0;
  let calculationMethod = '';
  
  // Calculate calving rate: offspring / successful pregnancies
  // Since we adjusted pregnancies to match offspring, this should never be 0 if there are offspring
  if (finalSuccessfulPregnancies > 0) {
    calvingRate = Math.round((totalOffspring / finalSuccessfulPregnancies) * 100);
    calculationMethod = 'pregnancy_based';
  }
  
  // For pregnancy rate, use service-based calculation if available
  if (totalServices > 0) {
    const currentPregnancy = animal.esta_preñada ? 1 : 0;
    pregnancyRate = Math.round((confirmedPregnancies + currentPregnancy) / totalServices * 100);
  } else if (reproductiveYears > 0 && confirmedPregnancies > 0) {
    // Fallback: use pregnancies per reproductive year
    pregnancyRate = Math.round((confirmedPregnancies / reproductiveYears) * 100);
  }
  
  console.log(`DEBUG ${animal.id_tag} final calculation:`, {
    totalPregnancies,
    finalSuccessfulPregnancies,
    totalOffspring,
    calvingRate,
    pregnancyRate
  });
  
  // Determine performance level
  let performanceLevel = 'Bajo';
  if (pregnancyRate >= 85) performanceLevel = 'Excelente';
  else if (pregnancyRate >= 70) performanceLevel = 'Muy Bueno';
  else if (pregnancyRate >= 55) performanceLevel = 'Bueno';
  else if (pregnancyRate >= 40) performanceLevel = 'Regular';
  
  return {
    pregnancy_rate: pregnancyRate,
    calving_rate: calvingRate,
    reproductive_years: reproductiveYears,
    total_services: totalServices,
    total_pregnancies: confirmedPregnancies,
    total_calvings: totalOffspring, // Use total offspring, not just live ones for calving count
    performance_level: performanceLevel,
    calculation_method: calculationMethod
  };
}

/**
 * Validate reproductive data for consistency
 */
export function validateReproductiveData(
  animal: AnimalReproductiveData,
  pregnancies: PregnancyRecord[],
  services: ServiceRecord[],
  offspring: OffspringRecord[]
): string[] {
  const warnings: string[] = [];
  
  const ageMonths = calculateAgeInMonths(animal.birth_date);
  
  // Warning if pregnant but too young
  if (animal.esta_preñada && ageMonths < 15) {
    warnings.push('Animal appears pregnant but is under 15 months old');
  }
  
  // Warning if many services but no pregnancies
  if (services.length > 3 && pregnancies.length === 0) {
    warnings.push('Multiple services recorded but no confirmed pregnancies');
  }
  
  // Warning if pregnancies > services (should not happen)
  if (pregnancies.length > services.length && services.length > 0) {
    warnings.push('More pregnancies than services recorded');
  }
  
  // Warning if offspring > pregnancies (possible data gap)
  if (offspring.length > pregnancies.length && pregnancies.length > 0) {
    warnings.push('More offspring than recorded pregnancies');
  }
  
  return warnings;
}

/**
 * Calculate overall herd reproductive performance
 */
export function calculateHerdPerformance(
  results: ReproductiveCalculationResult[]
): {
  average_pregnancy_rate: number;
  average_calving_rate: number;
  total_animals: number;
  by_method: Record<string, number>;
  by_performance: Record<string, number>;
} {
  if (results.length === 0) {
    return {
      average_pregnancy_rate: 0,
      average_calving_rate: 0,
      total_animals: 0,
      by_method: {},
      by_performance: {}
    };
  }
  
  const totalPregnancyRate = results.reduce((sum, r) => sum + r.pregnancy_rate, 0);
  const totalCalvingRate = results.reduce((sum, r) => sum + r.calving_rate, 0);
  
  const byMethod = results.reduce((acc, r) => {
    acc[r.calculation_method] = (acc[r.calculation_method] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const byPerformance = results.reduce((acc, r) => {
    acc[r.performance_level] = (acc[r.performance_level] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    average_pregnancy_rate: Math.round(totalPregnancyRate / results.length),
    average_calving_rate: Math.round(totalCalvingRate / results.length),
    total_animals: results.length,
    by_method: byMethod,
    by_performance: byPerformance
  };
}