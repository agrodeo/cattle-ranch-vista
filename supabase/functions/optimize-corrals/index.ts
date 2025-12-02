import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ObjectiveType = 'consanguinity' | 'fertility' | 'weight';
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
  allAncestors: Set<string>;
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
  },
};

// Build ancestry map for all animals with up to 3 generations
function buildAncestryMap(animals: Animal[]): Map<string, AncestryNode> {
  const ancestryMap = new Map<string, AncestryNode>();
  const animalMap = new Map<string, Animal>();
  
  // First pass: create map of all animals by ID
  animals.forEach(a => animalMap.set(a.id, a));
  
  // Second pass: build ancestry nodes
  animals.forEach(animal => {
    const node: AncestryNode = {
      id: animal.id,
      fatherId: animal.father_id,
      motherId: animal.mother_id,
      paternalGrandparents: [],
      maternalGrandparents: [],
      allAncestors: new Set<string>(),
    };
    
    // Add direct parents to ancestors
    if (animal.father_id) {
      node.allAncestors.add(animal.father_id);
      const father = animalMap.get(animal.father_id);
      if (father) {
        // Add paternal grandparents
        if (father.father_id) {
          node.paternalGrandparents.push(father.father_id);
          node.allAncestors.add(father.father_id);
        }
        if (father.mother_id) {
          node.paternalGrandparents.push(father.mother_id);
          node.allAncestors.add(father.mother_id);
        }
      }
    }
    
    if (animal.mother_id) {
      node.allAncestors.add(animal.mother_id);
      const mother = animalMap.get(animal.mother_id);
      if (mother) {
        // Add maternal grandparents
        if (mother.father_id) {
          node.maternalGrandparents.push(mother.father_id);
          node.allAncestors.add(mother.father_id);
        }
        if (mother.mother_id) {
          node.maternalGrandparents.push(mother.mother_id);
          node.allAncestors.add(mother.mother_id);
        }
      }
    }
    
    ancestryMap.set(animal.id, node);
  });
  
  return ancestryMap;
}

// Find relationship between two animals using ancestry map
function findRelationship(
  animal1: Animal,
  animal2: Animal,
  ancestryMap: Map<string, AncestryNode>
): { type: string; severity: 'severe' | 'medium' | 'low'; coefficient: number } | null {
  const node1 = ancestryMap.get(animal1.id);
  const node2 = ancestryMap.get(animal2.id);
  
  // 1. Parent-child (coefficient: 0.25)
  if (animal1.id === animal2.father_id || animal1.id === animal2.mother_id) {
    return { type: 'parent-child', severity: 'severe', coefficient: 0.25 };
  }
  if (animal2.id === animal1.father_id || animal2.id === animal1.mother_id) {
    return { type: 'parent-child', severity: 'severe', coefficient: 0.25 };
  }

  // 2. Full siblings (coefficient: 0.25)
  if (animal1.father_id && animal1.mother_id && animal2.father_id && animal2.mother_id) {
    if (animal1.father_id === animal2.father_id && animal1.mother_id === animal2.mother_id) {
      return { type: 'full-siblings', severity: 'severe', coefficient: 0.25 };
    }
  }

  // 3. Grandparent-grandchild (coefficient: 0.125)
  if (node1 && node2) {
    // Check if animal1 is grandparent of animal2
    if (node2.paternalGrandparents.includes(animal1.id) || node2.maternalGrandparents.includes(animal1.id)) {
      return { type: 'grandparent-grandchild', severity: 'medium', coefficient: 0.125 };
    }
    // Check if animal2 is grandparent of animal1
    if (node1.paternalGrandparents.includes(animal2.id) || node1.maternalGrandparents.includes(animal2.id)) {
      return { type: 'grandparent-grandchild', severity: 'medium', coefficient: 0.125 };
    }
  }

  // 4. Half siblings (coefficient: 0.125)
  if (animal1.father_id && animal2.father_id && animal1.father_id === animal2.father_id) {
    if (!animal1.mother_id || !animal2.mother_id || animal1.mother_id !== animal2.mother_id) {
      return { type: 'half-siblings-paternal', severity: 'medium', coefficient: 0.125 };
    }
  }
  if (animal1.mother_id && animal2.mother_id && animal1.mother_id === animal2.mother_id) {
    if (!animal1.father_id || !animal2.father_id || animal1.father_id !== animal2.father_id) {
      return { type: 'half-siblings-maternal', severity: 'medium', coefficient: 0.125 };
    }
  }

  // 5. Uncle/Aunt-Niece/Nephew (coefficient: 0.0625)
  // Animal1 is uncle/aunt of animal2 (animal1 is sibling of animal2's parent)
  if (node2) {
    const animal2Parents = [animal2.father_id, animal2.mother_id].filter(Boolean);
    for (const parentId of animal2Parents) {
      const parent = ancestryMap.get(parentId!);
      if (parent) {
        // Check if animal1 shares a parent with animal2's parent (making animal1 an uncle/aunt)
        const sharedFather = animal1.father_id && parent.fatherId && animal1.father_id === parent.fatherId;
        const sharedMother = animal1.mother_id && parent.motherId && animal1.mother_id === parent.motherId;
        if ((sharedFather || sharedMother) && animal1.id !== parentId) {
          return { type: 'uncle-niece-nephew', severity: 'low', coefficient: 0.0625 };
        }
      }
    }
  }
  // Animal2 is uncle/aunt of animal1
  if (node1) {
    const animal1Parents = [animal1.father_id, animal1.mother_id].filter(Boolean);
    for (const parentId of animal1Parents) {
      const parent = ancestryMap.get(parentId!);
      if (parent) {
        const sharedFather = animal2.father_id && parent.fatherId && animal2.father_id === parent.fatherId;
        const sharedMother = animal2.mother_id && parent.motherId && animal2.mother_id === parent.motherId;
        if ((sharedFather || sharedMother) && animal2.id !== parentId) {
          return { type: 'uncle-niece-nephew', severity: 'low', coefficient: 0.0625 };
        }
      }
    }
  }

  // 6. First cousins (coefficient: 0.0625) - share at least one grandparent
  if (node1 && node2) {
    const allGrandparents1 = [...node1.paternalGrandparents, ...node1.maternalGrandparents];
    const allGrandparents2 = [...node2.paternalGrandparents, ...node2.maternalGrandparents];
    
    // Check if they share any grandparent (but are not siblings)
    const notSiblings = animal1.father_id !== animal2.father_id || animal1.mother_id !== animal2.mother_id;
    if (notSiblings && allGrandparents1.length > 0 && allGrandparents2.length > 0) {
      for (const gp1 of allGrandparents1) {
        if (allGrandparents2.includes(gp1)) {
          return { type: 'first-cousins', severity: 'low', coefficient: 0.0625 };
        }
      }
    }
  }

  return null;
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
