import { differenceInDays } from 'date-fns';
import type { WeightRecord } from './types';

interface AdgResult {
  weightedAdg: number;
  lastWeight: number;
  lastDate: string;
  daysSinceLast: number;
  confidence: number;
  hasAnomaly: boolean;
}

/**
 * Layer 1: Calculate weighted ADG from individual weight history.
 * Recent segments are weighted more (decay factor 0.7 per older segment).
 * Returns null if fewer than 2 records.
 */
export function calculateIndividualAdg(
  weights: WeightRecord[],
  animalAgeDays: number | null
): AdgResult | null {
  if (weights.length < 2) return null;

  // Sort descending by date (most recent first)
  const sorted = [...weights].sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
  );

  const now = new Date();
  const lastWeight = sorted[0].peso;
  const lastDate = sorted[0].fecha;
  const daysSinceLast = differenceInDays(now, new Date(lastDate));

  // Calculate ADG for each consecutive pair
  const segments: { adg: number; days: number }[] = [];
  let hasAnomaly = false;

  for (let i = 0; i < sorted.length - 1; i++) {
    const recent = sorted[i];
    const older = sorted[i + 1];
    const days = differenceInDays(new Date(recent.fecha), new Date(older.fecha));
    if (days <= 0) continue;
    const adg = (recent.peso - older.peso) / days;
    if (adg < 0) {
      hasAnomaly = true;
      continue; // skip negative ADG segments
    }
    segments.push({ adg, days });
  }

  if (segments.length === 0) return null;

  // Weighted average with decay: most recent segment has highest weight
  const DECAY = 0.7;
  let totalWeight = 0;
  let weightedSum = 0;
  for (let i = 0; i < segments.length; i++) {
    const w = Math.pow(DECAY, i);
    weightedSum += segments[i].adg * w;
    totalWeight += w;
  }
  let weightedAdg = weightedSum / totalWeight;

  // Age-based decay
  if (animalAgeDays !== null) {
    const ageMonths = animalAgeDays / 30.44;
    if (ageMonths > 24) weightedAdg *= 0.85;
    else if (ageMonths > 18) weightedAdg *= 0.92;
  }

  // Confidence decreases with time since last weigh
  const confidence = Math.max(0.4, 1.0 - daysSinceLast / 365);

  return { weightedAdg, lastWeight, lastDate, daysSinceLast, confidence, hasAnomaly };
}
