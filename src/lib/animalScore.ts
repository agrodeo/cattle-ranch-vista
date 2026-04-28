import type { BreedBenchmarks } from "./breedBenchmarks";

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
}

export interface ScoreBadge {
  id: string;
  labelKey: string;
  labelParams?: Record<string, string | number>;
  variant: "success" | "warning" | "info" | "neutral";
}

const MALE_WEIGHTS = { production: 0.55, reproduction: 0, health: 0, genetics: 0.2, longevity: 0.25 };
const FEMALE_WEIGHTS = { production: 0.25, reproduction: 0.5, health: 0, genetics: 0.1, longevity: 0.15 };

function clamp(value: number, min = 0, max = 10): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function isFemale(sex: string): boolean {
  return ["hembra", "female", "fêmea"].includes((sex || "").toLowerCase());
}

function scoreProduction(input: AnimalScoreInput): { score: number; completeness: number } {
  const hasAnyWeightData =
    input.adg != null ||
    input.pesoDestete != null ||
    input.pesoNacimiento != null ||
    input.pesoFinal != null ||
    input.pesoActual != null;

  if (!hasAnyWeightData) {
    return { score: 0, completeness: 0 };
  }

  const b = input.benchmarks;
  let totalWeight = 0;
  let weightedSum = 0;
  let fieldsAvailable = 0;
  const fieldsTotal = 4;

  if (input.adg != null && input.adg > 0) {
    weightedSum += clamp((input.adg / b.dailyGain.good) * 7) * 0.4;
    totalWeight += 0.4;
    fieldsAvailable++;
  }
  if (input.pesoDestete != null && input.pesoDestete > 0) {
    weightedSum += clamp((input.pesoDestete / b.weaningWeight.good) * 7) * 0.3;
    totalWeight += 0.3;
    fieldsAvailable++;
  }
  if (input.pesoNacimiento != null && input.pesoNacimiento > 0) {
    const ratio = input.pesoNacimiento / b.birthWeight.good;
    const birthScore = ratio >= 0.9 && ratio <= 1.15 ? 9 : ratio > 1.15 ? clamp(9 - (ratio - 1.15) * 15, 3, 9) : clamp(ratio * 10, 2, 8);
    weightedSum += birthScore * 0.1;
    totalWeight += 0.1;
    fieldsAvailable++;
  }
  if (input.adgPercentile != null) {
    weightedSum += (input.adgPercentile / 100) * 10 * 0.2;
    totalWeight += 0.2;
    fieldsAvailable++;
  }

  return { score: totalWeight > 0 ? clamp(weightedSum / totalWeight) : 5, completeness: (fieldsAvailable / fieldsTotal) * 100 };
}

function scoreReproduction(input: AnimalScoreInput): { score: number; completeness: number } {
  if (!isFemale(input.sex)) return { score: 0, completeness: 0 };
  if (input.totalServices === 0 && input.totalOffspring === 0 && !input.isPregnant) {
    return { score: 0, completeness: 0 };
  }

  let totalWeight = 0;
  let weightedSum = 0;
  let fieldsAvailable = 0;
  const fieldsTotal = 4;

  if (input.totalServices > 0) {
    weightedSum += clamp(((input.successfulPregnancies / input.totalServices) * 100 / 85) * 10) * 0.35;
    totalWeight += 0.35;
    fieldsAvailable++;
  }
  if (input.totalPregnancies > 0) {
    weightedSum += clamp(((input.liveOffspring / input.totalPregnancies) * 100 / 80) * 10) * 0.3;
    totalWeight += 0.3;
    fieldsAvailable++;
  }
  if (input.daysOpen != null) {
    weightedSum += clamp(10 - input.daysOpen / 45) * 0.2;
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

  return { score: totalWeight > 0 ? clamp(weightedSum / totalWeight) : 5, completeness: (fieldsAvailable / fieldsTotal) * 100 };
}

function scoreHealth(input: AnimalScoreInput) {
  let fieldsAvailable = 0;
  let vaccineScore = 5;
  if (input.requiredVaccines > 0) {
    vaccineScore = clamp((input.completedVaccines / input.requiredVaccines) * 10 - input.overdueVaccines);
    fieldsAvailable++;
  }
  let bodyScore = 5;
  if (input.condicionCorporal != null) {
    const bcs = input.condicionCorporal;
    bodyScore = bcs >= 2.5 && bcs <= 3.5 ? 9 : bcs >= 2 && bcs <= 4 ? 7 : 4;
    fieldsAvailable++;
  }
  return { score: clamp(vaccineScore * 0.7 + bodyScore * 0.3), completeness: (fieldsAvailable / 2) * 100 };
}

function scoreGenetics(input: AnimalScoreInput): { score: number; completeness: number } {
  const hasAnyGeneticData = input.registrationLevel != null || input.dnaVerified || input.hasFather || input.hasMother;
  if (!hasAnyGeneticData) {
    return { score: 0, completeness: 0 };
  }

  let score = 3;
  let fieldsAvailable = 0;
  const regLevels: Record<string, number> = { PC: 4, PO: 3.5, PP: 2.5, PA: 2 };
  if (input.registrationLevel) {
    score += regLevels[input.registrationLevel.toUpperCase()] ?? 1;
    fieldsAvailable++;
  }
  if (input.dnaVerified) {
    score += 1.5;
    fieldsAvailable++;
  }
  if (input.hasFather) {
    score += input.fatherRegistration ? 1 : 0.5;
    fieldsAvailable++;
  }
  if (input.hasMother) {
    score += input.motherRegistration ? 1 : 0.5;
    fieldsAvailable++;
  }
  return { score: clamp(score), completeness: (fieldsAvailable / 4) * 100 };
}

function scoreLongevity(input: AnimalScoreInput) {
  let score = 5;
  let fieldsAvailable = 0;
  if (input.birthDate) {
    const ageMonths = Math.floor((Date.now() - new Date(input.birthDate).getTime()) / (30.44 * 86400000));
    score = ageMonths >= 6 && ageMonths <= 96 ? 8 : ageMonths > 96 && ageMonths <= 144 ? 6 : ageMonths > 144 ? 4 : 7;
    fieldsAvailable++;
  }
  if (input.condicionCorporal != null) {
    score += input.condicionCorporal >= 2.5 && input.condicionCorporal <= 4 ? 1 : input.condicionCorporal < 2 ? -2 : 0;
    fieldsAvailable++;
  }
  return { score: clamp(score), completeness: (fieldsAvailable / 2) * 100 };
}

function generateBadges(overall: number, production: number, reproduction: number, health: number, percentileRank: number | null, input: AnimalScoreInput): ScoreBadge[] {
  const badges: ScoreBadge[] = [];
  if (percentileRank != null) {
    if (percentileRank >= 95) badges.push({ id: "top5", labelKey: "topPercent", labelParams: { pct: 5 }, variant: "success" });
    else if (percentileRank >= 90) badges.push({ id: "top10", labelKey: "topPercent", labelParams: { pct: 10 }, variant: "success" });
    else if (percentileRank >= 75) badges.push({ id: "top25", labelKey: "topPercent", labelParams: { pct: 25 }, variant: "info" });
  }
  if (production >= 8.5) badges.push({ id: "growth", labelKey: "excellentGrowth", variant: "success" });
  else if (production >= 7) badges.push({ id: "growth_good", labelKey: "goodGrowth", variant: "info" });
  if (isFemale(input.sex) && reproduction >= 8.5) badges.push({ id: "repro", labelKey: "eliteBreeder", variant: "success" });
  if (health >= 9) badges.push({ id: "health", labelKey: "fullHealth", variant: "success" });
  if (overall >= 8.5) badges.push({ id: "excellent", labelKey: "superiorPerformance", variant: "success" });
  else if (overall < 4) badges.push({ id: "attention", labelKey: "needsAttentionBadge", variant: "warning" });
  return badges.slice(0, 3);
}

export function calculateAnimalScore(input: AnimalScoreInput): AnimalScore {
  const female = isFemale(input.sex);
  const baseWeights = female ? FEMALE_WEIGHTS : MALE_WEIGHTS;
  const prod = scoreProduction(input);
  const repro = scoreReproduction(input);
  const hlth = scoreHealth(input);
  const gen = scoreGenetics(input);
  const long = scoreLongevity(input);
  const dimensions = { production: prod, reproduction: repro, health: hlth, genetics: gen, longevity: long };
  let totalActiveWeight = 0;
  let weightedOverall = 0;

  for (const [key, weight] of Object.entries(baseWeights)) {
    const dimension = dimensions[key as keyof typeof dimensions];
    if (weight > 0 && dimension.completeness > 0) {
      totalActiveWeight += weight;
      weightedOverall += dimension.score * weight;
    }
  }

  const dimensionsWithData = Object.entries(baseWeights).filter(([key, weight]) => {
    return weight > 0 && dimensions[key as keyof typeof dimensions].completeness > 0;
  }).length;
  const hasEnoughData = dimensionsWithData >= 2;
  const overall = round1(clamp(totalActiveWeight > 0 ? weightedOverall / totalActiveWeight : 5));
  const scoredDimensions = Object.entries(baseWeights).filter(([, weight]) => weight > 0);
  const scoredWeightTotal = scoredDimensions.reduce((sum, [, weight]) => sum + weight, 0);
  const dataCompleteness = Math.round(
    scoredWeightTotal > 0
      ? scoredDimensions.reduce((sum, [key, weight]) => sum + dimensions[key as keyof typeof dimensions].completeness * weight, 0) / scoredWeightTotal
      : 0
  );

  return {
    overall: hasEnoughData ? overall : 0,
    production: round1(prod.score),
    reproduction: round1(repro.score),
    health: round1(hlth.score),
    genetics: round1(gen.score),
    longevity: round1(long.score),
    vsHerdAvg: hasEnoughData && input.herdAvgScore != null && input.herdAvgScore > 1 ? Math.round(((overall - input.herdAvgScore) / input.herdAvgScore) * 100) : null,
    percentileRank: input.adgPercentile,
    badges: hasEnoughData ? generateBadges(overall, prod.score, repro.score, hlth.score, input.adgPercentile, input) : [],
    dataCompleteness,
    hasEnoughData,
    dimensionsWithData,
  };
}