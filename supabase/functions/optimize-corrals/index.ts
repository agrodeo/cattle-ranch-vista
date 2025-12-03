import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ObjectiveType = 'consanguinity' | 'fertility' | 'weight' | 'breeding_ratio';
type LanguageType = 'es' | 'en' | 'pt';

interface Animal {
  id: string;
  name: string | null;
  id_tag: string | null;
  sex: string;
  birth_date: string | null;
  corral_id: string | null;
  father_id: string | null;
  mother_id: string | null;
  status: string;
  peso_actual_kg: number | null;
  ganancia_diaria_kg: number | null;
  peso_destete: number | null;
}

interface Corral {
  id: string;
  name: string;
  capacity: number | null;
  hectareas: number | null;
  animal_count: number;
}

interface AncestryNode {
  id: string;
  fatherId: string | null;
  motherId: string | null;
  paternalGrandparents: string[];
  maternalGrandparents: string[];
  greatGrandparents: string[];
  greatGreatGrandparents: string[];
  greatGreatGreatGrandparents: string[];
  allAncestors: Set<string>;
  ancestorGenerations: Map<string, number>;
}

interface ConsanguinityRisk {
  animal1_id: string;
  animal1_name: string;
  animal2_id: string;
  animal2_name: string;
  relationship: string;
  severity: 'severe' | 'medium' | 'low';
  coefficient: number;
  corral_id: string;
  corral_name: string;
}

interface SuggestedMove {
  animal_id: string;
  animal_name: string;
  from_corral_id: string | null;
  from_corral_name: string | null;
  to_corral_id: string;
  to_corral_name: string;
  reason: string;
  issue_type: string;
  expectedBenefit?: string;
  riskReduction?: number;
}

const translations = {
  es: {
    reuniteWithMother: "Reunir con madre",
    avoidConsanguinity: "Evitar consanguinidad",
    reduceOvercrowding: "Reducir sobrecarga",
    spaceAvailable: "Espacio disponible",
    improveBreeding: "Mejorar potencial reproductivo",
    optimizeWeight: "Optimizar genética de peso",
    groupFertileFemales: "Agrupar hembras fértiles",
    groupHighWeightAnimals: "Agrupar animales con buena genética de peso",
    separateLowPerformers: "Separar bajo rendimiento reproductivo",
    fertilityScore: "fertilidad",
    weightScore: "puntos",
    months: "meses",
    parentChild: "padre-hijo",
    fullSiblings: "hermanos completos",
    halfSiblingsPaternal: "medio hermanos (padre)",
    halfSiblingsMaternal: "medio hermanos (madre)",
    grandparentGrandchild: "abuelo-nieto",
    uncleNieceNephew: "tío-sobrino",
    firstCousins: "primos hermanos",
    halfUncleAunt: "medio tío-sobrino",
    greatGrandparentGrandchild: "bisabuelo-bisnieto",
    greatGreatGrandparentGrandchild: "tatarabuelo-tataranieto",
    greatGreatGreatGrandparentGrandchild: "trastatarabuelo-trastataranieto",
    secondCousins: "primos segundos",
    thirdCousins: "primos terceros",
    firstCousinsOnceRemoved: "primos en primer grado una vez removidos",
    expectedImprovementConsanguinity: "Se reducirán {{count}} riesgos de consanguinidad",
    riskBefore: "Riesgo actual",
    riskAfter: "Riesgo proyectado",
    riskReduction: "Reducción de riesgo",
    risksResolved: "Riesgos resueltos",
    risksRemaining: "Riesgos restantes",
    severe: "severos",
    medium: "medianos",
    low: "bajos",
    expectedImprovementFertility: "Se mejorará el potencial reproductivo en ~{{percent}}%",
    expectedImprovementWeight: "Se optimizará la genética de peso en {{count}} animales",
    moreCorralasNeeded: "Se requieren más corrales para eliminar todos los riesgos",
    maxReductionAchieved: "Máxima reducción posible con los corrales disponibles",
    // Breeding ratio translations
    breedingRatioOptimization: "Optimización de ratio de cría",
    distributeForBreeding: "Distribuir para reproducción",
    femalesPerBull: "hembras por toro",
    createBreedingCorral: "Crear corral reproductivo funcional",
    assignBullToCorral: "Asignar toro a corral con hembras",
    noRelatedFemales: "Sin hembras relacionadas en destino",
    lowRiskRelationships: "relaciones de bajo riesgo con hembras en destino",
    currentRatio: "Ratio actual",
    targetRatio: "Ratio objetivo",
    bullsNeeded: "toros necesarios",
    corralsWithoutBulls: "corrales sin toros",
    breedingDistributionComplete: "Distribución reproductiva completada",
    expectedBreedingImprovement: "Se crearán {{count}} corrales reproductivos funcionales con ratio ~{{ratio}}:1",
    consanguinityWarning: "⚠️ Este toro tiene {{count}} relaciones de bajo riesgo con hembras en el corral destino",
  },
  en: {
    reuniteWithMother: "Reunite with mother",
    avoidConsanguinity: "Avoid consanguinity",
    reduceOvercrowding: "Reduce overcrowding",
    spaceAvailable: "Space available",
    improveBreeding: "Improve reproductive potential",
    optimizeWeight: "Optimize weight genetics",
    groupFertileFemales: "Group fertile females",
    groupHighWeightAnimals: "Group animals with good weight genetics",
    separateLowPerformers: "Separate low reproductive performance",
    fertilityScore: "fertility",
    weightScore: "points",
    months: "months",
    parentChild: "parent-child",
    fullSiblings: "full siblings",
    halfSiblingsPaternal: "half siblings (father)",
    halfSiblingsMaternal: "half siblings (mother)",
    grandparentGrandchild: "grandparent-grandchild",
    uncleNieceNephew: "uncle-niece-nephew",
    firstCousins: "first cousins",
    halfUncleAunt: "half uncle-niece-nephew",
    greatGrandparentGrandchild: "great-grandparent-great-grandchild",
    greatGreatGrandparentGrandchild: "great-great-grandparent-great-great-grandchild",
    greatGreatGreatGrandparentGrandchild: "great-great-great-grandparent",
    secondCousins: "second cousins",
    thirdCousins: "third cousins",
    firstCousinsOnceRemoved: "first cousins once removed",
    expectedImprovementConsanguinity: "{{count}} consanguinity risks will be reduced",
    riskBefore: "Current risk",
    riskAfter: "Projected risk",
    riskReduction: "Risk reduction",
    risksResolved: "Risks resolved",
    risksRemaining: "Risks remaining",
    severe: "severe",
    medium: "medium",
    low: "low",
    expectedImprovementFertility: "Reproductive potential will improve by ~{{percent}}%",
    expectedImprovementWeight: "Weight genetics will be optimized in {{count}} animals",
    moreCorralasNeeded: "More corrals are needed to eliminate all risks",
    maxReductionAchieved: "Maximum reduction achieved with available corrals",
    // Breeding ratio translations
    breedingRatioOptimization: "Breeding ratio optimization",
    distributeForBreeding: "Distribute for breeding",
    femalesPerBull: "females per bull",
    createBreedingCorral: "Create functional breeding corral",
    assignBullToCorral: "Assign bull to corral with females",
    noRelatedFemales: "No related females in destination",
    lowRiskRelationships: "low-risk relationships with females in destination",
    currentRatio: "Current ratio",
    targetRatio: "Target ratio",
    bullsNeeded: "bulls needed",
    corralsWithoutBulls: "corrals without bulls",
    breedingDistributionComplete: "Breeding distribution completed",
    expectedBreedingImprovement: "{{count}} functional breeding corrals will be created with ~{{ratio}}:1 ratio",
    consanguinityWarning: "⚠️ This bull has {{count}} low-risk relationships with females in the destination corral",
  },
  pt: {
    reuniteWithMother: "Reunir com mãe",
    avoidConsanguinity: "Evitar consanguinidade",
    reduceOvercrowding: "Reduzir superlotação",
    spaceAvailable: "Espaço disponível",
    improveBreeding: "Melhorar potencial reprodutivo",
    optimizeWeight: "Otimizar genética de peso",
    groupFertileFemales: "Agrupar fêmeas férteis",
    groupHighWeightAnimals: "Agrupar animais com boa genética de peso",
    separateLowPerformers: "Separar baixo desempenho reprodutivo",
    fertilityScore: "fertilidade",
    weightScore: "pontos",
    months: "meses",
    parentChild: "pai-filho",
    fullSiblings: "irmãos completos",
    halfSiblingsPaternal: "meio irmãos (pai)",
    halfSiblingsMaternal: "meio irmãos (mãe)",
    grandparentGrandchild: "avô-neto",
    uncleNieceNephew: "tio-sobrinho",
    firstCousins: "primos irmãos",
    halfUncleAunt: "meio tio-sobrinho",
    greatGrandparentGrandchild: "bisavô-bisneto",
    greatGreatGrandparentGrandchild: "tataravô-tataraneto",
    greatGreatGreatGrandparentGrandchild: "trastataravô-trastataranetor",
    secondCousins: "primos segundos",
    thirdCousins: "primos terceiros",
    firstCousinsOnceRemoved: "primos em primeiro grau uma vez removidos",
    expectedImprovementConsanguinity: "{{count}} riscos de consanguinidade serão reduzidos",
    riskBefore: "Risco atual",
    riskAfter: "Risco projetado",
    riskReduction: "Redução de risco",
    risksResolved: "Riscos resolvidos",
    risksRemaining: "Riscos restantes",
    severe: "graves",
    medium: "médios",
    low: "baixos",
    expectedImprovementFertility: "O potencial reprodutivo melhorará em ~{{percent}}%",
    expectedImprovementWeight: "A genética de peso será otimizada em {{count}} animais",
    moreCorralasNeeded: "São necessários mais currais para eliminar todos os riscos",
    maxReductionAchieved: "Redução máxima alcançada com os currais disponíveis",
    // Breeding ratio translations
    breedingRatioOptimization: "Otimização de proporção de reprodução",
    distributeForBreeding: "Distribuir para reprodução",
    femalesPerBull: "fêmeas por touro",
    createBreedingCorral: "Criar curral reprodutivo funcional",
    assignBullToCorral: "Atribuir touro ao curral com fêmeas",
    noRelatedFemales: "Sem fêmeas relacionadas no destino",
    lowRiskRelationships: "relações de baixo risco com fêmeas no destino",
    currentRatio: "Proporção atual",
    targetRatio: "Proporção alvo",
    bullsNeeded: "touros necessários",
    corralsWithoutBulls: "currais sem touros",
    breedingDistributionComplete: "Distribuição reprodutiva concluída",
    expectedBreedingImprovement: "{{count}} currais reprodutivos funcionais serão criados com proporção ~{{ratio}}:1",
    consanguinityWarning: "⚠️ Este touro tem {{count}} relações de baixo risco com fêmeas no curral de destino",
  },
};

// Calculate age in months from birth date
function calculateAgeInMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  const yearsDiff = now.getFullYear() - birth.getFullYear();
  const monthsDiff = now.getMonth() - birth.getMonth();
  return yearsDiff * 12 + monthsDiff;
}

// Build ancestry map for all animals with up to 5 generations
function buildAncestryMap(animals: Animal[]): Map<string, AncestryNode> {
  const ancestryMap = new Map<string, AncestryNode>();
  const animalMap = new Map<string, Animal>();
  
  // First pass: create map of all animals by ID
  animals.forEach(a => animalMap.set(a.id, a));
  
  // Helper function to get ancestors at a specific generation
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
  
  // Second pass: build ancestry nodes with up to 5 generations
  animals.forEach(animal => {
    const allAncestors = new Set<string>();
    const ancestorGenerations = new Map<string, number>();
    const paternalGrandparents: string[] = [];
    const maternalGrandparents: string[] = [];
    
    // Generation 1 - Direct parents
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

    const node: AncestryNode = {
      id: animal.id,
      fatherId: animal.father_id,
      motherId: animal.mother_id,
      paternalGrandparents,
      maternalGrandparents,
      greatGrandparents,
      greatGreatGrandparents,
      greatGreatGreatGrandparents,
      allAncestors,
      ancestorGenerations,
    };
    
    ancestryMap.set(animal.id, node);
  });
  
  console.log(`Built ancestry map for ${ancestryMap.size} animals with up to 5 generations`);
  return ancestryMap;
}

// Find relationship between two animals using ancestry map (supports up to 5 generations)
function findRelationship(
  animal1: Animal,
  animal2: Animal,
  ancestryMap: Map<string, AncestryNode>
): { type: string; severity: 'severe' | 'medium' | 'low'; coefficient: number } | null {
  const node1 = ancestryMap.get(animal1.id);
  const node2 = ancestryMap.get(animal2.id);
  
  // 1. Parent-child (coefficient: 0.25, SEVERE)
  if (animal1.id === animal2.father_id || animal1.id === animal2.mother_id) {
    return { type: 'parent-child', severity: 'severe', coefficient: 0.25 };
  }
  if (animal2.id === animal1.father_id || animal2.id === animal1.mother_id) {
    return { type: 'parent-child', severity: 'severe', coefficient: 0.25 };
  }

  // 2. Full siblings (coefficient: 0.25, SEVERE)
  if (animal1.father_id && animal1.mother_id && animal2.father_id && animal2.mother_id) {
    if (animal1.father_id === animal2.father_id && animal1.mother_id === animal2.mother_id) {
      return { type: 'full-siblings', severity: 'severe', coefficient: 0.25 };
    }
  }

  // 3. Grandparent-grandchild (coefficient: 0.125, SEVERE)
  if (node1 && node2) {
    const allGrandparents1 = [...node1.paternalGrandparents, ...node1.maternalGrandparents];
    const allGrandparents2 = [...node2.paternalGrandparents, ...node2.maternalGrandparents];
    
    if (allGrandparents2.includes(animal1.id)) {
      return { type: 'grandparent-grandchild', severity: 'severe', coefficient: 0.125 };
    }
    if (allGrandparents1.includes(animal2.id)) {
      return { type: 'grandparent-grandchild', severity: 'severe', coefficient: 0.125 };
    }
  }

  // 4. Half siblings (coefficient: 0.125, SEVERE)
  if (animal1.father_id && animal2.father_id && animal1.father_id === animal2.father_id) {
    if (!animal1.mother_id || !animal2.mother_id || animal1.mother_id !== animal2.mother_id) {
      return { type: 'half-siblings-paternal', severity: 'severe', coefficient: 0.125 };
    }
  }
  if (animal1.mother_id && animal2.mother_id && animal1.mother_id === animal2.mother_id) {
    if (!animal1.father_id || !animal2.father_id || animal1.father_id !== animal2.father_id) {
      return { type: 'half-siblings-maternal', severity: 'severe', coefficient: 0.125 };
    }
  }

  // 5. Great-grandparent ↔ Great-grandchild (coefficient: 0.0625, MEDIUM)
  if (node1 && node2) {
    if (node2.greatGrandparents && node2.greatGrandparents.includes(animal1.id)) {
      return { type: 'great-grandparent-great-grandchild', severity: 'medium', coefficient: 0.0625 };
    }
    if (node1.greatGrandparents && node1.greatGrandparents.includes(animal2.id)) {
      return { type: 'great-grandparent-great-grandchild', severity: 'medium', coefficient: 0.0625 };
    }
  }

  // 6. Uncle/Aunt-Niece/Nephew (coefficient: 0.0625, MEDIUM)
  if (node2) {
    const animal2Parents = [animal2.father_id, animal2.mother_id].filter(Boolean);
    for (const parentId of animal2Parents) {
      const parent = ancestryMap.get(parentId!);
      if (parent) {
        const sharedFather = animal1.father_id && parent.fatherId && animal1.father_id === parent.fatherId;
        const sharedMother = animal1.mother_id && parent.motherId && animal1.mother_id === parent.motherId;
        if ((sharedFather || sharedMother) && animal1.id !== parentId) {
          return { type: 'uncle-niece-nephew', severity: 'medium', coefficient: 0.0625 };
        }
      }
    }
  }
  if (node1) {
    const animal1Parents = [animal1.father_id, animal1.mother_id].filter(Boolean);
    for (const parentId of animal1Parents) {
      const parent = ancestryMap.get(parentId!);
      if (parent) {
        const sharedFather = animal2.father_id && parent.fatherId && animal2.father_id === parent.fatherId;
        const sharedMother = animal2.mother_id && parent.motherId && animal2.mother_id === parent.motherId;
        if ((sharedFather || sharedMother) && animal2.id !== parentId) {
          return { type: 'uncle-niece-nephew', severity: 'medium', coefficient: 0.0625 };
        }
      }
    }
  }

  // 7. First cousins (coefficient: 0.0625, MEDIUM) - share grandparents
  if (node1 && node2) {
    const allGrandparents1 = [...node1.paternalGrandparents, ...node1.maternalGrandparents];
    const allGrandparents2 = [...node2.paternalGrandparents, ...node2.maternalGrandparents];
    
    const notSiblings = animal1.father_id !== animal2.father_id || animal1.mother_id !== animal2.mother_id;
    if (notSiblings && allGrandparents1.length > 0 && allGrandparents2.length > 0) {
      for (const gp1 of allGrandparents1) {
        if (allGrandparents2.includes(gp1)) {
          return { type: 'first-cousins', severity: 'medium', coefficient: 0.0625 };
        }
      }
    }
  }

  // 8. Great-great-grandparent ↔ Great-great-grandchild (coefficient: 0.03125, LOW)
  if (node1 && node2) {
    if (node2.greatGreatGrandparents && node2.greatGreatGrandparents.includes(animal1.id)) {
      return { type: 'great-great-grandparent', severity: 'low', coefficient: 0.03125 };
    }
    if (node1.greatGreatGrandparents && node1.greatGreatGrandparents.includes(animal2.id)) {
      return { type: 'great-great-grandparent', severity: 'low', coefficient: 0.03125 };
    }
  }

  // 9. First Cousins Once Removed (coefficient: 0.03125, LOW)
  if (node1 && node2) {
    const allGrandparents1 = [...node1.paternalGrandparents, ...node1.maternalGrandparents];
    const allGrandparents2 = [...node2.paternalGrandparents, ...node2.maternalGrandparents];
    
    for (const gp of allGrandparents1) {
      if (node2.greatGrandparents && node2.greatGrandparents.includes(gp)) {
        return { type: 'first-cousins-once-removed', severity: 'low', coefficient: 0.03125 };
      }
    }
    for (const gp of allGrandparents2) {
      if (node1.greatGrandparents && node1.greatGrandparents.includes(gp)) {
        return { type: 'first-cousins-once-removed', severity: 'low', coefficient: 0.03125 };
      }
    }
  }

  // 10. Second cousins (coefficient: 0.03125, LOW) - share great-grandparents
  if (node1 && node2 && node1.greatGrandparents && node2.greatGrandparents) {
    if (node1.greatGrandparents.length > 0 && node2.greatGrandparents.length > 0) {
      for (const ggp1 of node1.greatGrandparents) {
        if (node2.greatGrandparents.includes(ggp1)) {
          return { type: 'second-cousins', severity: 'low', coefficient: 0.03125 };
        }
      }
    }
  }

  // 11. Great-great-great-grandparent (coefficient: 0.015625, LOW)
  if (node1 && node2) {
    if (node2.greatGreatGreatGrandparents && node2.greatGreatGreatGrandparents.includes(animal1.id)) {
      return { type: 'great-great-great-grandparent', severity: 'low', coefficient: 0.015625 };
    }
    if (node1.greatGreatGreatGrandparents && node1.greatGreatGreatGrandparents.includes(animal2.id)) {
      return { type: 'great-great-great-grandparent', severity: 'low', coefficient: 0.015625 };
    }
  }

  // 12. Third cousins (coefficient: 0.015625, LOW) - share great-great-grandparents
  if (node1 && node2 && node1.greatGreatGrandparents && node2.greatGreatGrandparents) {
    if (node1.greatGreatGrandparents.length > 0 && node2.greatGreatGrandparents.length > 0) {
      for (const gggp1 of node1.greatGreatGrandparents) {
        if (node2.greatGreatGrandparents.includes(gggp1)) {
          return { type: 'third-cousins', severity: 'low', coefficient: 0.015625 };
        }
      }
    }
  }

  return null;
}

// Apply breeding ratio as a secondary pass after primary optimization
function applyBreedingRatioSecondary(
  workingDistribution: Record<string, Animal[]>,
  corralsWithCounts: Corral[],
  ancestryMap: Map<string, AncestryNode>,
  movedAnimals: Set<string>,
  females_per_bull: number,
  min_bulls_per_corral: number,
  t: typeof translations.es
): SuggestedMove[] {
  const suggestedMoves: SuggestedMove[] = [];
  const MAX_AGE_MONTHS = 15;

  // Helper: count bulls assigned to a corral in working distribution
  const countBullsInCorral = (corralId: string): number => {
    return (workingDistribution[corralId] || []).filter(a => {
      const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
      return a.sex === 'Macho' && ageMonths >= MAX_AGE_MONTHS;
    }).length;
  };
  
  const countFemalesInCorral = (corralId: string): number => {
    return (workingDistribution[corralId] || []).filter(a => {
      const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
      return a.sex === 'Hembra' && ageMonths >= MAX_AGE_MONTHS;
    }).length;
  };
  
  // Helper: check consanguinity risks between a bull and females in a corral
  const checkBullConsanguinityInCorral = (bull: Animal, corralId: string): { safe: boolean; lowRiskCount: number } => {
    const femalesInCorral = (workingDistribution[corralId] || []).filter(a => {
      const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
      return a.sex === 'Hembra' && ageMonths >= MAX_AGE_MONTHS;
    });
    
    let lowRiskCount = 0;
    for (const female of femalesInCorral) {
      const relationship = findRelationship(bull, female, ancestryMap);
      if (relationship) {
        if (relationship.severity === 'severe' || relationship.severity === 'medium') {
          return { safe: false, lowRiskCount: 0 };
        }
        if (relationship.severity === 'low') {
          lowRiskCount++;
        }
      }
    }
    return { safe: true, lowRiskCount };
  };
  
  // Identify corrals that need bulls (have females but insufficient bulls)
  const corralsNeedingBulls: Array<{ corral: Corral; females: number; currentBulls: number; neededBulls: number }> = [];
  
  for (const corral of corralsWithCounts) {
    const femaleCount = countFemalesInCorral(corral.id);
    const bullCount = countBullsInCorral(corral.id);
    
    if (femaleCount > 0) {
      const neededBulls = Math.max(min_bulls_per_corral, Math.ceil(femaleCount / females_per_bull));
      if (bullCount < neededBulls) {
        corralsNeedingBulls.push({
          corral,
          females: femaleCount,
          currentBulls: bullCount,
          neededBulls: neededBulls - bullCount,
        });
      }
    }
  }
  
  console.log(`[Breeding Ratio Secondary] Corrals needing bulls: ${corralsNeedingBulls.length}`);
  
  // Find bulls that can be moved (in corrals with excess bulls or no females)
  const availableBulls: Animal[] = [];
  
  for (const corral of corralsWithCounts) {
    const femaleCount = countFemalesInCorral(corral.id);
    const bullCount = countBullsInCorral(corral.id);
    const bullsInCorral = (workingDistribution[corral.id] || []).filter(a => {
      const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
      return a.sex === 'Macho' && ageMonths >= MAX_AGE_MONTHS;
    });
    
    // If corral has no females, all bulls can be moved (if not already moved)
    if (femaleCount === 0) {
      availableBulls.push(...bullsInCorral.filter(b => !movedAnimals.has(b.id)));
    } else {
      // Keep minimum bulls needed, rest can be moved
      const minBullsToKeep = Math.max(min_bulls_per_corral, Math.ceil(femaleCount / females_per_bull));
      const excessBulls = bullCount - minBullsToKeep;
      if (excessBulls > 0) {
        const bullsToMove = bullsInCorral.filter(b => !movedAnimals.has(b.id)).slice(0, excessBulls);
        availableBulls.push(...bullsToMove);
      }
    }
  }
  
  console.log(`[Breeding Ratio Secondary] Available bulls to move: ${availableBulls.length}`);
  
  // Sort corrals needing bulls by number of females (prioritize corrals with more females)
  corralsNeedingBulls.sort((a, b) => b.females - a.females);
  
  // Assign bulls to corrals
  for (const target of corralsNeedingBulls) {
    let bullsAssigned = 0;
    
    while (bullsAssigned < target.neededBulls && availableBulls.length > 0) {
      // Find the best bull (no severe/medium consanguinity risks)
      let bestBullIndex = -1;
      let bestBullLowRiskCount = Infinity;
      
      for (let i = 0; i < availableBulls.length; i++) {
        const bull = availableBulls[i];
        if (movedAnimals.has(bull.id)) continue;
        
        const { safe, lowRiskCount } = checkBullConsanguinityInCorral(bull, target.corral.id);
        if (safe && lowRiskCount < bestBullLowRiskCount) {
          bestBullIndex = i;
          bestBullLowRiskCount = lowRiskCount;
        }
      }
      
      if (bestBullIndex === -1) {
        // No safe bull found
        console.log(`[Breeding Ratio Secondary] No safe bull found for ${target.corral.name}`);
        break;
      }
      
      const bull = availableBulls[bestBullIndex];
      
      // Find bull's current corral in working distribution
      let currentCorralId: string | null = null;
      let currentCorralName: string | null = null;
      for (const [cId, anims] of Object.entries(workingDistribution)) {
        if (anims.some(a => a.id === bull.id)) {
          currentCorralId = cId;
          currentCorralName = corralsWithCounts.find(c => c.id === cId)?.name || null;
          break;
        }
      }
      
      // Skip if bull is already in target corral
      if (currentCorralId === target.corral.id) {
        availableBulls.splice(bestBullIndex, 1);
        continue;
      }
      
      // Create move suggestion
      let reason = `${t.assignBullToCorral} (${target.females} ${t.femalesPerBull})`;
      let warning = '';
      
      if (bestBullLowRiskCount > 0) {
        warning = t.consanguinityWarning.replace('{{count}}', String(bestBullLowRiskCount));
      }
      
      suggestedMoves.push({
        animal_id: bull.id,
        animal_name: bull.name || bull.id_tag || 'Sin nombre',
        from_corral_id: currentCorralId,
        from_corral_name: currentCorralName,
        to_corral_id: target.corral.id,
        to_corral_name: target.corral.name,
        reason,
        issue_type: 'breeding_ratio',
        expectedBenefit: warning || t.noRelatedFemales,
      });
      
      // Update working distribution
      if (currentCorralId && workingDistribution[currentCorralId]) {
        workingDistribution[currentCorralId] = workingDistribution[currentCorralId].filter(a => a.id !== bull.id);
      }
      if (!workingDistribution[target.corral.id]) {
        workingDistribution[target.corral.id] = [];
      }
      workingDistribution[target.corral.id].push({ ...bull, corral_id: target.corral.id });
      
      movedAnimals.add(bull.id);
      availableBulls.splice(bestBullIndex, 1);
      bullsAssigned++;
      
      console.log(`[Breeding Ratio Secondary] Assigned ${bull.name || bull.id_tag} to ${target.corral.name}`);
    }
  }
  
  return suggestedMoves;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { 
      cabanaId, 
      language = 'es', 
      objective = 'consanguinity',
      sourceCorrals = [],
      destinationCorrals = [],
      females_per_bull = 25,
      min_bulls_per_corral = 1,
    } = await req.json();

    if (!cabanaId) {
      return new Response(JSON.stringify({ error: 'cabanaId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const t = translations[language as LanguageType] || translations.es;

    console.log(`Optimizing corrals for cabana: ${cabanaId}, objective: ${objective}, language: ${language}`);

    // Fetch ALL animals (including inactive for ancestry reference)
    const { data: allAnimals, error: animalsError } = await supabase
      .from('animals')
      .select('id, name, id_tag, sex, birth_date, corral_id, father_id, mother_id, status, peso_actual_kg, ganancia_diaria_kg, peso_destete')
      .eq('cabaña_id', cabanaId);

    if (animalsError) throw animalsError;

    // Build ancestry map from ALL animals
    const ancestryMap = buildAncestryMap(allAnimals || []);
    console.log(`Built ancestry map for ${ancestryMap.size} animals`);

    // Filter active animals for optimization
    const animals = (allAnimals || []).filter(a => a.status === 'activo');

    // Fetch corrals
    const { data: corrals, error: corralsError } = await supabase
      .from('corrales')
      .select('id, name, capacity, hectareas')
      .eq('cabaña_id', cabanaId);

    if (corralsError) throw corralsError;

    if (!corrals || corrals.length === 0) {
      const messages = {
        es: 'No hay corrales configurados. Crea al menos un corral primero.',
        en: 'No corrals configured. Create at least one corral first.',
        pt: 'Nenhum curral configurado. Crie pelo menos um curral primeiro.',
      };
      return new Response(JSON.stringify({ error: messages[language as keyof typeof messages] || messages.es }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Count animals per corral
    const corralAnimals: Record<string, Animal[]> = {};
    animals.forEach((animal: Animal) => {
      if (animal.corral_id) {
        if (!corralAnimals[animal.corral_id]) {
          corralAnimals[animal.corral_id] = [];
        }
        corralAnimals[animal.corral_id].push(animal);
      }
    });

    const corralsWithCounts: Corral[] = corrals.map((corral: any) => ({
      ...corral,
      animal_count: corralAnimals[corral.id]?.length || 0,
    }));

    // Filter animals based on source corrals
    const animalsToOptimize = sourceCorrals.length > 0
      ? animals.filter((a: Animal) => a.corral_id && sourceCorrals.includes(a.corral_id))
      : animals;

    console.log(`Total animals: ${animals.length}, Animals to optimize: ${animalsToOptimize.length}`);

    // Initialize issues and moves
    const consanguinityRisks: ConsanguinityRisk[] = [];
    const capacityIssues: any[] = [];
    const separationIssues: any[] = [];
    const suggestedMoves: SuggestedMove[] = [];
    const movedAnimals = new Set<string>();

    // Helper to calculate age in months
    const calculateAgeInMonths = (birthDate: string): number => {
      const birth = new Date(birthDate);
      const now = new Date();
      return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    };

    // Helper function to calculate risk score for a corral
    const calculateCorralRiskScore = (animalsInCorral: Animal[]): { totalScore: number; risks: ConsanguinityRisk[] } => {
      const MAX_AGE_MONTHS = 15;
      const risks: ConsanguinityRisk[] = [];
      let totalScore = 0;

      const reproductiveAgeMales = animalsInCorral.filter(a => {
        const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
        return a.sex === 'Macho' && ageMonths >= MAX_AGE_MONTHS;
      });
      const reproductiveAgeFemales = animalsInCorral.filter(a => {
        const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
        return a.sex === 'Hembra' && ageMonths >= MAX_AGE_MONTHS;
      });

      for (const male of reproductiveAgeMales) {
        for (const female of reproductiveAgeFemales) {
          const relationship = findRelationship(male, female, ancestryMap);
          if (relationship) {
            totalScore += relationship.coefficient;
            risks.push({
              animal1_id: male.id,
              animal1_name: male.name || male.id_tag || 'Sin nombre',
              animal2_id: female.id,
              animal2_name: female.name || female.id_tag || 'Sin nombre',
              relationship: relationship.type,
              severity: relationship.severity,
              coefficient: relationship.coefficient,
              corral_id: '',
              corral_name: '',
            });
          }
        }
      }

      return { totalScore, risks };
    };

    // Helper function to calculate total risk score for entire distribution
    const calculateDistributionRiskScore = (distribution: Record<string, Animal[]>): number => {
      let totalScore = 0;
      for (const corralId in distribution) {
        const { totalScore: corralScore } = calculateCorralRiskScore(distribution[corralId]);
        totalScore += corralScore;
      }
      return totalScore;
    };

    // Helper function to simulate a move and calculate new risk score
    const simulateMove = (animal: Animal, targetCorralId: string, currentDistribution: Record<string, Animal[]>): number => {
      const simulatedDistribution: Record<string, Animal[]> = {};
      
      // Copy current distribution
      for (const corralId in currentDistribution) {
        simulatedDistribution[corralId] = [...currentDistribution[corralId]];
      }
      
      // Remove animal from source corral
      if (animal.corral_id && simulatedDistribution[animal.corral_id]) {
        simulatedDistribution[animal.corral_id] = simulatedDistribution[animal.corral_id].filter(a => a.id !== animal.id);
      }
      
      // Add animal to target corral
      if (!simulatedDistribution[targetCorralId]) {
        simulatedDistribution[targetCorralId] = [];
      }
      simulatedDistribution[targetCorralId].push({ ...animal, corral_id: targetCorralId });
      
      return calculateDistributionRiskScore(simulatedDistribution);
    };

    // Helper function to get relationship text
    const getRelationshipText = (relationship: string, t: typeof translations.es): string => {
      const map: Record<string, string> = {
        'parent-child': t.parentChild,
        'full-siblings': t.fullSiblings,
        'half-siblings-paternal': t.halfSiblingsPaternal,
        'half-siblings-maternal': t.halfSiblingsMaternal,
        'grandparent-grandchild': t.grandparentGrandchild,
        'uncle-niece-nephew': t.uncleNieceNephew,
        'first-cousins': t.firstCousins,
        'half-uncle-aunt': t.halfUncleAunt,
      };
      return map[relationship] || relationship;
    };

    // Always detect separation issues (Priority 1)
    const MAX_CALF_AGE_MONTHS = 8;
    for (const animal of animalsToOptimize) {
      if (animal.mother_id && animal.birth_date) {
        const ageMonths = calculateAgeInMonths(animal.birth_date);
        if (ageMonths < MAX_CALF_AGE_MONTHS) {
          const mother = animals.find((a: Animal) => a.id === animal.mother_id);
          if (mother && animal.corral_id !== mother.corral_id) {
            separationIssues.push({
              calf_id: animal.id,
              calf_name: animal.name || animal.id_tag || 'Sin nombre',
              mother_id: mother.id,
              mother_name: mother.name || mother.id_tag || 'Sin nombre',
              calf_corral_id: animal.corral_id,
              mother_corral_id: mother.corral_id,
              age_months: ageMonths,
            });

            if (!movedAnimals.has(animal.id)) {
              const motherCorral = corralsWithCounts.find(c => c.id === mother.corral_id);
              if (motherCorral) {
                const capacity = motherCorral.capacity || (motherCorral.hectareas ? Math.round(motherCorral.hectareas * 2) : 999);
                if (motherCorral.animal_count < capacity) {
                  suggestedMoves.push({
                    animal_id: animal.id,
                    animal_name: animal.name || animal.id_tag || 'Sin nombre',
                    from_corral_id: animal.corral_id,
                    from_corral_name: corralsWithCounts.find(c => c.id === animal.corral_id)?.name || null,
                    to_corral_id: motherCorral.id,
                    to_corral_name: motherCorral.name,
                    reason: `${t.reuniteWithMother} (${ageMonths} ${t.months})`,
                    issue_type: 'separation',
                  });
                  movedAnimals.add(animal.id);
                  motherCorral.animal_count++;
                }
              }
            }
          }
        }
      }
    }

    // Objective-specific optimization
    if (objective === 'consanguinity') {
      // Calculate initial risk score BEFORE any moves
      const initialRiskScore = calculateDistributionRiskScore(corralAnimals);
      console.log(`Initial total risk score: ${initialRiskScore.toFixed(4)}`);

      // Detect all consanguinity risks across all corrals
      const initialRisksBySeverity = { severe: 0, medium: 0, low: 0 };
      
      for (const corral of corralsWithCounts) {
        const animalsInCorral = corralAnimals[corral.id] || [];
        const { risks } = calculateCorralRiskScore(animalsInCorral);
        
        risks.forEach(risk => {
          consanguinityRisks.push({
            ...risk,
            corral_id: corral.id,
            corral_name: corral.name,
          });
          initialRisksBySeverity[risk.severity]++;
        });
      }

      console.log(`Found ${consanguinityRisks.length} consanguinity risks: ${initialRisksBySeverity.severe} severe, ${initialRisksBySeverity.medium} medium, ${initialRisksBySeverity.low} low`);

      // Sort risks by coefficient (most severe first)
      const sortedRisks = [...consanguinityRisks].sort((a, b) => b.coefficient - a.coefficient);
      
      // Track working distribution (copy for simulation)
      const workingDistribution: Record<string, Animal[]> = {};
      for (const corralId in corralAnimals) {
        workingDistribution[corralId] = [...corralAnimals[corralId]];
      }

      // Track risk resolution
      const resolvedRisks = new Set<string>();
      let noImprovementCount = 0;
      const MAX_NO_IMPROVEMENT = 10; // Stop after 10 consecutive moves with no improvement
      
      // Optimize by finding best moves to minimize global risk
      for (const risk of sortedRisks) {
        if (noImprovementCount >= MAX_NO_IMPROVEMENT) {
          console.log(`Stopping optimization: no improvement for ${MAX_NO_IMPROVEMENT} consecutive attempts`);
          break;
        }
        
        const riskKey = `${risk.animal1_id}-${risk.animal2_id}`;
        if (resolvedRisks.has(riskKey)) continue;
        
        // Don't move if either animal was already moved
        if (movedAnimals.has(risk.animal1_id) || movedAnimals.has(risk.animal2_id)) continue;

        const animal1 = animals.find((a: Animal) => a.id === risk.animal1_id);
        const animal2 = animals.find((a: Animal) => a.id === risk.animal2_id);
        
        if (!animal1 || !animal2) continue;

        let bestMove: { animal: Animal; targetCorralId: string; newRisk: number; corral: Corral } | null = null;
        const currentRisk = calculateDistributionRiskScore(workingDistribution);

        // Get available destination corrals
        const availableDestinations = destinationCorrals.length > 0
          ? corralsWithCounts.filter(c => destinationCorrals.includes(c.id))
          : corralsWithCounts;

        // Evaluate moving animal1 to all available corrals
        for (const targetCorral of availableDestinations) {
          // Find current corral of animal1 in working distribution
          let animal1CurrentCorral: string | null = null;
          for (const [cId, anims] of Object.entries(workingDistribution)) {
            if (anims.some(a => a.id === animal1.id)) {
              animal1CurrentCorral = cId;
              break;
            }
          }
          
          if (targetCorral.id === animal1CurrentCorral) continue;
          
          const capacity = targetCorral.capacity || (targetCorral.hectareas ? Math.round(targetCorral.hectareas * 2) : 999);
          const currentCount = workingDistribution[targetCorral.id]?.length || 0;
          if (currentCount >= capacity) continue;

          const newRisk = simulateMove(animal1, targetCorral.id, workingDistribution);
          const riskReduction = currentRisk - newRisk;
          
          // Only consider moves that reduce risk
          if (riskReduction > 0.001) { // Small threshold to avoid floating point issues
            if (!bestMove || newRisk < bestMove.newRisk) {
              bestMove = { animal: animal1, targetCorralId: targetCorral.id, newRisk, corral: targetCorral };
            }
          }
        }

        // Evaluate moving animal2 to all available corrals
        for (const targetCorral of availableDestinations) {
          let animal2CurrentCorral: string | null = null;
          for (const [cId, anims] of Object.entries(workingDistribution)) {
            if (anims.some(a => a.id === animal2.id)) {
              animal2CurrentCorral = cId;
              break;
            }
          }
          
          if (targetCorral.id === animal2CurrentCorral) continue;
          
          const capacity = targetCorral.capacity || (targetCorral.hectareas ? Math.round(targetCorral.hectareas * 2) : 999);
          const currentCount = workingDistribution[targetCorral.id]?.length || 0;
          if (currentCount >= capacity) continue;

          const newRisk = simulateMove(animal2, targetCorral.id, workingDistribution);
          const riskReduction = currentRisk - newRisk;
          
          if (riskReduction > 0.001) {
            if (!bestMove || newRisk < bestMove.newRisk) {
              bestMove = { animal: animal2, targetCorralId: targetCorral.id, newRisk, corral: targetCorral };
            }
          }
        }

        // Apply the best move found
        if (bestMove) {
          const riskReduction = currentRisk - bestMove.newRisk;
          const relationshipText = getRelationshipText(risk.relationship, t);
          
          // Find animal's current corral in working distribution
          let fromCorralId: string | null = null;
          let fromCorralName: string | null = null;
          for (const [cId, anims] of Object.entries(workingDistribution)) {
            if (anims.some(a => a.id === bestMove!.animal.id)) {
              fromCorralId = cId;
              fromCorralName = corralsWithCounts.find(c => c.id === cId)?.name || null;
              break;
            }
          }
          
          suggestedMoves.push({
            animal_id: bestMove.animal.id,
            animal_name: bestMove.animal.name || bestMove.animal.id_tag || 'Sin nombre',
            from_corral_id: fromCorralId,
            from_corral_name: fromCorralName,
            to_corral_id: bestMove.targetCorralId,
            to_corral_name: bestMove.corral.name,
            reason: `${t.avoidConsanguinity}: ${relationshipText}`,
            issue_type: 'consanguinity',
            riskReduction: Math.round(riskReduction * 1000) / 1000,
          });
          
          movedAnimals.add(bestMove.animal.id);
          resolvedRisks.add(riskKey);
          noImprovementCount = 0; // Reset counter
          
          // Update working distribution
          if (fromCorralId && workingDistribution[fromCorralId]) {
            workingDistribution[fromCorralId] = workingDistribution[fromCorralId].filter(a => a.id !== bestMove!.animal.id);
          }
          if (!workingDistribution[bestMove.targetCorralId]) {
            workingDistribution[bestMove.targetCorralId] = [];
          }
          workingDistribution[bestMove.targetCorralId].push({ ...bestMove.animal, corral_id: bestMove.targetCorralId });
          
          console.log(`Move suggested: ${bestMove.animal.name || bestMove.animal.id_tag} → ${bestMove.corral.name}, risk reduction: ${riskReduction.toFixed(4)}`);
        } else {
          noImprovementCount++;
        }
      }

      // Calculate final risk metrics
      const finalRiskScore = calculateDistributionRiskScore(workingDistribution);
      
      // Recalculate remaining risks after optimization
      const remainingRisksBySeverity = { severe: 0, medium: 0, low: 0 };
      let remainingRisksTotal = 0;
      
      for (const corral of corralsWithCounts) {
        const animalsInCorral = workingDistribution[corral.id] || [];
        const { risks } = calculateCorralRiskScore(animalsInCorral);
        risks.forEach(r => {
          remainingRisksBySeverity[r.severity]++;
          remainingRisksTotal++;
        });
      }
      
      const resolvedBySeverity = {
        severe: initialRisksBySeverity.severe - remainingRisksBySeverity.severe,
        medium: initialRisksBySeverity.medium - remainingRisksBySeverity.medium,
        low: initialRisksBySeverity.low - remainingRisksBySeverity.low,
      };

      const reductionPercentage = initialRiskScore > 0 
        ? Math.round(((initialRiskScore - finalRiskScore) / initialRiskScore) * 100)
        : 0;

      console.log(`Final risk score: ${finalRiskScore.toFixed(4)}, reduction: ${reductionPercentage}%`);
      console.log(`Remaining risks: ${remainingRisksTotal} (${remainingRisksBySeverity.severe} severe, ${remainingRisksBySeverity.medium} medium, ${remainingRisksBySeverity.low} low)`);

      // SECONDARY PASS: Apply breeding ratio optimization after consanguinity
      if (females_per_bull > 0 && min_bulls_per_corral > 0) {
        console.log(`Applying breeding ratio secondary pass: ${females_per_bull} females/bull, min ${min_bulls_per_corral} bulls/corral`);
        const breedingMoves = applyBreedingRatioSecondary(
          workingDistribution,
          corralsWithCounts,
          ancestryMap,
          movedAnimals,
          females_per_bull,
          min_bulls_per_corral,
          t
        );
        suggestedMoves.push(...breedingMoves);
        console.log(`Breeding ratio added ${breedingMoves.length} moves`);
      }

      // Build comprehensive risk metrics
      const riskMetrics = {
        riskBefore: initialRiskScore.toFixed(3),
        riskAfter: finalRiskScore.toFixed(3),
        riskReduction: `${reductionPercentage}%`,
        risksResolved: `${resolvedBySeverity.severe} ${t.severe}, ${resolvedBySeverity.medium} ${t.medium}, ${resolvedBySeverity.low} ${t.low}`,
        risksRemaining: `${remainingRisksBySeverity.severe} ${t.severe}, ${remainingRisksBySeverity.medium} ${t.medium}, ${remainingRisksBySeverity.low} ${t.low}`,
        totalRisksInitial: consanguinityRisks.length,
        totalRisksRemaining: remainingRisksTotal,
        initialBySeverity: initialRisksBySeverity,
        remainingBySeverity: remainingRisksBySeverity,
        warning: remainingRisksTotal > 0 && suggestedMoves.filter(m => m.issue_type === 'consanguinity').length === 0 
          ? t.moreCorralasNeeded 
          : (remainingRisksTotal > 0 ? t.maxReductionAchieved : undefined),
      };

      // Generate preview data
      const beforeState = corralsWithCounts.map(corral => ({
        corral_id: corral.id,
        corral_name: corral.name,
        count: corralAnimals[corral.id]?.length || 0,
        capacity: corral.capacity,
        animals: (corralAnimals[corral.id] || []).map(a => a.name || a.id_tag || 'Sin nombre').slice(0, 10),
      }));

      const afterState = corralsWithCounts.map(corral => ({
        corral_id: corral.id,
        corral_name: corral.name,
        count: workingDistribution[corral.id]?.length || 0,
        capacity: corral.capacity,
        animals: (workingDistribution[corral.id] || []).map(a => a.name || a.id_tag || 'Sin nombre').slice(0, 10),
      }));

      const affectedCorrals = new Set<string>();
      suggestedMoves.forEach(move => {
        if (move.from_corral_id) affectedCorrals.add(move.from_corral_id);
        affectedCorrals.add(move.to_corral_id);
      });

      return new Response(
        JSON.stringify({
          objective,
          issues: {
            consanguinity: consanguinityRisks,
            capacity: capacityIssues,
            separation: separationIssues,
          },
          suggestedMoves,
          summary: {
            totalMoves: suggestedMoves.length,
            expectedImprovement: t.expectedImprovementConsanguinity.replace('{{count}}', String(consanguinityRisks.length - remainingRisksTotal)),
            affectedCorrals: affectedCorrals.size,
            ...riskMetrics,
          },
          preview: {
            before: beforeState,
            after: afterState,
          },
          totalIssues: consanguinityRisks.length + capacityIssues.length + separationIssues.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // BREEDING RATIO OPTIMIZATION - Create functional breeding corrals
    if (objective === 'breeding_ratio') {
      console.log(`Starting breeding ratio optimization: ${females_per_bull} females per bull, min ${min_bulls_per_corral} bulls per corral`);
      
      const MAX_AGE_MONTHS = 15;
      
      // Get breeding-age animals
      const breedingAgeFemales = animals.filter((a: Animal) => {
        const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
        return a.sex === 'Hembra' && ageMonths >= MAX_AGE_MONTHS;
      });
      
      const breedingAgeBulls = animals.filter((a: Animal) => {
        const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
        return a.sex === 'Macho' && ageMonths >= MAX_AGE_MONTHS;
      });
      
      console.log(`Breeding-age females: ${breedingAgeFemales.length}, Bulls: ${breedingAgeBulls.length}`);
      
      // Calculate current distribution stats per corral
      const corralStats: Record<string, { females: number; bulls: number; ratio: string; animalsF: Animal[]; animalsM: Animal[] }> = {};
      
      corralsWithCounts.forEach(corral => {
        const animalsInCorral = corralAnimals[corral.id] || [];
        const females = animalsInCorral.filter(a => {
          const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Hembra' && ageMonths >= MAX_AGE_MONTHS;
        });
        const bulls = animalsInCorral.filter(a => {
          const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Macho' && ageMonths >= MAX_AGE_MONTHS;
        });
        
        corralStats[corral.id] = {
          females: females.length,
          bulls: bulls.length,
          ratio: bulls.length > 0 ? `${Math.round(females.length / bulls.length)}:1` : `${females.length}:0`,
          animalsF: females,
          animalsM: bulls,
        };
      });
      
      // Track working distribution
      const workingDistribution: Record<string, Animal[]> = {};
      for (const corralId in corralAnimals) {
        workingDistribution[corralId] = [...corralAnimals[corralId]];
      }
      
      // Helper: count bulls assigned to a corral in working distribution
      const countBullsInCorral = (corralId: string): number => {
        return (workingDistribution[corralId] || []).filter(a => {
          const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Macho' && ageMonths >= MAX_AGE_MONTHS;
        }).length;
      };
      
      const countFemalesInCorral = (corralId: string): number => {
        return (workingDistribution[corralId] || []).filter(a => {
          const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Hembra' && ageMonths >= MAX_AGE_MONTHS;
        }).length;
      };
      
      // Helper: check consanguinity risks between a bull and females in a corral
      const checkBullConsanguinityInCorral = (bull: Animal, corralId: string): { safe: boolean; lowRiskCount: number } => {
        const femalesInCorral = (workingDistribution[corralId] || []).filter(a => {
          const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Hembra' && ageMonths >= MAX_AGE_MONTHS;
        });
        
        let lowRiskCount = 0;
        for (const female of femalesInCorral) {
          const relationship = findRelationship(bull, female, ancestryMap);
          if (relationship) {
            if (relationship.severity === 'severe' || relationship.severity === 'medium') {
              return { safe: false, lowRiskCount: 0 }; // Has severe/medium risk, not safe
            }
            if (relationship.severity === 'low') {
              lowRiskCount++;
            }
          }
        }
        return { safe: true, lowRiskCount };
      };
      
      // Identify corrals that need bulls (have females but insufficient bulls)
      const corralsNeedingBulls: Array<{ corral: Corral; females: number; currentBulls: number; neededBulls: number }> = [];
      
      for (const corral of corralsWithCounts) {
        const femaleCount = countFemalesInCorral(corral.id);
        const bullCount = countBullsInCorral(corral.id);
        
        if (femaleCount > 0) {
          const neededBulls = Math.max(min_bulls_per_corral, Math.ceil(femaleCount / females_per_bull));
          if (bullCount < neededBulls) {
            corralsNeedingBulls.push({
              corral,
              females: femaleCount,
              currentBulls: bullCount,
              neededBulls: neededBulls - bullCount,
            });
          }
        }
      }
      
      console.log(`Corrals needing bulls: ${corralsNeedingBulls.length}`);
      corralsNeedingBulls.forEach(c => {
        console.log(`  - ${c.corral.name}: ${c.females} females, has ${c.currentBulls} bulls, needs ${c.neededBulls} more`);
      });
      
      // Find bulls that can be moved (in corrals with excess bulls or no females)
      const availableBulls: Animal[] = [];
      
      for (const corral of corralsWithCounts) {
        const femaleCount = countFemalesInCorral(corral.id);
        const bullCount = countBullsInCorral(corral.id);
        const bullsInCorral = (workingDistribution[corral.id] || []).filter(a => {
          const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Macho' && ageMonths >= MAX_AGE_MONTHS;
        });
        
        // If corral has no females, all bulls can be moved
        if (femaleCount === 0) {
          availableBulls.push(...bullsInCorral);
        } else {
          // Keep minimum bulls needed, rest can be moved
          const minBullsToKeep = Math.max(min_bulls_per_corral, Math.ceil(femaleCount / females_per_bull));
          const excessBulls = bullCount - minBullsToKeep;
          if (excessBulls > 0) {
            availableBulls.push(...bullsInCorral.slice(0, excessBulls));
          }
        }
      }
      
      console.log(`Available bulls to move: ${availableBulls.length}`);
      
      // Sort corrals needing bulls by number of females (prioritize corrals with more females)
      corralsNeedingBulls.sort((a, b) => b.females - a.females);
      
      // Assign bulls to corrals
      let functionalCorralsCreated = 0;
      
      for (const target of corralsNeedingBulls) {
        let bullsAssigned = 0;
        
        while (bullsAssigned < target.neededBulls && availableBulls.length > 0) {
          // Find the best bull (no severe/medium consanguinity risks)
          let bestBullIndex = -1;
          let bestBullLowRiskCount = Infinity;
          
          for (let i = 0; i < availableBulls.length; i++) {
            const bull = availableBulls[i];
            if (movedAnimals.has(bull.id)) continue;
            
            const { safe, lowRiskCount } = checkBullConsanguinityInCorral(bull, target.corral.id);
            if (safe && lowRiskCount < bestBullLowRiskCount) {
              bestBullIndex = i;
              bestBullLowRiskCount = lowRiskCount;
            }
          }
          
          if (bestBullIndex === -1) {
            // No safe bull found, try to find one with only low risks
            for (let i = 0; i < availableBulls.length; i++) {
              const bull = availableBulls[i];
              if (movedAnimals.has(bull.id)) continue;
              
              const { safe, lowRiskCount } = checkBullConsanguinityInCorral(bull, target.corral.id);
              if (safe) {
                bestBullIndex = i;
                bestBullLowRiskCount = lowRiskCount;
                break;
              }
            }
          }
          
          if (bestBullIndex === -1) {
            console.log(`No safe bull found for ${target.corral.name}`);
            break;
          }
          
          const bull = availableBulls[bestBullIndex];
          const currentCorralId = bull.corral_id;
          const currentCorralName = corralsWithCounts.find(c => c.id === currentCorralId)?.name || null;
          
          // Skip if bull is already in target corral
          if (currentCorralId === target.corral.id) {
            availableBulls.splice(bestBullIndex, 1);
            continue;
          }
          
          // Create move suggestion
          let reason = `${t.assignBullToCorral} (${target.females} ${t.femalesPerBull})`;
          let warning = '';
          
          if (bestBullLowRiskCount > 0) {
            warning = t.consanguinityWarning.replace('{{count}}', String(bestBullLowRiskCount));
          }
          
          suggestedMoves.push({
            animal_id: bull.id,
            animal_name: bull.name || bull.id_tag || 'Sin nombre',
            from_corral_id: currentCorralId,
            from_corral_name: currentCorralName,
            to_corral_id: target.corral.id,
            to_corral_name: target.corral.name,
            reason,
            issue_type: 'breeding_ratio',
            expectedBenefit: warning || t.noRelatedFemales,
          });
          
          // Update working distribution
          if (currentCorralId && workingDistribution[currentCorralId]) {
            workingDistribution[currentCorralId] = workingDistribution[currentCorralId].filter(a => a.id !== bull.id);
          }
          if (!workingDistribution[target.corral.id]) {
            workingDistribution[target.corral.id] = [];
          }
          workingDistribution[target.corral.id].push({ ...bull, corral_id: target.corral.id });
          
          movedAnimals.add(bull.id);
          availableBulls.splice(bestBullIndex, 1);
          bullsAssigned++;
        }
        
        if (bullsAssigned > 0 || target.currentBulls > 0) {
          functionalCorralsCreated++;
        }
      }
      
      // Calculate before/after stats
      const beforeStats = corralsWithCounts.map(corral => {
        const stats = corralStats[corral.id];
        return {
          corral_id: corral.id,
          corral_name: corral.name,
          females: stats?.females || 0,
          bulls: stats?.bulls || 0,
          ratio: stats?.ratio || '0:0',
          count: corralAnimals[corral.id]?.length || 0,
          capacity: corral.capacity,
        };
      });
      
      const afterStats = corralsWithCounts.map(corral => {
        const females = countFemalesInCorral(corral.id);
        const bulls = countBullsInCorral(corral.id);
        return {
          corral_id: corral.id,
          corral_name: corral.name,
          females,
          bulls,
          ratio: bulls > 0 ? `${Math.round(females / bulls)}:1` : `${females}:0`,
          count: workingDistribution[corral.id]?.length || 0,
          capacity: corral.capacity,
        };
      });
      
      const corralsWithoutBullsBefore = beforeStats.filter(s => s.females > 0 && s.bulls === 0).length;
      const corralsWithoutBullsAfter = afterStats.filter(s => s.females > 0 && s.bulls === 0).length;
      
      return new Response(
        JSON.stringify({
          objective: 'breeding_ratio',
          issues: {
            consanguinity: [],
            capacity: capacityIssues,
            separation: separationIssues,
          },
          suggestedMoves,
          summary: {
            totalMoves: suggestedMoves.length,
            expectedImprovement: t.expectedBreedingImprovement
              .replace('{{count}}', String(functionalCorralsCreated))
              .replace('{{ratio}}', String(females_per_bull)),
            affectedCorrals: new Set(suggestedMoves.flatMap(m => [m.from_corral_id, m.to_corral_id].filter(Boolean))).size,
            targetRatio: `${females_per_bull}:1`,
            corralsWithoutBullsBefore,
            corralsWithoutBullsAfter,
            functionalCorralsCreated,
          },
          preview: {
            before: beforeStats,
            after: afterStats,
          },
          breedingStats: {
            totalFemales: breedingAgeFemales.length,
            totalBulls: breedingAgeBulls.length,
            targetRatio: females_per_bull,
            minBullsPerCorral: min_bulls_per_corral,
          },
          totalIssues: capacityIssues.length + separationIssues.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fertility and weight objectives (unchanged logic)
    if (objective === 'fertility') {
      const { data: inseminationsData } = await supabase
        .from('artificial_inseminations')
        .select('female_id, is_pregnant')
        .eq('cabaña_id', cabanaId);

      const fertilityScores: Record<string, number> = {};
      const inseminationsByFemale: Record<string, any[]> = {};
      
      (inseminationsData || []).forEach((ins: any) => {
        if (!inseminationsByFemale[ins.female_id]) {
          inseminationsByFemale[ins.female_id] = [];
        }
        inseminationsByFemale[ins.female_id].push(ins);
      });

      Object.entries(inseminationsByFemale).forEach(([femaleId, inseminations]) => {
        const totalInseminations = inseminations.length;
        const successfulPregnancies = inseminations.filter(i => i.is_pregnant).length;
        fertilityScores[femaleId] = totalInseminations > 0 
          ? Math.round((successfulPregnancies / totalInseminations) * 100)
          : 50;
      });

      const highFertilityFemales = animalsToOptimize.filter(a =>
        a.sex === 'Hembra' && 
        (fertilityScores[a.id] || 50) >= 70 &&
        !movedAnimals.has(a.id)
      );

      const targetCorral = corralsWithCounts
        .filter(c => {
          const capacity = c.capacity || (c.hectareas ? Math.round(c.hectareas * 2) : 999);
          return c.animal_count < capacity - highFertilityFemales.length;
        })
        .sort((a, b) => b.animal_count - a.animal_count)[0];

      if (targetCorral) {
        for (const female of highFertilityFemales.slice(0, 5)) {
          if (female.corral_id !== targetCorral.id) {
            const score = fertilityScores[female.id] || 50;
            suggestedMoves.push({
              animal_id: female.id,
              animal_name: female.name || female.id_tag || 'Sin nombre',
              from_corral_id: female.corral_id,
              from_corral_name: corralsWithCounts.find(c => c.id === female.corral_id)?.name || null,
              to_corral_id: targetCorral.id,
              to_corral_name: targetCorral.name,
              reason: `${t.groupFertileFemales} (>${score}% ${t.fertilityScore})`,
              issue_type: 'fertility',
              expectedBenefit: `${score}% ${t.fertilityScore}`,
            });
            movedAnimals.add(female.id);
            targetCorral.animal_count++;
          }
        }
      }
    } else if (objective === 'weight') {
      const weightScores: Record<string, number> = {};
      
      animalsToOptimize.forEach((animal: Animal) => {
        let score = 0;
        if (animal.peso_actual_kg) score += animal.peso_actual_kg * 0.3;
        if (animal.ganancia_diaria_kg) score += animal.ganancia_diaria_kg * 100;
        if (animal.peso_destete) score += animal.peso_destete * 0.2;
        weightScores[animal.id] = Math.round(score);
      });

      const highWeightAnimals = animalsToOptimize.filter(a =>
        (weightScores[a.id] || 0) >= 100 &&
        !movedAnimals.has(a.id)
      );

      const targetCorral = corralsWithCounts
        .filter(c => {
          const capacity = c.capacity || (c.hectareas ? Math.round(c.hectareas * 2) : 999);
          return c.animal_count < capacity - highWeightAnimals.length;
        })
        .sort((a, b) => b.animal_count - a.animal_count)[0];

      if (targetCorral) {
        for (const animal of highWeightAnimals.slice(0, 5)) {
          if (animal.corral_id !== targetCorral.id) {
            const score = weightScores[animal.id];
            suggestedMoves.push({
              animal_id: animal.id,
              animal_name: animal.name || animal.id_tag || 'Sin nombre',
              from_corral_id: animal.corral_id,
              from_corral_name: corralsWithCounts.find(c => c.id === animal.corral_id)?.name || null,
              to_corral_id: targetCorral.id,
              to_corral_name: targetCorral.name,
              reason: `${t.optimizeWeight} (${score} ${t.weightScore})`,
              issue_type: 'weight',
              expectedBenefit: `${score} ${t.weightScore}`,
            });
            movedAnimals.add(animal.id);
            targetCorral.animal_count++;
          }
        }
      }
    }

    // SECONDARY PASS: Apply breeding ratio optimization after fertility/weight objectives
    if ((objective === 'fertility' || objective === 'weight') && females_per_bull > 0 && min_bulls_per_corral > 0) {
      console.log(`Applying breeding ratio secondary pass for ${objective}: ${females_per_bull} females/bull, min ${min_bulls_per_corral} bulls/corral`);
      
      // Build working distribution from current state
      const workingDistribution: Record<string, Animal[]> = {};
      for (const corralId in corralAnimals) {
        workingDistribution[corralId] = [...corralAnimals[corralId]];
      }
      
      // Apply primary objective moves to working distribution
      suggestedMoves.forEach(move => {
        if (move.from_corral_id && workingDistribution[move.from_corral_id]) {
          workingDistribution[move.from_corral_id] = workingDistribution[move.from_corral_id].filter(a => a.id !== move.animal_id);
        }
        const movedAnimal = animals.find((a: Animal) => a.id === move.animal_id);
        if (movedAnimal && workingDistribution[move.to_corral_id]) {
          workingDistribution[move.to_corral_id].push({ ...movedAnimal, corral_id: move.to_corral_id });
        }
      });
      
      const breedingMoves = applyBreedingRatioSecondary(
        workingDistribution,
        corralsWithCounts,
        ancestryMap,
        movedAnimals,
        females_per_bull,
        min_bulls_per_corral,
        t
      );
      suggestedMoves.push(...breedingMoves);
      console.log(`Breeding ratio added ${breedingMoves.length} moves for ${objective}`);
    }

    // Handle capacity issues
    for (const corral of corralsWithCounts) {
      const capacity = corral.capacity || (corral.hectareas ? Math.round(corral.hectareas * 2) : null);
      if (capacity && corral.animal_count > capacity) {
        capacityIssues.push({
          corral_id: corral.id,
          corral_name: corral.name,
          current_count: corral.animal_count,
          capacity,
          overflow: corral.animal_count - capacity,
        });
      }
    }

    // Generate preview data
    const beforeState = corralsWithCounts.map(corral => ({
      corral_id: corral.id,
      corral_name: corral.name,
      count: corral.animal_count,
      capacity: corral.capacity,
      animals: (corralAnimals[corral.id] || []).map(a => a.name || a.id_tag || 'Sin nombre').slice(0, 10),
    }));

    const afterCounts: Record<string, number> = {};
    corralsWithCounts.forEach(c => {
      afterCounts[c.id] = c.animal_count;
    });

    suggestedMoves.forEach(move => {
      if (move.from_corral_id && afterCounts[move.from_corral_id] !== undefined) {
        afterCounts[move.from_corral_id]--;
      }
      if (afterCounts[move.to_corral_id] !== undefined) {
        afterCounts[move.to_corral_id]++;
      }
    });

    const afterState = corralsWithCounts.map(corral => ({
      corral_id: corral.id,
      corral_name: corral.name,
      count: afterCounts[corral.id] || 0,
      capacity: corral.capacity,
      animals: [],
    }));

    const affectedCorrals = new Set<string>();
    suggestedMoves.forEach(move => {
      if (move.from_corral_id) affectedCorrals.add(move.from_corral_id);
      affectedCorrals.add(move.to_corral_id);
    });

    let expectedImprovement = '';
    if (objective === 'fertility') {
      expectedImprovement = t.expectedImprovementFertility.replace('{{percent}}', '15');
    } else if (objective === 'weight') {
      const count = suggestedMoves.filter(m => m.issue_type === 'weight').length;
      expectedImprovement = t.expectedImprovementWeight.replace('{{count}}', count.toString());
    }

    return new Response(
      JSON.stringify({
        objective,
        issues: {
          consanguinity: consanguinityRisks,
          capacity: capacityIssues,
          separation: separationIssues,
        },
        suggestedMoves,
        summary: {
          totalMoves: suggestedMoves.length,
          expectedImprovement,
          affectedCorrals: affectedCorrals.size,
        },
        preview: {
          before: beforeState,
          after: afterState,
        },
        totalIssues: consanguinityRisks.length + capacityIssues.length + separationIssues.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error optimizing corrals:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
