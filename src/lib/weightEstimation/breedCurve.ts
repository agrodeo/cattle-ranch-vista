import { getBreedGrowthParams, gompertzWeight } from '@/data/breedGrowthCurves';

interface BreedCurveResult {
  estimatedWeight: number;
  confidence: number;
}

/**
 * Layer 2: Estimate weight using Gompertz breed growth curve.
 * Confidence is fixed at 0.5 since it's a generic model.
 */
export function estimateFromBreedCurve(
  ageDays: number | null,
  breed: string | null | undefined,
  sex: string | null | undefined
): BreedCurveResult | null {
  if (ageDays === null || ageDays <= 0) return null;

  const params = getBreedGrowthParams(breed, sex);
  const estimatedWeight = gompertzWeight(ageDays, params);

  return {
    estimatedWeight: Math.round(estimatedWeight * 10) / 10,
    confidence: 0.5,
  };
}
