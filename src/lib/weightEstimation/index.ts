import { differenceInDays } from 'date-fns';
import { calculateIndividualAdg } from './individualAdg';
import { estimateFromBreedCurve } from './breedCurve';
import { getBreedGrowthParams } from '@/data/breedGrowthCurves';
import type { WeightEstimation, WeightRecord, AnimalWeightInput } from './types';

export type { WeightEstimation, AnimalWeightInput };

/**
 * Main weight estimation function combining Layer 1 (individual ADG)
 * and Layer 2 (breed Gompertz curve).
 */
export function estimateWeight(
  animal: AnimalWeightInput,
  weights: WeightRecord[]
): WeightEstimation {
  const now = new Date();
  const dataSources: string[] = [];

  // Calculate animal age in days
  const ageDays = animal.birth_date
    ? differenceInDays(now, new Date(animal.birth_date))
    : null;

  // Layer 1: Individual ADG
  const adgResult = calculateIndividualAdg(weights, ageDays);

  // Layer 2: Breed curve
  const breedResult = estimateFromBreedCurve(ageDays, animal.breed, animal.sex);

  // Days since last weigh
  const lastWeighDate = adgResult?.lastDate || animal.fecha_ultimo_pesaje;
  const daysSinceLastWeigh = lastWeighDate
    ? differenceInDays(now, new Date(lastWeighDate))
    : null;

  // If negative ADG detected, fall back to Layer 2
  const layer1Usable = adgResult && !adgResult.hasAnomaly;

  // Dynamic weighting
  let w1 = 0, w2 = 0;
  let layer1Est = 0, layer2Est = 0;

  if (layer1Usable && adgResult) {
    // Weight Layer 1 by recency of last weighing.
    // Recent weighings (≤7 days) → Layer 1 dominates almost entirely (98%).
    // Older weighings → breed curve gradually contributes more.
    const d = adgResult.daysSinceLast;
    if (d <= 7) {
      w1 = 0.98;
    } else if (d <= 30) {
      w1 = 0.92;
    } else if (d <= 90) {
      w1 = 0.80;
    } else if (d <= 180) {
      w1 = 0.60;
    } else if (d <= 365) {
      w1 = 0.40;
    } else {
      w1 = 0.25;
    }
    w2 = 1 - w1;
    layer1Est = adgResult.lastWeight + adgResult.weightedAdg * d;
    dataSources.push(`Último pesaje: ${adgResult.lastWeight} kg hace ${d} día${d === 1 ? '' : 's'} (GDP ${adgResult.weightedAdg.toFixed(3)} kg/día)`);
  } else {
    w1 = 0;
    w2 = 1.0;
  }

  if (breedResult) {
    layer2Est = breedResult.estimatedWeight;
    dataSources.push(`Curva de crecimiento ${animal.breed || 'promedio'} (Gompertz)`);
  } else {
    // No breed curve possible, use Layer 1 only
    w1 = layer1Usable ? 1.0 : 0;
    w2 = 0;
  }

  // Combine estimates
  let estimatedWeight = 0;
  let confidence = 0;

  if (w1 + w2 > 0) {
    const totalW = w1 + w2;
    const nw1 = w1 / totalW;
    const nw2 = w2 / totalW;
    estimatedWeight = nw1 * layer1Est + nw2 * layer2Est;
    confidence = layer1Usable && adgResult
      ? nw1 * adgResult.confidence + nw2 * (breedResult?.confidence || 0)
      : breedResult?.confidence || 0.4;
  }

  // Cap estimated weight to breed asymptotic maximum (A * 1.15)
  // No animal should realistically exceed ~115% of its breed's mature weight
  const breedParams = getBreedGrowthParams(animal.breed, animal.sex);
  const maxRealisticWeight = breedParams.A * 1.15;
  if (estimatedWeight > maxRealisticWeight) {
    estimatedWeight = maxRealisticWeight;
    // Lower confidence when capping is needed — the estimate was unreliable
    confidence = Math.min(confidence, 0.35);
    dataSources.push(`Peso limitado al máximo fisiológico (${Math.round(maxRealisticWeight)} kg)`);
  }

  // Pregnancy offset
  let pregnancyOffset = 0;
  if (animal.esta_preñada && animal.fecha_probable_parto) {
    const dueDate = new Date(animal.fecha_probable_parto);
    const daysToDue = differenceInDays(dueDate, now);
    const totalGestationDays = 283; // avg bovine gestation
    const daysPregnant = totalGestationDays - Math.max(0, daysToDue);
    const progress = Math.min(1, Math.max(0, daysPregnant / totalGestationDays));
    pregnancyOffset = 30 + progress * 30; // 30-60 kg
    estimatedWeight += pregnancyOffset;
    dataSources.push(`Ajuste por preñez (+${pregnancyOffset.toFixed(0)} kg)`);
  }

  // Confidence range (wider when confidence is lower)
  const baseRange = estimatedWeight * 0.05; // 5% base
  const confidenceRange = Math.round(baseRange / Math.max(confidence, 0.3));

  // Clamp confidence to percentage
  const confidencePercent = Math.round(Math.min(1, Math.max(0, confidence)) * 100);

  // Needs weighing flag
  const needsWeighing =
    confidencePercent < 60 ||
    (daysSinceLastWeigh !== null && daysSinceLastWeigh > 120) ||
    daysSinceLastWeigh === null;

  return {
    estimatedWeight: Math.round(estimatedWeight * 10) / 10,
    confidencePercent,
    confidenceRange,
    daysSinceLastWeigh,
    needsWeighing,
    dataSources,
    layer1Available: !!layer1Usable,
    hasAnomaly: adgResult?.hasAnomaly || false,
    pregnancyOffset,
  };
}
