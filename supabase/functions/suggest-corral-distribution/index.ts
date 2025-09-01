import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

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
    current_risks: ConsanguinityRisk[];
    moves_suggested: Array<{
      animal_id: string;
      animal_name: string;
      from_corral: string;
      to_corral: string;
      reason: string;
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

    const {
      cabanaId,
      max_bulls_per_corral = 1,
      min_age_months = 18,
      density_per_hectare = 1.5
    } = await req.json();

    console.log(`Analyzing corral distribution for cabana ${cabanaId}`);

    // Get animals
    const { data: animals, error: animalsError } = await supabaseClient
      .from('animals')
      .select('*')
      .eq('cabaña_id', cabanaId)
      .not('status', 'in', '("vendido","muerto")');
    
    if (animalsError) throw animalsError;

    // Get corrals
    const { data: corrals, error: corralsError } = await supabaseClient
      .from('corrales')
      .select('*')
      .eq('cabaña_id', cabanaId);
    
    if (corralsError) throw corralsError;

    // Filter eligible animals (breeding age)
    const currentDate = new Date();
    const eligibleAnimals = (animals || []).filter(animal => {
      if (!animal.birth_date) return false;
      const ageMonths = calculateAgeMonths(animal.birth_date, currentDate);
      return ageMonths >= min_age_months;
    });

    console.log(`Found ${eligibleAnimals.length} breeding-age animals`);

    // Analyze current consanguinity risks and optimize
    const optimizationPlan = await optimizeCorralDistribution(
      eligibleAnimals,
      corrals || [],
      { max_bulls_per_corral, density_per_hectare },
      cabanaId
    );

    return new Response(JSON.stringify(optimizationPlan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in suggest-corral-distribution:', error);
    return new Response(JSON.stringify({ error: error.message }), {
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
  constraints: any,
  cabanaId: string
): Promise<CorralOptimizationPlan> {
  console.log("Starting corral optimization for consanguinity reduction");
  
  // Step 1: Build current state analysis for each corral
  const corralAnalysis = await Promise.all(corrals.map(async (corral) => {
    const corralAnimals = animals.filter(a => a.corral_id === corral.id);
    const capacity = corral.capacity || Math.round((corral.hectareas || 0) * constraints.density_per_hectare);
    
    // Analyze current consanguinity risks in this corral
    const currentRisks = await analyzeCorralConsanguinity(corralAnimals, cabanaId);
    
    return {
      corral,
      animals: corralAnimals,
      capacity,
      currentRisks,
      bulls: corralAnimals.filter(a => a.sex === 'Macho'),
      cows: corralAnimals.filter(a => a.sex === 'Hembra'),
    };
  }));

  // Step 2: Calculate total current risks
  const totalCurrentRisks = corralAnalysis.reduce((sum, analysis) => sum + analysis.currentRisks.length, 0);
  
  // Step 3: Generate optimization moves to reduce consanguinity
  const allMoves: any[] = [];
  
  for (const sourceCorral of corralAnalysis) {
    if (sourceCorral.currentRisks.length === 0) continue; // No risks to solve
    
    // For each severe/medium risk, suggest moving one of the animals
    for (const risk of sourceCorral.currentRisks) {
      if (risk.severity === 'severe' || risk.severity === 'medium') {
        // Prioritize moving males (bulls) to reduce multiple female risks
        const animalToMove = sourceCorral.animals.find(a => 
          a.id === risk.animal1_id && a.sex === 'Macho'
        ) || sourceCorral.animals.find(a => a.id === risk.animal1_id);
        
        if (!animalToMove) continue;
        
        // Find best destination corral (least consanguinity risk potential)
        const bestDestination = await findBestDestinationCorral(
          animalToMove,
          corralAnalysis.filter(c => c.corral.id !== sourceCorral.corral.id),
          cabanaId
        );
        
        if (bestDestination) {
          allMoves.push({
            animal_id: animalToMove.id,
            animal_name: animalToMove.name || animalToMove.id_tag || animalToMove.id,
            from_corral: sourceCorral.corral.id,
            to_corral: bestDestination.corral.id,
            reason: `Reducir riesgo ${risk.severity}: ${risk.relationship}`,
            risk_severity: risk.severity,
            original_risk: risk
          });
          
          // Update tracking for next iterations
          sourceCorral.animals = sourceCorral.animals.filter(a => a.id !== animalToMove.id);
          bestDestination.animals.push(animalToMove);
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
    
    // Calculate projected risks after moves
    const projectedRisks = await analyzeCorralConsanguinity(finalAnimals, cabanaId);
    const riskReduction = Math.max(0, analysis.currentRisks.length - projectedRisks.length);
    const riskReductionScore = analysis.currentRisks.length > 0 ? 
      (riskReduction / analysis.currentRisks.length) * 100 : 0;
    
    // Generate intelligent suggestion
    let suggestion = "";
    const capacityOk = finalAnimals.length <= analysis.capacity;
    
    if (riskReduction > 0) {
      suggestion = `Reducirá ${riskReduction} riesgo(s) de consanguinidad`;
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
      current_risks: analysis.currentRisks,
      moves_suggested: [...movesOut, ...movesIn],
      risk_reduction_score: riskReductionScore,
      capacity_ok: capacityOk,
      suggestion
    };
  }));

  // Step 5: Calculate summary metrics
  const totalMovesCount = allMoves.length;
  const estimatedRisksAfter = Math.max(0, totalCurrentRisks - allMoves.filter(m => 
    m.risk_severity === 'severe' || m.risk_severity === 'medium'
  ).length);
  
  const riskReductionPercentage = totalCurrentRisks > 0 ? 
    ((totalCurrentRisks - estimatedRisksAfter) / totalCurrentRisks) * 100 : 0;

  // Step 6: Generate warnings
  const warnings: string[] = [];
  if (totalMovesCount === 0 && totalCurrentRisks > 0) {
    warnings.push("No se pudieron generar movimientos para reducir los riesgos detectados");
  }
  if (totalMovesCount > animals.length * 0.3) {
    warnings.push(`Gran cantidad de movimientos sugeridos (${totalMovesCount})`);
  }

  return {
    corral_plan: plan,
    summary: {
      total_risks_before: totalCurrentRisks,
      total_risks_after: estimatedRisksAfter,
      risk_reduction_percentage: Math.round(riskReductionPercentage),
      total_moves_suggested: totalMovesCount,
    },
    warnings
  };
}

async function findBestDestinationCorral(
  animal: Animal, 
  targetCorrals: any[], 
  cabanaId: string
): Promise<any | null> {
  let bestCorral = null;
  let lowestRiskIncrease = Infinity;
  
  for (const targetCorral of targetCorrals) {
    // Check capacity
    if (targetCorral.animals.length >= targetCorral.capacity) continue;
    
    // Simulate adding this animal and calculate new risk count
    const simulatedAnimals = [...targetCorral.animals, animal];
    const simulatedRisks = await analyzeCorralConsanguinity(simulatedAnimals, cabanaId);
    const riskIncrease = simulatedRisks.length - targetCorral.currentRisks.length;
    
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