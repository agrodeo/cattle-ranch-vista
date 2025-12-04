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
    // Direct parents
    fatherId: string | null;
    motherId: string | null;
    // Generation 2 - Grandparents
    paternalGrandparents: string[];
    maternalGrandparents: string[];
    // Generation 3 - Great-grandparents
    greatGrandparents: string[];
    // Generation 4 - Great-great-grandparents
    greatGreatGrandparents: string[];
    // Generation 5 - Great-great-great-grandparents
    greatGreatGreatGrandparents: string[];
    // All ancestors with generation distance
    allAncestors: Set<string>;
    ancestorGenerations: Map<string, number>; // ancestor_id → generation_distance
  };
}

/**
 * Builds a comprehensive ancestry map for all animals up to 5 generations
 */
export async function buildAncestryMap(animals: Animal[], userCabañaId: string): Promise<AncestryMap> {
  const ancestryMap: AncestryMap = {};
  
  // Collect all parent IDs we need to fetch
  const allAnimalIds = new Set(animals.map(a => a.id));
  const parentIdsToFetch = new Set<string>();
  
  animals.forEach(animal => {
    if (animal.father_id) parentIdsToFetch.add(animal.father_id);
    if (animal.mother_id) parentIdsToFetch.add(animal.mother_id);
  });

  // Fetch all ancestors from database (up to 5 generations)
  const ancestorIds = new Set<string>();
  let currentGeneration = Array.from(parentIdsToFetch);
  
  for (let gen = 0; gen < 5 && currentGeneration.length > 0; gen++) {
    const missingIds = currentGeneration.filter(id => !allAnimalIds.has(id) && !ancestorIds.has(id));
    
    if (missingIds.length > 0) {
      const { data } = await supabase
        .from("animals")
        .select("id, name, id_tag, sex, birth_date, father_id, mother_id")
        .eq("cabaña_id", userCabañaId)
        .in("id", missingIds);
      
      if (data) {
        data.forEach((a: any) => {
          ancestorIds.add(a.id);
          animals.push(a as Animal);
          if (a.father_id) parentIdsToFetch.add(a.father_id);
          if (a.mother_id) parentIdsToFetch.add(a.mother_id);
        });
      }
    }
    
    // Get next generation of parents
    currentGeneration = [];
    const latestAnimals = animals.filter(a => missingIds.includes(a.id));
    latestAnimals.forEach(a => {
      if (a.father_id && !ancestorIds.has(a.father_id)) currentGeneration.push(a.father_id);
      if (a.mother_id && !ancestorIds.has(a.mother_id)) currentGeneration.push(a.mother_id);
    });
  }

  // Create a map of all animals by ID
  const animalMap = new Map(animals.map(a => [a.id, a]));

  // Helper function to trace ancestry recursively
  function getAncestorsAtGeneration(animalId: string, targetGen: number, currentGen: number = 0): string[] {
    if (currentGen === targetGen) return [animalId];
    
    const animal = animalMap.get(animalId);
    if (!animal) return [];
    
    const ancestors: string[] = [];
    if (animal.father_id) {
      ancestors.push(...getAncestorsAtGeneration(animal.father_id, targetGen, currentGen + 1));
    }
    if (animal.mother_id) {
      ancestors.push(...getAncestorsAtGeneration(animal.mother_id, targetGen, currentGen + 1));
    }
    return ancestors;
  }

  // Build ancestry nodes for all animals
  animals.forEach(animal => {
    const allAncestors = new Set<string>();
    const ancestorGenerations = new Map<string, number>();
    
    // Generation 1 - Direct parents
    const paternalGrandparents: string[] = [];
    const maternalGrandparents: string[] = [];
    
    if (animal.father_id) {
      allAncestors.add(animal.father_id);
      ancestorGenerations.set(animal.father_id, 1);
      
      const father = animalMap.get(animal.father_id);
      if (father) {
        if (father.father_id) {
          paternalGrandparents.push(father.father_id);
          allAncestors.add(father.father_id);
          ancestorGenerations.set(father.father_id, 2);
        }
        if (father.mother_id) {
          paternalGrandparents.push(father.mother_id);
          allAncestors.add(father.mother_id);
          ancestorGenerations.set(father.mother_id, 2);
        }
      }
    }
    
    if (animal.mother_id) {
      allAncestors.add(animal.mother_id);
      ancestorGenerations.set(animal.mother_id, 1);
      
      const mother = animalMap.get(animal.mother_id);
      if (mother) {
        if (mother.father_id) {
          maternalGrandparents.push(mother.father_id);
          allAncestors.add(mother.father_id);
          ancestorGenerations.set(mother.father_id, 2);
        }
        if (mother.mother_id) {
          maternalGrandparents.push(mother.mother_id);
          allAncestors.add(mother.mother_id);
          ancestorGenerations.set(mother.mother_id, 2);
        }
      }
    }
    
    // Generation 3 - Great-grandparents
    const greatGrandparents = getAncestorsAtGeneration(animal.id, 3);
    greatGrandparents.forEach(id => {
      allAncestors.add(id);
      if (!ancestorGenerations.has(id)) ancestorGenerations.set(id, 3);
    });
    
    // Generation 4 - Great-great-grandparents
    const greatGreatGrandparents = getAncestorsAtGeneration(animal.id, 4);
    greatGreatGrandparents.forEach(id => {
      allAncestors.add(id);
      if (!ancestorGenerations.has(id)) ancestorGenerations.set(id, 4);
    });
    
    // Generation 5 - Great-great-great-grandparents
    const greatGreatGreatGrandparents = getAncestorsAtGeneration(animal.id, 5);
    greatGreatGreatGrandparents.forEach(id => {
      allAncestors.add(id);
      if (!ancestorGenerations.has(id)) ancestorGenerations.set(id, 5);
    });

    ancestryMap[animal.id] = {
      fatherId: animal.father_id,
      motherId: animal.mother_id,
      paternalGrandparents,
      maternalGrandparents,
      greatGrandparents,
      greatGreatGrandparents,
      greatGreatGreatGrandparents,
      allAncestors,
      ancestorGenerations
    };
  });

  return ancestryMap;
}

/**
 * Detects specific genealogical relationships between two animals
 * Supports detection up to 5 generations (third cousins)
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

  // 1. Parent-Offspring relationships (coefficient: 0.25, SEVERE)
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

  // 2. Full Siblings (coefficient: 0.25, SEVERE)
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

  // 3. Grandparent-Grandchild (coefficient: 0.125, SEVERE)
  const allGrandparents1 = [...ancestry1.paternalGrandparents, ...ancestry1.maternalGrandparents];
  const allGrandparents2 = [...ancestry2.paternalGrandparents, ...ancestry2.maternalGrandparents];
  
  if (allGrandparents1.includes(animal2.id)) {
    return {
      animal1,
      animal2,
      relationship: 'grandparent-grandchild',
      severity: 'severe',
      description: `${name2} ${getDesc('grandparentOf', 'es abuelo/a de')} ${name1}`,
      inbreedingCoefficient: 0.125
    };
  }
  
  if (allGrandparents2.includes(animal1.id)) {
    return {
      animal1,
      animal2,
      relationship: 'grandparent-grandchild',
      severity: 'severe',
      description: `${name1} ${getDesc('grandparentOf', 'es abuelo/a de')} ${name2}`,
      inbreedingCoefficient: 0.125
    };
  }

  // 4. Half-Siblings (coefficient: 0.125, SEVERE)
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

  // 5. Great-grandparent ↔ Great-grandchild (coefficient: 0.0625, MEDIUM)
  if (ancestry1.greatGrandparents.includes(animal2.id)) {
    return {
      animal1,
      animal2,
      relationship: 'great-grandparent-great-grandchild',
      severity: 'medium',
      description: `${name2} ${getDesc('greatGrandparentOf', 'es bisabuelo/a de')} ${name1}`,
      inbreedingCoefficient: 0.0625
    };
  }
  
  if (ancestry2.greatGrandparents.includes(animal1.id)) {
    return {
      animal1,
      animal2,
      relationship: 'great-grandparent-great-grandchild',
      severity: 'medium',
      description: `${name1} ${getDesc('greatGrandparentOf', 'es bisabuelo/a de')} ${name2}`,
      inbreedingCoefficient: 0.0625
    };
  }

  // 6. Uncle/Aunt-Niece/Nephew (coefficient: 0.0625, MEDIUM)
  // Check if animal1's parent is sibling of animal2
  const animal1Parents = [animal1.father_id, animal1.mother_id].filter(Boolean) as string[];
  const animal2Parents = [animal2.father_id, animal2.mother_id].filter(Boolean) as string[];
  
  for (const parentId of animal2Parents) {
    const parentAncestry = ancestryMap[parentId];
    if (parentAncestry) {
      // Check if animal1 shares parents with animal2's parent (making animal1 an uncle/aunt)
      const sharedFather = animal1.father_id && parentAncestry.fatherId && animal1.father_id === parentAncestry.fatherId;
      const sharedMother = animal1.mother_id && parentAncestry.motherId && animal1.mother_id === parentAncestry.motherId;
      if ((sharedFather || sharedMother) && animal1.id !== parentId) {
        return {
          animal1,
          animal2,
          relationship: 'uncle-niece-nephew',
          severity: 'medium',
          description: `${name1} ${getDesc('uncleAuntOf', 'es tío/a de')} ${name2}`,
          inbreedingCoefficient: 0.0625
        };
      }
    }
  }
  
  for (const parentId of animal1Parents) {
    const parentAncestry = ancestryMap[parentId];
    if (parentAncestry) {
      const sharedFather = animal2.father_id && parentAncestry.fatherId && animal2.father_id === parentAncestry.fatherId;
      const sharedMother = animal2.mother_id && parentAncestry.motherId && animal2.mother_id === parentAncestry.motherId;
      if ((sharedFather || sharedMother) && animal2.id !== parentId) {
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
  }

  // 7. First Cousins (coefficient: 0.0625, MEDIUM) - share grandparents
  const notSiblings = animal1.father_id !== animal2.father_id || animal1.mother_id !== animal2.mother_id;
  if (notSiblings && allGrandparents1.length > 0 && allGrandparents2.length > 0) {
    for (const gp1 of allGrandparents1) {
      if (allGrandparents2.includes(gp1)) {
        return {
          animal1,
          animal2,
          relationship: 'first-cousins',
          severity: 'medium',
          description: `${name1} y ${name2} ${getDesc('firstCousins', 'son primos hermanos (comparten abuelos)')}`,
          inbreedingCoefficient: 0.0625
        };
      }
    }
  }

  // 8. Great-great-grandparent ↔ Great-great-grandchild (coefficient: 0.03125, LOW)
  if (ancestry1.greatGreatGrandparents.includes(animal2.id)) {
    return {
      animal1,
      animal2,
      relationship: 'great-great-grandparent',
      severity: 'low',
      description: `${name2} ${getDesc('greatGreatGrandparentOf', 'es tatarabuelo/a de')} ${name1}`,
      inbreedingCoefficient: 0.03125
    };
  }
  
  if (ancestry2.greatGreatGrandparents.includes(animal1.id)) {
    return {
      animal1,
      animal2,
      relationship: 'great-great-grandparent',
      severity: 'low',
      description: `${name1} ${getDesc('greatGreatGrandparentOf', 'es tatarabuelo/a de')} ${name2}`,
      inbreedingCoefficient: 0.03125
    };
  }

  // 9. Half Uncle/Aunt - Niece/Nephew (coefficient: 0.03125, LOW)
  // Check if one animal's parent is a half-sibling of the other animal
  for (const parentId of animal2Parents) {
    const parentAncestry = ancestryMap[parentId];
    if (parentAncestry) {
      // Half-sibling check: share one parent but not both
      const sharedFatherOnly = animal1.father_id && parentAncestry.fatherId && 
                               animal1.father_id === parentAncestry.fatherId && 
                               animal1.mother_id !== parentAncestry.motherId;
      const sharedMotherOnly = animal1.mother_id && parentAncestry.motherId && 
                               animal1.mother_id === parentAncestry.motherId && 
                               animal1.father_id !== parentAncestry.fatherId;
      if ((sharedFatherOnly || sharedMotherOnly) && animal1.id !== parentId) {
        return {
          animal1,
          animal2,
          relationship: 'half-uncle-niece-nephew',
          severity: 'low',
          description: `${name1} ${getDesc('halfUncleAuntOf', 'es medio tío/a de')} ${name2}`,
          inbreedingCoefficient: 0.03125
        };
      }
    }
  }

  // 10. First Cousins Once Removed (coefficient: 0.03125, LOW)
  // Animal1's grandparent is Animal2's great-grandparent (or vice versa)
  for (const gp of allGrandparents1) {
    if (ancestry2.greatGrandparents.includes(gp)) {
      return {
        animal1,
        animal2,
        relationship: 'first-cousins-once-removed',
        severity: 'low',
        description: `${name1} y ${name2} ${getDesc('firstCousinsOnceRemoved', 'son primos en primer grado una vez removidos')}`,
        inbreedingCoefficient: 0.03125
      };
    }
  }
  
  for (const gp of allGrandparents2) {
    if (ancestry1.greatGrandparents.includes(gp)) {
      return {
        animal1,
        animal2,
        relationship: 'first-cousins-once-removed',
        severity: 'low',
        description: `${name1} y ${name2} ${getDesc('firstCousinsOnceRemoved', 'son primos en primer grado una vez removidos')}`,
        inbreedingCoefficient: 0.03125
      };
    }
  }

  // 11. Second Cousins (coefficient: 0.03125, LOW) - share great-grandparents
  if (ancestry1.greatGrandparents.length > 0 && ancestry2.greatGrandparents.length > 0) {
    for (const ggp1 of ancestry1.greatGrandparents) {
      if (ancestry2.greatGrandparents.includes(ggp1)) {
        return {
          animal1,
          animal2,
          relationship: 'second-cousins',
          severity: 'low',
          description: `${name1} y ${name2} ${getDesc('secondCousins', 'son primos segundos (comparten bisabuelos)')}`,
          inbreedingCoefficient: 0.03125
        };
      }
    }
  }

  // 12. Great-great-great-grandparent (coefficient: 0.015625, LOW)
  if (ancestry1.greatGreatGreatGrandparents.includes(animal2.id)) {
    return {
      animal1,
      animal2,
      relationship: 'great-great-great-grandparent',
      severity: 'low',
      description: `${name2} ${getDesc('greatGreatGreatGrandparentOf', 'es trastatarabuelo/a de')} ${name1}`,
      inbreedingCoefficient: 0.015625
    };
  }
  
  if (ancestry2.greatGreatGreatGrandparents.includes(animal1.id)) {
    return {
      animal1,
      animal2,
      relationship: 'great-great-great-grandparent',
      severity: 'low',
      description: `${name1} ${getDesc('greatGreatGreatGrandparentOf', 'es trastatarabuelo/a de')} ${name2}`,
      inbreedingCoefficient: 0.015625
    };
  }

  // 13. Third Cousins (coefficient: 0.015625, LOW) - share great-great-grandparents
  if (ancestry1.greatGreatGrandparents.length > 0 && ancestry2.greatGreatGrandparents.length > 0) {
    for (const gggp1 of ancestry1.greatGreatGrandparents) {
      if (ancestry2.greatGreatGrandparents.includes(gggp1)) {
        return {
          animal1,
          animal2,
          relationship: 'third-cousins',
          severity: 'low',
          description: `${name1} y ${name2} ${getDesc('thirdCousins', 'son primos terceros (comparten tatarabuelos)')}`,
          inbreedingCoefficient: 0.015625
        };
      }
    }
  }

  return null;
}

/**
 * Analyzes all animals in a corral for consanguinity risks
 * Only considers animals 15+ months old (breeding age)
 * Only checks male-female pairs within the original corral
 */
export async function analyzeCorralConsanguinity(
  animals: Animal[], 
  userCabañaId: string,
  t?: (key: string, params?: any) => string
): Promise<RelationshipRisk[]> {
  // Filter animals over 15 months old (breeding age)
  const eligibleAnimals = animals.filter(animal => {
    if (!animal.birth_date) return false;
    const ageMonths = Math.floor(
      (new Date().getTime() - new Date(animal.birth_date).getTime()) / 
      (1000 * 60 * 60 * 24 * 30.44)
    );
    return ageMonths >= 15;
  });

  if (eligibleAnimals.length < 2) return [];

  // Store original corral animal IDs before buildAncestryMap mutates the array
  const corralAnimalIds = new Set(eligibleAnimals.map(a => a.id));
  
  // Create a copy for ancestry building (buildAncestryMap mutates its input)
  const animalsForAncestry = [...eligibleAnimals];
  const ancestryMap = await buildAncestryMap(animalsForAncestry, userCabañaId);
  
  const risks: RelationshipRisk[] = [];
  const checkedPairs = new Set<string>(); // Prevent duplicate pairs

  // Only iterate over ORIGINAL corral animals (not ancestors added by buildAncestryMap)
  const corralAnimals = eligibleAnimals.filter(a => corralAnimalIds.has(a.id));

  // Check each pair of animals
  for (let i = 0; i < corralAnimals.length; i++) {
    for (let j = i + 1; j < corralAnimals.length; j++) {
      const animal1 = corralAnimals[i];
      const animal2 = corralAnimals[j];
      
      // Create unique pair key to prevent duplicates
      const pairKey = [animal1.id, animal2.id].sort().join('-');
      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);
      
      // Only check male-female pairs for breeding risks (case-insensitive)
      const sex1 = animal1.sex?.toLowerCase();
      const sex2 = animal2.sex?.toLowerCase();
      if ((sex1 === 'macho' && sex2 === 'hembra') || 
          (sex1 === 'hembra' && sex2 === 'macho')) {
        
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
