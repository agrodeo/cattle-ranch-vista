import type { BreedBenchmarks } from "./breedBenchmarks";
import { inbreedingLevel, inbreedingPenalty, type InbreedingInfo } from "./inbreeding";


export type AnimalCategory = "Ternero" | "Ternera" | "Novillito" | "Vaquillona" | "Vaca" | "Toro";

export interface AnimalScoreInput {
  sex: string;
  breed: string;
  birthDate: string | null;
  pesoNacimiento: number | null;
  pesoDestete: number | null;
  pesoFinal: number | null;
  pesoActual: number | null;
  adg: number | null;
  adgPercentile: number | null;
  weightRecordCount: number;
  weightTrend: "ascending" | "descending" | "stable" | null;
  totalServices: number;
  totalPregnancies: number;
  successfulPregnancies: number;
  totalOffspring: number;
  liveOffspring: number;
  daysOpen: number | null;
  isPregnant: boolean;
  requiredVaccines: number;
  completedVaccines: number;
  overdueVaccines: number;
  condicionCorporal: number | null;
  registrationLevel: string | null;
  dnaVerified: boolean;
  hasFather: boolean;
  hasMother: boolean;
  fatherRegistration: string | null;
  motherRegistration: string | null;
  herdAvgScore: number | null;
  benchmarks: BreedBenchmarks;
  /* --- Optional context added by the peer-group aware ranking --- */
  ageMonths?: number | null;
  /** Percentile (0-100) of ADG inside the peer group (same category, same breed when possible). */
  peerAdgPercentile?: number | null;
  /** Percentile (0-100) of weaning weight inside the peer group. */
  peerWeaningPercentile?: number | null;
  /** Number of comparable animals used to build the percentiles. */
  peerGroupSize?: number | null;
  /** Percentile (0-100) of the animal's DEP index inside the herd. */
  depPercentile?: number | null;
  /** Bull-only reproductive metrics. */
  scrotalCircumference?: number | null;
  bullServedFemales?: number | null;
  bullPregnancyRate?: number | null;
  bullLiveOffspring?: number | null;
  /** Cow-only longevity metrics. */
  reproductiveYears?: number | null;
  calvingIntervalDays?: number | null;
  /** Inbreeding coefficient F (0-1) of this animal, from the herd pedigree. */
  inbreedingCoefficient?: number | null;
  /** True when both parents are known (so the coefficient is meaningful). */
  inbreedingParentsKnown?: boolean;
}


export interface AnimalScore {
  overall: number;
  production: number;
  reproduction: number;
  health: number;
  genetics: number;
  longevity: number;
  vsHerdAvg: number | null;
  percentileRank: number | null;
  badges: ScoreBadge[];
  dataCompleteness: number;
  hasEnoughData: boolean;
  dimensionsWithData: number;
  /** Category used to resolve the dimension weights. */
  category: AnimalCategory;
  /** Weights actually applied for this animal's category. */
  weights: DimensionWeights;
  /** Which dimensions carry real data (the rest are shown as "—"). */
  applicable: Record<DimensionKey, boolean>;
  /** 0-100 confidence: share of the category weight that is backed by data. */
  confidence: number;
  peerGroupSize: number;
}

export interface ScoreBadge {
  id: string;
  labelKey: string;
  labelParams?: Record<string, string | number>;
  variant: "success" | "warning" | "info" | "neutral";
}

export type DimensionKey = "production" | "reproduction" | "health" | "genetics" | "longevity";
export type DimensionWeights = Record<DimensionKey, number>;

export const CATEGORY_WEIGHTS: Record<AnimalCategory, DimensionWeights> = {
  Ternero: { production: 0.6, reproduction: 0, health: 0.2, genetics: 0.2, longevity: 0 },
  Ternera: { production: 0.6, reproduction: 0, health: 0.2, genetics: 0.2, longevity: 0 },
  Novillito: { production: 0.65, reproduction: 0, health: 0.2, genetics: 0.15, longevity: 0 },
  Vaquillona: { production: 0.4, reproduction: 0.25, health: 0.2, genetics: 0.15, longevity: 0 },
  Vaca: { production: 0.2, reproduction: 0.45, health: 0.15, genetics: 0.1, longevity: 0.1 },
  Toro: { production: 0.4, reproduction: 0.25, health: 0.15, genetics: 0.2, longevity: 0 },
};

interface DimensionResult {
  score: number;
  completeness: number;
}

const NO_DATA: DimensionResult = { score: 0, completeness: 0 };

function clamp(value: number, min = 0, max = 10): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function isFemaleSex(sex: string): boolean {
  return ["hembra", "female", "fêmea", "f", "h"].includes((sex || "").trim().toLowerCase());
}

function isFemale(sex: string): boolean {
  return isFemaleSex(sex);
}

function monthsFromBirth(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const time = new Date(birthDate).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Math.floor((Date.now() - time) / (30.44 * 86400000)));
}

export function resolveCategory(sex: string, ageMonths: number | null): AnimalCategory {
  const female = isFemaleSex(sex);
  // Unknown age is treated as adult: adults are the majority of a herd and the
  // adult weight mix is the least biased default.
  const age = ageMonths ?? 30;
  if (female) return age < 12 ? "Ternera" : age < 24 ? "Vaquillona" : "Vaca";
  return age < 12 ? "Ternero" : age < 24 ? "Novillito" : "Toro";
}

/** Percentile 0-100 -> score 0-10 mapped so the median sits at 5.5. */
function percentileToScore(percentile: number): number {
  return clamp(1 + (percentile / 100) * 9);
}

/* ------------------------------------------------------------------ */
/* Production                                                          */
/* ------------------------------------------------------------------ */

function scoreProduction(input: AnimalScoreInput, category: AnimalCategory): DimensionResult {
  const b = input.benchmarks;
  const hasAnyWeightData =
    input.adg != null || input.pesoDestete != null || input.pesoNacimiento != null || input.pesoFinal != null || input.pesoActual != null;
  if (!hasAnyWeightData) return NO_DATA;

  let weightedSum = 0;
  let totalWeight = 0;
  let fieldsAvailable = 0;
  const fieldsTotal = 3;

  // ADG is the primary metric. Reliability: a single weighing yields a weak ADG,
  // so its influence is attenuated toward the neutral value.
  if (input.adg != null && input.adg > 0 && b.dailyGain.good > 0) {
    const raw = clamp((input.adg / b.dailyGain.good) * 7);
    const reliability = input.weightRecordCount >= 3 ? 1 : input.weightRecordCount === 2 ? 0.75 : 0.5;
    const adjusted = raw * reliability + 5.5 * (1 - reliability);
    weightedSum += adjusted * 0.5;
    totalWeight += 0.5;
    fieldsAvailable++;
  }

  if (input.pesoDestete != null && input.pesoDestete > 0 && b.weaningWeight.good > 0) {
    weightedSum += clamp((input.pesoDestete / b.weaningWeight.good) * 7) * 0.35;
    totalWeight += 0.35;
    fieldsAvailable++;
  }

  // Birth weight (calving-ease proxy) counts for every category: strongly while the
  // animal is a calf, and with a small residual weight for the rest of its life.
  if (input.pesoNacimiento != null && input.pesoNacimiento > 0 && b.birthWeight.good > 0) {
    const ratio = input.pesoNacimiento / b.birthWeight.good;
    const birthScore = ratio >= 0.9 && ratio <= 1.15 ? 9 : ratio > 1.15 ? clamp(9 - (ratio - 1.15) * 15, 3, 9) : clamp(ratio * 10, 2, 8);
    const birthWeightFactor = category === "Ternero" || category === "Ternera" ? 0.15 : 0.05;
    weightedSum += birthScore * birthWeightFactor;
    totalWeight += birthWeightFactor;
    fieldsAvailable++;
  }


  if (totalWeight === 0) return NO_DATA;

  const absoluteScore = clamp(weightedSum / totalWeight);
  const completeness = (fieldsAvailable / fieldsTotal) * 100;

  // Peer-relative blend: fair for mixed breeds, small herds and every category.
  const peerSize = input.peerGroupSize ?? 0;
  const peerParts: number[] = [];
  if (input.peerAdgPercentile != null) peerParts.push(percentileToScore(input.peerAdgPercentile) * 2);
  if (input.peerWeaningPercentile != null) peerParts.push(percentileToScore(input.peerWeaningPercentile));
  if (peerSize >= 5 && peerParts.length > 0) {
    const weightsSum = input.peerAdgPercentile != null ? (input.peerWeaningPercentile != null ? 3 : 2) : 1;
    const peerScore = peerParts.reduce((sum, value) => sum + value, 0) / weightsSum;
    return { score: clamp(peerScore * 0.6 + absoluteScore * 0.4), completeness };
  }

  return { score: absoluteScore, completeness };
}

/* ------------------------------------------------------------------ */
/* Reproduction                                                        */
/* ------------------------------------------------------------------ */

function laplaceRate(successes: number, attempts: number): number {
  return (successes + 1) / (attempts + 2);
}

function daysOpenScore(daysOpen: number): number {
  if (daysOpen <= 90) return 9.5;
  if (daysOpen <= 120) return 8;
  if (daysOpen <= 150) return 6.5;
  if (daysOpen <= 200) return 4.5;
  return 2.5;
}

function scoreCowReproduction(input: AnimalScoreInput): DimensionResult {
  const hasData = input.totalServices > 0 || input.totalOffspring > 0 || input.totalPregnancies > 0 || input.isPregnant;
  if (!hasData) return NO_DATA;

  let weightedSum = 0;
  let totalWeight = 0;
  let fieldsAvailable = 0;
  const fieldsTotal = 4;

  if (input.totalServices > 0) {
    const rate = laplaceRate(input.successfulPregnancies, input.totalServices);
    weightedSum += clamp((rate / 0.85) * 10) * 0.35;
    totalWeight += 0.35;
    fieldsAvailable++;
  }
  if (input.totalPregnancies > 0) {
    const survival = laplaceRate(input.liveOffspring, input.totalPregnancies);
    weightedSum += clamp((survival / 0.9) * 10) * 0.3;
    totalWeight += 0.3;
    fieldsAvailable++;
  }
  if (input.calvingIntervalDays != null && input.calvingIntervalDays > 0) {
    const interval = input.calvingIntervalDays;
    const intervalScore = interval <= 380 ? 9.5 : interval <= 420 ? 8 : interval <= 480 ? 6 : interval <= 550 ? 4 : 2.5;
    weightedSum += intervalScore * 0.2;
    totalWeight += 0.2;
    fieldsAvailable++;
  } else if (input.daysOpen != null) {
    weightedSum += daysOpenScore(input.daysOpen) * 0.2;
    totalWeight += 0.2;
    fieldsAvailable++;
  } else if (input.isPregnant) {
    weightedSum += 8 * 0.2;
    totalWeight += 0.2;
    fieldsAvailable++;
  }
  if (input.totalOffspring > 0) {
    weightedSum += clamp(3 + input.liveOffspring * 1.5, 3, 10) * 0.15;
    totalWeight += 0.15;
    fieldsAvailable++;
  }

  if (totalWeight === 0) return NO_DATA;
  return { score: clamp(weightedSum / totalWeight), completeness: (fieldsAvailable / fieldsTotal) * 100 };
}

function scoreHeiferReproduction(input: AnimalScoreInput, ageMonths: number | null): DimensionResult {
  const age = ageMonths ?? 0;
  const served = input.totalServices > 0;
  const hasOffspring = input.totalOffspring > 0;

  // Too young to be judged: no data instead of a penalty.
  if (!served && !input.isPregnant && !hasOffspring) {
    if (age < 18) return NO_DATA;
    // Old enough to have been served and still nothing recorded: mild penalty.
    return { score: age >= 24 ? 3.5 : 4.5, completeness: 50 };
  }

  // Precocity: earlier pregnancy scores higher.
  let score = 6;
  if (input.isPregnant || hasOffspring) score = age <= 20 ? 10 : age <= 24 ? 9 : 7.5;
  else if (served) score = age <= 20 ? 8 : 7;

  if (served) {
    const rate = laplaceRate(input.successfulPregnancies, input.totalServices);
    score = clamp(score * 0.7 + (rate / 0.85) * 10 * 0.3);
  }
  return { score: clamp(score), completeness: served ? 100 : 75 };
}

function scoreBullReproduction(input: AnimalScoreInput): DimensionResult {
  let weightedSum = 0;
  let totalWeight = 0;
  let fieldsAvailable = 0;
  const fieldsTotal = 3;

  const served = input.bullServedFemales ?? 0;
  if (served >= 3 && input.bullPregnancyRate != null) {
    weightedSum += clamp((input.bullPregnancyRate / 0.85) * 10) * 0.5;
    totalWeight += 0.5;
    fieldsAvailable++;
  }
  if ((input.bullLiveOffspring ?? 0) > 0 || (input.liveOffspring ?? 0) > 0) {
    const offspring = Math.max(input.bullLiveOffspring ?? 0, input.liveOffspring ?? 0);
    weightedSum += clamp(4 + offspring * 0.6, 4, 10) * 0.3;
    totalWeight += 0.3;
    fieldsAvailable++;
  }
  if (input.scrotalCircumference != null && input.scrotalCircumference > 0) {
    const cm = input.scrotalCircumference;
    const scScore = cm >= 38 ? 10 : cm >= 34 ? 8.5 : cm >= 30 ? 7 : cm >= 26 ? 5 : 3;
    weightedSum += scScore * 0.2;
    totalWeight += 0.2;
    fieldsAvailable++;
  }

  if (totalWeight === 0) return NO_DATA;
  return { score: clamp(weightedSum / totalWeight), completeness: (fieldsAvailable / fieldsTotal) * 100 };
}

function scoreReproduction(input: AnimalScoreInput, category: AnimalCategory, ageMonths: number | null): DimensionResult {
  if (category === "Vaca") return scoreCowReproduction(input);
  if (category === "Vaquillona") return scoreHeiferReproduction(input, ageMonths);
  if (category === "Toro") return scoreBullReproduction(input);
  return NO_DATA;
}

/* ------------------------------------------------------------------ */
/* Health                                                              */
/* ------------------------------------------------------------------ */

function scoreHealth(input: AnimalScoreInput): DimensionResult {
  let weightedSum = 0;
  let totalWeight = 0;
  let fieldsAvailable = 0;

  if (input.requiredVaccines > 0) {
    const coverage = clamp((input.completedVaccines / input.requiredVaccines) * 10);
    const penalty = Math.min(3, input.overdueVaccines * 1.5);
    weightedSum += clamp(coverage - penalty) * 0.7;
    totalWeight += 0.7;
    fieldsAvailable++;
  }
  if (input.condicionCorporal != null) {
    const bcs = input.condicionCorporal;
    const bodyScore = bcs >= 3 && bcs <= 4 ? 9.5 : bcs >= 2.5 && bcs < 3 ? 8 : bcs > 4 && bcs <= 5 ? 7 : bcs >= 2 ? 5 : 3;
    weightedSum += bodyScore * 0.3;
    totalWeight += 0.3;
    fieldsAvailable++;
  }

  if (totalWeight === 0) return NO_DATA;
  return { score: clamp(weightedSum / totalWeight), completeness: (fieldsAvailable / 2) * 100 };
}

/* ------------------------------------------------------------------ */
/* Genetics                                                            */
/* ------------------------------------------------------------------ */

function scoreGenetics(input: AnimalScoreInput): DimensionResult {
  const hasPedigree = input.registrationLevel != null || input.dnaVerified || input.hasFather || input.hasMother;
  const hasDeps = input.depPercentile != null;
  if (!hasPedigree && !hasDeps) return NO_DATA;

  let pedigreeScore = 3;
  let fieldsAvailable = 0;
  const regLevels: Record<string, number> = { PC: 4, PO: 3.5, PP: 2.5, PA: 2 };
  if (input.registrationLevel) {
    pedigreeScore += regLevels[input.registrationLevel.toUpperCase()] ?? 1;
    fieldsAvailable++;
  }
  if (input.dnaVerified) {
    pedigreeScore += 1.5;
    fieldsAvailable++;
  }
  if (input.hasFather) {
    pedigreeScore += input.fatherRegistration ? 1 : 0.5;
    fieldsAvailable++;
  }
  if (input.hasMother) {
    pedigreeScore += input.motherRegistration ? 1 : 0.5;
    fieldsAvailable++;
  }
  pedigreeScore = clamp(pedigreeScore);

  if (hasDeps) {
    // Real genetic merit dominates over how complete the pedigree paperwork is.
    const depScore = percentileToScore(input.depPercentile as number);
    const score = hasPedigree ? clamp(depScore * 0.65 + pedigreeScore * 0.35) : depScore;
    return { score, completeness: Math.min(100, ((fieldsAvailable + 1) / 4) * 100) };
  }

  return { score: pedigreeScore, completeness: (fieldsAvailable / 4) * 100 };
}

/* ------------------------------------------------------------------ */
/* Longevity (cows only)                                               */
/* ------------------------------------------------------------------ */

function scoreLongevity(input: AnimalScoreInput, category: AnimalCategory, ageMonths: number | null): DimensionResult {
  if (category !== "Vaca") return NO_DATA;
  const productiveYears = input.reproductiveYears ?? (ageMonths != null ? Math.max(0, (ageMonths - 24) / 12) : null);
  if (productiveYears == null || input.totalOffspring === 0) return NO_DATA;

  // Calves per productive year is the cleanest proxy for productive permanence.
  const perYear = productiveYears >= 1 ? input.liveOffspring / productiveYears : input.liveOffspring;
  let score = clamp(perYear * 9, 0, 10);
  if (productiveYears >= 5 && perYear >= 0.7) score = clamp(score + 0.5);
  if (input.condicionCorporal != null && input.condicionCorporal < 2) score = clamp(score - 1.5);

  return { score, completeness: input.reproductiveYears != null ? 100 : 70 };
}

/* ------------------------------------------------------------------ */
/* Badges                                                             */
/* ------------------------------------------------------------------ */

function generateBadges(
  overall: number,
  dims: Record<DimensionKey, DimensionResult>,
  percentileRank: number | null,
  category: AnimalCategory,
): ScoreBadge[] {
  const badges: ScoreBadge[] = [];
  if (percentileRank != null) {
    if (percentileRank >= 95) badges.push({ id: "top5", labelKey: "topPercent", labelParams: { pct: 5 }, variant: "success" });
    else if (percentileRank >= 90) badges.push({ id: "top10", labelKey: "topPercent", labelParams: { pct: 10 }, variant: "success" });
    else if (percentileRank >= 75) badges.push({ id: "top25", labelKey: "topPercent", labelParams: { pct: 25 }, variant: "info" });
  }
  if (dims.production.completeness > 0) {
    if (dims.production.score >= 8.5) badges.push({ id: "growth", labelKey: "excellentGrowth", variant: "success" });
    else if (dims.production.score >= 7) badges.push({ id: "growth_good", labelKey: "goodGrowth", variant: "info" });
  }
  if (dims.reproduction.completeness > 0 && dims.reproduction.score >= 8.5) {
    badges.push({ id: "repro", labelKey: category === "Toro" ? "eliteSire" : "eliteBreeder", variant: "success" });
  }
  if (dims.health.completeness > 0 && dims.health.score >= 9) badges.push({ id: "health", labelKey: "fullHealth", variant: "success" });
  if (overall >= 8.5) badges.push({ id: "excellent", labelKey: "superiorPerformance", variant: "success" });
  else if (overall < 4) badges.push({ id: "attention", labelKey: "needsAttentionBadge", variant: "warning" });
  return badges.slice(0, 3);
}

/* ------------------------------------------------------------------ */
/* Main                                                               */
/* ------------------------------------------------------------------ */

export function calculateAnimalScore(input: AnimalScoreInput): AnimalScore {
  const ageMonths = input.ageMonths ?? monthsFromBirth(input.birthDate);
  const category = resolveCategory(input.sex, ageMonths);
  const weights = CATEGORY_WEIGHTS[category];

  const dims: Record<DimensionKey, DimensionResult> = {
    production: scoreProduction(input, category),
    reproduction: scoreReproduction(input, category, ageMonths),
    health: scoreHealth(input),
    genetics: scoreGenetics(input),
    longevity: scoreLongevity(input, category, ageMonths),
  };

  const dimensionKeys = Object.keys(weights) as DimensionKey[];
  const applicable = dimensionKeys.reduce((acc, key) => {
    acc[key] = weights[key] > 0 && dims[key].completeness > 0;
    return acc;
  }, {} as Record<DimensionKey, boolean>);

  let activeWeight = 0;
  let weightedOverall = 0;
  dimensionKeys.forEach((key) => {
    if (!applicable[key]) return;
    activeWeight += weights[key];
    weightedOverall += dims[key].score * weights[key];
  });

  const totalCategoryWeight = dimensionKeys.reduce((sum, key) => sum + weights[key], 0);
  const dimensionsWithData = dimensionKeys.filter((key) => applicable[key]).length;
  // A single dimension is enough when it represents at least half of the
  // category weight (e.g. a calf with only weight records).
  const coverage = totalCategoryWeight > 0 ? activeWeight / totalCategoryWeight : 0;
  const hasEnoughData = dimensionsWithData >= 2 || coverage >= 0.5;
  const overall = round1(clamp(activeWeight > 0 ? weightedOverall / activeWeight : 0));

  const dataCompleteness = Math.round(
    totalCategoryWeight > 0
      ? dimensionKeys.reduce((sum, key) => sum + dims[key].completeness * weights[key], 0) / totalCategoryWeight
      : 0,
  );

  return {
    overall: hasEnoughData ? overall : 0,
    production: round1(dims.production.score),
    reproduction: round1(dims.reproduction.score),
    health: round1(dims.health.score),
    genetics: round1(dims.genetics.score),
    longevity: round1(dims.longevity.score),
    vsHerdAvg:
      hasEnoughData && input.herdAvgScore != null && input.herdAvgScore > 1
        ? Math.round(((overall - input.herdAvgScore) / input.herdAvgScore) * 100)
        : null,
    percentileRank: input.peerAdgPercentile ?? input.adgPercentile,
    badges: hasEnoughData ? generateBadges(overall, dims, input.peerAdgPercentile ?? input.adgPercentile, category) : [],
    dataCompleteness,
    hasEnoughData,
    dimensionsWithData,
    category,
    weights,
    applicable,
    confidence: Math.round(coverage * 100),
    peerGroupSize: input.peerGroupSize ?? 0,
  };
}
