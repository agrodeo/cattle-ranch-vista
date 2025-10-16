/**
 * Animal category classification based on age, sex, and activity history
 */

interface Animal {
  birth_date?: string;
  sex: string;
  id?: string;
}

/**
 * Gets the age in months for an animal
 */
export function getAgeInMonths(birthDate: string | null | undefined): number {
  if (!birthDate) return 0;
  
  const birth = new Date(birthDate);
  const now = new Date();
  
  // If birth date is in the future, return 0
  if (birth > now) return 0;
  
  const diffTime = now.getTime() - birth.getTime();
  const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
  
  return diffMonths;
}

/**
 * Categorizes an animal based on its sex, age, and castration status
 * @param animal - Animal data
 * @param isCastrated - Whether the animal has been castrated (only for males)
 * @returns Category string (Ternero, Ternera, Torito, Vaquillona, Toro, Vaca, Novillo)
 */
export function categorizeAnimal(animal: Animal, isCastrated: boolean = false): string {
  const ageMonths = getAgeInMonths(animal.birth_date);
  const sex = animal.sex;
  
  // Female categories (not affected by castration)
  if (sex === 'Hembra') {
    if (ageMonths < 8) return 'Ternera';
    if (ageMonths < 24) return 'Vaquillona';
    return 'Vaca';
  }
  
  // Male categories (affected by castration)
  if (sex === 'Macho') {
    // If castrated, always "Novillo" (regardless of age after castration)
    if (isCastrated) {
      return 'Novillo';
    }
    
    // Not castrated - normal progression
    if (ageMonths < 8) return 'Ternero';
    if (ageMonths < 24) return 'Torito';
    return 'Toro';
  }
  
  return 'Desconocido';
}

/**
 * Checks if an animal is eligible for reproductive activities
 * Castrated males and very young animals are not eligible
 */
export function isReproductivelyEligible(
  animal: Animal, 
  isCastrated: boolean = false
): boolean {
  const ageMonths = getAgeInMonths(animal.birth_date);
  
  // Castrated males are never reproductively eligible
  if (isCastrated && animal.sex === 'Macho') {
    return false;
  }
  
  // Females must be at least 15 months
  if (animal.sex === 'Hembra') {
    return ageMonths >= 15;
  }
  
  // Males (non-castrated) must be at least 18 months
  if (animal.sex === 'Macho') {
    return ageMonths >= 18;
  }
  
  return false;
}
