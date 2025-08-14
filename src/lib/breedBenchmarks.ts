// Breed-specific performance benchmarks for livestock production
import { supabase } from "@/integrations/supabase/client";

export interface BreedBenchmarks {
  birthWeight: {
    excellent: number;
    good: number;
    poor: number;
  };
  weaningWeight: {
    excellent: number;
    good: number;
    poor: number;
  };
  dailyGain: {
    excellent: number;
    good: number;
    poor: number;
  };
}

export interface CustomBenchmark {
  id: string;
  cabaña_id: string;
  breed: string | null;
  birth_weight_excellent: number;
  birth_weight_good: number;
  birth_weight_poor: number;
  weaning_weight_excellent: number;
  weaning_weight_good: number;
  weaning_weight_poor: number;
  daily_gain_excellent: number;
  daily_gain_good: number;
  daily_gain_poor: number;
}

// Breed-specific benchmarks based on industry standards
const BREED_BENCHMARKS: Record<string, BreedBenchmarks> = {
  'Angus': {
    birthWeight: { excellent: 35, good: 30, poor: 28 },
    weaningWeight: { excellent: 200, good: 180, poor: 160 },
    dailyGain: { excellent: 0.8, good: 0.7, poor: 0.6 }
  },
  'Braford': {
    birthWeight: { excellent: 38, good: 35, poor: 32 },
    weaningWeight: { excellent: 220, good: 200, poor: 180 },
    dailyGain: { excellent: 0.9, good: 0.8, poor: 0.7 }
  },
  'Brangus': {
    birthWeight: { excellent: 36, good: 33, poor: 30 },
    weaningWeight: { excellent: 210, good: 190, poor: 170 },
    dailyGain: { excellent: 0.85, good: 0.75, poor: 0.65 }
  },
  'Holstein': {
    birthWeight: { excellent: 42, good: 38, poor: 35 },
    weaningWeight: { excellent: 240, good: 220, poor: 200 },
    dailyGain: { excellent: 1.0, good: 0.9, poor: 0.8 }
  },
  'Hereford': {
    birthWeight: { excellent: 36, good: 32, poor: 29 },
    weaningWeight: { excellent: 205, good: 185, poor: 165 },
    dailyGain: { excellent: 0.82, good: 0.72, poor: 0.62 }
  },
  'Charolais': {
    birthWeight: { excellent: 40, good: 36, poor: 33 },
    weaningWeight: { excellent: 230, good: 210, poor: 190 },
    dailyGain: { excellent: 0.95, good: 0.85, poor: 0.75 }
  },
  'Limousin': {
    birthWeight: { excellent: 38, good: 34, poor: 31 },
    weaningWeight: { excellent: 215, good: 195, poor: 175 },
    dailyGain: { excellent: 0.88, good: 0.78, poor: 0.68 }
  }
};

// Default benchmarks for unknown breeds
const DEFAULT_BENCHMARKS: BreedBenchmarks = {
  birthWeight: { excellent: 35, good: 30, poor: 28 },
  weaningWeight: { excellent: 200, good: 180, poor: 160 },
  dailyGain: { excellent: 0.8, good: 0.7, poor: 0.6 }
};

/**
 * Convert database custom benchmark to BreedBenchmarks format
 */
function convertCustomBenchmark(custom: CustomBenchmark): BreedBenchmarks {
  return {
    birthWeight: {
      excellent: custom.birth_weight_excellent,
      good: custom.birth_weight_good,
      poor: custom.birth_weight_poor,
    },
    weaningWeight: {
      excellent: custom.weaning_weight_excellent,
      good: custom.weaning_weight_good,
      poor: custom.weaning_weight_poor,
    },
    dailyGain: {
      excellent: custom.daily_gain_excellent,
      good: custom.daily_gain_good,
      poor: custom.daily_gain_poor,
    },
  };
}

/**
 * Fetch custom benchmarks from database for a specific cabaña
 */
export async function fetchCustomBenchmarks(cabañaId: string): Promise<Record<string, BreedBenchmarks>> {
  try {
    const { data, error } = await supabase
      .from("custom_benchmarks")
      .select("*")
      .eq("cabaña_id", cabañaId);

    if (error) {
      console.error("Error fetching custom benchmarks:", error);
      return {};
    }

    const customBenchmarks: Record<string, BreedBenchmarks> = {};
    
    data?.forEach((custom: CustomBenchmark) => {
      const key = custom.breed || 'default';
      customBenchmarks[key] = convertCustomBenchmark(custom);
    });

    return customBenchmarks;
  } catch (error) {
    console.error("Error fetching custom benchmarks:", error);
    return {};
  }
}

/**
 * Get benchmarks for a specific breed with custom overrides
 */
export async function getBreedBenchmarksWithCustom(breed: string, cabañaId: string): Promise<BreedBenchmarks> {
  const customBenchmarks = await fetchCustomBenchmarks(cabañaId);
  
  // Check for breed-specific custom benchmark first
  const normalizedBreed = breed?.trim() || '';
  if (customBenchmarks[normalizedBreed]) {
    return customBenchmarks[normalizedBreed];
  }
  
  // Check for default custom benchmark
  if (customBenchmarks['default']) {
    return customBenchmarks['default'];
  }
  
  // Fall back to system defaults
  return getBreedBenchmarks(breed);
}

/**
 * Get benchmarks for a specific breed (system defaults only)
 */
export function getBreedBenchmarks(breed: string): BreedBenchmarks {
  const normalizedBreed = breed?.trim() || '';
  return BREED_BENCHMARKS[normalizedBreed] || DEFAULT_BENCHMARKS;
}

/**
 * Calculate weighted average benchmarks for multiple breeds with custom overrides
 */
export async function getWeightedBenchmarksWithCustom(
  breedDistribution: { breed: string; count: number }[], 
  cabañaId: string
): Promise<BreedBenchmarks> {
  if (breedDistribution.length === 0) {
    const customBenchmarks = await fetchCustomBenchmarks(cabañaId);
    return customBenchmarks['default'] || DEFAULT_BENCHMARKS;
  }

  if (breedDistribution.length === 1) {
    return await getBreedBenchmarksWithCustom(breedDistribution[0].breed, cabañaId);
  }

  const totalCount = breedDistribution.reduce((sum, item) => sum + item.count, 0);
  
  // Calculate weighted averages for each metric
  const weightedBenchmarks: BreedBenchmarks = {
    birthWeight: { excellent: 0, good: 0, poor: 0 },
    weaningWeight: { excellent: 0, good: 0, poor: 0 },
    dailyGain: { excellent: 0, good: 0, poor: 0 }
  };

  for (const { breed, count } of breedDistribution) {
    const benchmarks = await getBreedBenchmarksWithCustom(breed, cabañaId);
    const weight = count / totalCount;

    weightedBenchmarks.birthWeight.excellent += benchmarks.birthWeight.excellent * weight;
    weightedBenchmarks.birthWeight.good += benchmarks.birthWeight.good * weight;
    weightedBenchmarks.birthWeight.poor += benchmarks.birthWeight.poor * weight;

    weightedBenchmarks.weaningWeight.excellent += benchmarks.weaningWeight.excellent * weight;
    weightedBenchmarks.weaningWeight.good += benchmarks.weaningWeight.good * weight;
    weightedBenchmarks.weaningWeight.poor += benchmarks.weaningWeight.poor * weight;

    weightedBenchmarks.dailyGain.excellent += benchmarks.dailyGain.excellent * weight;
    weightedBenchmarks.dailyGain.good += benchmarks.dailyGain.good * weight;
    weightedBenchmarks.dailyGain.poor += benchmarks.dailyGain.poor * weight;
  }

  return weightedBenchmarks;
}

/**
 * Calculate weighted average benchmarks for multiple breeds (system defaults only)
 */
export function getWeightedBenchmarks(breedDistribution: { breed: string; count: number }[]): BreedBenchmarks {
  if (breedDistribution.length === 0) {
    return DEFAULT_BENCHMARKS;
  }

  if (breedDistribution.length === 1) {
    return getBreedBenchmarks(breedDistribution[0].breed);
  }

  const totalCount = breedDistribution.reduce((sum, item) => sum + item.count, 0);
  
  // Calculate weighted averages for each metric
  const weightedBenchmarks: BreedBenchmarks = {
    birthWeight: { excellent: 0, good: 0, poor: 0 },
    weaningWeight: { excellent: 0, good: 0, poor: 0 },
    dailyGain: { excellent: 0, good: 0, poor: 0 }
  };

  breedDistribution.forEach(({ breed, count }) => {
    const benchmarks = getBreedBenchmarks(breed);
    const weight = count / totalCount;

    weightedBenchmarks.birthWeight.excellent += benchmarks.birthWeight.excellent * weight;
    weightedBenchmarks.birthWeight.good += benchmarks.birthWeight.good * weight;
    weightedBenchmarks.birthWeight.poor += benchmarks.birthWeight.poor * weight;

    weightedBenchmarks.weaningWeight.excellent += benchmarks.weaningWeight.excellent * weight;
    weightedBenchmarks.weaningWeight.good += benchmarks.weaningWeight.good * weight;
    weightedBenchmarks.weaningWeight.poor += benchmarks.weaningWeight.poor * weight;

    weightedBenchmarks.dailyGain.excellent += benchmarks.dailyGain.excellent * weight;
    weightedBenchmarks.dailyGain.good += benchmarks.dailyGain.good * weight;
    weightedBenchmarks.dailyGain.poor += benchmarks.dailyGain.poor * weight;
  });

  return weightedBenchmarks;
}

/**
 * Evaluate performance against breed-specific benchmarks
 */
export function evaluatePerformance(value: number, benchmarks: BreedBenchmarks, metric: 'birthWeight' | 'weaningWeight' | 'dailyGain'): {
  status: 'good' | 'average' | 'poor';
  benchmark: number;
} {
  const metricBenchmarks = benchmarks[metric];
  
  if (value >= metricBenchmarks.excellent) {
    return { status: 'good', benchmark: metricBenchmarks.excellent };
  } else if (value >= metricBenchmarks.good) {
    return { status: 'average', benchmark: metricBenchmarks.good };
  } else {
    return { status: 'poor', benchmark: metricBenchmarks.poor };
  }
}

/**
 * Get breed display name with benchmarks info
 */
export function getBreedInfo(breed: string): { name: string; hasBenchmarks: boolean } {
  const normalizedBreed = breed?.trim() || '';
  return {
    name: normalizedBreed || 'Sin especificar',
    hasBenchmarks: !!BREED_BENCHMARKS[normalizedBreed]
  };
}