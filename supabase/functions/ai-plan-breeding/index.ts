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
  peso_nacimiento?: number;
  peso_destete?: number;
  peso_final?: number;
  circunferencia_escrotal?: number;
  esta_preñada?: boolean;
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

interface Pairing {
  cow_id: string;
  bull_id: string;
  cow_name: string;
  bull_name: string;
  score: number;
  inbreeding_F: number;
  blocked: boolean;
  predicted: {
    birth_weight?: number;
    weaning_weight?: number;
    final_weight?: number;
    ce_cm?: number;
  };
  explain: string;
  detailed_explanation: {
    genetic_merit: string;
    inbreeding_risk: string;
    predicted_performance: string;
    recommendation: string;
  };
}

interface BreedingPlan {
  season: string;
  constraints: {
    cow_per_bull_max: number;
    max_bulls_per_corral: number;
    capacity_respected: boolean;
  };
  pairings: Pairing[];
  corral_plan: Array<{
    corral_id: string;
    corral_name: string;
    moves_in: Array<{
      animal_id: string;
      animal_name: string;
      from_corral?: string;
    }>;
    moves_out: Array<{
      animal_id: string;
      animal_name: string;
      to_corral?: string;
    }>;
    bulls_assigned: Array<{
      id: string;
      name: string;
    }>;
    capacity_ok: boolean;
    ratio_ok: boolean;
    suggestion: string;
  }>;
  warnings: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const {
      cabanaId,
      mode = 'BOTH',
      season,
      targets = {},
      weights = { birth: 0.2, weaning: 0.3, final: 0.3, ce: 0.2 },
      cow_per_bull_max = 25,
      max_bulls_per_corral = 1,
      min_cow_age_months = 15,
      min_bull_age_months = 15,
      include_sold_dead = false,
      density_per_hectare = 1.5
    } = await req.json();

    console.log(`Processing breeding plan for cabana ${cabanaId}, mode: ${mode}`);

    // Get animals
    let animalsQuery = supabaseClient
      .from('animals')
      .select('*')
      .eq('cabaña_id', cabanaId);

    if (!include_sold_dead) {
      animalsQuery = animalsQuery.not('status', 'in', '("vendido","muerto")');
    }

    const { data: animals, error: animalsError } = await animalsQuery;
    if (animalsError) throw animalsError;

    // Get corrals
    const { data: corrals, error: corralsError } = await supabaseClient
      .from('corrales')
      .select('*')
      .eq('cabaña_id', cabanaId);
    if (corralsError) throw corralsError;

    // Calculate animal ages and filter eligible animals
    const currentDate = new Date();
    const eligibleCows: Animal[] = [];
    const eligibleBulls: Animal[] = [];

    for (const animal of animals || []) {
      if (!animal.birth_date) continue;
      
      const ageMonths = calculateAgeMonths(animal.birth_date, currentDate);
      
      if (animal.sex === 'Hembra' && ageMonths >= min_cow_age_months && !animal.esta_preñada) {
        eligibleCows.push(animal);
      } else if (animal.sex === 'Macho' && ageMonths >= min_bull_age_months) {
        eligibleBulls.push(animal);
      }
    }

    console.log(`Found ${eligibleCows.length} eligible cows and ${eligibleBulls.length} eligible bulls`);

    // Only calculate corral distribution to minimize consanguinity risks
    const corralPlan = calculateCorralPlan(
      eligibleCows,
      eligibleBulls,
      corrals || [],
      [],
      { cow_per_bull_max, max_bulls_per_corral, density_per_hectare }
    );

    const plan: BreedingPlan = {
      season: season || detectSeason(),
      constraints: {
        cow_per_bull_max,
        max_bulls_per_corral,
        capacity_respected: corralPlan.every(c => c.capacity_ok)
      },
      pairings: [], // Solo recomendaciones de corrales, no servicios de IA
      corral_plan: corralPlan,
      warnings: generateWarnings([], corralPlan, eligibleCows, eligibleBulls)
    };

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-plan-breeding:', error);
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
  return Math.floor(diffDays / 30.44); // Average days per month
}

function calculateInbreedingCoefficient(cow: Animal, bull: Animal): { F: number; blocked: boolean } {
  // Simplified inbreeding calculation
  // In a real implementation, this would involve complex pedigree analysis
  
  if (!cow.father_id && !cow.mother_id && !bull.father_id && !bull.mother_id) {
    return { F: 0, blocked: false };
  }

  // Direct parent-offspring relationships (blocked)
  if (cow.father_id === bull.id || cow.mother_id === bull.id || 
      bull.father_id === cow.id || bull.mother_id === cow.id) {
    return { F: 0.25, blocked: true }; // 25% - parent-offspring
  }

  // Full siblings (blocked)
  if (cow.father_id && bull.father_id && cow.father_id === bull.father_id &&
      cow.mother_id && bull.mother_id && cow.mother_id === bull.mother_id) {
    return { F: 0.25, blocked: true }; // 25% - full siblings
  }

  // Half siblings (blocked if > 6.25%)
  if ((cow.father_id && bull.father_id && cow.father_id === bull.father_id) ||
      (cow.mother_id && bull.mother_id && cow.mother_id === bull.mother_id)) {
    return { F: 0.125, blocked: true }; // 12.5% - half siblings
  }

  // Estimate cousin relationships (simplified)
  let estimatedF = 0;
  if (cow.father_id === bull.father_id || cow.mother_id === bull.mother_id) {
    estimatedF = 0.0625; // 6.25% - first cousins
  }

  return { F: estimatedF, blocked: estimatedF >= 0.0625 };
}

function calculatePairings(
  cows: Animal[], 
  bulls: Animal[], 
  targets: any, 
  weights: any
): Pairing[] {
  const pairings: Pairing[] = [];

  for (const cow of cows) {
    let bestPairing: Pairing | null = null;
    let bestScore = -Infinity;

    for (const bull of bulls) {
      const { F, blocked } = calculateInbreedingCoefficient(cow, bull);
      
      if (blocked) continue;

      const fitScore = calculateBenchmarkFit(cow, bull, targets, weights);
      const riskPenalty = F > 0 ? 1 - (F * 2) : 1; // Scale down based on inbreeding
      const finalScore = 0.7 * fitScore + 0.3 * riskPenalty;

      if (finalScore > bestScore) {
        bestScore = finalScore;
        bestPairing = {
          cow_id: cow.id,
          bull_id: bull.id,
          cow_name: cow.name || cow.id_tag || `V-${cow.id.slice(0, 6)}`,
          bull_name: bull.name || bull.id_tag || `T-${bull.id.slice(0, 6)}`,
          score: finalScore,
          inbreeding_F: F,
          blocked: false,
          predicted: predictOffspringTraits(cow, bull),
          explain: generateExplanation(cow, bull, F, fitScore),
          detailed_explanation: generateDetailedExplanation(cow, bull, F, fitScore, targets)
        };
      }
    }

    if (bestPairing) {
      pairings.push(bestPairing);
    }
  }

  return pairings.sort((a, b) => b.score - a.score);
}

function calculateBenchmarkFit(cow: Animal, bull: Animal, targets: any, weights: any): number {
  const predicted = predictOffspringTraits(cow, bull);
  let totalFit = 0;
  let totalWeight = 0;

  if (targets.birth_weight && predicted.birth_weight) {
    const error = Math.abs(targets.birth_weight - predicted.birth_weight) / targets.birth_weight;
    totalFit += weights.birth * (1 - Math.min(error, 1));
    totalWeight += weights.birth;
  }

  if (targets.weaning_weight && predicted.weaning_weight) {
    const error = Math.abs(targets.weaning_weight - predicted.weaning_weight) / targets.weaning_weight;
    totalFit += weights.weaning * (1 - Math.min(error, 1));
    totalWeight += weights.weaning;
  }

  if (targets.final_weight && predicted.final_weight) {
    const error = Math.abs(targets.final_weight - predicted.final_weight) / targets.final_weight;
    totalFit += weights.final * (1 - Math.min(error, 1));
    totalWeight += weights.final;
  }

  if (targets.ce_cm && predicted.ce_cm) {
    const error = Math.abs(targets.ce_cm - predicted.ce_cm) / targets.ce_cm;
    totalFit += weights.ce * (1 - Math.min(error, 1));
    totalWeight += weights.ce;
  }

  return totalWeight > 0 ? totalFit / totalWeight : 0.5; // Default neutral fit
}

function predictOffspringTraits(cow: Animal, bull: Animal): any {
  // Simple averaging of parental traits
  const prediction: any = {};

  if (cow.peso_nacimiento && bull.peso_nacimiento) {
    prediction.birth_weight = (cow.peso_nacimiento + bull.peso_nacimiento) / 2;
  }

  if (cow.peso_destete && bull.peso_destete) {
    prediction.weaning_weight = (cow.peso_destete + bull.peso_destete) / 2;
  }

  if (cow.peso_final && bull.peso_final) {
    prediction.final_weight = (cow.peso_final + bull.peso_final) / 2;
  }

  if (bull.circunferencia_escrotal) {
    prediction.ce_cm = bull.circunferencia_escrotal;
  }

  return prediction;
}

function generateExplanation(cow: Animal, bull: Animal, F: number, fitScore: number): string {
  const parts: string[] = [];

  if (F === 0) {
    parts.push("Sin parentesco directo");
  } else if (F < 0.03) {
    parts.push("Parentesco bajo");
  } else {
    parts.push(`Parentesco moderado (F=${(F * 100).toFixed(1)}%)`);
  }

  if (fitScore > 0.8) {
    parts.push("Excelente ajuste a benchmarks");
  } else if (fitScore > 0.6) {
    parts.push("Buen ajuste a benchmarks");
  } else {
    parts.push("Ajuste moderado a benchmarks");
  }

  return parts.join("; ");
}

function generateDetailedExplanation(cow: Animal, bull: Animal, F: number, fitScore: number, targets: any): any {
  const predicted = predictOffspringTraits(cow, bull);
  
  const genetic_merit = `Mérito genético combinado basado en pesos parentales: Vaca (${cow.peso_final || 'N/A'}kg) × Toro (${bull.peso_final || 'N/A'}kg)`;
  
  let inbreeding_risk = "";
  if (F === 0) {
    inbreeding_risk = "Riesgo nulo - No hay parentesco conocido entre los reproductores";
  } else if (F < 0.03) {
    inbreeding_risk = `Riesgo bajo (${(F * 100).toFixed(1)}%) - Parentesco distante, seguro para el cruce`;
  } else if (F < 0.0625) {
    inbreeding_risk = `Riesgo moderado (${(F * 100).toFixed(1)}%) - Requiere monitoreo de la descendencia`;
  } else {
    inbreeding_risk = `Riesgo alto (${(F * 100).toFixed(1)}%) - Cruce no recomendado`;
  }

  const predicted_performance = [
    predicted.birth_weight ? `Peso nacimiento esperado: ${predicted.birth_weight.toFixed(1)}kg` : null,
    predicted.weaning_weight ? `Peso destete esperado: ${predicted.weaning_weight.toFixed(1)}kg` : null,
    predicted.final_weight ? `Peso final esperado: ${predicted.final_weight.toFixed(1)}kg` : null,
    predicted.ce_cm ? `CE esperada: ${predicted.ce_cm.toFixed(1)}cm` : null
  ].filter(Boolean).join(", ");

  let recommendation = "";
  if (fitScore > 0.8 && F < 0.03) {
    recommendation = "⭐ Cruce altamente recomendado - Excelente potencial genético con riesgo mínimo";
  } else if (fitScore > 0.6 && F < 0.0625) {
    recommendation = "✓ Cruce recomendado - Buen balance entre mejora genética y seguridad";
  } else if (F >= 0.0625) {
    recommendation = "⚠️ Evaluar alternativas - Riesgo de consanguinidad elevado";
  } else {
    recommendation = "➡️ Cruce aceptable - Cumple objetivos básicos";
  }

  return {
    genetic_merit,
    inbreeding_risk,
    predicted_performance,
    recommendation
  };
}

function calculateCorralPlan(
  cows: Animal[],
  bulls: Animal[],
  corrals: Corral[],
  pairings: Pairing[],
  constraints: any
): any[] {
  console.log("Starting intelligent corral redistribution");
  
  // Step 1: Build current state analysis
  const corralStats = corrals.map(corral => {
    const currentAnimals = [...cows, ...bulls].filter(a => a.corral_id === corral.id);
    const capacity = corral.capacity || Math.round((corral.hectareas || 0) * constraints.density_per_hectare);
    const currentBulls = bulls.filter(b => b.corral_id === corral.id);
    const currentCows = cows.filter(c => c.corral_id === corral.id);
    const eligibleCows = currentCows.filter(c => c.sex === 'Hembra' && c.birth_date && calculateAgeMonths(c.birth_date, new Date()) >= 15);
    
    return {
      corral,
      currentAnimals,
      currentBulls,
      currentCows,
      eligibleCows,
      capacity,
      needsBull: eligibleCows.length > 0 && currentBulls.length === 0,
      hasExcessBulls: currentBulls.length > constraints.max_bulls_per_corral,
      hasSpace: currentAnimals.length < capacity
    };
  });

  // Step 2: Identify redistribution needs
  const corralsWithExcessBulls = corralStats.filter(stats => stats.hasExcessBulls);
  const corralsNeedingBulls = corralStats.filter(stats => stats.needsBull && stats.hasSpace);
  
  console.log(`Found ${corralsWithExcessBulls.length} corrals with excess bulls, ${corralsNeedingBulls.length} corrals needing bulls`);

  // Step 3: Calculate intelligent moves
  const moves: { bull: Animal, from: string, to: string }[] = [];
  
  // Redistribute excess bulls to corrals that need them
  for (const sourceStats of corralsWithExcessBulls) {
    const excessBulls = sourceStats.currentBulls.slice(constraints.max_bulls_per_corral);
    
    for (const bull of excessBulls) {
      // Find best destination corral
      const targetCorral = corralsNeedingBulls
        .filter(stats => !moves.some(m => m.to === stats.corral.id)) // Not already receiving a bull
        .sort((a, b) => b.eligibleCows.length - a.eligibleCows.length)[0]; // Prioritize corrals with more eligible cows
      
      if (targetCorral) {
        moves.push({
          bull,
          from: sourceStats.corral.id,
          to: targetCorral.corral.id
        });
        
        // Update tracking
        const targetIndex = corralsNeedingBulls.findIndex(s => s.corral.id === targetCorral.corral.id);
        if (targetIndex !== -1) {
          corralsNeedingBulls.splice(targetIndex, 1); // Remove from needing bulls list
        }
      }
    }
  }

  // Step 4: Build final plan with specific moves
  const plan = corralStats.map(stats => {
    const movesOut = moves.filter(m => m.from === stats.corral.id);
    const movesIn = moves.filter(m => m.to === stats.corral.id);
    
    // Calculate final bull assignment after moves
    const finalBulls = [
      ...stats.currentBulls.filter(b => !movesOut.some(m => m.bull.id === b.id)),
      ...movesIn.map(m => m.bull)
    ];

    // Generate intelligent suggestions
    let suggestion = "";
    const finalAnimalsCount = stats.currentAnimals.length - movesOut.length + movesIn.length;
    
    if (finalAnimalsCount > stats.capacity) {
      suggestion = `Reducir ${finalAnimalsCount - stats.capacity} animales para optimizar densidad`;
    } else if (finalBulls.length === 0 && stats.eligibleCows.length > 0) {
      suggestion = "Requiere asignación de toro reproductor";
    } else if (movesIn.length > 0) {
      suggestion = `Recibiendo ${movesIn.length} toro(s) para optimizar servicio`;
    } else if (movesOut.length > 0) {
      suggestion = `Liberando ${movesOut.length} toro(s) para mejor distribución`;
    } else if (finalAnimalsCount < stats.capacity * 0.7) {
      suggestion = `Capacidad disponible para ${Math.floor(stats.capacity - finalAnimalsCount)} animales adicionales`;
    } else {
      suggestion = "Distribución óptima - No requiere cambios";
    }
    
    return {
      corral_id: stats.corral.id,
      corral_name: stats.corral.name,
      moves_in: movesIn.map(m => ({
        animal_id: m.bull.id,
        animal_name: m.bull.name || m.bull.id_tag || `T-${m.bull.id.slice(0, 6)}`,
        animal_type: 'Toro',
        reason: `Optimizar servicio (${stats.eligibleCows.length} vacas elegibles)`
      })),
      moves_out: movesOut.map(m => ({
        animal_id: m.bull.id,
        animal_name: m.bull.name || m.bull.id_tag || `T-${m.bull.id.slice(0, 6)}`,
        animal_type: 'Toro',
        reason: 'Redistribuir para equilibrar corrales'
      })),
      bulls_assigned: finalBulls.map(b => ({
        id: b.id,
        name: b.name || b.id_tag || `T-${b.id.slice(0, 6)}`
      })),
      eligible_cows_count: stats.eligibleCows.length,
      current_capacity: finalAnimalsCount,
      max_capacity: stats.capacity,
      capacity_ok: finalAnimalsCount <= stats.capacity,
      ratio_ok: finalBulls.length <= constraints.max_bulls_per_corral,
      has_breeding_potential: finalBulls.length > 0 && stats.eligibleCows.length > 0,
      suggestion
    };
  });

  console.log(`Generated ${moves.length} bull movements for optimal distribution`);
  return plan;
}

function generateWarnings(pairings: Pairing[], corralPlan: any[], cows: Animal[], bulls: Animal[]): string[] {
  const warnings: string[] = [];

  const unpairedCows = cows.length - pairings.length;
  if (unpairedCows > 0) {
    warnings.push(`${unpairedCows} vacas sin asignación de cruce`);
  }

  const overCapacityCorrals = corralPlan.filter(c => !c.capacity_ok);
  if (overCapacityCorrals.length > 0) {
    warnings.push(`${overCapacityCorrals.length} corrales sobre capacidad`);
  }

  return warnings;
}

function detectSeason(): string {
  const month = new Date().getMonth() + 1; // 1-12
  if (month >= 3 && month <= 5) return "Otoño";
  if (month >= 6 && month <= 8) return "Invierno";
  if (month >= 9 && month <= 11) return "Primavera";
  return "Verano";
}