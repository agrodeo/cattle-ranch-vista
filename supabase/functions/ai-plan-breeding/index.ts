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
  peso_nacimiento?: number;
  peso_destete?: number;
  peso_final?: number;
  circunferencia_escrotal?: number;
  esta_preñada?: boolean;
  name?: string;
  id_tag?: string;
}

interface Corral {
  id: string;
  name: string;
  hectareas?: number;
  capacity?: number;
}

interface Pairing {
  cow_id: string;
  bull_id: string;
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
    moves_in: string[];
    moves_out: string[];
    bulls_assigned: string[];
    capacity_ok: boolean;
    ratio_ok: boolean;
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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
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

    // Calculate pairings if mode includes PAIRINGS
    let pairings: Pairing[] = [];
    if (mode === 'PAIRINGS' || mode === 'BOTH') {
      pairings = calculatePairings(eligibleCows, eligibleBulls, targets, weights);
    }

    // Calculate corral plan
    const corralPlan = calculateCorralPlan(
      eligibleCows,
      eligibleBulls,
      corrals || [],
      pairings,
      { cow_per_bull_max, max_bulls_per_corral, density_per_hectare }
    );

    const plan: BreedingPlan = {
      season: season || detectSeason(),
      constraints: {
        cow_per_bull_max,
        max_bulls_per_corral,
        capacity_respected: corralPlan.every(c => c.capacity_ok)
      },
      pairings,
      corral_plan: corralPlan,
      warnings: generateWarnings(pairings, corralPlan, eligibleCows, eligibleBulls)
    };

    return new Response(JSON.stringify(plan), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-plan-breeding:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateAgeMonths(birthDate: string, currentDate: Date): number {
  const birth = new Date(birthDate);
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
          score: finalScore,
          inbreeding_F: F,
          blocked: false,
          predicted: predictOffspringTraits(cow, bull),
          explain: generateExplanation(cow, bull, F, fitScore)
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

function calculateCorralPlan(
  cows: Animal[],
  bulls: Animal[],
  corrals: Corral[],
  pairings: Pairing[],
  constraints: any
): any[] {
  const plan = corrals.map(corral => {
    const currentAnimals = [...cows, ...bulls].filter(a => a.corral_id === corral.id);
    const capacity = corral.capacity || Math.round((corral.hectareas || 0) * constraints.density_per_hectare);
    
    return {
      corral_id: corral.id,
      moves_in: [],
      moves_out: [],
      bulls_assigned: bulls.filter(b => b.corral_id === corral.id).map(b => b.id),
      capacity_ok: currentAnimals.length <= capacity,
      ratio_ok: true // Simplified for now
    };
  });

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