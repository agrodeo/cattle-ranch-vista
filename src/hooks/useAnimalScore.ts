import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { calculateAnimalScore, type AnimalScore, type AnimalScoreInput } from "@/lib/animalScore";
import { getBreedBenchmarksWithCustom } from "@/lib/breedBenchmarks";
import { animalInbreeding, buildPedigreeIndex } from "@/lib/inbreeding";

export type AnimalScoreRawData = Record<string, unknown>;

function numberOrNull(value: unknown): number | null {
  const n = typeof value === "number" ? value : value == null ? NaN : Number(value);
  return Number.isFinite(n) ? n : null;
}

export interface ScoreExtras {
  inbreedingCoefficient?: number | null;
  inbreedingParentsKnown?: boolean;
}

/** Inbreeding coefficient for one animal, using the whole herd pedigree. */
export async function fetchInbreeding(animalId: string, cabañaId: string): Promise<ScoreExtras> {
  const { data } = await supabase
    .from("animals")
    .select("id, father_id, mother_id")
    .eq("cabaña_id", cabañaId);
  if (!data?.length) return {};
  const info = animalInbreeding(animalId, buildPedigreeIndex(data));
  if (!info) return {};
  return { inbreedingCoefficient: info.coefficient, inbreedingParentsKnown: info.parentsKnown };
}

export async function scoreFromRawData(
  rawData: AnimalScoreRawData,
  cabañaId: string,
  extras: ScoreExtras = {},
): Promise<AnimalScore> {
  const d = rawData;
  const benchmarks = await getBreedBenchmarksWithCustom(String(d.breed || ""), cabañaId);
  const herdAvgScore: number | null = null;

  const input: AnimalScoreInput = {
    sex: String(d.sex || "Macho"),
    breed: String(d.breed || ""),
    birthDate: (d.birthDate as string | null) ?? null,
    pesoNacimiento: numberOrNull(d.pesoNacimiento),
    pesoDestete: numberOrNull(d.pesoDestete),
    pesoFinal: numberOrNull(d.pesoFinal),
    pesoActual: numberOrNull(d.pesoActual),
    adg: numberOrNull(d.adg),
    adgPercentile: numberOrNull(d.adgPercentile),
    weightRecordCount: numberOrNull(d.weightRecordCount) ?? 0,
    weightTrend: (d.weightTrend as AnimalScoreInput["weightTrend"]) ?? null,
    totalServices: numberOrNull(d.totalServices) ?? 0,
    totalPregnancies: numberOrNull(d.totalPregnancies) ?? 0,
    successfulPregnancies: numberOrNull(d.successfulPregnancies) ?? 0,
    totalOffspring: numberOrNull(d.totalOffspring) ?? 0,
    liveOffspring: numberOrNull(d.liveOffspring) ?? 0,
    daysOpen: numberOrNull(d.daysOpen),
    isPregnant: Boolean(d.isPregnant),
    requiredVaccines: numberOrNull(d.requiredVaccines) ?? 0,
    completedVaccines: numberOrNull(d.completedVaccines) ?? 0,
    overdueVaccines: numberOrNull(d.overdueVaccines) ?? 0,
    condicionCorporal: numberOrNull(d.condicionCorporal),
    registrationLevel: (d.registrationLevel as string | null) ?? null,
    dnaVerified: Boolean(d.dnaVerified),
    hasFather: Boolean(d.hasFather),
    hasMother: Boolean(d.hasMother),
    fatherRegistration: (d.fatherRegistration as string | null) ?? null,
    motherRegistration: (d.motherRegistration as string | null) ?? null,
    herdAvgScore,
    benchmarks,
    inbreedingCoefficient: extras.inbreedingCoefficient ?? null,
    inbreedingParentsKnown: extras.inbreedingParentsKnown,
  };

  return calculateAnimalScore(input);
}

export function useAnimalScore(animalId: string | undefined) {
  const { currentUser } = useSupabaseAuth();
  const cabañaId = currentUser?.cabañaId;

  return useQuery({
    queryKey: ["animal-score", animalId, cabañaId],
    queryFn: async (): Promise<AnimalScore | null> => {
      if (!animalId || !cabañaId) return null;
      const { data, error } = await supabase.rpc("calculate_animal_score_data" as never, {
        _animal_id: animalId,
        _cabana_id: cabañaId,
      } as never);
      if (error || !data) return null;
      const extras = await fetchInbreeding(animalId, cabañaId);
      return scoreFromRawData(data as AnimalScoreRawData, cabañaId, extras);
    },
    enabled: !!animalId && !!cabañaId,
    staleTime: 10 * 60 * 1000,
  });
}