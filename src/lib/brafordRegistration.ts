// Braford Registration System according to Asociación Braford Argentina 2022
export type RegistrationLevel = 
  | 'Preparatorio' 
  | 'Controlado' 
  | 'Registrado' 
  | 'Avanzado' 
  | 'Definitivo' 
  | 'Sin Registro' 
  | 'Pendiente de registro'
  // Brangus levels
  | 'BO' 
  | 'PC' 
  | 'PR' 
  | 'UB';

export interface RegistrationResult {
  level: RegistrationLevel;
  reason: string;
  fatherLevel?: RegistrationLevel;
  motherLevel?: RegistrationLevel;
  requiresDNA?: boolean;
  canOverride: boolean;
  errors: string[];
  warnings: string[];
}

export interface ParentInfo {
  level?: RegistrationLevel;
  isBoMother?: boolean;
  birthYear?: number;
  hasDNA?: boolean;
}

// Registration level hierarchy for validation
const LEVEL_HIERARCHY: Record<RegistrationLevel, number> = {
  'Sin Registro': 0,
  'Pendiente de registro': 1,
  'Preparatorio': 2,
  'Controlado': 3,
  'Registrado': 4,
  'Avanzado': 5,
  'Definitivo': 6,
  // Brangus hierarchy
  'BO': 2,
  'PC': 4,
  'PR': 6,
  'UB': 4,
};

// Registration level descriptions
export const REGISTRATION_DESCRIPTIONS: Record<RegistrationLevel, string> = {
  'Preparatorio': 'Animales de cruzamientos Hereford × Cebú. Se reconocen fracciones como: ⅜, ½, ¾ Braford. No requieren identificación individual.',
  'Controlado': 'Animales nacidos de padres conocidos, aunque no inscriptos. Se puede inscribir si ambos padres tienen origen conocido.',
  'Registrado': 'Ambos padres deben estar identificados individualmente. Padre: mínimo "Controlado". Madre: mínimo "Controlada".',
  'Avanzado': 'Ambos padres deben estar registrados como mínimo "Registrado". Se recomienda verificación por ADN.',
  'Definitivo': 'Ambos padres deben ser "Avanzado". Se requiere prueba de ADN obligatoria para confirmar filiación.',
  'Sin Registro': 'No cumple con los requisitos mínimos para obtener un nivel de registro.',
  'Pendiente de registro': 'Falta información de parentesco o documentación para determinar el nivel.',
  // Brangus descriptions
  'BO': 'Base: Cruza inicial de razas fundadoras (Brahman y Angus/Hereford). Requiere identificación individual.',
  'PC': 'Puro por Cruza: Resultado de cruzamientos registrados. Padre y madre mínimo "BO" o superior.',
  'PR': 'Puro Registrado: Ambos padres PC o PR. Requiere identificación por ADN obligatoria.',
  'UB': 'Ultrablack: Cruza Brangus × Angus para aumentar rusticidad o calidad carnicera.',
};

/**
 * Calculate automatic registration level for Braford and Brangus animals based on parents
 */
export function calculateBrafordRegistration(
  breed: string,
  fatherInfo?: ParentInfo,
  motherInfo?: ParentInfo,
  isArtificialInsemination = false
): RegistrationResult {
  const result: RegistrationResult = {
    level: 'Pendiente de registro',
    reason: '',
    fatherLevel: fatherInfo?.level,
    motherLevel: motherInfo?.level,
    requiresDNA: false,
    canOverride: true,
    errors: [],
    warnings: [],
  };

  // Only apply registration rules to Braford and Brangus breeds
  if (breed !== 'Braford' && breed !== 'Brangus') {
    result.level = 'Sin Registro';
    result.reason = 'Sistema de registro solo aplicable a razas Braford y Brangus';
    result.canOverride = false;
    return result;
  }

  // If no parent information available
  if (!fatherInfo?.level && !motherInfo?.level) {
    result.reason = 'Sin información de parentesco disponible';
    result.warnings.push('Complete la información de padre y madre para calcular el nivel de registro');
    return result;
  }

  const fatherLevel = fatherInfo?.level;
  const motherLevel = motherInfo?.level;

  // Apply breed-specific rules
  if (breed === 'Brangus') {
    return calculateBrangusRegistration(result, fatherLevel, motherLevel, fatherInfo, motherInfo);
  }

  // Apply inheritance rules
  try {
    // Rule 1: Avanzado + Avanzado → Definitivo
    if (fatherLevel === 'Avanzado' && motherLevel === 'Avanzado') {
      result.level = 'Definitivo';
      result.reason = 'Padre: Avanzado, Madre: Avanzado';
      result.requiresDNA = true;
      result.warnings.push('Se requiere prueba de ADN obligatoria para confirmar filiación');
    }
    // Rule 2: Registrado + Registrado → Avanzado
    else if (fatherLevel === 'Registrado' && motherLevel === 'Registrado') {
      result.level = 'Avanzado';
      result.reason = 'Padre: Registrado, Madre: Registrado';
      result.warnings.push('Se recomienda verificación por ADN');
    }
    // Rule 3: Controlado + Controlado → Registrado
    else if (fatherLevel === 'Controlado' && motherLevel === 'Controlado') {
      result.level = 'Registrado';
      result.reason = 'Padre: Controlado, Madre: Controlado';
      
      if (isArtificialInsemination) {
        result.warnings.push('Para inseminación artificial se exige certificado de ADN del toro');
        result.requiresDNA = true;
      }
    }
    // Rule 4: Base (Bo) + Registrado → Controlado (if mother meets year requirement)
    else if (motherInfo?.isBoMother && fatherLevel === 'Registrado') {
      if (motherInfo.birthYear && motherInfo.birthYear >= 2013) {
        result.level = 'Controlado';
        result.reason = 'Padre: Registrado, Madre: Bo (nacida desde 2013)';
      } else {
        result.level = 'Sin Registro';
        result.reason = 'Madre Bo debe haber nacido desde 2013 para registro Controlado';
        result.errors.push('Año de nacimiento de madre Bo no cumple requisito mínimo');
      }
    }
    // Rule 5: Preparatorio + Controlado → Controlado
    else if (
      (fatherLevel === 'Preparatorio' && motherLevel === 'Controlado') ||
      (fatherLevel === 'Controlado' && motherLevel === 'Preparatorio')
    ) {
      result.level = 'Controlado';
      result.reason = `Padre: ${fatherLevel}, Madre: ${motherLevel}`;
    }
    // Mixed levels - assign the lowest applicable level
    else if (fatherLevel && motherLevel) {
      const validLevels = [fatherLevel, motherLevel].filter(level => 
        level && level !== 'Sin Registro' && level !== 'Pendiente de registro'
      );
      
      if (validLevels.length === 0) {
        result.level = 'Sin Registro';
        result.reason = 'Ninguno de los padres tiene un nivel de registro válido';
        result.errors.push('Se requieren padres con niveles de registro válidos');
      } else {
        // Find the minimum level that can be achieved
        const minLevel = Math.min(...validLevels.map(level => LEVEL_HIERARCHY[level as RegistrationLevel]));
        const achievableLevel = Object.keys(LEVEL_HIERARCHY).find(
          level => LEVEL_HIERARCHY[level as RegistrationLevel] === Math.max(2, minLevel - 1) // Minimum Preparatorio
        ) as RegistrationLevel;
        
        result.level = achievableLevel;
        result.reason = `Padre: ${fatherLevel || 'Desconocido'}, Madre: ${motherLevel || 'Desconocido'}`;
        result.warnings.push('Nivel calculado basado en el parentesco más restrictivo');
      }
    }
    // Only one parent available
    else {
      const availableLevel = fatherLevel || motherLevel;
      if (availableLevel && availableLevel !== 'Sin Registro') {
        result.level = 'Preparatorio';
        result.reason = `Solo ${fatherLevel ? 'padre' : 'madre'} disponible: ${availableLevel}`;
        result.warnings.push('Se requiere información completa de ambos padres para nivel óptimo');
      } else {
        result.level = 'Sin Registro';
        result.reason = 'Información de parentesco insuficiente';
        result.errors.push('Se requiere al menos un padre con nivel de registro válido');
      }
    }
  } catch (error) {
    result.level = 'Pendiente de registro';
    result.reason = 'Error en el cálculo del nivel de registro';
    result.errors.push('Error interno en el sistema de registro');
  }

  return result;
}

/**
 * Calculate registration level for Brangus breed
 */
function calculateBrangusRegistration(
  result: RegistrationResult,
  fatherLevel?: RegistrationLevel,
  motherLevel?: RegistrationLevel,
  fatherInfo?: ParentInfo,
  motherInfo?: ParentInfo
): RegistrationResult {
  try {
    // Brangus inheritance rules
    // BO × BO → PC (if genealogy complies)
    if (fatherLevel === 'BO' && motherLevel === 'BO') {
      result.level = 'PC';
      result.reason = 'Padre: BO, Madre: BO';
      result.warnings.push('Verificar genealogía completa para confirmar nivel PC');
    }
    // PC × PC → PR
    else if (fatherLevel === 'PC' && motherLevel === 'PC') {
      result.level = 'PR';
      result.reason = 'Padre: PC, Madre: PC';
      result.requiresDNA = true;
      result.warnings.push('Se requiere identificación por ADN obligatoria');
    }
    // PR × PR → PR
    else if (fatherLevel === 'PR' && motherLevel === 'PR') {
      result.level = 'PR';
      result.reason = 'Padre: PR, Madre: PR';
      result.requiresDNA = true;
    }
    // PC × PR → PR
    else if (
      (fatherLevel === 'PC' && motherLevel === 'PR') ||
      (fatherLevel === 'PR' && motherLevel === 'PC')
    ) {
      result.level = 'PR';
      result.reason = `Padre: ${fatherLevel}, Madre: ${motherLevel}`;
      result.requiresDNA = true;
    }
    // BO × PC → PC
    else if (
      (fatherLevel === 'BO' && motherLevel === 'PC') ||
      (fatherLevel === 'PC' && motherLevel === 'BO')
    ) {
      result.level = 'PC';
      result.reason = `Padre: ${fatherLevel}, Madre: ${motherLevel}`;
    }
    // If one parent is unknown → Only BO possible
    else if (!fatherLevel || !motherLevel) {
      result.level = 'BO';
      result.reason = 'Un padre desconocido - solo puede ser BO';
      result.warnings.push('Se requieren ambos padres registrados para niveles superiores');
    }
    // Other combinations → BO
    else {
      result.level = 'BO';
      result.reason = `Combinación ${fatherLevel || 'Desconocido'} × ${motherLevel || 'Desconocido'} resulta en BO`;
      result.warnings.push('Combinación de padres no permite nivel superior');
    }

    // Additional Brangus validations
    if (result.level === 'PR' && !fatherInfo?.hasDNA) {
      result.warnings.push('Verificar que ambos padres tengan ADN validado para nivel PR');
    }

  } catch (error) {
    result.level = 'Pendiente de registro';
    result.reason = 'Error en el cálculo del nivel de registro Brangus';
    result.errors.push('Error interno en el sistema de registro');
  }

  return result;
}

/**
 * Validate if a registration override is allowed
 */
export function validateRegistrationOverride(
  calculatedLevel: RegistrationLevel,
  overrideLevel: RegistrationLevel,
  reason: string
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!reason || reason.trim().length < 10) {
    errors.push('Se requiere una justificación detallada para el override manual');
  }

  // Don't allow downgrading without strong justification
  const calculatedHierarchy = LEVEL_HIERARCHY[calculatedLevel];
  const overrideHierarchy = LEVEL_HIERARCHY[overrideLevel];

  if (overrideHierarchy < calculatedHierarchy && reason.length < 50) {
    errors.push('La reducción de nivel requiere justificación extensa');
  }

  // Don't allow impossible upgrades
  if (overrideHierarchy > calculatedHierarchy + 2) {
    errors.push('El upgrade excede los límites permitidos por el reglamento');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get registration level color for UI display
 */
export function getRegistrationLevelColor(level: RegistrationLevel): string {
  switch (level) {
    case 'Definitivo':
      return 'bg-purple-500 text-white';
    case 'Avanzado':
      return 'bg-blue-500 text-white';
    case 'Registrado':
      return 'bg-green-500 text-white';
    case 'Controlado':
      return 'bg-yellow-500 text-black';
    case 'Preparatorio':
      return 'bg-orange-500 text-white';
    case 'Sin Registro':
      return 'bg-red-500 text-white';
    case 'Pendiente de registro':
      return 'bg-gray-500 text-white';
    // Brangus colors
    case 'PR':
      return 'bg-purple-600 text-white';
    case 'PC':
      return 'bg-blue-600 text-white';
    case 'BO':
      return 'bg-green-600 text-white';
    case 'UB':
      return 'bg-indigo-600 text-white';
    default:
      return 'bg-gray-300 text-black';
  }
}