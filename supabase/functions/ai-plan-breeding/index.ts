import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  buildAncestryMap,
  inbreedingCoefficient,
  type AncestryMap,
  type PedigreeAnimal,
} from "../_shared/genetics.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// EPD traits we read from animal_deps.
interface AnimalDEPs {
  animal_id: string;
  dep_peso_nacer: number | null; dep_peso_nacer_acc: number | null;
  dep_peso_destete: number | null; dep_peso_destete_acc: number | null;
  dep_peso_final: number | null; dep_peso_final_acc: number | null;
  dep_circunferencia_escrotal: number | null; dep_circunferencia_escrotal_acc: number | null;
  dep_leche: number | null; dep_leche_acc: number | null;
  dep_largo_gestacion: number | null; dep_largo_gestacion_acc: number | null;
  dep_area_ojo_bife: number | null; dep_area_ojo_bife_acc: number | null;
  dep_grasa_dorsal: number | null; dep_grasa_dorsal_acc: number | null;
  dep_grasa_cadera: number | null; dep_grasa_cadera_acc: number | null;
  dep_grasa_intramuscular: number | null; dep_grasa_intramuscular_acc: number | null;
  dep_docilidad: number | null; dep_docilidad_acc: number | null;
}


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
  mocho?: string;
}

interface Corral {
  id: string;
  name: string;
  hectareas?: number;
  capacity?: number;
  cabaña_id: string;
}

interface Benchmark {
  birth_weight_excellent: number;
  birth_weight_good: number;
  birth_weight_poor: number;
  weaning_weight_excellent: number;
  weaning_weight_good: number;
  weaning_weight_poor: number;
  final_weight_excellent: number;
  final_weight_good: number;
  final_weight_poor: number;
  daily_gain_excellent: number;
  daily_gain_good: number;
  daily_gain_poor: number;
  scrotal_circumference_excellent: number;
  scrotal_circumference_good: number;
  scrotal_circumference_poor: number;
  horn_preference: string;
}

interface Pairing {
  cow_id: string;
  bull_id: string;
  cow_name: string;
  bull_name: string;
  cow_tag?: string;
  bull_tag?: string;
  score: number;
  inbreeding_F: number;
  blocked: boolean;
  predicted: {
    birth_weight?: number;
    weaning_weight?: number;
    final_weight?: number;
    ce_cm?: number;
    milk?: number;
    ribeye_area?: number;
    marbling?: number;
    docility?: number;
    // per-trait confidence 0..1 (EPD accuracy when available, else heuristic).
    confidence?: {
      birth_weight?: number;
      weaning_weight?: number;
      final_weight?: number;
      ce_cm?: number;
      milk?: number;
      ribeye_area?: number;
      marbling?: number;
      docility?: number;
    };
    // 'epd' when both parents had a DEP, 'epd_partial' when one, 'phenotype' otherwise.
    source?: {
      birth_weight?: 'epd' | 'epd_partial' | 'phenotype';
      weaning_weight?: 'epd' | 'epd_partial' | 'phenotype';
      final_weight?: 'epd' | 'epd_partial' | 'phenotype';
      ce_cm?: 'epd' | 'epd_partial' | 'phenotype';
      milk?: 'epd' | 'epd_partial' | 'phenotype';
      ribeye_area?: 'epd' | 'epd_partial' | 'phenotype';
      marbling?: 'epd' | 'epd_partial' | 'phenotype';
      docility?: 'epd' | 'epd_partial' | 'phenotype';
    };
  };
  match_quality: 'excellent' | 'good' | 'acceptable' | 'poor';
  explain: string;
  detailed_explanation: {
    genetic_merit: string;
    inbreeding_risk: string;
    predicted_performance: string;
    recommendation: string;
    scores: {
      birth_weight_score: number;
      weaning_weight_score: number;
      final_weight_score: number;
      ce_score: number;
      horn_match: boolean;
    };
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
  summary: {
    total_eligible_cows: number;
    total_eligible_bulls: number;
    total_pairings: number;
    excellent_matches: number;
    good_matches: number;
    acceptable_matches: number;
    blocked_combinations: number;
  };
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

const DEFAULT_BENCHMARKS: Benchmark = {
  birth_weight_excellent: 35,
  birth_weight_good: 30,
  birth_weight_poor: 28,
  weaning_weight_excellent: 200,
  weaning_weight_good: 180,
  weaning_weight_poor: 160,
  final_weight_excellent: 450,
  final_weight_good: 420,
  final_weight_poor: 380,
  daily_gain_excellent: 0.8,
  daily_gain_good: 0.7,
  daily_gain_poor: 0.6,
  scrotal_circumference_excellent: 38,
  scrotal_circumference_good: 35,
  scrotal_circumference_poor: 32,
  horn_preference: 'any',
};

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

    // Fetch custom benchmarks from database
    const { data: benchmarkData } = await supabaseClient
      .from('custom_benchmarks')
      .select('*')
      .eq('cabaña_id', cabanaId)
      .is('breed', null)
      .limit(1)
      .single();

    const benchmarks: Benchmark = benchmarkData ? {
      birth_weight_excellent: benchmarkData.birth_weight_excellent ?? DEFAULT_BENCHMARKS.birth_weight_excellent,
      birth_weight_good: benchmarkData.birth_weight_good ?? DEFAULT_BENCHMARKS.birth_weight_good,
      birth_weight_poor: benchmarkData.birth_weight_poor ?? DEFAULT_BENCHMARKS.birth_weight_poor,
      weaning_weight_excellent: benchmarkData.weaning_weight_excellent ?? DEFAULT_BENCHMARKS.weaning_weight_excellent,
      weaning_weight_good: benchmarkData.weaning_weight_good ?? DEFAULT_BENCHMARKS.weaning_weight_good,
      weaning_weight_poor: benchmarkData.weaning_weight_poor ?? DEFAULT_BENCHMARKS.weaning_weight_poor,
      final_weight_excellent: benchmarkData.final_weight_excellent ?? DEFAULT_BENCHMARKS.final_weight_excellent,
      final_weight_good: benchmarkData.final_weight_good ?? DEFAULT_BENCHMARKS.final_weight_good,
      final_weight_poor: benchmarkData.final_weight_poor ?? DEFAULT_BENCHMARKS.final_weight_poor,
      daily_gain_excellent: benchmarkData.daily_gain_excellent ?? DEFAULT_BENCHMARKS.daily_gain_excellent,
      daily_gain_good: benchmarkData.daily_gain_good ?? DEFAULT_BENCHMARKS.daily_gain_good,
      daily_gain_poor: benchmarkData.daily_gain_poor ?? DEFAULT_BENCHMARKS.daily_gain_poor,
      scrotal_circumference_excellent: benchmarkData.scrotal_circumference_excellent ?? DEFAULT_BENCHMARKS.scrotal_circumference_excellent,
      scrotal_circumference_good: benchmarkData.scrotal_circumference_good ?? DEFAULT_BENCHMARKS.scrotal_circumference_good,
      scrotal_circumference_poor: benchmarkData.scrotal_circumference_poor ?? DEFAULT_BENCHMARKS.scrotal_circumference_poor,
      horn_preference: benchmarkData.horn_preference ?? DEFAULT_BENCHMARKS.horn_preference,
    } : DEFAULT_BENCHMARKS;

    console.log('Using benchmarks:', benchmarks);

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

    // ---- Fetch EPDs (Phase 1) ---------------------------------------------
    const allEligibleIds = [...eligibleCows, ...eligibleBulls].map(a => a.id);
    const depsMap = new Map<string, AnimalDEPs>();
    if (allEligibleIds.length > 0) {
      const { data: depsRows, error: depsErr } = await supabaseClient
        .from('animal_deps')
        .select('*')
        .eq('cabaña_id', cabanaId)
        .in('animal_id', allEligibleIds);
      if (depsErr) {
        console.warn('animal_deps query failed (continuing without EPDs):', depsErr.message);
      } else {
        for (const r of (depsRows || []) as AnimalDEPs[]) depsMap.set(r.animal_id, r);
      }
      console.log(`Loaded EPDs for ${depsMap.size}/${allEligibleIds.length} animals`);
    }

    // ---- Build multi-generation ancestry map (Phase 2) --------------------
    const pedigreeSeed: PedigreeAnimal[] = (animals || []).map((a: Animal) => ({
      id: a.id,
      father_id: a.father_id ?? null,
      mother_id: a.mother_id ?? null,
    }));
    const ancestryMap: AncestryMap = await buildAncestryMap(
      pedigreeSeed,
      async (missingIds) => {
        if (missingIds.length === 0) return [];
        const { data, error } = await supabaseClient
          .from('animals')
          .select('id, father_id, mother_id')
          .in('id', missingIds);
        if (error) {
          console.warn('Ancestor fetch failed:', error.message);
          return [];
        }
        return (data || []) as PedigreeAnimal[];
      },
    );
    console.log(`Ancestry map built for ${ancestryMap.size} animals`);

    // Calculate ALL possible pairings and score them
    const { pairings, blockedCount } = calculateAllPairings(
      eligibleCows, eligibleBulls, benchmarks, weights, depsMap, ancestryMap,
    );

    console.log(`Generated ${pairings.length} pairings, ${blockedCount} blocked`);

    // Calculate corral distribution
    const corralPlan = calculateCorralPlan(
      eligibleCows,
      eligibleBulls,
      corrals || [],
      pairings,
      { cow_per_bull_max, max_bulls_per_corral, density_per_hectare }
    );

    // Calculate summary
    const summary = {
      total_eligible_cows: eligibleCows.length,
      total_eligible_bulls: eligibleBulls.length,
      total_pairings: pairings.length,
      excellent_matches: pairings.filter(p => p.match_quality === 'excellent').length,
      good_matches: pairings.filter(p => p.match_quality === 'good').length,
      acceptable_matches: pairings.filter(p => p.match_quality === 'acceptable').length,
      blocked_combinations: blockedCount,
    };

    const plan: BreedingPlan = {
      season: season || detectSeason(),
      constraints: {
        cow_per_bull_max,
        max_bulls_per_corral,
        capacity_respected: corralPlan.every(c => c.capacity_ok)
      },
      pairings: pairings.slice(0, 100), // Return top 100 pairings
      summary,
      corral_plan: corralPlan,
      warnings: generateWarnings(pairings, corralPlan, eligibleCows, eligibleBulls)
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
  return Math.floor(diffDays / 30.44);
}

/**
 * Hard-block matings closer than first cousins (F >= 0.0625).
 * Lineal blood relatives and full/half sibs are blocked by the F threshold,
 * but we also keep an explicit direct-parent check as a safety net.
 */
function inbreedingForPairing(
  cow: Animal,
  bull: Animal,
  ancestry: AncestryMap,
): { F: number; blocked: boolean } {
  // Direct parent-offspring safety net.
  if (
    cow.father_id === bull.id || cow.mother_id === bull.id ||
    bull.father_id === cow.id || bull.mother_id === cow.id
  ) {
    return { F: 0.25, blocked: true };
  }
  const F = inbreedingCoefficient(cow.id, bull.id, ancestry);
  return { F, blocked: F >= 0.0625 };
}

function calculateAllPairings(
  cows: Animal[],
  bulls: Animal[],
  benchmarks: Benchmark,
  weights: any,
  depsMap: Map<string, AnimalDEPs>,
  ancestry: AncestryMap,
): { pairings: Pairing[]; blockedCount: number } {
  const pairings: Pairing[] = [];
  let blockedCount = 0;

  let debuggedOne = false;

  // Analyze ALL possible cow × bull combinations
  for (const cow of cows) {
    for (const bull of bulls) {
      const { F, blocked } = inbreedingForPairing(cow, bull, ancestry);

      if (blocked) {
        blockedCount++;
        continue;
      }

      const cowDEPs = depsMap.get(cow.id);
      const bullDEPs = depsMap.get(bull.id);
      const predicted = predictOffspringTraits(cow, bull, benchmarks, cowDEPs, bullDEPs);
      const scores = calculateDetailedScores(predicted, benchmarks, bull);
      const hornMatch = checkHornCompatibility(cow, bull, benchmarks.horn_preference);

      // Calculate weighted score (down-weighted by per-trait confidence).
      const weightedScore = calculateWeightedScore(scores, weights, hornMatch, predicted);
      const matchQuality = getMatchQuality(weightedScore);

      if (!debuggedOne && cowDEPs && bullDEPs) {
        console.log('[EPD debug] cow', cow.id, 'bull', bull.id, 'predicted', predicted);
        debuggedOne = true;
      }

      const pairing: Pairing = {
        cow_id: cow.id,
        bull_id: bull.id,
        cow_name: cow.name || `Vaca ${cow.id_tag || cow.id.slice(0, 6)}`,
        bull_name: bull.name || `Toro ${bull.id_tag || bull.id.slice(0, 6)}`,
        cow_tag: cow.id_tag,
        bull_tag: bull.id_tag,
        score: weightedScore,
        inbreeding_F: F,
        blocked: false,
        predicted,
        match_quality: matchQuality,
        explain: generateExplanation(cow, bull, F, weightedScore, matchQuality),
        detailed_explanation: generateDetailedExplanation(cow, bull, F, weightedScore, benchmarks, predicted, scores, hornMatch)
      };

      pairings.push(pairing);
    }
  }

  // Sort by score descending
  return {
    pairings: pairings.sort((a, b) => b.score - a.score),
    blockedCount
  };
}

// ---------- EPD-aware offspring prediction (Phase 1) -----------------------
//
// EPDs (DEPs) are deviations vs the breed average for a trait. For one mating
// we estimate the offspring EPD as the parent average:
//   offspring_EPD ≈ (sire_EPD + dam_EPD) / 2
// To produce a phenotype-like predicted value comparable to benchmarks we add
// the EPD to a baseline (benchmark "good" tier acts as the breed reference).
// Confidence is the blended accuracy; halved when only one parent has a DEP.

interface PredictedTrait { value: number; confidence: number; source: 'epd' | 'epd_partial' | 'phenotype'; }

function epdPredict(
  sireDep: number | null | undefined,
  sireAcc: number | null | undefined,
  damDep: number | null | undefined,
  damAcc: number | null | undefined,
  baseline: number,
): PredictedTrait | null {
  const hasS = sireDep !== null && sireDep !== undefined;
  const hasD = damDep !== null && damDep !== undefined;
  const sAcc = sireAcc ?? 0;
  const dAcc = damAcc ?? 0;
  if (hasS && hasD) {
    return {
      value: baseline + (sireDep! + damDep!) / 2,
      confidence: Math.min(1, (sAcc + dAcc) / 2),
      source: 'epd',
    };
  }
  if (hasS) {
    return { value: baseline + sireDep!, confidence: Math.min(1, sAcc / 2), source: 'epd_partial' };
  }
  if (hasD) {
    return { value: baseline + damDep!, confidence: Math.min(1, dAcc / 2), source: 'epd_partial' };
  }
  return null;
}

function predictOffspringTraits(
  cow: Animal,
  bull: Animal,
  benchmarks: Benchmark,
  cowDeps?: AnimalDEPs,
  bullDeps?: AnimalDEPs,
): any {
  const prediction: any = { confidence: {}, source: {} };

  const put = (key: string, t: PredictedTrait | null, fallback?: { value: number; confidence: number }) => {
    if (t) {
      prediction[key] = t.value;
      prediction.confidence[key] = t.confidence;
      prediction.source[key] = t.source;
    } else if (fallback) {
      prediction[key] = fallback.value;
      prediction.confidence[key] = fallback.confidence;
      prediction.source[key] = 'phenotype';
    }
  };

  // --- Birth weight ---
  const bwEpd = epdPredict(
    bullDeps?.dep_peso_nacer, bullDeps?.dep_peso_nacer_acc,
    cowDeps?.dep_peso_nacer, cowDeps?.dep_peso_nacer_acc,
    benchmarks.birth_weight_good,
  );
  let bwFallback: { value: number; confidence: number } | undefined;
  if (cow.peso_nacimiento || bull.peso_nacimiento) {
    const cowW = cow.peso_nacimiento ?? 32;
    const bullW = bull.peso_nacimiento ?? 35;
    bwFallback = { value: cowW * 0.4 + bullW * 0.6, confidence: 0.35 };
  }
  put('birth_weight', bwEpd, bwFallback);

  // --- Weaning weight ---
  const wwEpd = epdPredict(
    bullDeps?.dep_peso_destete, bullDeps?.dep_peso_destete_acc,
    cowDeps?.dep_peso_destete, cowDeps?.dep_peso_destete_acc,
    benchmarks.weaning_weight_good,
  );
  let wwFallback: { value: number; confidence: number } | undefined;
  if (cow.peso_destete || bull.peso_destete) {
    const cowW = cow.peso_destete ?? 180;
    const bullW = bull.peso_destete ?? 200;
    wwFallback = { value: (cowW + bullW) / 2, confidence: 0.35 };
  }
  put('weaning_weight', wwEpd, wwFallback);

  // --- Final weight ---
  const fwEpd = epdPredict(
    bullDeps?.dep_peso_final, bullDeps?.dep_peso_final_acc,
    cowDeps?.dep_peso_final, cowDeps?.dep_peso_final_acc,
    benchmarks.final_weight_good,
  );
  let fwFallback: { value: number; confidence: number } | undefined;
  if (cow.peso_final || bull.peso_final) {
    const cowW = cow.peso_final ?? 400;
    const bullW = bull.peso_final ?? 500;
    fwFallback = { value: cowW * 0.45 + bullW * 0.55, confidence: 0.35 };
  }
  put('final_weight', fwEpd, fwFallback);

  // --- Scrotal circumference ---
  const ceEpd = epdPredict(
    bullDeps?.dep_circunferencia_escrotal, bullDeps?.dep_circunferencia_escrotal_acc,
    cowDeps?.dep_circunferencia_escrotal, cowDeps?.dep_circunferencia_escrotal_acc,
    benchmarks.scrotal_circumference_good,
  );
  let ceFallback: { value: number; confidence: number } | undefined;
  if (bull.circunferencia_escrotal) {
    ceFallback = { value: bull.circunferencia_escrotal, confidence: 0.4 };
  }
  put('ce_cm', ceEpd, ceFallback);

  // --- Additional EPD-only traits (displayed; weighted only if user opts in)
  const milk = epdPredict(
    bullDeps?.dep_leche, bullDeps?.dep_leche_acc,
    cowDeps?.dep_leche, cowDeps?.dep_leche_acc,
    0,
  );
  put('milk', milk);

  const ribeye = epdPredict(
    bullDeps?.dep_area_ojo_bife, bullDeps?.dep_area_ojo_bife_acc,
    cowDeps?.dep_area_ojo_bife, cowDeps?.dep_area_ojo_bife_acc,
    0,
  );
  put('ribeye_area', ribeye);

  const marbling = epdPredict(
    bullDeps?.dep_grasa_intramuscular, bullDeps?.dep_grasa_intramuscular_acc,
    cowDeps?.dep_grasa_intramuscular, cowDeps?.dep_grasa_intramuscular_acc,
    0,
  );
  put('marbling', marbling);

  const docility = epdPredict(
    bullDeps?.dep_docilidad, bullDeps?.dep_docilidad_acc,
    cowDeps?.dep_docilidad, cowDeps?.dep_docilidad_acc,
    0,
  );
  put('docility', docility);

  return prediction;
}

function calculateDetailedScores(predicted: any, benchmarks: Benchmark, bull: Animal): any {
  const scores: any = {
    birth_weight_score: 0,
    weaning_weight_score: 0,
    final_weight_score: 0,
    ce_score: 0
  };

  // Birth weight score - penalize if too high (calving difficulty) or too low
  if (predicted.birth_weight) {
    const bw = predicted.birth_weight;
    if (bw >= benchmarks.birth_weight_good && bw <= benchmarks.birth_weight_excellent) {
      scores.birth_weight_score = 100;
    } else if (bw < benchmarks.birth_weight_poor) {
      scores.birth_weight_score = 40;
    } else if (bw > benchmarks.birth_weight_excellent * 1.1) {
      scores.birth_weight_score = 50; // Too heavy - calving risk
    } else {
      scores.birth_weight_score = 70;
    }
  }

  // Weaning weight score - higher is better
  if (predicted.weaning_weight) {
    const ww = predicted.weaning_weight;
    if (ww >= benchmarks.weaning_weight_excellent) {
      scores.weaning_weight_score = 100;
    } else if (ww >= benchmarks.weaning_weight_good) {
      scores.weaning_weight_score = 80;
    } else if (ww >= benchmarks.weaning_weight_poor) {
      scores.weaning_weight_score = 60;
    } else {
      scores.weaning_weight_score = 40;
    }
  }

  // Final weight score - higher is better
  if (predicted.final_weight) {
    const fw = predicted.final_weight;
    if (fw >= benchmarks.final_weight_excellent) {
      scores.final_weight_score = 100;
    } else if (fw >= benchmarks.final_weight_good) {
      scores.final_weight_score = 80;
    } else if (fw >= benchmarks.final_weight_poor) {
      scores.final_weight_score = 60;
    } else {
      scores.final_weight_score = 40;
    }
  }

  // CE score - higher is better (indicates better fertility in male offspring)
  if (predicted.ce_cm) {
    const ce = predicted.ce_cm;
    if (ce >= benchmarks.scrotal_circumference_excellent) {
      scores.ce_score = 100;
    } else if (ce >= benchmarks.scrotal_circumference_good) {
      scores.ce_score = 80;
    } else if (ce >= benchmarks.scrotal_circumference_poor) {
      scores.ce_score = 60;
    } else {
      scores.ce_score = 40;
    }
  }

  // EPD-only traits scored as "higher is better" vs zero (deviation from breed avg)
  if (typeof predicted.milk === 'number') {
    scores.milk_score = predicted.milk >= 0 ? Math.min(100, 60 + predicted.milk * 5) : Math.max(0, 60 + predicted.milk * 5);
  }
  if (typeof predicted.ribeye_area === 'number') {
    scores.ribeye_area_score = predicted.ribeye_area >= 0 ? Math.min(100, 60 + predicted.ribeye_area * 10) : Math.max(0, 60 + predicted.ribeye_area * 10);
  }
  if (typeof predicted.marbling === 'number') {
    scores.marbling_score = predicted.marbling >= 0 ? Math.min(100, 60 + predicted.marbling * 20) : Math.max(0, 60 + predicted.marbling * 20);
  }
  if (typeof predicted.docility === 'number') {
    scores.docility_score = predicted.docility >= 0 ? Math.min(100, 60 + predicted.docility * 5) : Math.max(0, 60 + predicted.docility * 5);
  }

  return scores;
}


function checkHornCompatibility(cow: Animal, bull: Animal, preference: string): boolean {
  if (preference === 'any') return true;
  
  // Polled is dominant over horned
  const cowPolled = cow.mocho === 'Si' || cow.mocho === 'Mocho';
  const bullPolled = bull.mocho === 'Si' || bull.mocho === 'Mocho';

  if (preference === 'polled') {
    // At least one parent should be polled for polled offspring likelihood
    return cowPolled || bullPolled;
  } else if (preference === 'horned') {
    // Both parents should be horned for horned offspring
    return !cowPolled && !bullPolled;
  }

  return true;
}

function calculateWeightedScore(scores: any, weights: any, hornMatch: boolean, predicted?: any): number {
  let total = 0;
  let totalWeight = 0;

  // Each contribution is down-weighted by its prediction confidence (0..1).
  // Phenotype fallbacks have lower confidence than EPD-based predictions, so
  // a high-accuracy EPD moves the score more than a guess.
  const conf = (key: string, fallback = 0.5) => {
    const c = predicted?.confidence?.[key];
    if (typeof c === 'number') return Math.max(0.1, Math.min(1, c));
    return fallback;
  };

  const add = (rawScore: number, weight: number, confidence: number) => {
    if (!rawScore) return;
    const w = weight * confidence;
    total += rawScore * w;
    totalWeight += w;
  };

  add(scores.birth_weight_score, weights.birth ?? 0.2, conf('birth_weight'));
  add(scores.weaning_weight_score, weights.weaning ?? 0.3, conf('weaning_weight'));
  add(scores.final_weight_score, weights.final ?? 0.3, conf('final_weight'));
  add(scores.ce_score, weights.ce ?? 0.2, conf('ce_cm'));

  // Optional EPD-only traits (default weight 0 — only score if user opted in).
  add(scores.milk_score, weights.milk ?? 0, conf('milk'));
  add(scores.ribeye_area_score, weights.ribeye_area ?? 0, conf('ribeye_area'));
  add(scores.marbling_score, weights.marbling ?? 0, conf('marbling'));
  add(scores.docility_score, weights.docility ?? 0, conf('docility'));

  let score = totalWeight > 0 ? total / totalWeight : 50;

  if (!hornMatch) {
    score *= 0.9; // 10% penalty for horn mismatch
  }

  return Math.round(score);
}


function getMatchQuality(score: number): 'excellent' | 'good' | 'acceptable' | 'poor' {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 55) return 'acceptable';
  return 'poor';
}

function generateExplanation(cow: Animal, bull: Animal, F: number, score: number, quality: string): string {
  const parts: string[] = [];

  if (F === 0) {
    parts.push("Sin parentesco");
  } else if (F < 0.03) {
    parts.push("Parentesco bajo");
  } else {
    parts.push(`Parentesco ${(F * 100).toFixed(1)}%`);
  }

  if (quality === 'excellent') {
    parts.push("⭐ Excelente ajuste");
  } else if (quality === 'good') {
    parts.push("✓ Buen ajuste");
  } else if (quality === 'acceptable') {
    parts.push("Ajuste aceptable");
  } else {
    parts.push("Ajuste bajo");
  }

  return parts.join(" • ");
}

function generateDetailedExplanation(
  cow: Animal, 
  bull: Animal, 
  F: number, 
  score: number, 
  benchmarks: Benchmark,
  predicted: any,
  scores: any,
  hornMatch: boolean
): any {
  const genetic_merit = `Vaca: ${cow.peso_final || 'N/A'}kg final • Toro: ${bull.peso_final || 'N/A'}kg final, CE: ${bull.circunferencia_escrotal || 'N/A'}cm`;
  
  let inbreeding_risk = "";
  if (F === 0) {
    inbreeding_risk = "✓ Sin parentesco conocido - Cruce seguro";
  } else if (F < 0.03) {
    inbreeding_risk = `Parentesco bajo (${(F * 100).toFixed(1)}%) - Seguro`;
  } else if (F < 0.0625) {
    inbreeding_risk = `⚠️ Parentesco moderado (${(F * 100).toFixed(1)}%) - Monitorear`;
  } else {
    inbreeding_risk = `❌ Parentesco alto (${(F * 100).toFixed(1)}%) - No recomendado`;
  }

  const predicted_performance = [
    predicted.birth_weight ? `Peso nacer: ${predicted.birth_weight.toFixed(1)}kg (${scores.birth_weight_score}pts)` : null,
    predicted.weaning_weight ? `Peso destete: ${predicted.weaning_weight.toFixed(1)}kg (${scores.weaning_weight_score}pts)` : null,
    predicted.final_weight ? `Peso final: ${predicted.final_weight.toFixed(1)}kg (${scores.final_weight_score}pts)` : null,
    predicted.ce_cm ? `CE: ${predicted.ce_cm.toFixed(1)}cm (${scores.ce_score}pts)` : null,
    !hornMatch ? `⚠️ Cuernos no coincide con preferencia` : null
  ].filter(Boolean).join(" | ");

  let recommendation = "";
  if (score >= 85 && F < 0.03) {
    recommendation = "⭐ Altamente recomendado - Excelente potencial genético";
  } else if (score >= 70 && F < 0.0625) {
    recommendation = "✓ Recomendado - Buen balance genético";
  } else if (score >= 55) {
    recommendation = "➡️ Aceptable - Cumple objetivos básicos";
  } else {
    recommendation = "⚠️ Evaluar alternativas - Bajo potencial";
  }

  return {
    genetic_merit,
    inbreeding_risk,
    predicted_performance,
    recommendation,
    scores: {
      ...scores,
      horn_match: hornMatch
    }
  };
}

function calculateCorralPlan(
  cows: Animal[],
  bulls: Animal[],
  corrals: Corral[],
  pairings: Pairing[],
  constraints: any
): any[] {
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

  const corralsWithExcessBulls = corralStats.filter(stats => stats.hasExcessBulls);
  const corralsNeedingBulls = corralStats.filter(stats => stats.needsBull && stats.hasSpace);
  
  const moves: { bull: Animal, from: string, to: string }[] = [];
  
  for (const sourceStats of corralsWithExcessBulls) {
    const excessBulls = sourceStats.currentBulls.slice(constraints.max_bulls_per_corral);
    
    for (const bull of excessBulls) {
      const targetCorral = corralsNeedingBulls
        .filter(stats => !moves.some(m => m.to === stats.corral.id))
        .sort((a, b) => b.eligibleCows.length - a.eligibleCows.length)[0];
      
      if (targetCorral) {
        moves.push({
          bull,
          from: sourceStats.corral.id,
          to: targetCorral.corral.id
        });
        
        const targetIndex = corralsNeedingBulls.findIndex(s => s.corral.id === targetCorral.corral.id);
        if (targetIndex !== -1) {
          corralsNeedingBulls.splice(targetIndex, 1);
        }
      }
    }
  }

  return corralStats.map(stats => {
    const movesOut = moves.filter(m => m.from === stats.corral.id);
    const movesIn = moves.filter(m => m.to === stats.corral.id);
    
    const finalBulls = [
      ...stats.currentBulls.filter(b => !movesOut.some(m => m.bull.id === b.id)),
      ...movesIn.map(m => m.bull)
    ];

    let suggestion = "";
    const finalAnimalsCount = stats.currentAnimals.length - movesOut.length + movesIn.length;
    
    if (finalAnimalsCount > stats.capacity) {
      suggestion = `Reducir ${finalAnimalsCount - stats.capacity} animales`;
    } else if (finalBulls.length === 0 && stats.eligibleCows.length > 0) {
      suggestion = "Requiere toro reproductor";
    } else if (movesIn.length > 0) {
      suggestion = `Recibiendo ${movesIn.length} toro(s)`;
    } else if (movesOut.length > 0) {
      suggestion = `Liberando ${movesOut.length} toro(s)`;
    } else if (finalAnimalsCount < stats.capacity * 0.7) {
      suggestion = `Capacidad: ${Math.floor(stats.capacity - finalAnimalsCount)} lugares`;
    } else {
      suggestion = "Distribución óptima";
    }
    
    return {
      corral_id: stats.corral.id,
      corral_name: stats.corral.name,
      moves_in: movesIn.map(m => ({
        animal_id: m.bull.id,
        animal_name: m.bull.name || m.bull.id_tag || `T-${m.bull.id.slice(0, 6)}`,
        from_corral: corrals.find(c => c.id === m.from)?.name
      })),
      moves_out: movesOut.map(m => ({
        animal_id: m.bull.id,
        animal_name: m.bull.name || m.bull.id_tag || `T-${m.bull.id.slice(0, 6)}`,
        to_corral: corrals.find(c => c.id === m.to)?.name
      })),
      bulls_assigned: finalBulls.map(b => ({
        id: b.id,
        name: b.name || b.id_tag || `T-${b.id.slice(0, 6)}`
      })),
      capacity_ok: finalAnimalsCount <= stats.capacity,
      ratio_ok: stats.eligibleCows.length === 0 || 
                (finalBulls.length > 0 && stats.eligibleCows.length / finalBulls.length <= constraints.cow_per_bull_max),
      suggestion
    };
  });
}

function generateWarnings(pairings: Pairing[], corralPlan: any[], cows: Animal[], bulls: Animal[]): string[] {
  const warnings: string[] = [];

  if (bulls.length === 0) {
    warnings.push("No hay toros elegibles para servicio");
  }

  if (cows.length === 0) {
    warnings.push("No hay vacas elegibles para servicio");
  }

  const poorMatches = pairings.filter(p => p.match_quality === 'poor').length;
  if (poorMatches > pairings.length * 0.3) {
    warnings.push(`${poorMatches} cruces con bajo potencial genético`);
  }

  const overCapacity = corralPlan.filter(c => !c.capacity_ok);
  if (overCapacity.length > 0) {
    warnings.push(`${overCapacity.length} corrales sobre capacidad`);
  }

  const needBulls = corralPlan.filter(c => c.suggestion.includes("Requiere toro"));
  if (needBulls.length > 0) {
    warnings.push(`${needBulls.length} corrales sin toro asignado`);
  }

  return warnings;
}

function detectSeason(): string {
  const month = new Date().getMonth() + 1;
  if (month >= 9 || month <= 2) return "Primavera/Verano";
  return "Otoño/Invierno";
}