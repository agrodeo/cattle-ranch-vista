import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://deno.land/x/supabase@1.2.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Animal {
  id: string;
  sex: string;
  birth_date: string;
  status: string;
  breed: string;
  father_id?: string;
  mother_id?: string;
  corral_id?: string;
  name?: string;
  id_tag?: string;
  cabaña_id: string;
  age_months?: number;
  is_calf?: boolean;
  is_reproductive_age?: boolean;
}

interface Corral {
  id: string;
  name: string;
  hectareas?: number;
  capacity?: number;
  cabaña_id: string;
}

interface ConsanguinityRisk {
  animal1_id: string;
  animal2_id: string;
  relationship: string;
  severity: 'severe' | 'medium' | 'low';
  description: string;
  inbreeding_coefficient: number;
}

interface CorralOptimizationPlan {
  corral_plan: Array<{
    corral_id: string;
    corral_name: string;
    current_animals: number;
    total_capacity: number;
    adult_count: number;
    calf_count: number;
    current_risks: ConsanguinityRisk[];
    moves_suggested: Array<{
      animal_id: string;
      animal_name: string;
      from_corral: string;
      to_corral: string;
      reason: string;
      type: 'consanguinity' | 'mother_calf';
      associated_animals?: string[];
    }>;
    risk_reduction_score: number;
    capacity_ok: boolean;
    suggestion: string;
  }>;
  summary: {
    total_risks_before: number;
    total_risks_after: number;
    risk_reduction_percentage: number;
    total_moves_suggested: number;
    calves_moved_with_mothers: number;
  };
  warnings: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const requestBody = await req.json();
    console.log('Request body:', JSON.stringify(requestBody));

    const {
      cabanaId,
      max_bulls_per_corral = 1,
      max_age_months_with_mother = 8,
      density_per_hectare = 1.5,
      calf_space_factor = 0.6
    } = requestBody;

    console.log(`Analyzing corral distribution for cabana ${cabanaId}`);

    // Get animals
    const { data: animals, error: animalsError } = await supabaseClient
      .from('animals')
      .select('*')
      .eq('cabaña_id', cabanaId)
      .not('status', 'in', '("vendido","muerto")');
    
    if (animalsError) {
      console.error('Error fetching animals:', animalsError);
      throw animalsError;
    }

    // Get corrals
    const { data: corrals, error: corralsError } = await supabaseClient
      .from('corrales')
      .select('*')
      .eq('cabaña_id', cabanaId);
    
    if (corralsError) {
      console.error('Error fetching corrals:', corralsError);
      throw corralsError;
    }

    console.log(`Found ${(animals || []).length} total animals and ${(corrals || []).length} corrals`);

    // Categorize animals by age and role
    const currentDate = new Date();
    const allAnimals = (animals || []).map(animal => {
      const ageMonths = animal.birth_date ? calculateAgeMonths(animal.birth_date, currentDate) : 0;
      return {
        ...animal,
        age_months: ageMonths,
        is_calf: ageMonths < max_age_months_with_mother,
        is_reproductive_age: ageMonths >= 18
      };
    });

    console.log(`Found ${allAnimals.length} total animals (${allAnimals.filter(a => a.is_reproductive_age).length} reproductive age, ${allAnimals.filter(a => a.is_calf).length} calves)`);

    // Analyze current consanguinity risks and optimize
    const optimizationPlan = await optimizeCorralDistribution(
      allAnimals,
      corrals || [],
      { max_bulls_per_corral, max_age_months_with_mother, density_per_hectare, calf_space_factor },
      cabanaId
    );

    return new Response(JSON.stringify(optimizationPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-corral-distribution:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateAgeMonths(birthDate: string, currentDate: Date): number {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  if (isNaN(birth.getTime())) return 0;
  const diffTime = currentDate.getTime() - birth.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 30.44);
}

async function optimizeCorralDistribution(
  animals: Animal[],
  corrals: Corral[],
  constraints: {
    max_bulls_per_corral: number;
    max_age_months_with_mother: number;
    density_per_hectare: number;
    calf_space_factor: number;
  },
  cabanaId: string
): Promise<CorralOptimizationPlan> {
  console.log("Starting corral optimization for consanguinity reduction");
  
  // Step 1: Build current state analysis for each corral
  const corralAnalysis = await Promise.all(corrals.map(async (corral) => {
    const corralAnimals = animals.filter(a => a.corral_id === corral.id);
    const adultsCount = corralAnimals.filter(a => a.is_reproductive_age).length;
    const calvesCount = corralAnimals.filter(a => a.is_calf).length;
    
    // Calculate capacity considering calves take less space
    const totalCapacityUsed = adultsCount + (calvesCount * constraints.calf_space_factor);
    const totalCapacity = corral.capacity || Math.round((corral.hectareas || 0) * constraints.density_per_hectare);
    
    // Analyze current consanguinity risks only among reproductive age animals
    const reproductiveAnimals = corralAnimals.filter(a => a.is_reproductive_age);
    const currentRisks = await analyzeCorralConsanguinity(reproductiveAnimals, cabanaId);
    
    return {
      corral,
      animals: corralAnimals,
      reproductiveAnimals,
      capacity: totalCapacity,
      currentCapacityUsed: totalCapacityUsed,
      adultsCount,
      calvesCount,
      currentRisks,
      bulls: reproductiveAnimals.filter(a => a.sex === 'Macho'),
      cows: reproductiveAnimals.filter(a => a.sex === 'Hembra'),
    };
  }));

  // Step 2: Calculate total current risks
  const totalCurrentRisks = corralAnalysis.reduce((sum, analysis) => sum + analysis.currentRisks.length, 0);
  
  // Step 3: Generate optimization moves to reduce consanguinity
  const allMoves: any[] = [];
  const calvesMovedWithMothers = new Set<string>();
  
  for (const sourceCorral of corralAnalysis) {
    if (sourceCorral.currentRisks.length === 0) continue; // No risks to solve
    
    // For each severe/medium risk, suggest moving one of the animals
    for (const risk of sourceCorral.currentRisks) {
      if (risk.severity === 'severe' || risk.severity === 'medium') {
        // Prioritize moving males (bulls) to reduce multiple female risks
        const animalToMove = sourceCorral.reproductiveAnimals.find(a => 
          a.id === risk.animal1_id && a.sex === 'Macho'
        ) || sourceCorral.reproductiveAnimals.find(a => a.id === risk.animal1_id);
        
        if (!animalToMove) continue;
        
        // Find best destination corral
        const bestDestination = await findBestDestinationCorral(
          animalToMove,
          corralAnalysis.filter(c => c.corral.id !== sourceCorral.corral.id),
          constraints,
          cabanaId
        );
        
        if (bestDestination) {
          const associatedAnimals: string[] = [];
          
          // Check if this animal has calves that must move with it
          if (animalToMove.sex === 'Hembra') {
            const calvesToMove = sourceCorral.animals.filter(calf => 
              calf.is_calf && calf.mother_id === animalToMove.id
            );
            
            for (const calf of calvesToMove) {
              associatedAnimals.push(calf.id);
              calvesMovedWithMothers.add(calf.id);
              
              // Add separate move entry for the calf
              allMoves.push({
                animal_id: calf.id,
                animal_name: calf.name || calf.id_tag || calf.id,
                from_corral: sourceCorral.corral.id,
                to_corral: bestDestination.corral.id,
                reason: `Acompañar a madre: ${animalToMove.name || animalToMove.id_tag}`,
                type: 'mother_calf',
                associated_animals: [animalToMove.id]
              });
            }
          }
          
          allMoves.push({
            animal_id: animalToMove.id,
            animal_name: animalToMove.name || animalToMove.id_tag || animalToMove.id,
            from_corral: sourceCorral.corral.id,
            to_corral: bestDestination.corral.id,
            reason: `Reducir riesgo ${risk.severity}: ${risk.relationship}`,
            type: 'consanguinity',
            risk_severity: risk.severity,
            original_risk: risk,
            associated_animals: associatedAnimals
          });
          
          // Update tracking for next iterations
          sourceCorral.animals = sourceCorral.animals.filter(a => 
            a.id !== animalToMove.id && !associatedAnimals.includes(a.id)
          );
          sourceCorral.reproductiveAnimals = sourceCorral.reproductiveAnimals.filter(a => a.id !== animalToMove.id);
          bestDestination.animals.push(animalToMove);
          bestDestination.reproductiveAnimals.push(animalToMove);
        }
      }
    }
  }

  // Step 4: Build final plan with risk reduction analysis
  const plan = await Promise.all(corralAnalysis.map(async (analysis) => {
    const movesIn = allMoves.filter(m => m.to_corral === analysis.corral.id);
    const movesOut = allMoves.filter(m => m.from_corral === analysis.corral.id);
    
    // Simulate final animal composition
    const finalAnimals = [
      ...analysis.animals.filter(a => !movesOut.some(m => m.animal_id === a.id)),
      ...movesIn.map(m => animals.find(a => a.id === m.animal_id)!).filter(Boolean)
    ];
    
    const finalReproductiveAnimals = finalAnimals.filter(a => a.is_reproductive_age);
    const finalCalves = finalAnimals.filter(a => a.is_calf);
    const finalCapacityUsed = finalReproductiveAnimals.length + (finalCalves.length * constraints.calf_space_factor);
    
    // Calculate projected risks after moves (only reproductive animals)
    const projectedRisks = await analyzeCorralConsanguinity(finalReproductiveAnimals, cabanaId);
    const riskReduction = Math.max(0, analysis.currentRisks.length - projectedRisks.length);
    const riskReductionScore = analysis.currentRisks.length > 0 ? 
      (riskReduction / analysis.currentRisks.length) * 100 : 0;
    
    // Generate intelligent suggestion
    let suggestion = "";
    const capacityOk = finalCapacityUsed <= analysis.capacity;
    const calvesMoving = movesOut.filter(m => m.type === 'mother_calf').length;
    
    if (riskReduction > 0) {
      suggestion = `Reducirá ${riskReduction} riesgo(s) de consanguinidad`;
      if (calvesMoving > 0) {
        suggestion += ` (incluye ${calvesMoving} ternero(s) con madre)`;
      }
    } else if (movesIn.length > 0) {
      suggestion = `Recibiendo ${movesIn.length} animal(es) de redistribución`;
    } else if (movesOut.length > 0) {
      suggestion = `Enviando ${movesOut.length} animal(es) para optimización`;
    } else if (analysis.currentRisks.length === 0) {
      suggestion = "Distribución óptima - Sin riesgos detectados";
    } else {
      suggestion = "Revisar manualmente - Requiere análisis adicional";
    }
    
    return {
      corral_id: analysis.corral.id,
      corral_name: analysis.corral.name,
      current_animals: analysis.animals.length,
      total_capacity: analysis.capacity,
      adult_count: analysis.adultsCount,
      calf_count: analysis.calvesCount,
      current_risks: analysis.currentRisks,
      moves_suggested: [...movesOut, ...movesIn],
      risk_reduction_score: riskReductionScore,
      capacity_ok: capacityOk,
      suggestion
    };
  }));

  // Step 5: Calculate summary metrics
  const totalMovesCount = allMoves.length;
  const calvesMovedCount = calvesMovedWithMothers.size;
  const consanguinityMoves = allMoves.filter(m => m.type === 'consanguinity').length;
  const estimatedRisksAfter = Math.max(0, totalCurrentRisks - consanguinityMoves);
  
  const riskReductionPercentage = totalCurrentRisks > 0 ? 
    ((totalCurrentRisks - estimatedRisksAfter) / totalCurrentRisks) * 100 : 0;

  // Step 6: Generate warnings
  const warnings: string[] = [];
  if (consanguinityMoves === 0 && totalCurrentRisks > 0) {
    warnings.push("No se pudieron generar movimientos para reducir los riesgos detectados");
  }
  if (totalMovesCount > animals.length * 0.3) {
    warnings.push(`Gran cantidad de movimientos sugeridos (${totalMovesCount})`);
  }
  if (calvesMovedCount > 0) {
    warnings.push(`${calvesMovedCount} ternero(s) se moverán automáticamente con sus madres`);
  }

  return {
    corral_plan: plan,
    summary: {
      total_risks_before: totalCurrentRisks,
      total_risks_after: estimatedRisksAfter,
      risk_reduction_percentage: Math.round(riskReductionPercentage),
      total_moves_suggested: totalMovesCount,
      calves_moved_with_mothers: calvesMovedCount,
    },
    warnings
  };
}

async function findBestDestinationCorral(
  animal: Animal, 
  targetCorrals: any[], 
  constraints: {
    max_bulls_per_corral: number;
    max_age_months_with_mother: number;
    density_per_hectare: number;
    calf_space_factor: number;
  },
  cabanaId: string
): Promise<any | null> {
  let bestCorral = null;
  let lowestRiskIncrease = Infinity;
  
  for (const targetCorral of targetCorrals) {
    // Calculate capacity considering the animal to move and any associated calves
    let additionalCapacityNeeded = animal.is_reproductive_age ? 1 : constraints.calf_space_factor;
    
    // If it's a female with calves, account for them too
    if (animal.sex === 'Hembra') {
      const calvesCount = targetCorral.animals.filter((a: any) => 
        a.is_calf && a.mother_id === animal.id
      ).length;
      additionalCapacityNeeded += calvesCount * constraints.calf_space_factor;
    }
    
    // Check capacity
    if (targetCorral.currentCapacityUsed + additionalCapacityNeeded > targetCorral.capacity) continue;
    
    // Only analyze consanguinity risk if the animal is reproductive age
    let riskIncrease = 0;
    if (animal.is_reproductive_age) {
      // Simulate adding this animal and calculate new risk count
      const simulatedReproductiveAnimals = [...targetCorral.reproductiveAnimals, animal];
      const simulatedRisks = await analyzeCorralConsanguinity(simulatedReproductiveAnimals, cabanaId);
      riskIncrease = simulatedRisks.length - targetCorral.currentRisks.length;
    }
    
    // Prefer corrals that introduce the least new risks
    if (riskIncrease < lowestRiskIncrease) {
      lowestRiskIncrease = riskIncrease;
      bestCorral = targetCorral;
    }
  }
  
  return bestCorral;
}

async function analyzeCorralConsanguinity(animals: Animal[], cabanaId: string): Promise<ConsanguinityRisk[]> {
  if (animals.length < 2) return [];
  
  const risks: ConsanguinityRisk[] = [];
  
  // Check each pair of animals for consanguinity
  for (let i = 0; i < animals.length; i++) {
    for (let j = i + 1; j < animals.length; j++) {
      const animal1 = animals[i];
      const animal2 = animals[j];
      
      // Only check male-female pairs for breeding risks
      if ((animal1.sex === 'Macho' && animal2.sex === 'Hembra') || 
          (animal1.sex === 'Hembra' && animal2.sex === 'Macho')) {
        
        const risk = detectRelationship(animal1, animal2);
        if (risk) {
          risks.push(risk);
        }
      }
    }
  }
  
  return risks;
}

function detectRelationship(animal1: Animal, animal2: Animal): ConsanguinityRisk | null {
  if (animal1.id === animal2.id) return null;

  const name1 = animal1.name || animal1.id_tag || animal1.id;
  const name2 = animal2.name || animal2.id_tag || animal2.id;

  // Parent-Offspring relationships (SEVERE)
  if (animal1.father_id === animal2.id || animal1.mother_id === animal2.id) {
    return {
      animal1_id: animal1.id,
      animal2_id: animal2.id,
      relationship: 'parent-offspring',
      severity: 'severe',
      description: `${name2} es padre/madre de ${name1}`,
      inbreeding_coefficient: 0.25
    };
  }
  
  if (animal2.father_id === animal1.id || animal2.mother_id === animal1.id) {
    return {
      animal1_id: animal1.id,
      animal2_id: animal2.id,
      relationship: 'parent-offspring',
      severity: 'severe',
      description: `${name1} es padre/madre de ${name2}`,
      inbreeding_coefficient: 0.25
    };
  }

  // Full Siblings (SEVERE)
  if (animal1.father_id && animal1.mother_id && 
      animal1.father_id === animal2.father_id && 
      animal1.mother_id === animal2.mother_id) {
    return {
      animal1_id: animal1.id,
      animal2_id: animal2.id,
      relationship: 'full-siblings',
      severity: 'severe',
      description: `${name1} y ${name2} son hermanos completos`,
      inbreeding_coefficient: 0.25
    };
  }

  // Half-Siblings (SEVERE)
  if ((animal1.father_id && animal1.father_id === animal2.father_id && 
       animal1.mother_id !== animal2.mother_id) ||
      (animal1.mother_id && animal1.mother_id === animal2.mother_id && 
       animal1.father_id !== animal2.father_id)) {
    return {
      animal1_id: animal1.id,
      animal2_id: animal2.id,
      relationship: 'half-siblings',
      severity: 'severe',
      description: `${name1} y ${name2} son medio hermanos`,
      inbreeding_coefficient: 0.125
    };
  }

  return null;
}