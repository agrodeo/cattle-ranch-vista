import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ObjectiveType = 'consanguinity' | 'fertility' | 'standards' | 'benchmarks' | 'breeding_ratio';
type SecondaryObjectiveType = 'none' | 'fertility' | 'standards';

interface CustomBenchmark {
  breed: string | null;
  birth_weight_excellent: number;
  birth_weight_good: number;
  birth_weight_poor: number;
  weaning_weight_excellent: number;
  weaning_weight_good: number;
  weaning_weight_poor: number;
  daily_gain_excellent: number;
  daily_gain_good: number;
  daily_gain_poor: number;
  final_weight_excellent: number | null;
  final_weight_good: number | null;
  final_weight_poor: number | null;
  scrotal_circumference_excellent: number | null;
  scrotal_circumference_good: number | null;
  scrotal_circumference_poor: number | null;
  horn_preference: string | null;
}

interface BreedingPairing {
  cow_id: string;
  bull_id: string;
  cow_name: string;
  bull_name: string;
  cow_tag?: string;
  bull_tag?: string;
  score: number;
  inbreeding_coefficient: number;
  blocked: boolean;
  predicted: {
    birth_weight?: number;
    weaning_weight?: number;
    final_weight?: number;
    daily_gain?: number;
  };
  match_quality: 'excellent' | 'good' | 'acceptable' | 'poor';
  explanation: string;
}

// Default benchmarks if none configured
const DEFAULT_BENCHMARKS: CustomBenchmark = {
  breed: null,
  birth_weight_excellent: 38,
  birth_weight_good: 34,
  birth_weight_poor: 28,
  weaning_weight_excellent: 220,
  weaning_weight_good: 190,
  weaning_weight_poor: 160,
  daily_gain_excellent: 0.9,
  daily_gain_good: 0.7,
  daily_gain_poor: 0.5,
  final_weight_excellent: 500,
  final_weight_good: 450,
  final_weight_poor: 380,
  scrotal_circumference_excellent: 38,
  scrotal_circumference_good: 34,
  scrotal_circumference_poor: 30,
  horn_preference: null,
};
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
  peso_nacimiento: number | null;
  peso_final: number | null;
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

interface FutureConsanguinityRisk {
  animal1_id: string;
  animal1_name: string;
  animal1_age_months: number;
  animal2_id: string;
  animal2_name: string;
  animal2_age_months: number;
  relationship: string;
  severity: 'severe' | 'medium' | 'low';
  coefficient: number;
  corral_id: string;
  corral_name: string;
  months_until_active: number;
  warning: string;
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
  secondaryCriterionApplied?: boolean;
  secondaryScore?: number;
  equalOptionsCount?: number;
  alternativeOptions?: { corralName: string; secondaryScore: number }[];
}

const translations = {
  es: {
    reuniteWithMother: "Reunir con madre",
    avoidConsanguinity: "Evitar consanguinidad",
    reduceOvercrowding: "Reducir sobrecarga",
    spaceAvailable: "Espacio disponible",
    improveBreeding: "Mejorar potencial reproductivo",
    optimizeStandards: "Optimizar según estándares de la cabaña",
    groupFertileFemales: "Agrupar hembras fértiles",
    groupHighStandardAnimals: "Agrupar animales que cumplen estándares",
    meetsExcellent: "Cumple estándares de excelencia",
    meetsGood: "Cumple estándares buenos",
    meetsPoor: "Por debajo de estándares",
    standardsScore: "puntos estándares",
    separateLowPerformers: "Separar bajo rendimiento reproductivo",
    fertilityScore: "fertilidad",
    standardsScore: "puntos",
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
    lowRisk: "consanguinidad",
    expectedImprovementFertility: "Se mejorará el potencial reproductivo en ~{{percent}}%",
    expectedImprovementStandards: "Se agruparán {{count}} animales que cumplen los estándares de la cabaña",
    moreCorralasNeeded: "Se requieren más corrales para eliminar todos los riesgos",
    maxReductionAchieved: "Máxima reducción posible con los corrales disponibles",
    breedingRatioOptimization: "Optimización de ratio de cría",
    distributeForBreeding: "Distribuir para reproducción",
    femalesPerBull: "hembras por toro",
    createBreedingCorral: "Crear corral reproductivo funcional",
    assignBullToCorral: "Asignar toro a corral con hembras",
    moveFemaleToBreedingGroup: "Mover hembra a grupo reproductivo",
    createNewBreedingGroup: "Crear nuevo grupo reproductivo",
    noRelatedFemales: "Sin hembras relacionadas en destino",
    lowRiskRelationships: "relaciones de bajo riesgo con hembras en destino",
    currentRatio: "Ratio actual",
    targetRatio: "Ratio objetivo",
    bullsNeeded: "toros necesarios",
    corralsWithoutBulls: "corrales sin toros",
    breedingDistributionComplete: "Distribución reproductiva completada",
    expectedBreedingImprovement: "Se crearán {{count}} corrales reproductivos funcionales con ratio ~{{ratio}}:1",
    consanguinityWarning: "⚠️ Este toro tiene {{count}} relaciones de bajo riesgo con hembras en el corral destino",
    excessBullsCorral: "Corral con exceso de toros",
    excessFemalesCorral: "Corral con exceso de hembras",
    emptyCorralAvailable: "Corral vacío disponible",
    compatibleBull: "Toro compatible sin riesgo severo",
    redistributionNeeded: "Se requiere redistribución",
    movingToBalanceRatio: "Mover para balancear ratio reproductivo",
    futureRisk: "Riesgo futuro",
    futureRiskWarning: "Este animal alcanzará edad reproductiva en {{months}} meses",
    futureRiskDetectedSingular: "1 riesgo futuro de consanguinidad detectado",
    futureRiskDetectedPlural: "{{count}} riesgos futuros de consanguinidad detectados",
    proactiveMoveSuggestion: "Mover proactivamente antes de que alcance edad reproductiva",
    monthsUntilBreedingAge: "meses hasta edad reproductiva",
    alreadyOptimized: "El sistema ya está optimizado. No se encontraron movimientos que mejoren la distribución.",
    consolidationMode: "Modo consolidación",
    consolidatingAnimals: "Consolidando {{count}} animales en {{corrals}} corrales",
    minimizingRisks: "Minimizando riesgos de consanguinidad durante la redistribución",
    consolidationComplete: "Consolidación completada con mínimo riesgo de consanguinidad",
    capacityExceeded: "La capacidad de los corrales destino es insuficiente para {{count}} animales",
    noFurtherOptimizationPossible: "No se pueden reducir más los riesgos con los corrales disponibles.",
    secondaryApplied: "Seleccionado por mejor",
    fertilityOptimized: "fertilidad",
    standardsOptimized: "estándares",
  },
  en: {
    reuniteWithMother: "Reunite with mother",
    avoidConsanguinity: "Avoid consanguinity",
    reduceOvercrowding: "Reduce overcrowding",
    spaceAvailable: "Space available",
    improveBreeding: "Improve reproductive potential",
    optimizeStandards: "Optimize by ranch standards",
    groupFertileFemales: "Group fertile females",
    groupHighStandardAnimals: "Group animals meeting standards",
    meetsExcellent: "Meets excellent standards",
    meetsGood: "Meets good standards",
    meetsPoor: "Below standards",
    standardsScore: "standards score",
    separateLowPerformers: "Separate low reproductive performance",
    fertilityScore: "fertility",
    standardsScore: "points",
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
    lowRisk: "inbreeding",
    expectedImprovementFertility: "Reproductive potential will improve by ~{{percent}}%",
    expectedImprovementStandards: "{{count}} animals meeting ranch standards will be grouped",
    moreCorralasNeeded: "More corrals are needed to eliminate all risks",
    maxReductionAchieved: "Maximum reduction achieved with available corrals",
    breedingRatioOptimization: "Breeding ratio optimization",
    distributeForBreeding: "Distribute for breeding",
    femalesPerBull: "females per bull",
    createBreedingCorral: "Create functional breeding corral",
    assignBullToCorral: "Assign bull to corral with females",
    moveFemaleToBreedingGroup: "Move female to breeding group",
    createNewBreedingGroup: "Create new breeding group",
    noRelatedFemales: "No related females in destination",
    lowRiskRelationships: "low-risk relationships with females in destination",
    currentRatio: "Current ratio",
    targetRatio: "Target ratio",
    bullsNeeded: "bulls needed",
    corralsWithoutBulls: "corrals without bulls",
    breedingDistributionComplete: "Breeding distribution completed",
    expectedBreedingImprovement: "{{count}} functional breeding corrals will be created with ~{{ratio}}:1 ratio",
    consanguinityWarning: "⚠️ This bull has {{count}} low-risk relationships with females in the destination corral",
    excessBullsCorral: "Corral with excess bulls",
    excessFemalesCorral: "Corral with excess females",
    emptyCorralAvailable: "Empty corral available",
    compatibleBull: "Compatible bull without severe risk",
    redistributionNeeded: "Redistribution needed",
    movingToBalanceRatio: "Move to balance breeding ratio",
    futureRisk: "Future risk",
    futureRiskWarning: "This animal will reach breeding age in {{months}} months",
    futureRiskDetectedSingular: "1 future consanguinity risk detected",
    futureRiskDetectedPlural: "{{count}} future consanguinity risks detected",
    proactiveMoveSuggestion: "Move proactively before reaching breeding age",
    monthsUntilBreedingAge: "months until breeding age",
    alreadyOptimized: "The system is already optimized. No moves were found that improve the distribution.",
    consolidationMode: "Consolidation mode",
    consolidatingAnimals: "Consolidating {{count}} animals into {{corrals}} corrals",
    minimizingRisks: "Minimizing consanguinity risks during redistribution",
    consolidationComplete: "Consolidation completed with minimum consanguinity risk",
    capacityExceeded: "Destination corrals capacity is insufficient for {{count}} animals",
    noFurtherOptimizationPossible: "No further optimization possible with available corrals.",
    secondaryApplied: "Selected by better",
    fertilityOptimized: "fertility",
    standardsOptimized: "standards",
  },
  pt: {
    reuniteWithMother: "Reunir com mãe",
    avoidConsanguinity: "Evitar consanguinidade",
    reduceOvercrowding: "Reduzir superlotação",
    spaceAvailable: "Espaço disponível",
    improveBreeding: "Melhorar potencial reprodutivo",
    optimizeStandards: "Otimizar por padrões da cabana",
    groupFertileFemales: "Agrupar fêmeas férteis",
    groupHighStandardAnimals: "Agrupar animais que cumprem padrões",
    meetsExcellent: "Cumpre padrões de excelência",
    meetsGood: "Cumpre padrões bons",
    meetsPoor: "Abaixo dos padrões",
    standardsScore: "pontos padrões",
    separateLowPerformers: "Separar baixo desempenho reprodutivo",
    fertilityScore: "fertilidade",
    standardsScore: "pontos",
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
    lowRisk: "consanguinidade",
    expectedImprovementFertility: "O potencial reprodutivo melhorará em ~{{percent}}%",
    expectedImprovementStandards: "{{count}} animais que cumprem os padrões da cabana serão agrupados",
    moreCorralasNeeded: "São necessários mais currais para eliminar todos os riscos",
    maxReductionAchieved: "Redução máxima alcançada com os currais disponíveis",
    breedingRatioOptimization: "Otimização de proporção de reprodução",
    distributeForBreeding: "Distribuir para reprodução",
    femalesPerBull: "fêmeas por touro",
    createBreedingCorral: "Criar curral reprodutivo funcional",
    assignBullToCorral: "Atribuir touro ao curral com fêmeas",
    moveFemaleToBreedingGroup: "Mover fêmea para grupo reprodutivo",
    createNewBreedingGroup: "Criar novo grupo reprodutivo",
    noRelatedFemales: "Sem fêmeas relacionadas no destino",
    lowRiskRelationships: "relações de baixo risco com fêmeas no destino",
    currentRatio: "Proporção atual",
    targetRatio: "Proporção alvo",
    bullsNeeded: "touros necessários",
    corralsWithoutBulls: "currais sem touros",
    breedingDistributionComplete: "Distribuição reprodutiva concluída",
    expectedBreedingImprovement: "{{count}} currais reprodutivos funcionais serão criados com proporção ~{{ratio}}:1",
    consanguinityWarning: "⚠️ Este touro tem {{count}} relações de baixo risco com fêmeas no curral de destino",
    excessBullsCorral: "Curral com excesso de touros",
    excessFemalesCorral: "Curral com excesso de fêmeas",
    emptyCorralAvailable: "Curral vazio disponível",
    compatibleBull: "Touro compatível sem risco grave",
    redistributionNeeded: "Redistribuição necessária",
    movingToBalanceRatio: "Mover para equilibrar proporção reprodutiva",
    futureRisk: "Risco futuro",
    futureRiskWarning: "Este animal atingirá idade reprodutiva em {{months}} meses",
    futureRiskDetectedSingular: "1 risco futuro de consanguinidade detectado",
    futureRiskDetectedPlural: "{{count}} riscos futuros de consanguinidade detectados",
    proactiveMoveSuggestion: "Mover proativamente antes de atingir idade reprodutiva",
    monthsUntilBreedingAge: "meses até idade reprodutiva",
    alreadyOptimized: "O sistema já está otimizado. Não foram encontrados movimentos que melhorem a distribuição.",
    consolidationMode: "Modo consolidação",
    consolidatingAnimals: "Consolidando {{count}} animais em {{corrals}} currais",
    minimizingRisks: "Minimizando riscos de consanguinidade durante a redistribuição",
    consolidationComplete: "Consolidação concluída com mínimo risco de consanguinidade",
    capacityExceeded: "A capacidade dos currais destino é insuficiente para {{count}} animais",
    noFurtherOptimizationPossible: "Não é possível otimizar mais com os currais disponíveis.",
    secondaryApplied: "Selecionado por melhor",
    fertilityOptimized: "fertilidade",
    standardsOptimized: "padrões",
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

// Predict offspring trait using parental averages
function predictOffspringTrait(
  motherTrait: number | null | undefined,
  fatherTrait: number | null | undefined,
  defaultValue: number
): number | null {
  const motherVal = motherTrait ?? null;
  const fatherVal = fatherTrait ?? null;
  
  if (motherVal !== null && fatherVal !== null) {
    return (motherVal + fatherVal) / 2;
  } else if (motherVal !== null) {
    return (motherVal + defaultValue) / 2;
  } else if (fatherVal !== null) {
    return (fatherVal + defaultValue) / 2;
  }
  return null;
}

// Build ancestry map for all animals with up to 5 generations
function buildAncestryMap(animals: Animal[]): Map<string, AncestryNode> {
  const ancestryMap = new Map<string, AncestryNode>();
  const animalMap = new Map<string, Animal>();
  
  animals.forEach(a => animalMap.set(a.id, a));
  
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
  
  animals.forEach(animal => {
    const allAncestors = new Set<string>();
    const ancestorGenerations = new Map<string, number>();
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
    
    const greatGrandparents = getAncestorsAtGeneration(animal.id, 3);
    greatGrandparents.forEach(id => {
      allAncestors.add(id);
      if (!ancestorGenerations.has(id)) ancestorGenerations.set(id, 3);
    });
    
    const greatGreatGrandparents = getAncestorsAtGeneration(animal.id, 4);
    greatGreatGrandparents.forEach(id => {
      allAncestors.add(id);
      if (!ancestorGenerations.has(id)) ancestorGenerations.set(id, 4);
    });
    
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
  
  return ancestryMap;
}

// Find relationship between two animals
function findRelationship(
  animal1: Animal,
  animal2: Animal,
  ancestryMap: Map<string, AncestryNode>
): { type: string; severity: 'severe' | 'medium' | 'low'; coefficient: number } | null {
  const node1 = ancestryMap.get(animal1.id);
  const node2 = ancestryMap.get(animal2.id);
  
  // Parent-child
  if (animal1.id === animal2.father_id || animal1.id === animal2.mother_id ||
      animal2.id === animal1.father_id || animal2.id === animal1.mother_id) {
    return { type: 'parent-child', severity: 'severe', coefficient: 0.25 };
  }

  // Full siblings
  if (animal1.father_id && animal1.mother_id && animal2.father_id && animal2.mother_id) {
    if (animal1.father_id === animal2.father_id && animal1.mother_id === animal2.mother_id) {
      return { type: 'full-siblings', severity: 'severe', coefficient: 0.25 };
    }
  }

  // Grandparent-grandchild
  if (node1 && node2) {
    const allGrandparents1 = [...node1.paternalGrandparents, ...node1.maternalGrandparents];
    const allGrandparents2 = [...node2.paternalGrandparents, ...node2.maternalGrandparents];
    
    if (allGrandparents2.includes(animal1.id) || allGrandparents1.includes(animal2.id)) {
      return { type: 'grandparent-grandchild', severity: 'severe', coefficient: 0.125 };
    }
  }

  // Half siblings
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

  // Great-grandparent
  if (node1 && node2) {
    if (node2.greatGrandparents?.includes(animal1.id) || node1.greatGrandparents?.includes(animal2.id)) {
      return { type: 'great-grandparent-great-grandchild', severity: 'medium', coefficient: 0.0625 };
    }
  }

  // Uncle/Aunt-Niece/Nephew
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

  // First cousins
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

  // Great-great-grandparent
  if (node1 && node2) {
    if (node2.greatGreatGrandparents?.includes(animal1.id) || node1.greatGreatGrandparents?.includes(animal2.id)) {
      return { type: 'great-great-grandparent', severity: 'low', coefficient: 0.03125 };
    }
  }

  // First Cousins Once Removed
  if (node1 && node2) {
    const allGrandparents1 = [...node1.paternalGrandparents, ...node1.maternalGrandparents];
    const allGrandparents2 = [...node2.paternalGrandparents, ...node2.maternalGrandparents];
    
    for (const gp of allGrandparents1) {
      if (node2.greatGrandparents?.includes(gp)) {
        return { type: 'first-cousins-once-removed', severity: 'low', coefficient: 0.03125 };
      }
    }
    for (const gp of allGrandparents2) {
      if (node1.greatGrandparents?.includes(gp)) {
        return { type: 'first-cousins-once-removed', severity: 'low', coefficient: 0.03125 };
      }
    }
  }

  // Second cousins
  if (node1 && node2 && node1.greatGrandparents && node2.greatGrandparents) {
    for (const ggp1 of node1.greatGrandparents) {
      if (node2.greatGrandparents.includes(ggp1)) {
        return { type: 'second-cousins', severity: 'low', coefficient: 0.03125 };
      }
    }
  }

  // Great-great-great-grandparent
  if (node1 && node2) {
    if (node2.greatGreatGreatGrandparents?.includes(animal1.id) || node1.greatGreatGreatGrandparents?.includes(animal2.id)) {
      return { type: 'great-great-great-grandparent', severity: 'low', coefficient: 0.015625 };
    }
  }

  // Third cousins
  if (node1 && node2 && node1.greatGreatGrandparents && node2.greatGreatGrandparents) {
    for (const gggp1 of node1.greatGreatGrandparents) {
      if (node2.greatGreatGrandparents.includes(gggp1)) {
        return { type: 'third-cousins', severity: 'low', coefficient: 0.015625 };
      }
    }
  }

  return null;
}

// ============================================================================
// NEW: Complete Breeding Redistribution Algorithm
// ============================================================================

interface BreedingGroup {
  bullId: string;
  bullName: string;
  femaleIds: string[];
  targetCorralId: string;
  targetCorralName: string;
}

interface CorralAnalysis {
  corralId: string;
  corralName: string;
  capacity: number;
  currentCount: number;
  females: Animal[];
  bulls: Animal[];
  femaleCount: number;
  bullCount: number;
  currentRatio: number; // females per bull
  imbalanceType: 'excess_bulls' | 'excess_females' | 'balanced' | 'empty' | 'no_bulls';
}

function analyzeCorralDistribution(
  corrals: Corral[],
  corralAnimals: Record<string, Animal[]>,
  targetRatio: number
): CorralAnalysis[] {
  const MIN_AGE_MONTHS = 15;
  
  return corrals.map(corral => {
    const animalsInCorral = corralAnimals[corral.id] || [];
    const females = animalsInCorral.filter(a => {
      const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
      return a.sex === 'Hembra' && ageMonths >= MIN_AGE_MONTHS;
    });
    const bulls = animalsInCorral.filter(a => {
      const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
      return a.sex === 'Macho' && ageMonths >= MIN_AGE_MONTHS;
    });
    
    const femaleCount = females.length;
    const bullCount = bulls.length;
    const capacity = corral.capacity || (corral.hectareas ? Math.round(corral.hectareas * 2) : 999);
    
    let currentRatio = 0;
    if (bullCount > 0) {
      currentRatio = femaleCount / bullCount;
    }
    
    let imbalanceType: CorralAnalysis['imbalanceType'] = 'balanced';
    
    if (femaleCount === 0 && bullCount === 0) {
      imbalanceType = 'empty';
    } else if (femaleCount === 0 && bullCount > 0) {
      // Bulls with no females - they should be distributed
      imbalanceType = 'excess_bulls';
    } else if (femaleCount > 0 && bullCount === 0) {
      // Females with no bulls - need bulls assigned
      imbalanceType = 'no_bulls';
    } else if (bullCount > 0 && currentRatio < targetRatio * 0.5) {
      // Too many bulls for the females (ratio much lower than target)
      imbalanceType = 'excess_bulls';
    } else if (bullCount > 0 && currentRatio > targetRatio * 1.5) {
      // Too few bulls for the females (ratio much higher than target)
      imbalanceType = 'excess_females';
    }
    
    return {
      corralId: corral.id,
      corralName: corral.name,
      capacity,
      currentCount: animalsInCorral.length,
      females,
      bulls,
      femaleCount,
      bullCount,
      currentRatio,
      imbalanceType,
    };
  });
}

function redistributeForOptimalBreeding(
  corralAnalysis: CorralAnalysis[],
  workingDistribution: Record<string, Animal[]>,
  ancestryMap: Map<string, AncestryNode>,
  corralsWithCounts: Corral[],
  targetRatio: number,
  minBullsPerCorral: number,
  movedAnimals: Set<string>,
  t: typeof translations.es
): SuggestedMove[] {
  const suggestedMoves: SuggestedMove[] = [];
  const MIN_AGE_MONTHS = 15;
  
  console.log(`[Redistribution] Starting with target ratio ${targetRatio}:1, min bulls ${minBullsPerCorral}`);
  
  // Helper functions using workingDistribution
  const getBullsInCorral = (corralId: string): Animal[] => {
    return (workingDistribution[corralId] || []).filter(a => {
      const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
      return a.sex === 'Macho' && ageMonths >= MIN_AGE_MONTHS;
    });
  };
  
  const getFemalesInCorral = (corralId: string): Animal[] => {
    return (workingDistribution[corralId] || []).filter(a => {
      const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
      return a.sex === 'Hembra' && ageMonths >= MIN_AGE_MONTHS;
    });
  };
  
  const getCorralCapacity = (corralId: string): number => {
    const corral = corralsWithCounts.find(c => c.id === corralId);
    return corral?.capacity || (corral?.hectareas ? Math.round(corral.hectareas * 2) : 999);
  };
  
  const getCorralCount = (corralId: string): number => {
    return (workingDistribution[corralId] || []).length;
  };
  
  const getCorralName = (corralId: string): string => {
    return corralsWithCounts.find(c => c.id === corralId)?.name || 'Unknown';
  };
  
  // Check if a bull is compatible with females in a corral (no severe/medium risk)
  const checkBullCompatibility = (bull: Animal, femalesInCorral: Animal[]): { safe: boolean; lowRiskCount: number } => {
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
  
  // Move animal in working distribution
  const moveAnimal = (animal: Animal, fromCorralId: string | null, toCorralId: string) => {
    if (fromCorralId && workingDistribution[fromCorralId]) {
      workingDistribution[fromCorralId] = workingDistribution[fromCorralId].filter(a => a.id !== animal.id);
    }
    if (!workingDistribution[toCorralId]) {
      workingDistribution[toCorralId] = [];
    }
    workingDistribution[toCorralId].push({ ...animal, corral_id: toCorralId });
  };
  
  // =========================================================================
  // PHASE 1: Identify empty corrals that can be used for new breeding groups
  // =========================================================================
  const emptyCorrals = corralAnalysis.filter(c => c.imbalanceType === 'empty');
  const excessBullsCorrals = corralAnalysis.filter(c => c.imbalanceType === 'excess_bulls');
  const excessFemalesCorrals = corralAnalysis.filter(c => c.imbalanceType === 'excess_females' || c.imbalanceType === 'no_bulls');
  
  console.log(`[Redistribution] Empty corrals: ${emptyCorrals.length}`);
  console.log(`[Redistribution] Corrals with excess bulls: ${excessBullsCorrals.length}`);
  console.log(`[Redistribution] Corrals needing bulls: ${excessFemalesCorrals.length}`);
  
  // Collect all available bulls (from corrals with excess bulls or no females)
  const availableBulls: { bull: Animal; fromCorralId: string; fromCorralName: string }[] = [];
  
  for (const analysis of excessBullsCorrals) {
    const bulls = getBullsInCorral(analysis.corralId);
    const females = getFemalesInCorral(analysis.corralId);
    
    // If no females, all bulls are available
    if (females.length === 0) {
      for (const bull of bulls) {
        if (!movedAnimals.has(bull.id)) {
          availableBulls.push({
            bull,
            fromCorralId: analysis.corralId,
            fromCorralName: analysis.corralName,
          });
        }
      }
    } else {
      // Keep minimum needed, rest available
      const neededBulls = Math.max(minBullsPerCorral, Math.ceil(females.length / targetRatio));
      const excessCount = bulls.length - neededBulls;
      if (excessCount > 0) {
        const excessBulls = bulls.filter(b => !movedAnimals.has(b.id)).slice(0, excessCount);
        for (const bull of excessBulls) {
          availableBulls.push({
            bull,
            fromCorralId: analysis.corralId,
            fromCorralName: analysis.corralName,
          });
        }
      }
    }
  }
  
  console.log(`[Redistribution] Available bulls to redistribute: ${availableBulls.length}`);
  
  // Collect all females that could be moved (from corrals with too many females per bull or no bulls)
  const movableFemales: { female: Animal; fromCorralId: string; fromCorralName: string; priority: number }[] = [];
  
  for (const analysis of excessFemalesCorrals) {
    const females = getFemalesInCorral(analysis.corralId);
    const bulls = getBullsInCorral(analysis.corralId);
    
    // Calculate how many females should stay based on current bulls
    const maxFemalesWithCurrentBulls = bulls.length * targetRatio;
    const excessFemales = Math.max(0, females.length - maxFemalesWithCurrentBulls);
    
    // If no bulls, priority is highest
    const priority = bulls.length === 0 ? 100 : excessFemales / females.length * 10;
    
    // Add excess females (or all if no bulls)
    const femalesToMove = bulls.length === 0 ? females : females.slice(0, excessFemales);
    for (const female of femalesToMove) {
      if (!movedAnimals.has(female.id)) {
        movableFemales.push({
          female,
          fromCorralId: analysis.corralId,
          fromCorralName: analysis.corralName,
          priority,
        });
      }
    }
  }
  
  // Sort by priority (higher = more urgent to move)
  movableFemales.sort((a, b) => b.priority - a.priority);
  
  console.log(`[Redistribution] Females that could be moved: ${movableFemales.length}`);
  
  // =========================================================================
  // PHASE 2: Create new breeding groups in empty corrals
  // =========================================================================
  
  // Strategy: For each empty corral, try to create a balanced breeding group
  // by assigning compatible bulls and females
  
  const femalesPerGroup = targetRatio;
  let emptyCorralIndex = 0;
  
  // FIXED: Allow creating groups with as few as 1 female when ratio is low (e.g., 2:1)
  const minFemalesForGroup = Math.max(1, Math.min(femalesPerGroup, 2));
  
  console.log(`[Phase 2] Creating breeding groups. Target ratio: ${targetRatio}:1, min females per group: ${minFemalesForGroup}`);
  console.log(`[Phase 2] Empty corrals: ${emptyCorrals.length}, Available bulls: ${availableBulls.length}, Movable females: ${movableFemales.length}`);
  
  while (emptyCorralIndex < emptyCorrals.length && availableBulls.length > 0 && movableFemales.length > 0) {
    const targetCorral = emptyCorrals[emptyCorralIndex];
    const capacity = getCorralCapacity(targetCorral.corralId);
    const currentCount = getCorralCount(targetCorral.corralId);
    
    // Skip if not enough capacity for at least 1 bull + 1 female
    if (currentCount + 2 > capacity) {
      console.log(`[Phase 2] Skipping ${targetCorral.corralName}: not enough capacity`);
      emptyCorralIndex++;
      continue;
    }
    
    // Find compatible females for each available bull
    let bestBullIndex = -1;
    let bestCompatibleFemales: typeof movableFemales = [];
    let bestLowRiskTotal = Infinity;
    
    for (let i = 0; i < availableBulls.length; i++) {
      const { bull } = availableBulls[i];
      if (movedAnimals.has(bull.id)) continue;
      
      // Find females compatible with this bull
      const compatibleFemales: typeof movableFemales = [];
      let totalLowRisk = 0;
      
      for (const femaleInfo of movableFemales) {
        if (movedAnimals.has(femaleInfo.female.id)) continue;
        
        const { safe, lowRiskCount } = checkBullCompatibility(bull, [femaleInfo.female]);
        if (safe) {
          compatibleFemales.push(femaleInfo);
          totalLowRisk += lowRiskCount;
          
          // Collect up to femalesPerGroup compatible females
          if (compatibleFemales.length >= femalesPerGroup) break;
        }
      }
      
      // Prefer bull with most compatible females and least low-risk relationships
      if (compatibleFemales.length > bestCompatibleFemales.length ||
          (compatibleFemales.length === bestCompatibleFemales.length && totalLowRisk < bestLowRiskTotal)) {
        bestBullIndex = i;
        bestCompatibleFemales = compatibleFemales;
        bestLowRiskTotal = totalLowRisk;
      }
    }
    
    // FIXED: Allow groups with at least 1 female (important for low ratios like 2:1)
    const requiredFemales = Math.max(1, Math.min(minFemalesForGroup, movableFemales.filter(f => !movedAnimals.has(f.female.id)).length));
    
    console.log(`[Phase 2] Best match for ${targetCorral.corralName}: bull index ${bestBullIndex}, ${bestCompatibleFemales.length} compatible females (need ${requiredFemales})`);
    
    if (bestBullIndex >= 0 && bestCompatibleFemales.length >= requiredFemales) {
      const { bull, fromCorralId: bullFromCorral, fromCorralName: bullFromCorralName } = availableBulls[bestBullIndex];
      
      // Move bull to new corral
      suggestedMoves.push({
        animal_id: bull.id,
        animal_name: bull.name || bull.id_tag || 'Sin nombre',
        from_corral_id: bullFromCorral,
        from_corral_name: bullFromCorralName,
        to_corral_id: targetCorral.corralId,
        to_corral_name: targetCorral.corralName,
        reason: t.createNewBreedingGroup,
        issue_type: 'breeding_redistribution',
        expectedBenefit: `${t.compatibleBull} - ${bestCompatibleFemales.length} ${t.femalesPerBull}`,
      });
      
      moveAnimal(bull, bullFromCorral, targetCorral.corralId);
      movedAnimals.add(bull.id);
      availableBulls.splice(bestBullIndex, 1);
      
      // Move compatible females
      for (const femaleInfo of bestCompatibleFemales) {
        suggestedMoves.push({
          animal_id: femaleInfo.female.id,
          animal_name: femaleInfo.female.name || femaleInfo.female.id_tag || 'Sin nombre',
          from_corral_id: femaleInfo.fromCorralId,
          from_corral_name: femaleInfo.fromCorralName,
          to_corral_id: targetCorral.corralId,
          to_corral_name: targetCorral.corralName,
          reason: t.moveFemaleToBreedingGroup,
          issue_type: 'breeding_redistribution',
          expectedBenefit: `${t.movingToBalanceRatio} (${targetRatio}:1)`,
        });
        
        moveAnimal(femaleInfo.female, femaleInfo.fromCorralId, targetCorral.corralId);
        movedAnimals.add(femaleInfo.female.id);
        
        // Remove from movableFemales
        const idx = movableFemales.findIndex(f => f.female.id === femaleInfo.female.id);
        if (idx >= 0) movableFemales.splice(idx, 1);
      }
      
      console.log(`[Phase 2] Created breeding group in ${targetCorral.corralName}: 1 bull + ${bestCompatibleFemales.length} females`);
    } else {
      console.log(`[Phase 2] Could not create group in ${targetCorral.corralName}: no compatible bull/females found`);
    }
    
    emptyCorralIndex++;
  }
  
  // =========================================================================
  // PHASE 3: Assign remaining available bulls to corrals needing bulls
  // =========================================================================
  
  // Recalculate which corrals still need bulls after phase 2
  const corralsStillNeedingBulls: { corralId: string; corralName: string; femaleCount: number; neededBulls: number }[] = [];
  
  for (const corral of corralsWithCounts) {
    const females = getFemalesInCorral(corral.id);
    const bulls = getBullsInCorral(corral.id);
    
    if (females.length > 0) {
      const neededBulls = Math.max(minBullsPerCorral, Math.ceil(females.length / targetRatio));
      const deficit = neededBulls - bulls.length;
      
      if (deficit > 0) {
        corralsStillNeedingBulls.push({
          corralId: corral.id,
          corralName: corral.name,
          femaleCount: females.length,
          neededBulls: deficit,
        });
      }
    }
  }
  
  // Sort by number of females (prioritize larger groups)
  corralsStillNeedingBulls.sort((a, b) => b.femaleCount - a.femaleCount);
  
  console.log(`[Redistribution] Corrals still needing bulls: ${corralsStillNeedingBulls.length}`);
  
  // Refresh available bulls list
  const refreshedAvailableBulls: typeof availableBulls = [];
  for (const corral of corralsWithCounts) {
    const bulls = getBullsInCorral(corral.id);
    const females = getFemalesInCorral(corral.id);
    
    if (females.length === 0 && bulls.length > 0) {
      for (const bull of bulls) {
        if (!movedAnimals.has(bull.id)) {
          refreshedAvailableBulls.push({
            bull,
            fromCorralId: corral.id,
            fromCorralName: corral.name,
          });
        }
      }
    } else if (bulls.length > 0) {
      const neededBulls = Math.max(minBullsPerCorral, Math.ceil(females.length / targetRatio));
      const excess = bulls.length - neededBulls;
      if (excess > 0) {
        const excessBulls = bulls.filter(b => !movedAnimals.has(b.id)).slice(0, excess);
        for (const bull of excessBulls) {
          refreshedAvailableBulls.push({
            bull,
            fromCorralId: corral.id,
            fromCorralName: corral.name,
          });
        }
      }
    }
  }
  
  console.log(`[Redistribution] Refreshed available bulls: ${refreshedAvailableBulls.length}`);
  
  // Assign bulls to corrals that need them
  for (const target of corralsStillNeedingBulls) {
    let bullsAssigned = 0;
    
    while (bullsAssigned < target.neededBulls && refreshedAvailableBulls.length > 0) {
      const femalesInTarget = getFemalesInCorral(target.corralId);
      
      let bestBullIndex = -1;
      let bestLowRiskCount = Infinity;
      
      for (let i = 0; i < refreshedAvailableBulls.length; i++) {
        const { bull } = refreshedAvailableBulls[i];
        if (movedAnimals.has(bull.id)) continue;
        
        const { safe, lowRiskCount } = checkBullCompatibility(bull, femalesInTarget);
        if (safe && lowRiskCount < bestLowRiskCount) {
          bestBullIndex = i;
          bestLowRiskCount = lowRiskCount;
        }
      }
      
      if (bestBullIndex === -1) {
        console.log(`[Redistribution] No compatible bull found for ${target.corralName}`);
        break;
      }
      
      const { bull, fromCorralId, fromCorralName } = refreshedAvailableBulls[bestBullIndex];
      
      let warning = '';
      if (bestLowRiskCount > 0) {
        warning = t.consanguinityWarning.replace('{{count}}', String(bestLowRiskCount));
      }
      
      suggestedMoves.push({
        animal_id: bull.id,
        animal_name: bull.name || bull.id_tag || 'Sin nombre',
        from_corral_id: fromCorralId,
        from_corral_name: fromCorralName,
        to_corral_id: target.corralId,
        to_corral_name: target.corralName,
        reason: `${t.assignBullToCorral} (${target.femaleCount} ${t.femalesPerBull})`,
        issue_type: 'breeding_ratio',
        expectedBenefit: warning || t.noRelatedFemales,
      });
      
      moveAnimal(bull, fromCorralId, target.corralId);
      movedAnimals.add(bull.id);
      refreshedAvailableBulls.splice(bestBullIndex, 1);
      bullsAssigned++;
      
      console.log(`[Phase 3] Assigned ${bull.name || bull.id_tag} to ${target.corralName}`);
    }
  }
  
  // =========================================================================
  // PHASE 4: Move excess females to corrals with compatible bulls
  // =========================================================================
  // For corrals that still have too many females relative to their bulls,
  // move excess females to other corrals that have available bulls with space
  
  console.log(`[Phase 4] Redistributing excess females to corrals with compatible bulls`);
  
  // Recalculate corral status
  const corralsWithSpace: { corralId: string; corralName: string; bulls: Animal[]; femaleCount: number; spaceForFemales: number }[] = [];
  
  for (const corral of corralsWithCounts) {
    const animalsInCorral = workingDistribution[corral.id] || [];
    const bulls = animalsInCorral.filter(a => {
      const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
      return a.sex === 'Macho' && ageMonths >= MIN_AGE_MONTHS;
    });
    const females = animalsInCorral.filter(a => {
      const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
      return a.sex === 'Hembra' && ageMonths >= MIN_AGE_MONTHS;
    });
    
    if (bulls.length > 0) {
      const maxFemales = bulls.length * targetRatio;
      const spaceForFemales = maxFemales - females.length;
      
      if (spaceForFemales > 0) {
        const capacity = corral.capacity || (corral.hectareas ? Math.round(corral.hectareas * 2) : 999);
        const totalSpaceInCorral = capacity - animalsInCorral.length;
        const actualSpace = Math.min(spaceForFemales, totalSpaceInCorral);
        
        if (actualSpace > 0) {
          corralsWithSpace.push({
            corralId: corral.id,
            corralName: corral.name,
            bulls: bulls.filter(b => !movedAnimals.has(b.id)),
            femaleCount: females.length,
            spaceForFemales: actualSpace,
          });
        }
      }
    }
  }
  
  console.log(`[Phase 4] Corrals with space for females: ${corralsWithSpace.length}`);
  
  // Recalculate excess females (from corrals with no bulls or too many females per bull)
  const excessFemalesList: { female: Animal; fromCorralId: string; fromCorralName: string }[] = [];
  
  for (const corral of corralsWithCounts) {
    const animalsInCorral = workingDistribution[corral.id] || [];
    const bulls = animalsInCorral.filter(a => {
      const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
      return a.sex === 'Macho' && ageMonths >= MIN_AGE_MONTHS;
    });
    const females = animalsInCorral.filter(a => {
      const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 999;
      return a.sex === 'Hembra' && ageMonths >= MIN_AGE_MONTHS;
    });
    
    if (bulls.length === 0 && females.length > 0) {
      // All females in corral without bulls are excess
      for (const f of females) {
        if (!movedAnimals.has(f.id)) {
          excessFemalesList.push({ female: f, fromCorralId: corral.id, fromCorralName: corral.name });
        }
      }
    } else if (bulls.length > 0) {
      const maxFemales = bulls.length * targetRatio;
      const excessCount = females.length - maxFemales;
      
      if (excessCount > 0) {
        // Take females that haven't been moved yet
        const femalesToMove = females.filter(f => !movedAnimals.has(f.id)).slice(0, excessCount);
        for (const f of femalesToMove) {
          excessFemalesList.push({ female: f, fromCorralId: corral.id, fromCorralName: corral.name });
        }
      }
    }
  }
  
  console.log(`[Phase 4] Excess females to redistribute: ${excessFemalesList.length}`);
  
  // Move excess females to corrals with compatible bulls
  for (const { female, fromCorralId, fromCorralName } of excessFemalesList) {
    if (movedAnimals.has(female.id)) continue;
    
    // Find best destination - corral with compatible bulls and space
    let bestDestination: typeof corralsWithSpace[0] | null = null;
    let bestLowRiskCount = Infinity;
    
    for (const dest of corralsWithSpace) {
      if (dest.spaceForFemales <= 0) continue;
      if (dest.corralId === fromCorralId) continue;
      
      // Check compatibility with ALL bulls in destination
      let isCompatible = true;
      let totalLowRisk = 0;
      
      for (const bull of dest.bulls) {
        const { safe, lowRiskCount } = checkBullCompatibility(bull, [female]);
        if (!safe) {
          isCompatible = false;
          break;
        }
        totalLowRisk += lowRiskCount;
      }
      
      if (isCompatible && totalLowRisk < bestLowRiskCount) {
        bestDestination = dest;
        bestLowRiskCount = totalLowRisk;
      }
    }
    
    if (bestDestination) {
      suggestedMoves.push({
        animal_id: female.id,
        animal_name: female.name || female.id_tag || 'Sin nombre',
        from_corral_id: fromCorralId,
        from_corral_name: fromCorralName,
        to_corral_id: bestDestination.corralId,
        to_corral_name: bestDestination.corralName,
        reason: t.moveFemaleToBreedingGroup,
        issue_type: 'breeding_redistribution',
        expectedBenefit: `${t.movingToBalanceRatio} (${targetRatio}:1)`,
      });
      
      moveAnimal(female, fromCorralId, bestDestination.corralId);
      movedAnimals.add(female.id);
      bestDestination.spaceForFemales--;
      bestDestination.femaleCount++;
      
      console.log(`[Phase 4] Moved ${female.name || female.id_tag} from ${fromCorralName} to ${bestDestination.corralName}`);
    } else {
      console.log(`[Phase 4] No compatible destination found for ${female.name || female.id_tag}`);
    }
  }
  
  console.log(`[Redistribution] Complete. Total moves: ${suggestedMoves.length}`);
  
  return suggestedMoves;
}

// ============================================================================
// Main serve function
// ============================================================================

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
      secondaryObjective = 'none' as SecondaryObjectiveType,
      sourceCorrals = [],
      destinationCorrals = [],
      females_per_bull = 25,
      min_bulls_per_corral = 1,
      applyBreedingRatioPass = false,
      includeSeparationMoves = false,
    } = await req.json();
    
    console.log(`[Config] Objective: ${objective}, Secondary: ${secondaryObjective}, Language: ${language}`);

    if (!cabanaId) {
      return new Response(JSON.stringify({ error: 'cabanaId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const t = translations[language as LanguageType] || translations.es;

    console.log(`Optimizing corrals for cabana: ${cabanaId}, objective: ${objective}, language: ${language}`);
    console.log(`Breeding params: ${females_per_bull} females/bull, min ${min_bulls_per_corral} bulls/corral`);

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

    // Fetch custom benchmarks for cabaña (for standards-based optimization)
    const { data: customBenchmarks } = await supabase
      .from('custom_benchmarks')
      .select('*')
      .eq('cabaña_id', cabanaId);
    
    // Use custom benchmarks if available, otherwise use defaults
    const benchmarks: CustomBenchmark = customBenchmarks && customBenchmarks.length > 0
      ? customBenchmarks[0]
      : DEFAULT_BENCHMARKS;
    
    console.log(`Using benchmarks: ${customBenchmarks?.length ? 'custom' : 'default'}`);

    // Helper: Calculate benchmark-based score for an animal
    const calculateAnimalBenchmarkScore = (animal: Animal): number => {
      let score = 0;
      let metrics = 0;
      
      // Daily gain scoring (most important)
      if (animal.ganancia_diaria_kg !== null && animal.ganancia_diaria_kg > 0) {
        metrics++;
        if (animal.ganancia_diaria_kg >= benchmarks.daily_gain_excellent) {
          score += 100;
        } else if (animal.ganancia_diaria_kg >= benchmarks.daily_gain_good) {
          score += 70;
        } else if (animal.ganancia_diaria_kg >= benchmarks.daily_gain_poor) {
          score += 40;
        } else {
          score += 20;
        }
      }
      
      // Weaning weight scoring
      if (animal.peso_destete !== null && animal.peso_destete > 0) {
        metrics++;
        if (animal.peso_destete >= benchmarks.weaning_weight_excellent) {
          score += 100;
        } else if (animal.peso_destete >= benchmarks.weaning_weight_good) {
          score += 70;
        } else if (animal.peso_destete >= benchmarks.weaning_weight_poor) {
          score += 40;
        } else {
          score += 20;
        }
      }
      
      // Current weight as supplemental (less weight in scoring)
      if (animal.peso_actual_kg !== null && animal.peso_actual_kg > 0) {
        metrics++;
        // Estimate expected weight based on weaning standards (rough approximation)
        const expectedWeight = benchmarks.weaning_weight_good * 1.5; // Adult should be ~1.5x weaning
        if (animal.peso_actual_kg >= expectedWeight * 1.1) {
          score += 80;
        } else if (animal.peso_actual_kg >= expectedWeight) {
          score += 60;
        } else if (animal.peso_actual_kg >= expectedWeight * 0.8) {
          score += 40;
        } else {
          score += 20;
        }
      }
      
      return metrics > 0 ? Math.round(score / metrics) : 50;
    };

    // Helper: Get tier label for an animal's benchmark score
    const getBenchmarkTier = (score: number, t: typeof translations.es): string => {
      if (score >= 85) return t.meetsExcellent;
      if (score >= 55) return t.meetsGood;
      return t.meetsPoor;
    };

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

    // Initialize working distribution
    const workingDistribution: Record<string, Animal[]> = {};
    for (const corralId in corralAnimals) {
      workingDistribution[corralId] = [...corralAnimals[corralId]];
    }
    // Initialize empty corrals
    for (const corral of corralsWithCounts) {
      if (!workingDistribution[corral.id]) {
        workingDistribution[corral.id] = [];
      }
    }

    // Initialize issues and moves
    const consanguinityRisks: ConsanguinityRisk[] = [];
    const capacityIssues: any[] = [];
    const separationIssues: any[] = [];
    const suggestedMoves: SuggestedMove[] = [];
    const movedAnimals = new Set<string>();

    // Helper to calculate age
    const calcAgeInMonths = (birthDate: string): number => {
      const birth = new Date(birthDate);
      const now = new Date();
      return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    };

    // Detect separation issues (only if explicitly requested)
    const MAX_CALF_AGE_MONTHS = 8;
    if (includeSeparationMoves) {
      console.log('Including separation moves (explicitly requested)');
      for (const animal of animals) {
        if (animal.mother_id && animal.birth_date) {
          const ageMonths = calcAgeInMonths(animal.birth_date);
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
                    
                    // Update working distribution
                    if (animal.corral_id && workingDistribution[animal.corral_id]) {
                      workingDistribution[animal.corral_id] = workingDistribution[animal.corral_id].filter(a => a.id !== animal.id);
                    }
                    if (!workingDistribution[motherCorral.id]) {
                      workingDistribution[motherCorral.id] = [];
                    }
                    workingDistribution[motherCorral.id].push({ ...animal, corral_id: motherCorral.id });
                  }
                }
              }
            }
          }
        }
      }
    } else {
      console.log('Skipping separation moves (not requested)');
    }

    // =========================================================================
    // BREEDING RATIO OPTIMIZATION
    // =========================================================================
    if (objective === 'breeding_ratio') {
      console.log(`Starting breeding ratio optimization: ${females_per_bull} females per bull, min ${min_bulls_per_corral} bulls per corral`);
      
      // Analyze current distribution
      const corralAnalysis = analyzeCorralDistribution(corralsWithCounts, workingDistribution, females_per_bull);
      
      // Log analysis
      for (const analysis of corralAnalysis) {
        console.log(`[Analysis] ${analysis.corralName}: ${analysis.femaleCount}F/${analysis.bullCount}M, type=${analysis.imbalanceType}, ratio=${analysis.currentRatio.toFixed(1)}:1`);
      }
      
      // Run comprehensive redistribution
      const redistributionMoves = redistributeForOptimalBreeding(
        corralAnalysis,
        workingDistribution,
        ancestryMap,
        corralsWithCounts,
        females_per_bull,
        min_bulls_per_corral,
        movedAnimals,
        t
      );
      
      suggestedMoves.push(...redistributionMoves);
      
      // Calculate before/after stats
      const MIN_AGE_MONTHS = 15;
      
      const beforeStats = corralsWithCounts.map(corral => {
        const animalsInCorral = corralAnimals[corral.id] || [];
        const females = animalsInCorral.filter(a => {
          const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Hembra' && ageMonths >= MIN_AGE_MONTHS;
        }).length;
        const bulls = animalsInCorral.filter(a => {
          const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Macho' && ageMonths >= MIN_AGE_MONTHS;
        }).length;
        
        return {
          corral_id: corral.id,
          corral_name: corral.name,
          females,
          bulls,
          ratio: bulls > 0 ? `${Math.round(females / bulls)}:1` : `${females}:0`,
          count: animalsInCorral.length,
          capacity: corral.capacity,
        };
      });
      
      const afterStats = corralsWithCounts.map(corral => {
        const animalsInCorral = workingDistribution[corral.id] || [];
        const females = animalsInCorral.filter(a => {
          const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Hembra' && ageMonths >= MIN_AGE_MONTHS;
        }).length;
        const bulls = animalsInCorral.filter(a => {
          const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Macho' && ageMonths >= MIN_AGE_MONTHS;
        }).length;
        
        return {
          corral_id: corral.id,
          corral_name: corral.name,
          females,
          bulls,
          ratio: bulls > 0 ? `${Math.round(females / bulls)}:1` : `${females}:0`,
          count: animalsInCorral.length,
          capacity: corral.capacity,
        };
      });
      
      const corralsWithoutBullsBefore = beforeStats.filter(s => s.females > 0 && s.bulls === 0).length;
      const corralsWithoutBullsAfter = afterStats.filter(s => s.females > 0 && s.bulls === 0).length;
      const functionalCorralsAfter = afterStats.filter(s => s.females > 0 && s.bulls > 0).length;
      
      // Count breeding-age animals
      const breedingAgeFemales = animals.filter((a: Animal) => {
        const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
        return a.sex === 'Hembra' && ageMonths >= MIN_AGE_MONTHS;
      });
      const breedingAgeBulls = animals.filter((a: Animal) => {
        const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
        return a.sex === 'Macho' && ageMonths >= MIN_AGE_MONTHS;
      });
      
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
              .replace('{{count}}', String(functionalCorralsAfter))
              .replace('{{ratio}}', String(females_per_bull)),
            affectedCorrals: new Set(suggestedMoves.flatMap(m => [m.from_corral_id, m.to_corral_id].filter(Boolean))).size,
            targetRatio: `${females_per_bull}:1`,
            corralsWithoutBullsBefore,
            corralsWithoutBullsAfter,
            functionalCorralsCreated: functionalCorralsAfter,
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

    // =========================================================================
    // CONSANGUINITY OPTIMIZATION
    // =========================================================================
    if (objective === 'consanguinity') {
      const MIN_AGE_MONTHS = 15; // Define at section scope for use in all consanguinity code
      
      // Calculate risk score for a corral
      const calculateCorralRiskScore = (animalsInCorral: Animal[]): { totalScore: number; risks: ConsanguinityRisk[] } => {
        const risks: ConsanguinityRisk[] = [];
        let totalScore = 0;

        const reproductiveAgeMales = animalsInCorral.filter(a => {
          const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Macho' && ageMonths >= MIN_AGE_MONTHS;
        });
        const reproductiveAgeFemales = animalsInCorral.filter(a => {
          const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Hembra' && ageMonths >= MIN_AGE_MONTHS;
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

      const calculateDistributionRiskScore = (distribution: Record<string, Animal[]>): number => {
        let totalScore = 0;
        for (const corralId in distribution) {
          const { totalScore: corralScore } = calculateCorralRiskScore(distribution[corralId]);
          totalScore += corralScore;
        }
        return totalScore;
      };

      const simulateMove = (animal: Animal, targetCorralId: string, currentDistribution: Record<string, Animal[]>): number => {
        const simulatedDistribution: Record<string, Animal[]> = {};
        
        for (const corralId in currentDistribution) {
          simulatedDistribution[corralId] = currentDistribution[corralId].filter(a => a.id !== animal.id);
        }
        
        if (!simulatedDistribution[targetCorralId]) {
          simulatedDistribution[targetCorralId] = [];
        }
        simulatedDistribution[targetCorralId].push({ ...animal, corral_id: targetCorralId });
        
        return calculateDistributionRiskScore(simulatedDistribution);
      };

      const getRelationshipText = (relationship: string, t: typeof translations.es): string => {
        const map: Record<string, string> = {
          'parent-child': t.parentChild,
          'full-siblings': t.fullSiblings,
          'half-siblings-paternal': t.halfSiblingsPaternal,
          'half-siblings-maternal': t.halfSiblingsMaternal,
          'grandparent-grandchild': t.grandparentGrandchild,
          'uncle-niece-nephew': t.uncleNieceNephew,
          'first-cousins': t.firstCousins,
          'first-cousins-once-removed': t.firstCousinsOnceRemoved,
          'second-cousins': t.secondCousins,
          'third-cousins': t.thirdCousins,
          'great-grandparent-great-grandchild': t.greatGrandparentGrandchild,
          'great-great-grandparent': t.greatGreatGrandparentGrandchild,
          'great-great-great-grandparent': t.greatGreatGreatGrandparentGrandchild,
          'half-uncle-aunt': t.halfUncleAunt,
        };
        return map[relationship] || relationship;
      };

      // =========================================================================
      // CONSOLIDATION MODE - When user selects specific destination corrals
      // Move ALL animals from source corrals INTO destination corrals
      // while minimizing consanguinity risks
      // =========================================================================
      const isConsolidationMode = destinationCorrals.length > 0 && destinationCorrals.length < corralsWithCounts.length;
      
      if (isConsolidationMode) {
        console.log(`CONSOLIDATION MODE: Redistributing animals into ${destinationCorrals.length} destination corrals`);
        
        // Get target corrals with their capacities
        const targetCorrals = corralsWithCounts.filter(c => destinationCorrals.includes(c.id));
        
        // Get animals to redistribute (from source corrals, or all if no source specified)
        const animalsToRedistribute: Animal[] = [];
        const sourceCorralSet = new Set(sourceCorrals.length > 0 ? sourceCorrals : corralsWithCounts.map(c => c.id));
        
        for (const animal of animals) {
          if (animal.corral_id && sourceCorralSet.has(animal.corral_id)) {
            animalsToRedistribute.push(animal);
          }
        }
        
        console.log(`Consolidating ${animalsToRedistribute.length} animals from ${sourceCorralSet.size} source corrals`);
        
        // Calculate total available capacity in destination corrals
        const totalDestinationCapacity = targetCorrals.reduce((sum, c) => {
          const capacity = c.capacity || (c.hectareas ? Math.round(c.hectareas * 2) : 999);
          return sum + capacity;
        }, 0);
        
        // Count animals already in destination corrals that don't need to move
        const animalsAlreadyInDestination = animalsToRedistribute.filter(a => 
          a.corral_id && destinationCorrals.includes(a.corral_id)
        );
        
        console.log(`${animalsAlreadyInDestination.length} animals already in destination corrals`);
        
        if (animalsToRedistribute.length > totalDestinationCapacity) {
          console.log(`WARNING: Not enough capacity (${totalDestinationCapacity}) for ${animalsToRedistribute.length} animals`);
          return new Response(
            JSON.stringify({
              objective: 'consanguinity',
              error: t.capacityExceeded.replace('{{count}}', String(animalsToRedistribute.length)),
              issues: { consanguinity: [], capacity: [], separation: [] },
              suggestedMoves: [],
              summary: {
                totalMoves: 0,
                expectedImprovement: t.capacityExceeded.replace('{{count}}', String(animalsToRedistribute.length)),
                affectedCorrals: 0,
                capacityNeeded: animalsToRedistribute.length,
                capacityAvailable: totalDestinationCapacity,
              },
              preview: { before: [], after: [] },
              totalIssues: 0,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // Initialize consolidation distribution - start with empty destination corrals
        const consolidationDistribution: Record<string, Animal[]> = {};
        for (const corral of targetCorrals) {
          consolidationDistribution[corral.id] = [];
        }
        
        // Calculate risk score when adding an animal to a corral
        const calculatePlacementRisk = (animal: Animal, targetAnimals: Animal[]): number => {
          let riskScore = 0;
          const animalAge = animal.birth_date ? calcAgeInMonths(animal.birth_date) : 999;
          const isAnimalBreedingAge = animalAge >= MIN_AGE_MONTHS;
          
          for (const existing of targetAnimals) {
            // Only check opposite sex and breeding-age pairs
            if (animal.sex === existing.sex) continue;
            
            const existingAge = existing.birth_date ? calcAgeInMonths(existing.birth_date) : 999;
            const isExistingBreedingAge = existingAge >= MIN_AGE_MONTHS;
            
            if (!isAnimalBreedingAge || !isExistingBreedingAge) continue;
            
            const relationship = findRelationship(animal, existing, ancestryMap);
            if (relationship) {
              riskScore += relationship.coefficient;
            }
          }
          
          return riskScore;
        };
        
        // Sort animals: process bulls first for better distribution, then females
        const sortedAnimals = [...animalsToRedistribute].sort((a, b) => {
          // Males first
          if (a.sex === 'Macho' && b.sex !== 'Macho') return -1;
          if (a.sex !== 'Macho' && b.sex === 'Macho') return 1;
          // Then by age (older first)
          const ageA = a.birth_date ? calcAgeInMonths(a.birth_date) : 0;
          const ageB = b.birth_date ? calcAgeInMonths(b.birth_date) : 0;
          return ageB - ageA;
        });
        
        // Assign each animal to the best destination corral
        const consolidationMoves: SuggestedMove[] = [];
        
        for (const animal of sortedAnimals) {
          let bestCorral: Corral | null = null;
          let bestRiskScore = Infinity;
          
          for (const targetCorral of targetCorrals) {
            const capacity = targetCorral.capacity || (targetCorral.hectareas ? Math.round(targetCorral.hectareas * 2) : 999);
            const currentCount = consolidationDistribution[targetCorral.id].length;
            
            // Skip if full
            if (currentCount >= capacity) continue;
            
            // Calculate risk if placing animal here
            const riskScore = calculatePlacementRisk(animal, consolidationDistribution[targetCorral.id]);
            
            // Prefer corral with lowest risk score, tie-break by current count (spread evenly)
            if (riskScore < bestRiskScore || (riskScore === bestRiskScore && (!bestCorral || currentCount < consolidationDistribution[bestCorral.id].length))) {
              bestRiskScore = riskScore;
              bestCorral = targetCorral;
            }
          }
          
          if (bestCorral) {
            // Add to distribution
            consolidationDistribution[bestCorral.id].push({ ...animal, corral_id: bestCorral.id });
            
            // Generate move suggestion if animal is changing corrals
            if (animal.corral_id !== bestCorral.id) {
              const fromCorral = corralsWithCounts.find(c => c.id === animal.corral_id);
              consolidationMoves.push({
                animal_id: animal.id,
                animal_name: animal.name || animal.id_tag || 'Sin nombre',
                from_corral_id: animal.corral_id,
                from_corral_name: fromCorral?.name || null,
                to_corral_id: bestCorral.id,
                to_corral_name: bestCorral.name,
                reason: bestRiskScore > 0 
                  ? `${t.consolidationMode}: ${t.minimizingRisks}`
                  : t.consolidationMode,
                issue_type: 'consolidation',
                expectedBenefit: t.consolidationComplete,
              });
              movedAnimals.add(animal.id);
            }
          }
        }
        
        console.log(`Generated ${consolidationMoves.length} consolidation moves`);
        
        // Calculate risk metrics for the new distribution
        const finalRiskScore = calculateDistributionRiskScore(consolidationDistribution);
        
        const finalRisksBySeverity = { severe: 0, medium: 0, low: 0 };
        let finalRisksTotal = 0;
        
        for (const corral of targetCorrals) {
          const animalsInCorral = consolidationDistribution[corral.id] || [];
          const { risks } = calculateCorralRiskScore(animalsInCorral);
          risks.forEach(r => {
            finalRisksBySeverity[r.severity]++;
            finalRisksTotal++;
          });
        }
        
        // Build before/after preview
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
          count: consolidationDistribution[corral.id]?.length || 0,
          capacity: corral.capacity,
          animals: (consolidationDistribution[corral.id] || []).map(a => a.name || a.id_tag || 'Sin nombre').slice(0, 10),
        }));
        
        return new Response(
          JSON.stringify({
            objective: 'consanguinity',
            mode: 'consolidation',
            issues: {
              consanguinity: [],
              futureConsanguinity: [],
              capacity: [],
              separation: [],
            },
            suggestedMoves: consolidationMoves,
            summary: {
              totalMoves: consolidationMoves.length,
              expectedImprovement: t.consolidatingAnimals
                .replace('{{count}}', String(animalsToRedistribute.length))
                .replace('{{corrals}}', String(targetCorrals.length)),
              affectedCorrals: targetCorrals.length + (sourceCorrals.length > 0 ? sourceCorrals.length : corralsWithCounts.length),
              riskAfter: finalRiskScore.toFixed(3),
              risksAfterByServerity: finalRisksBySeverity,
              totalRisksAfter: finalRisksTotal,
              consolidationStats: {
                animalsRedistributed: animalsToRedistribute.length,
                movesGenerated: consolidationMoves.length,
                destinationCorrals: targetCorrals.length,
              },
            },
            preview: {
              before: beforeState,
              after: afterState,
            },
            totalIssues: finalRisksTotal,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // =========================================================================
      // STANDARD CONSANGUINITY OPTIMIZATION (no consolidation)
      // =========================================================================

      // Calculate initial risk score
      const initialRiskScore = calculateDistributionRiskScore(workingDistribution);
      console.log(`Initial total risk score: ${initialRiskScore.toFixed(4)}`);

      // Detect all consanguinity risks
      const initialRisksBySeverity = { severe: 0, medium: 0, low: 0 };
      
      for (const corral of corralsWithCounts) {
        const animalsInCorral = workingDistribution[corral.id] || [];
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

      console.log(`Found ${consanguinityRisks.length} consanguinity risks`);

      // =========================================================================
      // FUTURE RISK DETECTION (animals 12-14 months that will soon be breeding age)
      // =========================================================================
      const FUTURE_RISK_MIN_AGE = 12;
      const futureConsanguinityRisks: FutureConsanguinityRisk[] = [];
      
      for (const corral of corralsWithCounts) {
        const animalsInCorral = workingDistribution[corral.id] || [];
        
        // Get animals approaching breeding age (12-14 months)
        const nearBreedingAge = animalsInCorral.filter(a => {
          if (!a.birth_date) return false;
          const ageMonths = calcAgeInMonths(a.birth_date);
          return ageMonths >= FUTURE_RISK_MIN_AGE && ageMonths < MIN_AGE_MONTHS;
        });
        
        // Get breeding-age animals of opposite sex
        const breedingAgeMales = animalsInCorral.filter(a => {
          const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Macho' && ageMonths >= MIN_AGE_MONTHS;
        });
        
        const breedingAgeFemales = animalsInCorral.filter(a => {
          const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Hembra' && ageMonths >= MIN_AGE_MONTHS;
        });
        
        // Check young animals approaching breeding age against existing breeding-age animals
        for (const youngAnimal of nearBreedingAge) {
          const youngAgeMonths = calcAgeInMonths(youngAnimal.birth_date!);
          const monthsUntilActive = MIN_AGE_MONTHS - youngAgeMonths;
          
          // Check against opposite sex breeding-age animals
          const potentialMates = youngAnimal.sex === 'Macho' ? breedingAgeFemales : breedingAgeMales;
          
          for (const mateAnimal of potentialMates) {
            const mateAgeMonths = mateAnimal.birth_date ? calcAgeInMonths(mateAnimal.birth_date) : 999;
            const relationship = findRelationship(youngAnimal, mateAnimal, ancestryMap);
            
            if (relationship && (relationship.severity === 'severe' || relationship.severity === 'medium')) {
              const relationshipText = getRelationshipText(relationship.type, t);
              futureConsanguinityRisks.push({
                animal1_id: youngAnimal.id,
                animal1_name: youngAnimal.name || youngAnimal.id_tag || 'Sin nombre',
                animal1_age_months: youngAgeMonths,
                animal2_id: mateAnimal.id,
                animal2_name: mateAnimal.name || mateAnimal.id_tag || 'Sin nombre',
                animal2_age_months: mateAgeMonths,
                relationship: relationship.type,
                severity: relationship.severity,
                coefficient: relationship.coefficient,
                corral_id: corral.id,
                corral_name: corral.name,
                months_until_active: monthsUntilActive,
                warning: t.futureRiskWarning.replace('{{months}}', String(monthsUntilActive)),
              });
            }
          }
        }
        
        // Also check young animals against each other (if both are near breeding age and opposite sex)
        for (let i = 0; i < nearBreedingAge.length; i++) {
          for (let j = i + 1; j < nearBreedingAge.length; j++) {
            const animal1 = nearBreedingAge[i];
            const animal2 = nearBreedingAge[j];
            
            // Only check opposite sex pairs
            if (animal1.sex === animal2.sex) continue;
            
            const age1 = calcAgeInMonths(animal1.birth_date!);
            const age2 = calcAgeInMonths(animal2.birth_date!);
            const monthsUntilBothActive = Math.max(MIN_AGE_MONTHS - age1, MIN_AGE_MONTHS - age2);
            
            const relationship = findRelationship(animal1, animal2, ancestryMap);
            
            if (relationship && (relationship.severity === 'severe' || relationship.severity === 'medium')) {
              futureConsanguinityRisks.push({
                animal1_id: animal1.id,
                animal1_name: animal1.name || animal1.id_tag || 'Sin nombre',
                animal1_age_months: age1,
                animal2_id: animal2.id,
                animal2_name: animal2.name || animal2.id_tag || 'Sin nombre',
                animal2_age_months: age2,
                relationship: relationship.type,
                severity: relationship.severity,
                coefficient: relationship.coefficient,
                corral_id: corral.id,
                corral_name: corral.name,
                months_until_active: monthsUntilBothActive,
                warning: t.futureRiskWarning.replace('{{months}}', String(monthsUntilBothActive)),
              });
            }
          }
        }
      }
      
      console.log(`Found ${futureConsanguinityRisks.length} future consanguinity risks`);

      // Define available destinations for moves
      const availableDestinations = destinationCorrals.length > 0
        ? corralsWithCounts.filter(c => destinationCorrals.includes(c.id))
        : corralsWithCounts;

      // Generate proactive move suggestions for future risks
      const proactiveMoves: SuggestedMove[] = [];
      
      for (const futureRisk of futureConsanguinityRisks) {
        // Skip if already moved
        if (movedAnimals.has(futureRisk.animal1_id) || movedAnimals.has(futureRisk.animal2_id)) continue;
        
        // Prefer moving the younger animal
        const animalToMove = futureRisk.animal1_age_months < futureRisk.animal2_age_months
          ? animals.find((a: Animal) => a.id === futureRisk.animal1_id)
          : animals.find((a: Animal) => a.id === futureRisk.animal2_id);
        
        if (!animalToMove) continue;
        
        // Find best destination
        let bestDestination: Corral | null = null;
        
        for (const targetCorral of availableDestinations) {
          if (targetCorral.id === futureRisk.corral_id) continue;
          
          const capacity = targetCorral.capacity || 999;
          const currentCount = workingDistribution[targetCorral.id]?.length || 0;
          if (currentCount >= capacity) continue;
          
          // Check if moving there creates new risks
          const animalsInTarget = workingDistribution[targetCorral.id] || [];
          let createsNewRisk = false;
          
          for (const targetAnimal of animalsInTarget) {
            if (targetAnimal.sex === animalToMove.sex) continue;
            const relationship = findRelationship(animalToMove, targetAnimal, ancestryMap);
            if (relationship && (relationship.severity === 'severe' || relationship.severity === 'medium')) {
              createsNewRisk = true;
              break;
            }
          }
          
          if (!createsNewRisk) {
            bestDestination = targetCorral;
            break;
          }
        }
        
        if (bestDestination) {
          const relationshipText = getRelationshipText(futureRisk.relationship, t);
          proactiveMoves.push({
            animal_id: animalToMove.id,
            animal_name: animalToMove.name || animalToMove.id_tag || 'Sin nombre',
            from_corral_id: futureRisk.corral_id,
            from_corral_name: futureRisk.corral_name,
            to_corral_id: bestDestination.id,
            to_corral_name: bestDestination.name,
            reason: `${t.futureRisk}: ${relationshipText} (${futureRisk.months_until_active} ${t.monthsUntilBreedingAge})`,
            issue_type: 'future_consanguinity',
            expectedBenefit: t.proactiveMoveSuggestion,
          });
          movedAnimals.add(animalToMove.id);
        }
      }

      // Optimize by finding best moves
      const sortedRisks = [...consanguinityRisks].sort((a, b) => b.coefficient - a.coefficient);
      const resolvedRisks = new Set<string>();
      let noImprovementCount = 0;
      const MAX_NO_IMPROVEMENT = 10;
      
      for (const risk of sortedRisks) {
        if (noImprovementCount >= MAX_NO_IMPROVEMENT) break;
        
        const riskKey = `${risk.animal1_id}-${risk.animal2_id}`;
        if (resolvedRisks.has(riskKey)) continue;
        if (movedAnimals.has(risk.animal1_id) || movedAnimals.has(risk.animal2_id)) continue;

        const animal1 = animals.find((a: Animal) => a.id === risk.animal1_id);
        const animal2 = animals.find((a: Animal) => a.id === risk.animal2_id);
        if (!animal1 || !animal2) continue;

        // Helper: Calculate secondary score for a corral
        const calculateSecondaryScore = (corralId: string, secondaryObj: SecondaryObjectiveType): number => {
          const animalsInCorral = workingDistribution[corralId] || [];
          if (animalsInCorral.length === 0) return 50; // Neutral score for empty corrals
          
          if (secondaryObj === 'fertility') {
            // Calculate average fertility metrics
            let totalScore = 0;
            let count = 0;
            for (const animal of animalsInCorral) {
              // Use reproductive data if available
              const hasOffspring = animals.some((a: Animal) => a.father_id === animal.id || a.mother_id === animal.id);
              let score = 50; // Base
              if (hasOffspring) score += 30;
              // Check if animal was pregnant
              if ((animal as any).esta_preñada) score += 20;
              totalScore += score;
              count++;
            }
            return count > 0 ? totalScore / count : 50;
          } else if (secondaryObj === 'standards') {
            // Calculate average benchmark-based score using cabaña standards
            let totalScore = 0;
            let count = 0;
            for (const animal of animalsInCorral) {
              const benchmarkScore = calculateAnimalBenchmarkScore(animal);
              totalScore += benchmarkScore;
              count++;
            }
            return count > 0 ? totalScore / count : 50;
          }
          return 50;
        };

        const RISK_SIMILARITY_THRESHOLD = 0.01; // Moves are "similar" if risk difference < 1%
        
        interface MoveCandidate {
          animal: Animal;
          targetCorralId: string;
          targetCorralName: string;
          newRisk: number;
          corral: Corral;
          secondaryScore: number;
          secondaryCriterionApplied: boolean;
        }
        
        // Track all candidates within threshold for transparency
        const allCandidates: MoveCandidate[] = [];
        
        let bestMove: MoveCandidate | null = null;
        const currentRisk = calculateDistributionRiskScore(workingDistribution);

        // Try moving animal1
        for (const targetCorral of availableDestinations) {
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
          if (currentRisk - newRisk > 0.001) {
            const secondaryScore = secondaryObjective !== 'none' 
              ? calculateSecondaryScore(targetCorral.id, secondaryObjective as SecondaryObjectiveType) 
              : 0;
            
            allCandidates.push({ 
              animal: animal1, 
              targetCorralId: targetCorral.id, 
              targetCorralName: targetCorral.name,
              newRisk, 
              corral: targetCorral, 
              secondaryScore, 
              secondaryCriterionApplied: false 
            });
          }
        }

        // Try moving animal2
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
          if (currentRisk - newRisk > 0.001) {
            const secondaryScore = secondaryObjective !== 'none' 
              ? calculateSecondaryScore(targetCorral.id, secondaryObjective as SecondaryObjectiveType) 
              : 0;
            
            allCandidates.push({ 
              animal: animal2, 
              targetCorralId: targetCorral.id, 
              targetCorralName: targetCorral.name,
              newRisk, 
              corral: targetCorral, 
              secondaryScore, 
              secondaryCriterionApplied: false 
            });
          }
        }
        
        // Find best move considering secondary objective
        if (allCandidates.length > 0) {
          // Sort by risk (lowest first)
          allCandidates.sort((a, b) => a.newRisk - b.newRisk);
          const lowestRisk = allCandidates[0].newRisk;
          
          // Find all candidates within threshold of best risk
          const similarCandidates = allCandidates.filter(c => 
            Math.abs(c.newRisk - lowestRisk) <= RISK_SIMILARITY_THRESHOLD
          );
          
          if (similarCandidates.length > 1 && secondaryObjective !== 'none') {
            // Multiple options with similar risk - use secondary criterion
            similarCandidates.sort((a, b) => b.secondaryScore - a.secondaryScore);
            bestMove = { ...similarCandidates[0], secondaryCriterionApplied: true };
          } else {
            bestMove = { ...allCandidates[0], secondaryCriterionApplied: false };
          }
        }

        if (bestMove) {
          const riskReduction = currentRisk - bestMove.newRisk;
          const relationshipText = getRelationshipText(risk.relationship, t);
          
          let fromCorralId: string | null = null;
          let fromCorralName: string | null = null;
          for (const [cId, anims] of Object.entries(workingDistribution)) {
            if (anims.some(a => a.id === bestMove!.animal.id)) {
              fromCorralId = cId;
              fromCorralName = corralsWithCounts.find(c => c.id === cId)?.name || null;
              break;
            }
          }
          
          // Calculate similar options for transparency
          const lowestRisk = allCandidates.length > 0 ? allCandidates[0].newRisk : bestMove.newRisk;
          const similarOptions = allCandidates.filter(c => 
            Math.abs(c.newRisk - lowestRisk) <= RISK_SIMILARITY_THRESHOLD
          );
          const equalOptionsCount = similarOptions.length;
          
          // Get alternative corral names for display
          const alternativeOptions = similarOptions
            .filter(c => c.targetCorralId !== bestMove!.targetCorralId)
            .slice(0, 3)
            .map(c => ({
              corralName: c.targetCorralName,
              secondaryScore: Math.round(c.secondaryScore)
            }));
          
          const secondaryLabel = secondaryObjective === 'fertility' ? t.fertilityOptimized : 
                                secondaryObjective === 'standards' ? t.standardsOptimized : '';
          
          suggestedMoves.push({
            animal_id: bestMove.animal.id,
            animal_name: bestMove.animal.name || bestMove.animal.id_tag || 'Sin nombre',
            from_corral_id: fromCorralId,
            from_corral_name: fromCorralName,
            to_corral_id: bestMove.targetCorralId,
            to_corral_name: bestMove.corral.name,
            reason: bestMove.secondaryCriterionApplied 
              ? `${t.avoidConsanguinity}: ${relationshipText} (${t.secondaryApplied} ${secondaryLabel})`
              : `${t.avoidConsanguinity}: ${relationshipText}`,
            issue_type: 'consanguinity',
            riskReduction: Math.round(riskReduction * 1000) / 1000,
            secondaryCriterionApplied: bestMove.secondaryCriterionApplied,
            secondaryScore: bestMove.secondaryScore,
            equalOptionsCount,
            alternativeOptions,
          });
          
          movedAnimals.add(bestMove.animal.id);
          resolvedRisks.add(riskKey);
          noImprovementCount = 0;
          
          // Update working distribution
          if (fromCorralId && workingDistribution[fromCorralId]) {
            workingDistribution[fromCorralId] = workingDistribution[fromCorralId].filter(a => a.id !== bestMove!.animal.id);
          }
          if (!workingDistribution[bestMove.targetCorralId]) {
            workingDistribution[bestMove.targetCorralId] = [];
          }
          workingDistribution[bestMove.targetCorralId].push({ ...bestMove.animal, corral_id: bestMove.targetCorralId });
        } else {
          noImprovementCount++;
        }
      }

      // Calculate final risk metrics
      const finalRiskScore = calculateDistributionRiskScore(workingDistribution);
      
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

      // Secondary pass: breeding ratio (only if explicitly requested)
      if (applyBreedingRatioPass && females_per_bull > 0 && min_bulls_per_corral > 0) {
        console.log(`Applying breeding ratio secondary pass (explicitly requested)`);
        const corralAnalysis = analyzeCorralDistribution(corralsWithCounts, workingDistribution, females_per_bull);
        const breedingMoves = redistributeForOptimalBreeding(
          corralAnalysis,
          workingDistribution,
          ancestryMap,
          corralsWithCounts,
          females_per_bull,
          min_bulls_per_corral,
          movedAnimals,
          t
        );
        suggestedMoves.push(...breedingMoves);
      } else {
        console.log(`Skipping breeding ratio pass (not requested for consanguinity objective)`);
      }

      // Add proactive moves for future risks
      suggestedMoves.push(...proactiveMoves);
      console.log(`Added ${proactiveMoves.length} proactive moves for future risks`);

      const riskMetrics = {
        riskBefore: initialRiskScore.toFixed(3),
        riskAfter: finalRiskScore.toFixed(3),
        riskReduction: `${reductionPercentage}%`,
        risksResolved: `${resolvedBySeverity.severe} ${t.severe}, ${resolvedBySeverity.medium} ${t.medium}, ${resolvedBySeverity.low} ${t.low}`,
        risksRemaining: `${remainingRisksBySeverity.severe} ${t.severe}, ${remainingRisksBySeverity.medium} ${t.medium}, ${remainingRisksBySeverity.low} ${t.low}`,
        totalRisksInitial: consanguinityRisks.length,
        totalRisksRemaining: remainingRisksTotal,
        futureRisksDetected: futureConsanguinityRisks.length,
        futureRisksMessage: futureConsanguinityRisks.length > 0 
          ? (futureConsanguinityRisks.length === 1 
              ? t.futureRiskDetectedSingular
              : t.futureRiskDetectedPlural.replace('{{count}}', String(futureConsanguinityRisks.length)))
          : undefined,
        initialBySeverity: initialRisksBySeverity,
        remainingBySeverity: remainingRisksBySeverity,
        warning: remainingRisksTotal > 0 && suggestedMoves.filter(m => m.issue_type === 'consanguinity').length === 0 
          ? t.moreCorralasNeeded 
          : (remainingRisksTotal > 0 ? t.maxReductionAchieved : undefined),
      };

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

      // Filter moves by objective - only include consanguinity-related moves for consanguinity objective
      const filteredMoves = suggestedMoves.filter(m => 
        m.issue_type === 'consanguinity' || m.issue_type === 'future_consanguinity'
      );
      
      console.log(`Filtered ${suggestedMoves.length} moves to ${filteredMoves.length} consanguinity-related moves`);

      // Check if already optimized (no moves can help but risks remain)
      if (filteredMoves.length === 0 && consanguinityRisks.length > 0) {
        console.log('Already optimized - no further moves can reduce consanguinity risks');
        return new Response(
          JSON.stringify({
            objective,
            issues: {
              consanguinity: consanguinityRisks,
              futureConsanguinity: futureConsanguinityRisks,
              capacity: capacityIssues,
              separation: separationIssues,
            },
            suggestedMoves: [],
            summary: {
              totalMoves: 0,
              expectedImprovement: t.alreadyOptimized || 'El sistema ya está optimizado. No se pueden reducir más los riesgos con los corrales disponibles.',
              affectedCorrals: 0,
              ...riskMetrics,
              message: t.noFurtherOptimizationPossible || 'No se encontraron movimientos adicionales que mejoren la distribución.',
            },
            preview: {
              before: beforeState,
              after: beforeState, // No changes
            },
            totalIssues: consanguinityRisks.length + futureConsanguinityRisks.length,
            alreadyOptimized: true,
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Recalculate affected corrals based on filtered moves
      const filteredAffectedCorrals = new Set<string>();
      filteredMoves.forEach(move => {
        if (move.from_corral_id) filteredAffectedCorrals.add(move.from_corral_id);
        filteredAffectedCorrals.add(move.to_corral_id);
      });

      return new Response(
        JSON.stringify({
          objective,
          issues: {
            consanguinity: consanguinityRisks,
            futureConsanguinity: futureConsanguinityRisks,
            capacity: capacityIssues,
            separation: separationIssues,
          },
          suggestedMoves: filteredMoves,
          summary: {
            totalMoves: filteredMoves.length,
            expectedImprovement: t.expectedImprovementConsanguinity.replace('{{count}}', String(consanguinityRisks.length - remainingRisksTotal)),
            affectedCorrals: filteredAffectedCorrals.size,
            ...riskMetrics,
          },
          preview: {
            before: beforeState,
            after: afterState,
          },
          totalIssues: consanguinityRisks.length + futureConsanguinityRisks.length + capacityIssues.length + separationIssues.length,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =========================================================================
    // FERTILITY OBJECTIVE - COMPREHENSIVE IMPLEMENTATION
    // =========================================================================
    if (objective === 'fertility') {
      console.log('Starting comprehensive fertility optimization');
      
      // -------------------------------------------------------------------------
      // PHASE 1: Fetch all reproductive data
      // -------------------------------------------------------------------------
      
      // Fetch pregnancy data (preñeces)
      const { data: pregnancyData } = await supabase
        .from('preñeces')
        .select('animal_id, estado_final, cria_id')
        .eq('cabaña_id', cabanaId);
      
      // Fetch AI insemination data
      const { data: aiInseminationsData } = await supabase
        .from('artificial_inseminations')
        .select('female_id, bull_id, is_pregnant')
        .eq('cabaña_id', cabanaId);
      
      // Fetch IA data (service records with bull info)
      const { data: iaData } = await supabase
        .from('ia')
        .select('toro_id, animales_ids, evento_id')
        .not('evento_id', 'is', null);
      
      console.log(`Fetched data: ${pregnancyData?.length || 0} pregnancies, ${aiInseminationsData?.length || 0} AI records, ${iaData?.length || 0} IA records`);
      
      // -------------------------------------------------------------------------
      // PHASE 2: Calculate Fertility Scores
      // -------------------------------------------------------------------------
      
      // Calculate offspring count for females (as mothers)
      const offspringByMother: Record<string, number> = {};
      animals.forEach((animal: Animal) => {
        if (animal.mother_id) {
          offspringByMother[animal.mother_id] = (offspringByMother[animal.mother_id] || 0) + 1;
        }
      });
      
      // Calculate offspring sired count for males (as fathers)
      const offspringByFather: Record<string, number> = {};
      animals.forEach((animal: Animal) => {
        if (animal.father_id) {
          offspringByFather[animal.father_id] = (offspringByFather[animal.father_id] || 0) + 1;
        }
      });
      
      // Process pregnancy records
      const pregnanciesByAnimal: Record<string, { successful: number; failed: number; total: number }> = {};
      (pregnancyData || []).forEach((p: any) => {
        if (!pregnanciesByAnimal[p.animal_id]) {
          pregnanciesByAnimal[p.animal_id] = { successful: 0, failed: 0, total: 0 };
        }
        pregnanciesByAnimal[p.animal_id].total++;
        if (p.estado_final === 'exitosa') {
          pregnanciesByAnimal[p.animal_id].successful++;
        } else if (p.estado_final === 'fallida') {
          pregnanciesByAnimal[p.animal_id].failed++;
        }
      });
      
      // Process AI inseminations by female
      const aiByFemale: Record<string, { total: number; successful: number }> = {};
      (aiInseminationsData || []).forEach((ai: any) => {
        if (!aiByFemale[ai.female_id]) {
          aiByFemale[ai.female_id] = { total: 0, successful: 0 };
        }
        aiByFemale[ai.female_id].total++;
        if (ai.is_pregnant) aiByFemale[ai.female_id].successful++;
      });
      
      // Process AI inseminations by bull
      const aiByBull: Record<string, { total: number; successful: number }> = {};
      (aiInseminationsData || []).forEach((ai: any) => {
        if (ai.bull_id) {
          if (!aiByBull[ai.bull_id]) {
            aiByBull[ai.bull_id] = { total: 0, successful: 0 };
          }
          aiByBull[ai.bull_id].total++;
          if (ai.is_pregnant) aiByBull[ai.bull_id].successful++;
        }
      });
      
      // Process IA service records by bull
      const iaServicesByBull: Record<string, number> = {};
      (iaData || []).forEach((ia: any) => {
        if (ia.toro_id) {
          iaServicesByBull[ia.toro_id] = (iaServicesByBull[ia.toro_id] || 0) + (ia.animales_ids?.length || 0);
        }
      });
      
      // Calculate FEMALE fertility scores (0-100)
      // Score = base 50 + pregnancy bonus (40) + offspring bonus (30) + AI bonus (20) + efficiency bonus (10)
      const femaleFertilityScores: Record<string, number> = {};
      animals.filter((a: Animal) => a.sex === 'Hembra').forEach((female: Animal) => {
        let score = 50; // Base score for all females
        let hasData = false;
        
        const pregnancies = pregnanciesByAnimal[female.id];
        const offspring = offspringByMother[female.id] || 0;
        const aiRecords = aiByFemale[female.id];
        
        // Pregnancy success rate: ADD up to 40 points (not replace!)
        if (pregnancies && pregnancies.total > 0) {
          const successRate = pregnancies.successful / pregnancies.total;
          score += successRate * 40; // FIX: was = instead of +=
          hasData = true;
        }
        
        // Offspring count bonus: ADD up to 30 points (capped at 6 offspring)
        if (offspring > 0) {
          score += Math.min(offspring * 5, 30);
          hasData = true;
        }
        
        // AI success rate: ADD up to 20 points
        if (aiRecords && aiRecords.total > 0) {
          const aiSuccessRate = aiRecords.successful / aiRecords.total;
          score += aiSuccessRate * 20;
          hasData = true;
        }
        
        // Reproductive efficiency bonus: ADD 10 points if no failed pregnancies
        if (pregnancies && pregnancies.total > 0 && pregnancies.failed === 0) {
          score += 10;
        }
        
        femaleFertilityScores[female.id] = Math.min(Math.round(score), 100);
        if (hasData) {
          console.log(`Female ${female.name || female.id_tag}: score=${femaleFertilityScores[female.id]} (offspring=${offspring})`);
        }
      });
      
      // Calculate MALE fertility scores (0-100)
      // Score = base 50 + offspring bonus (40) + AI bonus (30) + service bonus (20) + diversity bonus (10)
      const maleFertilityScores: Record<string, number> = {};
      animals.filter((a: Animal) => a.sex === 'Macho').forEach((male: Animal) => {
        let score = 50; // Base score for all males
        let hasData = false;
        
        const offspring = offspringByFather[male.id] || 0;
        const aiRecords = aiByBull[male.id];
        const iaServices = iaServicesByBull[male.id] || 0;
        
        // Offspring sired count: ADD up to 40 points (capped at ~13 offspring)
        if (offspring > 0) {
          score += Math.min(offspring * 3, 40); // FIX: was = instead of +=
          hasData = true;
        }
        
        // AI success rate as sire: ADD up to 30 points
        if (aiRecords && aiRecords.total > 0) {
          const aiSuccessRate = aiRecords.successful / aiRecords.total;
          score += aiSuccessRate * 30;
          hasData = true;
        }
        
        // IA service count bonus: ADD up to 20 points (capped at ~20 services)
        if (iaServices > 0) {
          score += Math.min(iaServices, 20);
          hasData = true;
        }
        
        // Genetic diversity bonus: ADD 10 points if offspring from multiple females
        if (offspring >= 3) {
          score += 10;
        }
        
        maleFertilityScores[male.id] = Math.min(Math.round(score), 100);
        if (hasData) {
          console.log(`Male ${male.name || male.id_tag}: score=${maleFertilityScores[male.id]} (offspring=${offspring})`);
        }
      });
      
      console.log(`Calculated fertility scores for ${Object.keys(femaleFertilityScores).length} females and ${Object.keys(maleFertilityScores).length} males`);
      
      // -------------------------------------------------------------------------
      // PHASE 3: Determine Target Corrals and Animals to Move
      // -------------------------------------------------------------------------
      
      const MIN_AGE_MONTHS = 15;
      
      // Get breeding-age animals
      const breedingAgeFemales = animals.filter((a: Animal) => {
        const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
        return a.sex === 'Hembra' && ageMonths >= MIN_AGE_MONTHS && !movedAnimals.has(a.id);
      });
      
      const breedingAgeMales = animals.filter((a: Animal) => {
        const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
        return a.sex === 'Macho' && ageMonths >= MIN_AGE_MONTHS && !movedAnimals.has(a.id);
      });
      
      // Classify animals by fertility score (lowered threshold from 70 to 60)
      const HIGH_FERTILITY_THRESHOLD = 60;
      const MEDIUM_FERTILITY_THRESHOLD = 50;
      
      const highFertilityFemales = breedingAgeFemales
        .filter(a => (femaleFertilityScores[a.id] || 50) >= HIGH_FERTILITY_THRESHOLD)
        .sort((a, b) => (femaleFertilityScores[b.id] || 50) - (femaleFertilityScores[a.id] || 50));
      
      const mediumFertilityFemales = breedingAgeFemales
        .filter(a => {
          const score = femaleFertilityScores[a.id] || 50;
          return score >= MEDIUM_FERTILITY_THRESHOLD && score < HIGH_FERTILITY_THRESHOLD;
        });
      
      const highFertilityMales = breedingAgeMales
        .filter(a => (maleFertilityScores[a.id] || 50) >= HIGH_FERTILITY_THRESHOLD)
        .sort((a, b) => (maleFertilityScores[b.id] || 50) - (maleFertilityScores[a.id] || 50));
      
      // Also track medium fertility males for redistribution
      const mediumFertilityMales = breedingAgeMales
        .filter(a => {
          const score = maleFertilityScores[a.id] || 50;
          return score >= MEDIUM_FERTILITY_THRESHOLD && score < HIGH_FERTILITY_THRESHOLD;
        })
        .sort((a, b) => (maleFertilityScores[b.id] || 50) - (maleFertilityScores[a.id] || 50));
      
      console.log(`High fertility (>=${HIGH_FERTILITY_THRESHOLD}): ${highFertilityFemales.length} females, ${highFertilityMales.length} males`);
      console.log(`Medium fertility: ${mediumFertilityFemales.length} females, ${mediumFertilityMales.length} males`);
      
      // Determine source and destination corrals
      const sourceCorralSet = new Set(sourceCorrals);
      const destCorralSet = new Set(destinationCorrals);
      // FIX: Consolidation mode only if destinations are a SUBSET of all corrals
      const isConsolidationMode = destinationCorrals.length > 0 && destinationCorrals.length < corralsWithCounts.length;
      
      console.log(`Consolidation mode: ${isConsolidationMode} (${destinationCorrals.length} destinations vs ${corralsWithCounts.length} total corrals)`);
      
      // Get animals from source corrals (or all if not specified)
      const animalsToConsider = isConsolidationMode && sourceCorrals.length > 0
        ? [...highFertilityFemales, ...highFertilityMales].filter(a => a.corral_id && sourceCorralSet.has(a.corral_id))
        : [...highFertilityFemales, ...highFertilityMales];
      
      // Get target corrals
      let targetCorrals = isConsolidationMode
        ? corralsWithCounts.filter(c => destCorralSet.has(c.id))
        : corralsWithCounts;
      
      // Sort target corrals by available capacity
      targetCorrals = targetCorrals
        .map(c => ({
          ...c,
          availableCapacity: (c.capacity || (c.hectareas ? Math.round(c.hectareas * 2) : 999)) - (workingDistribution[c.id]?.length || 0)
        }))
        .filter(c => c.availableCapacity > 0)
        .sort((a, b) => b.availableCapacity - a.availableCapacity);
      
      console.log(`Target corrals: ${targetCorrals.length}, Animals to consider: ${animalsToConsider.length}`);
      
      // -------------------------------------------------------------------------
      // PHASE 4: Generate Moves with Consanguinity Checking
      // -------------------------------------------------------------------------
      
      // Helper to check if moving an animal to a corral creates consanguinity risk
      const checkMoveConsanguinityRisk = (animal: Animal, targetCorralId: string): { hasRisk: boolean; riskCount: number; severityMax: string } => {
        const animalsInTarget = workingDistribution[targetCorralId] || [];
        const oppositeSexAnimals = animalsInTarget.filter(a => {
          const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
          return a.sex !== animal.sex && ageMonths >= MIN_AGE_MONTHS;
        });
        
        let riskCount = 0;
        let severityMax = 'none';
        
        for (const other of oppositeSexAnimals) {
          const relationship = findRelationship(animal, other, ancestryMap);
          if (relationship) {
            riskCount++;
            if (relationship.severity === 'severe' || severityMax === 'none') {
              severityMax = relationship.severity;
            }
          }
        }
        
        return { hasRisk: riskCount > 0, riskCount, severityMax };
      };
      
      // Group high-fertility females with high-fertility bulls
      for (const female of highFertilityFemales.slice(0, 20)) { // Limit to 20 females
        if (movedAnimals.has(female.id)) continue;
        
        // Find best target corral (with high-fertility bull, no severe consanguinity)
        let bestCorral: typeof targetCorrals[0] | null = null;
        let bestBullScore = 0;
        
        for (const corral of targetCorrals) {
          if (corral.id === female.corral_id) continue; // Skip if already there
          
          const consanguinityCheck = checkMoveConsanguinityRisk(female, corral.id);
          if (consanguinityCheck.severityMax === 'severe') continue; // Skip if severe risk
          
          // Check if corral has a high-fertility bull
          const bullsInCorral = (workingDistribution[corral.id] || []).filter(a => {
            const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
            return a.sex === 'Macho' && ageMonths >= MIN_AGE_MONTHS;
          });
          
          const bestBullInCorral = bullsInCorral.reduce((best, bull) => {
            const score = maleFertilityScores[bull.id] || 50;
            return score > best ? score : best;
          }, 0);
          
          if (bestBullInCorral > bestBullScore && corral.availableCapacity > 0) {
            bestCorral = corral;
            bestBullScore = bestBullInCorral;
          }
        }
        
        if (bestCorral) {
          const femaleScore = femaleFertilityScores[female.id] || 50;
          suggestedMoves.push({
            animal_id: female.id,
            animal_name: female.name || female.id_tag || 'Sin nombre',
            from_corral_id: female.corral_id,
            from_corral_name: corralsWithCounts.find(c => c.id === female.corral_id)?.name || null,
            to_corral_id: bestCorral.id,
            to_corral_name: bestCorral.name,
            reason: `${t.groupFertileFemales} (${femaleScore}% ${t.fertilityScore})`,
            issue_type: 'fertility',
            expectedBenefit: `${t.improveBreeding}: ${femaleScore}% hembra + ${bestBullScore}% toro`,
          });
          movedAnimals.add(female.id);
          
          // Update working distribution
          if (female.corral_id && workingDistribution[female.corral_id]) {
            workingDistribution[female.corral_id] = workingDistribution[female.corral_id].filter(a => a.id !== female.id);
          }
          workingDistribution[bestCorral.id].push({ ...female, corral_id: bestCorral.id });
          bestCorral.availableCapacity--;
        }
      }
      
      // -------------------------------------------------------------------------
      // PHASE 4B: Bull Redistribution - Include corrals with suboptimal ratios
      // -------------------------------------------------------------------------
      
      // Analyze current bull:female ratios in all target corrals
      const corralBreedingAnalysis = targetCorrals.map(corral => {
        const animalsInCorral = workingDistribution[corral.id] || [];
        const females = animalsInCorral.filter(a => {
          const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Hembra' && ageMonths >= MIN_AGE_MONTHS;
        });
        const bulls = animalsInCorral.filter(a => {
          const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
          return a.sex === 'Macho' && ageMonths >= MIN_AGE_MONTHS;
        });
        const targetRatio = females_per_bull || 25;
        const idealBulls = Math.max(1, Math.ceil(females.length / targetRatio));
        const needsBulls = bulls.length < idealBulls && females.length > 0;
        const hasExcessBulls = bulls.length > idealBulls && bulls.length > 1;
        
        return {
          ...corral,
          femaleCount: females.length,
          bullCount: bulls.length,
          idealBulls,
          needsBulls,
          hasExcessBulls,
          bulls,
          avgBullScore: bulls.length > 0 
            ? Math.round(bulls.reduce((sum, b) => sum + (maleFertilityScores[b.id] || 50), 0) / bulls.length)
            : 0
        };
      });
      
      // Corrals needing bulls (NO bulls or suboptimal ratio)
      const corralsNeedingBulls = corralBreedingAnalysis.filter(c => c.needsBulls);
      // Corrals with excess bulls that can donate
      const corralsWithExcessBulls = corralBreedingAnalysis.filter(c => c.hasExcessBulls);
      
      console.log(`Corrals needing bulls: ${corralsNeedingBulls.length}, Corrals with excess bulls: ${corralsWithExcessBulls.length}`);
      
      // Get all available bulls (high + medium fertility) sorted by score
      const allAvailableBulls = [...highFertilityMales, ...mediumFertilityMales]
        .filter(b => !movedAnimals.has(b.id))
        .sort((a, b) => (maleFertilityScores[b.id] || 50) - (maleFertilityScores[a.id] || 50));
      
      console.log(`Available bulls for redistribution: ${allAvailableBulls.length}`);
      
      for (const corral of corralsNeedingBulls) {
        const bullsNeeded = corral.idealBulls - corral.bullCount;
        let bullsAssigned = 0;
        
        // First try from excess bulls in other corrals
        for (const donorCorral of corralsWithExcessBulls) {
          if (bullsAssigned >= bullsNeeded) break;
          
          // Get lowest-scoring bull from donor corral (keep best ones)
          const donorBulls = donorCorral.bulls
            .filter(b => !movedAnimals.has(b.id))
            .sort((a, b) => (maleFertilityScores[a.id] || 50) - (maleFertilityScores[b.id] || 50));
          
          for (const bull of donorBulls) {
            if (bullsAssigned >= bullsNeeded) break;
            if (movedAnimals.has(bull.id)) continue;
            
            const consanguinityCheck = checkMoveConsanguinityRisk(bull, corral.id);
            if (consanguinityCheck.severityMax === 'severe') continue;
            
            const bullScore = maleFertilityScores[bull.id] || 50;
            let reasonSuffix = '';
            if (consanguinityCheck.riskCount > 0) {
              reasonSuffix = ` ⚠️ ${consanguinityCheck.riskCount} ${t.lowRiskRelationships}`;
            }
            
            suggestedMoves.push({
              animal_id: bull.id,
              animal_name: bull.name || bull.id_tag || 'Sin nombre',
              from_corral_id: bull.corral_id,
              from_corral_name: donorCorral.name,
              to_corral_id: corral.id,
              to_corral_name: corral.name,
              reason: `${t.assignBullToCorral} (${bullScore}% ${t.fertilityScore})${reasonSuffix}`,
              issue_type: 'fertility',
              expectedBenefit: `${t.improveBreeding}: ${corral.femaleCount} hembras sin toro`,
            });
            movedAnimals.add(bull.id);
            bullsAssigned++;
            
            // Update working distribution
            if (bull.corral_id && workingDistribution[bull.corral_id]) {
              workingDistribution[bull.corral_id] = workingDistribution[bull.corral_id].filter(a => a.id !== bull.id);
            }
            workingDistribution[corral.id].push({ ...bull, corral_id: corral.id });
          }
        }
        
        // Then try from general available bulls pool
        if (bullsAssigned < bullsNeeded) {
          for (const bull of allAvailableBulls) {
            if (bullsAssigned >= bullsNeeded) break;
            if (movedAnimals.has(bull.id)) continue;
            if (bull.corral_id === corral.id) continue;
            
            const consanguinityCheck = checkMoveConsanguinityRisk(bull, corral.id);
            if (consanguinityCheck.severityMax === 'severe') continue;
            
            const bullScore = maleFertilityScores[bull.id] || 50;
            let reasonSuffix = '';
            if (consanguinityCheck.riskCount > 0) {
              reasonSuffix = ` ⚠️ ${consanguinityCheck.riskCount} ${t.lowRiskRelationships}`;
            }
            
            suggestedMoves.push({
              animal_id: bull.id,
              animal_name: bull.name || bull.id_tag || 'Sin nombre',
              from_corral_id: bull.corral_id,
              from_corral_name: corralsWithCounts.find(c => c.id === bull.corral_id)?.name || null,
              to_corral_id: corral.id,
              to_corral_name: corral.name,
              reason: `${t.assignBullToCorral} (${bullScore}% ${t.fertilityScore})${reasonSuffix}`,
              issue_type: 'fertility',
              expectedBenefit: t.createBreedingCorral,
            });
            movedAnimals.add(bull.id);
            bullsAssigned++;
            
            // Update working distribution
            if (bull.corral_id && workingDistribution[bull.corral_id]) {
              workingDistribution[bull.corral_id] = workingDistribution[bull.corral_id].filter(a => a.id !== bull.id);
            }
            workingDistribution[corral.id].push({ ...bull, corral_id: corral.id });
          }
        }
      }
      
      // -------------------------------------------------------------------------
      // PHASE 5: Calculate ACTUAL Metrics (not hardcoded)
      // -------------------------------------------------------------------------
      
      // Calculate average fertility scores before and after
      const calculateAvgFertility = (distribution: Record<string, Animal[]>) => {
        let totalScore = 0;
        let count = 0;
        Object.values(distribution).forEach(animals => {
          animals.forEach(a => {
            const score = a.sex === 'Hembra' 
              ? (femaleFertilityScores[a.id] || 50)
              : (maleFertilityScores[a.id] || 50);
            const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
            if (ageMonths >= MIN_AGE_MONTHS) {
              totalScore += score;
              count++;
            }
          });
        });
        return count > 0 ? Math.round(totalScore / count) : 50;
      };
      
      // Count breeding pairs before/after
      const countBreedingPairs = (distribution: Record<string, Animal[]>) => {
        let pairs = 0;
        Object.values(distribution).forEach(animals => {
          const females = animals.filter(a => {
            const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
            return a.sex === 'Hembra' && ageMonths >= MIN_AGE_MONTHS;
          });
          const bulls = animals.filter(a => {
            const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
            return a.sex === 'Macho' && ageMonths >= MIN_AGE_MONTHS;
          });
          if (females.length > 0 && bulls.length > 0) {
            pairs += females.length; // Each female paired with bull
          }
        });
        return pairs;
      };
      
      const avgFertilityAfter = calculateAvgFertility(workingDistribution);
      const breedingPairsBefore = countBreedingPairs(corralAnimals);
      const breedingPairsAfter = countBreedingPairs(workingDistribution);
      const pairsImprovement = breedingPairsBefore > 0 
        ? Math.round(((breedingPairsAfter - breedingPairsBefore) / breedingPairsBefore) * 100)
        : (breedingPairsAfter > 0 ? 100 : 0);
      
      const movedFemalesScores = suggestedMoves
        .filter(m => m.issue_type === 'fertility')
        .map(m => femaleFertilityScores[m.animal_id] || maleFertilityScores[m.animal_id] || 50);
      
      const avgFertilityMoved = movedFemalesScores.length > 0
        ? Math.round(movedFemalesScores.reduce((sum, s) => sum + s, 0) / movedFemalesScores.length)
        : 0;
      
      const breedingGroupsCreated = corralsNeedingBulls.filter(c => 
        suggestedMoves.some(m => m.to_corral_id === c.id)
      ).length;
      
      console.log(`Generated ${suggestedMoves.length} fertility moves`);
      console.log(`Breeding pairs: ${breedingPairsBefore} -> ${breedingPairsAfter} (${pairsImprovement}% improvement)`);
      console.log(`Avg fertility of moved animals: ${avgFertilityMoved}%`);
    }
    
    // Declare breedingPairings at higher scope so it's accessible for response building
    let breedingPairingsResults: BreedingPairing[] = [];
    
    // Corral configurations for standards objective
    let corralConfigurations: Array<{
      corral_id: string;
      corral_name: string;
      bulls: Array<{ id: string; name: string; tag?: string; score: number }>;
      cows: Array<{ id: string; name: string; tag?: string; assignedScore: number }>;
      expectedScore: number;
      allPairings: Array<{ cow_name: string; bull_name: string; score: number }>;
      blockedPairings: number;
      matchQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
    }> = [];
    let overallExpectedScore = 0;
    let currentDistributionScore = 0;

    if (objective === 'standards' || objective === 'benchmarks') {
      // =========================================================================
      // STANDARDS OBJECTIVE - CORRAL COMPOSITION OPTIMIZATION
      // Optimizes breeding group composition to maximize expected offspring quality
      // =========================================================================
      console.log('Starting corral composition optimization for ranch standards');
      
      const MIN_AGE_MONTHS = 15;
      
      // Get breeding-age animals
      const breedingAgeFemales = animals.filter((a: Animal) => {
        const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
        return a.sex === 'Hembra' && ageMonths >= MIN_AGE_MONTHS;
      });
      
      const breedingAgeMales = animals.filter((a: Animal) => {
        const ageMonths = a.birth_date ? calcAgeInMonths(a.birth_date) : 999;
        return a.sex === 'Macho' && ageMonths >= MIN_AGE_MONTHS;
      });
      
      console.log(`Found ${breedingAgeFemales.length} breeding-age females and ${breedingAgeMales.length} breeding-age males`);
      
      // -------------------------------------------------------------------------
      // STEP 1: Calculate ALL pairwise scores and build score matrix
      // -------------------------------------------------------------------------
      const scoreMatrix: Record<string, Record<string, { score: number; blocked: boolean; predicted: any }>> = {};
      const breedingPairings: BreedingPairing[] = [];
      
      for (const cow of breedingAgeFemales) {
        scoreMatrix[cow.id] = {};
        
        for (const bull of breedingAgeMales) {
          // Calculate inbreeding coefficient
          const relationship = findRelationship(cow, bull, ancestryMap);
          const inbreedingCoeff = relationship?.coefficient || 0;
          const blocked = inbreedingCoeff >= 0.25; // Block parent-child / full siblings
          
          // Predict offspring traits using parental averages
          const predictedBirthWeight = predictOffspringTrait(
            cow.peso_nacimiento, bull.peso_nacimiento,
            benchmarks.birth_weight_good
          );
          const predictedWeaningWeight = predictOffspringTrait(
            cow.peso_destete, bull.peso_destete,
            benchmarks.weaning_weight_good
          );
          const predictedFinalWeight = predictOffspringTrait(
            cow.peso_final, bull.peso_final,
            benchmarks.final_weight_good || 450
          );
          const predictedDailyGain = predictOffspringTrait(
            cow.ganancia_diaria_kg, bull.ganancia_diaria_kg,
            benchmarks.daily_gain_good
          );
          
          // Score predicted offspring against benchmarks
          let totalScore = 0;
          let maxScore = 0;
          
          // Birth weight score
          if (predictedBirthWeight) {
            maxScore += 25;
            if (predictedBirthWeight >= benchmarks.birth_weight_poor && predictedBirthWeight <= benchmarks.birth_weight_excellent + 5) {
              if (predictedBirthWeight <= benchmarks.birth_weight_excellent) totalScore += 25;
              else if (predictedBirthWeight <= benchmarks.birth_weight_good + 5) totalScore += 20;
              else totalScore += 10;
            }
          }
          
          // Weaning weight score
          if (predictedWeaningWeight) {
            maxScore += 25;
            if (predictedWeaningWeight >= benchmarks.weaning_weight_excellent) totalScore += 25;
            else if (predictedWeaningWeight >= benchmarks.weaning_weight_good) totalScore += 20;
            else if (predictedWeaningWeight >= benchmarks.weaning_weight_poor) totalScore += 10;
          }
          
          // Final weight score
          if (predictedFinalWeight && benchmarks.final_weight_excellent) {
            maxScore += 25;
            if (predictedFinalWeight >= benchmarks.final_weight_excellent) totalScore += 25;
            else if (predictedFinalWeight >= (benchmarks.final_weight_good || 450)) totalScore += 20;
            else if (predictedFinalWeight >= (benchmarks.final_weight_poor || 380)) totalScore += 10;
          }
          
          // Daily gain score
          if (predictedDailyGain) {
            maxScore += 25;
            if (predictedDailyGain >= benchmarks.daily_gain_excellent) totalScore += 25;
            else if (predictedDailyGain >= benchmarks.daily_gain_good) totalScore += 20;
            else if (predictedDailyGain >= benchmarks.daily_gain_poor) totalScore += 10;
          }
          
          // Normalize score to 0-100
          const normalizedScore = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 50;
          
          // Apply inbreeding penalty
          const inbreedingPenalty = Math.min(inbreedingCoeff * 200, 50);
          const finalScore = Math.max(0, normalizedScore - inbreedingPenalty);
          
          // Store in matrix
          scoreMatrix[cow.id][bull.id] = {
            score: finalScore,
            blocked,
            predicted: {
              birth_weight: predictedBirthWeight,
              weaning_weight: predictedWeaningWeight,
              final_weight: predictedFinalWeight,
              daily_gain: predictedDailyGain,
            }
          };
          
          // Determine match quality
          let matchQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
          if (blocked) matchQuality = 'poor';
          else if (finalScore >= 80) matchQuality = 'excellent';
          else if (finalScore >= 60) matchQuality = 'good';
          else if (finalScore >= 40) matchQuality = 'acceptable';
          else matchQuality = 'poor';
          
          breedingPairings.push({
            cow_id: cow.id,
            bull_id: bull.id,
            cow_name: cow.name || cow.id_tag || 'Sin nombre',
            bull_name: bull.name || bull.id_tag || 'Sin nombre',
            cow_tag: cow.id_tag || undefined,
            bull_tag: bull.id_tag || undefined,
            score: finalScore,
            inbreeding_coefficient: inbreedingCoeff,
            blocked,
            predicted: scoreMatrix[cow.id][bull.id].predicted,
            match_quality: matchQuality,
            explanation: blocked
              ? `${t.avoidConsanguinity}: ${relationship?.type || 'related'}`
              : `${t.standardsScore}: ${finalScore} pts`,
          });
        }
      }
      
      console.log(`Built score matrix for ${Object.keys(scoreMatrix).length} cows x ${breedingAgeMales.length} bulls`);
      
      // Store for response
      breedingPairingsResults = breedingPairings;
      
      // -------------------------------------------------------------------------
      // STEP 2: Calculate CURRENT distribution expected score
      // -------------------------------------------------------------------------
      const corralBulls: Record<string, Animal[]> = {};
      const corralCows: Record<string, Animal[]> = {};
      
      for (const corral of corralsWithCounts) {
        corralBulls[corral.id] = breedingAgeMales.filter(b => b.corral_id === corral.id);
        corralCows[corral.id] = breedingAgeFemales.filter(c => c.corral_id === corral.id);
      }
      
      let currentTotalScore = 0;
      let currentPairCount = 0;
      
      for (const corralId in corralBulls) {
        const bulls = corralBulls[corralId];
        const cows = corralCows[corralId];
        
        for (const cow of cows) {
          for (const bull of bulls) {
            const pairData = scoreMatrix[cow.id]?.[bull.id];
            if (pairData && !pairData.blocked) {
              currentTotalScore += pairData.score;
              currentPairCount++;
            }
          }
        }
      }
      
      currentDistributionScore = currentPairCount > 0 ? Math.round(currentTotalScore / currentPairCount) : 0;
      console.log(`Current distribution expected score: ${currentDistributionScore} (${currentPairCount} valid pairs)`);
      
      // -------------------------------------------------------------------------
      // STEP 3: GREEDY CORRAL COMPOSITION OPTIMIZATION
      // Assign bulls to corrals, then assign each cow to maximize expected score
      // -------------------------------------------------------------------------
      
      // Get destination corrals (user-selected or all)
      const allDestinationCorrals = corralsWithCounts.filter(c => 
        destinationCorrals.length === 0 || destinationCorrals.includes(c.id)
      );
      
      if (allDestinationCorrals.length === 0) {
        console.log('No destination corrals available');
      } else {
        // -------------------------------------------------------------------------
        // OPTIMAL BREEDING CONFIGURATION - COW-FIRST MATCHING
        // Each cow is assigned to her BEST bull, then groups are assigned to corrals
        // This ensures truly optimal pairings based on ranch standards
        // -------------------------------------------------------------------------
        const totalFemales = breedingAgeFemales.length;
        const totalBulls = breedingAgeMales.length;
        
        console.log(`=== COW-FIRST OPTIMAL MATCHING ===`);
        console.log(`Total females: ${totalFemales}, Total bulls: ${totalBulls}`);
        console.log(`Available destination corrals: ${allDestinationCorrals.length}`);
        console.log(`Females per bull target: ${females_per_bull}`);
        
        // -------------------------------------------------------------------------
        // STEP 1: For each cow, find her BEST bull match (highest pairing score)
        // -------------------------------------------------------------------------
        console.log('Finding best bull match for each cow...');
        
        type CowBullMatch = {
          cow: Animal;
          bestBull: Animal;
          bestScore: number;
          allScores: Array<{ bull: Animal; score: number }>;
        };
        
        const cowMatches: CowBullMatch[] = breedingAgeFemales.map(cow => {
          const scores: Array<{ bull: Animal; score: number }> = [];
          
          for (const bull of breedingAgeMales) {
            const pairData = scoreMatrix[cow.id]?.[bull.id];
            if (pairData && !pairData.blocked) {
              scores.push({ bull, score: pairData.score });
            }
          }
          
          // Sort by score descending
          scores.sort((a, b) => b.score - a.score);
          
          return {
            cow,
            bestBull: scores[0]?.bull,
            bestScore: scores[0]?.score || 0,
            allScores: scores
          };
        }).filter(m => m.bestBull); // Only cows with at least one valid pairing
        
        console.log(`${cowMatches.length} cows have valid bull matches`);
        
        // -------------------------------------------------------------------------
        // STEP 2: Group cows by their best bull, respecting capacity limits
        // If a bull has too many cows, reassign excess cows to their 2nd best match
        // -------------------------------------------------------------------------
        console.log('Grouping cows by best bull match (respecting capacity limits)...');
        
        const bullGroups: Map<string, { bull: Animal; cows: Animal[]; totalScore: number }> = new Map();
        
        // Initialize groups for all bulls
        for (const bull of breedingAgeMales) {
          bullGroups.set(bull.id, { bull, cows: [], totalScore: 0 });
        }
        
        // Sort cows by their best score (highest first - priority assignment)
        cowMatches.sort((a, b) => b.bestScore - a.bestScore);
        
        // Assign each cow to a bull, respecting capacity
        for (const match of cowMatches) {
          let assigned = false;
          
          // Try each bull in order of preference for this cow
          for (const { bull, score } of match.allScores) {
            const group = bullGroups.get(bull.id);
            if (group && group.cows.length < females_per_bull) {
              group.cows.push(match.cow);
              group.totalScore += score;
              assigned = true;
              break;
            }
          }
          
          if (!assigned) {
            console.log(`Warning: Could not assign cow ${match.cow.id_tag || match.cow.name} to any bull (all at capacity)`);
          }
        }
        
        // -------------------------------------------------------------------------
        // STEP 3: Select bulls that have cows assigned (active breeding groups)
        // -------------------------------------------------------------------------
        const activeGroups = Array.from(bullGroups.values())
          .filter(g => g.cows.length > 0)
          .sort((a, b) => {
            // Sort by number of cows (largest groups first for best capacity use)
            return b.cows.length - a.cows.length;
          });
        
        console.log(`${activeGroups.length} bulls have cows assigned:`);
        activeGroups.forEach((g, i) => {
          const avgScore = g.cows.length > 0 ? Math.round(g.totalScore / g.cows.length) : 0;
          console.log(`  ${i + 1}. ${g.bull.id_tag || g.bull.name}: ${g.cows.length} cows, avgScore=${avgScore}`);
        });
        
        // -------------------------------------------------------------------------
        // STEP 4: Assign bull groups to corrals (1 bull per corral)
        // -------------------------------------------------------------------------
        const corralsSortedByCapacity = [...allDestinationCorrals].map(corral => {
          const capacity = corral.capacity || (corral.hectareas ? Math.round(corral.hectareas * 2) : 100);
          return { ...corral, effectiveCapacity: capacity };
        }).sort((a, b) => b.effectiveCapacity - a.effectiveCapacity);
        
        // Only use as many corrals as we have active breeding groups
        const corralsNeeded = Math.min(activeGroups.length, corralsSortedByCapacity.length);
        const selectedCorrals = corralsSortedByCapacity.slice(0, corralsNeeded);
        
        console.log(`Assigning ${activeGroups.length} breeding groups to ${selectedCorrals.length} corrals`);
        
        const corralAssignments: Record<string, { 
          bulls: Animal[]; 
          cows: Animal[];
          expectedScore: number;
        }> = {};
        
        // Match largest groups to largest corrals
        for (let i = 0; i < corralsNeeded; i++) {
          const group = activeGroups[i];
          const corral = selectedCorrals[i];
          
          corralAssignments[corral.id] = {
            bulls: [group.bull],
            cows: group.cows,
            expectedScore: group.cows.length > 0 ? Math.round(group.totalScore / group.cows.length) : 0
          };
        }
        
        // Log final assignments
        console.log('Final corral assignments (each cow with her BEST matching bull):');
        Object.entries(corralAssignments).forEach(([id, a]) => {
          const corralName = selectedCorrals.find(c => c.id === id)?.name;
          const bullTag = a.bulls[0]?.id_tag || a.bulls[0]?.name || 'unknown';
          const avgScore = a.expectedScore;
          console.log(`  ${corralName}: ${bullTag} with ${a.cows.length} cows (avgScore=${avgScore})`);
        });
        
        const selectedCorralIds = selectedCorrals.map(c => c.id);
        
        // -------------------------------------------------------------------------
        // STEP 5: ITERATIVE IMPROVEMENT PHASE (SKIP - already optimal)
        // Since we assigned each cow to her BEST bull, no swapping needed
        // -------------------------------------------------------------------------
        console.log('Skipping iterative improvement - cow-first matching is already optimal');
        
        // Calculate final score for logging
        let bestScore = 0;
        let bestPairCount = 0;
        for (const [corralId, assignment] of Object.entries(corralAssignments)) {
          for (const cow of assignment.cows) {
            const bull = assignment.bulls[0];
            if (bull) {
              const pairData = scoreMatrix[cow.id]?.[bull.id];
              if (pairData && !pairData.blocked) {
                bestScore += pairData.score;
                bestPairCount++;
              }
            }
          }
        }
        
        const finalAvgScore = bestPairCount > 0 ? Math.round(bestScore / bestPairCount) : 0;
        console.log(`Final optimized score: ${finalAvgScore} (${bestPairCount} pairs)`);
        
        
        
        // -------------------------------------------------------------------------
        // STEP 6: Calculate final expected scores per corral
        // -------------------------------------------------------------------------
        let totalOptimizedScore = 0;
        let totalOptimizedPairs = 0;
        
        for (const corralId in corralAssignments) {
          const assignment = corralAssignments[corralId];
          const corral = selectedCorrals.find(c => c.id === corralId) || corralsWithCounts.find(c => c.id === corralId);
          if (!corral) continue;
          
          let corralTotalScore = 0;
          let corralPairCount = 0;
          const allPairings: Array<{ cow_name: string; bull_name: string; score: number }> = [];
          let blockedCount = 0;
          
          for (const cow of assignment.cows) {
            for (const bull of assignment.bulls) {
              const pairData = scoreMatrix[cow.id]?.[bull.id];
              if (pairData) {
                if (pairData.blocked) {
                  blockedCount++;
                } else {
                  corralTotalScore += pairData.score;
                  corralPairCount++;
                  allPairings.push({
                    cow_name: cow.name || cow.id_tag || 'Sin nombre',
                    bull_name: bull.name || bull.id_tag || 'Sin nombre',
                    score: pairData.score,
                  });
                }
              }
            }
          }
          
          const expectedScore = corralPairCount > 0 ? Math.round(corralTotalScore / corralPairCount) : 0;
          assignment.expectedScore = expectedScore;
          
          totalOptimizedScore += corralTotalScore;
          totalOptimizedPairs += corralPairCount;
          
          // Determine match quality
          let matchQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
          if (expectedScore >= 80) matchQuality = 'excellent';
          else if (expectedScore >= 60) matchQuality = 'good';
          else if (expectedScore >= 40) matchQuality = 'acceptable';
          else matchQuality = 'poor';
          
          // Sort pairings by score descending
          allPairings.sort((a, b) => b.score - a.score);
          
          corralConfigurations.push({
            corral_id: corralId,
            corral_name: corral.name,
            bulls: assignment.bulls.map(b => ({
              id: b.id,
              name: b.name || b.id_tag || 'Sin nombre',
              tag: b.id_tag,
              score: Math.round(breedingAgeFemales.reduce((sum, cow) => {
                const data = scoreMatrix[cow.id]?.[b.id];
                return sum + (data && !data.blocked ? data.score : 0);
              }, 0) / breedingAgeFemales.length),
            })),
            cows: assignment.cows.map(c => {
              const avgScore = assignment.bulls.length > 0
                ? Math.round(assignment.bulls.reduce((sum, bull) => {
                    const data = scoreMatrix[c.id]?.[bull.id];
                    return sum + (data && !data.blocked ? data.score : 0);
                  }, 0) / assignment.bulls.length)
                : 0;
              return {
                id: c.id,
                name: c.name || c.id_tag || 'Sin nombre',
                tag: c.id_tag,
                assignedScore: avgScore,
              };
            }),
            expectedScore,
            allPairings: allPairings.slice(0, 20), // Top 20 for display
            blockedPairings: blockedCount,
            matchQuality,
          });
        }
        
        overallExpectedScore = totalOptimizedPairs > 0 
          ? Math.round(totalOptimizedScore / totalOptimizedPairs) 
          : 0;
        
        console.log(`Optimized distribution expected score: ${overallExpectedScore} (${totalOptimizedPairs} valid pairs)`);
        
        // -------------------------------------------------------------------------
        // STEP 5: Generate suggested moves and UPDATE workingDistribution
        // This ensures the preview accurately reflects the optimal 1-bull-per-corral setup
        // -------------------------------------------------------------------------
        
        // First, rebuild workingDistribution for selected corrals based on optimization
        // Clear all selected destination corrals for fresh assignment
        for (const corral of selectedCorrals) {
          // Keep non-breeding-age animals in their original corrals
          const nonBreedingAge = (workingDistribution[corral.id] || []).filter(a => {
            const ageMonths = a.birth_date ? calculateAgeInMonths(a.birth_date) : 0;
            return ageMonths < MIN_AGE_MONTHS;
          });
          workingDistribution[corral.id] = nonBreedingAge;
        }
        
        for (const config of corralConfigurations) {
          // Generate moves for cows that need to relocate
          for (const cowData of config.cows) {
            const cow = breedingAgeFemales.find(c => c.id === cowData.id);
            if (!cow) continue;
            
            // Update workingDistribution: remove from old corral, add to new
            if (cow.corral_id && workingDistribution[cow.corral_id]) {
              workingDistribution[cow.corral_id] = workingDistribution[cow.corral_id].filter(a => a.id !== cow.id);
            }
            if (!workingDistribution[config.corral_id]) {
              workingDistribution[config.corral_id] = [];
            }
            workingDistribution[config.corral_id].push({ ...cow, corral_id: config.corral_id });
            
            // Only suggest move if cow is not already in this corral
            if (cow.corral_id !== config.corral_id && !movedAnimals.has(cow.id)) {
              suggestedMoves.push({
                animal_id: cow.id,
                animal_name: cowData.name,
                from_corral_id: cow.corral_id,
                from_corral_name: corralsWithCounts.find(c => c.id === cow.corral_id)?.name || null,
                to_corral_id: config.corral_id,
                to_corral_name: config.corral_name,
                reason: `${t.optimizeStandards}: ${cowData.assignedScore} pts avg con ${config.bulls.length} ${config.bulls.length === 1 ? 'toro' : 'toros'}`,
                issue_type: 'standards',
                expectedBenefit: `${t.meetsExcellent} (${config.matchQuality})`,
              });
              movedAnimals.add(cow.id);
            }
          }
          
          // Generate moves for bulls that need to relocate
          for (const bullData of config.bulls) {
            const bull = breedingAgeMales.find(b => b.id === bullData.id);
            if (!bull) continue;
            
            // Update workingDistribution: remove from old corral, add to new
            if (bull.corral_id && workingDistribution[bull.corral_id]) {
              workingDistribution[bull.corral_id] = workingDistribution[bull.corral_id].filter(a => a.id !== bull.id);
            }
            if (!workingDistribution[config.corral_id]) {
              workingDistribution[config.corral_id] = [];
            }
            workingDistribution[config.corral_id].push({ ...bull, corral_id: config.corral_id });
            
            if (bull.corral_id !== config.corral_id && !movedAnimals.has(bull.id)) {
              suggestedMoves.push({
                animal_id: bull.id,
                animal_name: bullData.name,
                from_corral_id: bull.corral_id,
                from_corral_name: corralsWithCounts.find(c => c.id === bull.corral_id)?.name || null,
                to_corral_id: config.corral_id,
                to_corral_name: config.corral_name,
                reason: `${t.assignBull}: ${bullData.score} pts avg`,
                issue_type: 'standards',
                expectedBenefit: config.matchQuality,
              });
              movedAnimals.add(bull.id);
            }
          }
        }
        
        console.log(`Generated ${suggestedMoves.length} moves for standards optimization`);
        
        // Log final workingDistribution for verification
        console.log('Post-optimization workingDistribution:');
        for (const corral of selectedCorrals) {
          const animals = workingDistribution[corral.id] || [];
          const males = animals.filter(a => a.sex === 'Macho').length;
          const females = animals.filter(a => a.sex === 'Hembra').length;
          console.log(`  ${corral.name}: ${males}M / ${females}F`);
        }
      }
    }

    // Secondary breeding ratio pass for fertility/standards (only if explicitly requested)
    if ((objective === 'fertility' || objective === 'standards' || objective === 'benchmarks') && applyBreedingRatioPass && females_per_bull > 0 && min_bulls_per_corral > 0) {
      console.log(`Applying breeding ratio secondary pass for ${objective} (explicitly requested)`);
      const corralAnalysis = analyzeCorralDistribution(corralsWithCounts, workingDistribution, females_per_bull);
      const breedingMoves = redistributeForOptimalBreeding(
        corralAnalysis,
        workingDistribution,
        ancestryMap,
        corralsWithCounts,
        females_per_bull,
        min_bulls_per_corral,
        movedAnimals,
        t
      );
      suggestedMoves.push(...breedingMoves);
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
      afterCounts[c.id] = workingDistribution[c.id]?.length || 0;
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
    let breedingPairingsSummary: any = null;
    
    if (objective === 'fertility') {
      // Calculate actual improvement percentage based on breeding pairs
      const fertilityMoves = suggestedMoves.filter(m => m.issue_type === 'fertility');
      if (fertilityMoves.length > 0) {
        // Use breeding pairs improvement or moved animals count as fallback
        const improvementPercent = pairsImprovement > 0 ? pairsImprovement : Math.min(fertilityMoves.length * 5, 50);
        expectedImprovement = t.expectedImprovementFertility.replace('{{percent}}', improvementPercent.toString());
      } else {
        expectedImprovement = t.alreadyOptimal || 'Distribution is already optimal';
      }
    } else if (objective === 'standards' || objective === 'benchmarks') {
      const count = suggestedMoves.filter(m => m.issue_type === 'standards').length;
      const improvement = currentDistributionScore > 0 
        ? Math.round(((overallExpectedScore - currentDistributionScore) / currentDistributionScore) * 100)
        : 0;
      expectedImprovement = improvement > 0 
        ? `+${improvement}% mejora esperada (${currentDistributionScore} → ${overallExpectedScore} pts)`
        : `${overallExpectedScore} pts promedio esperado`;
      
      // Include breeding pairings summary for standards objective
      if (breedingPairingsResults.length > 0) {
        breedingPairingsSummary = {
          totalPairings: breedingPairingsResults.length,
          excellentMatches: breedingPairingsResults.filter(p => p.match_quality === 'excellent' && !p.blocked).length,
          goodMatches: breedingPairingsResults.filter(p => p.match_quality === 'good' && !p.blocked).length,
          acceptableMatches: breedingPairingsResults.filter(p => p.match_quality === 'acceptable' && !p.blocked).length,
          blockedCombinations: breedingPairingsResults.filter(p => p.blocked).length,
          topPairings: breedingPairingsResults.filter(p => !p.blocked).slice(0, 20),
          corralConfigurations,
          overallExpectedScore,
          currentDistributionScore,
        };
        console.log(`Breeding optimization: ${currentDistributionScore} → ${overallExpectedScore} pts (${improvement}% improvement)`);
      }
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
        breedingPairings: breedingPairingsSummary,
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
