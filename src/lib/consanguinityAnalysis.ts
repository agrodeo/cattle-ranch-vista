import { supabase } from "@/integrations/supabase/client";

export interface Animal {
  id: string;
  name: string;
  id_tag: string;
  sex: string;
  birth_date: string;
  father_id: string | null;
  mother_id: string | null;
}

export interface RelationshipRisk {
  animal1: Animal;
  animal2: Animal;
  relationship: string;
  severity: 'severe' | 'medium' | 'low';
  description: string;
  inbreedingCoefficient?: number;
}

export interface AncestryMap {
  [animalId: string]: {
    fathers: Set<string>;
    mothers: Set<string>;
    ancestors: Set<string>;
    generation: number;
  };
}

/**
 * Builds a comprehensive ancestry map for all animals
 */
export async function buildAncestryMap(animals: Animal[], userCabañaId: string): Promise<AncestryMap> {
  const ancestryMap: AncestryMap = {};
  
  // Initialize the map
  animals.forEach(animal => {
    ancestryMap[animal.id] = {
      fathers: new Set(),
      mothers: new Set(),
      ancestors: new Set(),
      generation: 0
    };
  });

  // Fetch additional ancestor data from database if needed
  const allAnimalIds = new Set(animals.map(a => a.id));
  const parentIds = new Set();
  
  animals.forEach(animal => {
    if (animal.father_id) parentIds.add(animal.father_id);
    if (animal.mother_id) parentIds.add(animal.mother_id);
  });

  // Get parent animals that might not be in the current corral
  const missingParentIds = Array.from(parentIds).filter(id => !allAnimalIds.has(id as string));
  let additionalParents: Animal[] = [];
  
  if (missingParentIds.length > 0) {
    const { data } = await supabase
      .from("animals")
      .select("id, name, id_tag, sex, birth_date, father_id, mother_id")
      .eq("cabaña_id", userCabañaId)
      .in("id", missingParentIds as string[]);
    
    additionalParents = (data as Animal[]) || [];
  }

  const allAnimals = [...animals, ...additionalParents];
  const animalMap = new Map(allAnimals.map(a => [a.id, a]));

  // Build ancestry recursively
  function traceAncestry(animalId: string, visited: Set<string> = new Set(), generation: number = 0): void {
    if (visited.has(animalId) || generation > 5) return; // Prevent infinite loops, limit to 5 generations
    
    visited.add(animalId);
    const animal = animalMap.get(animalId);
    if (!animal) return;

    if (!ancestryMap[animalId]) {
      ancestryMap[animalId] = {
        fathers: new Set(),
        mothers: new Set(),
        ancestors: new Set(),
        generation: generation
      };
    }

    const ancestry = ancestryMap[animalId];

    // Add direct parents
    if (animal.father_id) {
      ancestry.fathers.add(animal.father_id);
      ancestry.ancestors.add(animal.father_id);
      
      // Trace father's ancestry
      traceAncestry(animal.father_id, new Set(visited), generation + 1);
      const fatherAncestry = ancestryMap[animal.father_id];
      if (fatherAncestry) {
        fatherAncestry.fathers.forEach(id => {
          ancestry.fathers.add(id);
          ancestry.ancestors.add(id);
        });
        fatherAncestry.mothers.forEach(id => {
          ancestry.mothers.add(id);
          ancestry.ancestors.add(id);
        });
      }
    }

    if (animal.mother_id) {
      ancestry.mothers.add(animal.mother_id);
      ancestry.ancestors.add(animal.mother_id);
      
      // Trace mother's ancestry
      traceAncestry(animal.mother_id, new Set(visited), generation + 1);
      const motherAncestry = ancestryMap[animal.mother_id];
      if (motherAncestry) {
        motherAncestry.fathers.forEach(id => {
          ancestry.fathers.add(id);
          ancestry.ancestors.add(id);
        });
        motherAncestry.mothers.forEach(id => {
          ancestry.mothers.add(id);
          ancestry.ancestors.add(id);
        });
      }
    }
  }

  // Build ancestry for all animals
  animals.forEach(animal => {
    traceAncestry(animal.id);
  });

  return ancestryMap;
}

/**
 * Detects specific genealogical relationships between two animals
 */
export function detectRelationship(
  animal1: Animal, 
  animal2: Animal, 
  ancestryMap: AncestryMap,
  t?: (key: string, params?: any) => string
): RelationshipRisk | null {
  if (animal1.id === animal2.id) return null;

  const ancestry1 = ancestryMap[animal1.id];
  const ancestry2 = ancestryMap[animal2.id];
  
  if (!ancestry1 || !ancestry2) return null;

  const name1 = animal1.name || animal1.id_tag || animal1.id;
  const name2 = animal2.name || animal2.id_tag || animal2.id;

  // Helper to get translated description or fallback
  const getDesc = (key: string, fallback: string) => 
    t ? t(`relationships.${key}`) : fallback;

  // 1. Parent-Offspring relationships (SEVERE)
  if (animal1.father_id === animal2.id) {
    return {
      animal1,
      animal2,
      relationship: 'father-offspring',
      severity: 'severe',
      description: `${name2} ${getDesc('fatherOf', 'es el padre de')} ${name1}`,
      inbreedingCoefficient: 0.25
    };
  }
  
  if (animal1.mother_id === animal2.id) {
    return {
      animal1,
      animal2,
      relationship: 'mother-offspring',
      severity: 'severe',
      description: `${name2} ${getDesc('motherOf', 'es la madre de')} ${name1}`,
      inbreedingCoefficient: 0.25
    };
  }

  if (animal2.father_id === animal1.id) {
    return {
      animal1,
      animal2,
      relationship: 'father-offspring',
      severity: 'severe',
      description: `${name1} ${getDesc('fatherOf', 'es el padre de')} ${name2}`,
      inbreedingCoefficient: 0.25
    };
  }

  if (animal2.mother_id === animal1.id) {
    return {
      animal1,
      animal2,
      relationship: 'mother-offspring',
      severity: 'severe',
      description: `${name1} ${getDesc('motherOf', 'es la madre de')} ${name2}`,
      inbreedingCoefficient: 0.25
    };
  }

  // 2. Full Siblings (SEVERE)
  if (animal1.father_id && animal1.mother_id && 
      animal1.father_id === animal2.father_id && 
      animal1.mother_id === animal2.mother_id) {
    return {
      animal1,
      animal2,
      relationship: 'full-siblings',
      severity: 'severe',
      description: `${name1} y ${name2} ${getDesc('fullSiblings', 'son hermanos completos (mismo padre y madre)')}`,
      inbreedingCoefficient: 0.25
    };
  }

  // 3. Half-Siblings (SEVERE)
  if (animal1.father_id && animal1.father_id === animal2.father_id && 
      animal1.mother_id !== animal2.mother_id) {
    return {
      animal1,
      animal2,
      relationship: 'half-siblings-paternal',
      severity: 'severe',
      description: `${name1} y ${name2} ${getDesc('halfSiblingsPaternal', 'son medio hermanos (mismo padre)')}`,
      inbreedingCoefficient: 0.125
    };
  }

  if (animal1.mother_id && animal1.mother_id === animal2.mother_id && 
      animal1.father_id !== animal2.father_id) {
    return {
      animal1,
      animal2,
      relationship: 'half-siblings-maternal',
      severity: 'severe',
      description: `${name1} y ${name2} ${getDesc('halfSiblingsMaternal', 'son medio hermanos (misma madre)')}`,
      inbreedingCoefficient: 0.125
    };
  }

  // 4. Grandparent-Grandchild relationships (MEDIUM)
  if (ancestry1.fathers.has(animal2.id) || ancestry1.mothers.has(animal2.id)) {
    return {
      animal1,
      animal2,
      relationship: 'grandparent-grandchild',
      severity: 'medium',
      description: `${name2} ${getDesc('grandparentOf', 'es abuelo/a de')} ${name1}`,
      inbreedingCoefficient: 0.125
    };
  }

  if (ancestry2.fathers.has(animal1.id) || ancestry2.mothers.has(animal1.id)) {
    return {
      animal1,
      animal2,
      relationship: 'grandparent-grandchild',
      severity: 'medium',
      description: `${name1} ${getDesc('grandparentOf', 'es abuelo/a de')} ${name2}`,
      inbreedingCoefficient: 0.125
    };
  }

  // 5. Uncle/Aunt with Niece/Nephew (MEDIUM)
  // Check if one animal's parent is a sibling of the other animal
  if (animal1.father_id || animal1.mother_id) {
    const parent1Father = animal1.father_id;
    const parent1Mother = animal1.mother_id;
    
    // Check if animal2 shares a parent with animal1's parents (making animal2 an uncle/aunt)
    if (parent1Father && ((animal2.father_id === parent1Father) || (animal2.mother_id === parent1Father))) {
      return {
        animal1,
        animal2,
        relationship: 'uncle-niece-nephew',
        severity: 'medium',
        description: `${name2} ${getDesc('uncleAuntOf', 'es tío/a de')} ${name1}`,
        inbreedingCoefficient: 0.0625
      };
    }
    
    if (parent1Mother && ((animal2.father_id === parent1Mother) || (animal2.mother_id === parent1Mother))) {
      return {
        animal1,
        animal2,
        relationship: 'uncle-niece-nephew',
        severity: 'medium',
        description: `${name2} ${getDesc('uncleAuntOf', 'es tío/a de')} ${name1}`,
        inbreedingCoefficient: 0.0625
      };
    }
  }

  // 6. First Cousins (LOW)
  // Check if they share grandparents
  const sharedGrandparents = new Set();
  
  ancestry1.fathers.forEach(ancestorId => {
    if (ancestry2.fathers.has(ancestorId) || ancestry2.mothers.has(ancestorId)) {
      sharedGrandparents.add(ancestorId);
    }
  });
  
  ancestry1.mothers.forEach(ancestorId => {
    if (ancestry2.fathers.has(ancestorId) || ancestry2.mothers.has(ancestorId)) {
      sharedGrandparents.add(ancestorId);
    }
  });

  if (sharedGrandparents.size > 0) {
    return {
      animal1,
      animal2,
      relationship: 'first-cousins',
      severity: 'low',
      description: `${name1} y ${name2} ${getDesc('cousins', 'son primos (comparten ancestros)')}`,
      inbreedingCoefficient: 0.0625
    };
  }

  return null;
}

/**
 * Analyzes all animals in a corral for consanguinity risks
 */
export async function analyzeCorralConsanguinity(
  animals: Animal[], 
  userCabañaId: string,
  t?: (key: string, params?: any) => string
): Promise<RelationshipRisk[]> {
  // Filter animals over 18 months old
  const eligibleAnimals = animals.filter(animal => {
    if (!animal.birth_date) return false;
    const ageMonths = Math.floor(
      (new Date().getTime() - new Date(animal.birth_date).getTime()) / 
      (1000 * 60 * 60 * 24 * 30.44)
    );
    return ageMonths >= 18;
  });

  if (eligibleAnimals.length < 2) return [];

  const ancestryMap = await buildAncestryMap(eligibleAnimals, userCabañaId);
  const risks: RelationshipRisk[] = [];

  // Check each pair of animals
  for (let i = 0; i < eligibleAnimals.length; i++) {
    for (let j = i + 1; j < eligibleAnimals.length; j++) {
      const animal1 = eligibleAnimals[i];
      const animal2 = eligibleAnimals[j];
      
      // Only check male-female pairs for breeding risks
      if ((animal1.sex === 'Macho' && animal2.sex === 'Hembra') || 
          (animal1.sex === 'Hembra' && animal2.sex === 'Macho')) {
        
        const risk = detectRelationship(animal1, animal2, ancestryMap, t);
        if (risk) {
          risks.push(risk);
        }
      }
    }
  }

  return risks;
}

/**
 * Gets severity color and emoji for display
 */
export function getSeverityDisplay(
  severity: 'severe' | 'medium' | 'low', 
  t?: (key: string) => string
): { color: string; emoji: string; label: string } {
  const defaultLabels = {
    severe: 'Riesgo Alto',
    medium: 'Riesgo Medio',
    low: 'Riesgo Bajo',
    unknown: 'Desconocido'
  };

  const getLabel = (key: string, fallback: string) => 
    t ? t(`relationships.${key}`) : fallback;

  switch (severity) {
    case 'severe':
      return { 
        color: 'text-red-600', 
        emoji: '🔴', 
        label: getLabel('highRisk', defaultLabels.severe)
      };
    case 'medium':
      return { 
        color: 'text-orange-600', 
        emoji: '🟠', 
        label: getLabel('mediumRisk', defaultLabels.medium)
      };
    case 'low':
      return { 
        color: 'text-yellow-600', 
        emoji: '🟡', 
        label: getLabel('lowRisk', defaultLabels.low)
      };
    default:
      return { 
        color: 'text-gray-600', 
        emoji: '⚪', 
        label: getLabel('unknown', defaultLabels.unknown)
      };
  }
}