import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { calculateAnimalScore, type AnimalScore, type AnimalScoreInput } from "@/lib/animalScore";
import { getBreedBenchmarksWithCustom, type BreedBenchmarks } from "@/lib/breedBenchmarks";
import type { ReportFilters } from "@/pages/Reports";
import type { Json } from "@/integrations/supabase/types";

export interface RankedAnimal {
  animalId: string;
  idTag: string;
  name: string | null;
  sex: string;
  breed: string;
  birthDate: string | null;
  ageMonths: number;
  category: string;
  corralName: string | null;
  status: string;
  score: AnimalScore;
  rank: number;
}

export interface HerdRankingStats {
  totalScored: number;
  totalInsufficient: number;
  avgOverall: number;
  avgProduction: number;
  avgReproduction: number;
  topPerformers: number;
  needsAttention: number;
}

type ScoreDataRow = { animal_id: string; score_data: Json | null };
type ScoreData = Record<string, unknown>;

function emptyStats(): HerdRankingStats {
  return {
    totalScored: 0,
    totalInsufficient: 0,
    avgOverall: 0,
    avgProduction: 0,
    avgReproduction: 0,
    topPerformers: 0,
    needsAttention: 0,
  };
}

function toScoreData(value: Json | null | undefined): ScoreData {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as ScoreData) : {};
}

function numberOrNull(value: unknown): number | null {
  const n = typeof value === "number" ? value : value == null ? NaN : Number(value);
  return Number.isFinite(n) ? n : null;
}

function ageInMonths(birthDate: string | null): number {
  if (!birthDate) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(birthDate).getTime()) / (30.44 * 86400000)));
}

function deriveCategory(sex: string, ageMonths: number): string {
  const normalizedSex = (sex || "").toLowerCase();
  const female = normalizedSex === "hembra" || normalizedSex === "female" || normalizedSex === "fêmea";
  if (female) return ageMonths < 12 ? "Ternera" : ageMonths < 24 ? "Vaquillona" : "Vaca";
  return ageMonths < 12 ? "Ternero" : ageMonths < 24 ? "Novillito" : "Toro";
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function useHerdRanking(filters: ReportFilters = {}) {
  const { currentUser } = useSupabaseAuth();
  const cabañaId = currentUser?.cabañaId;

  return useQuery({
    queryKey: ["herd-ranking", cabañaId, filters],
    queryFn: async (): Promise<{ animals: RankedAnimal[]; stats: HerdRankingStats }> => {
      if (!cabañaId) return { animals: [], stats: emptyStats() };

      let query = supabase
        .from("animals")
        .select("*")
        .eq("cabaña_id", cabañaId)
        .in("status", ["activo", "Activo", "active"]);

      if (filters.corral_ids?.length) query = query.in("corral_id", filters.corral_ids);
      if (filters.breed) query = query.eq("breed", filters.breed);

      const { data: animals, error: animalsError } = await query;
      if (animalsError) throw animalsError;
      if (!animals?.length) return { animals: [], stats: emptyStats() };

      const animalIds = animals.map((animal) => animal.id);
      const { data: scoreRows, error: scoreError } = await supabase.rpc("calculate_herd_scores", {
        _cabana_id: cabañaId,
        _animal_ids: animalIds,
      });
      if (scoreError) throw scoreError;

      const scoreDataMap = new Map<string, ScoreData>();
      ((scoreRows || []) as ScoreDataRow[]).forEach((row) => {
        scoreDataMap.set(row.animal_id, toScoreData(row.score_data));
      });

      const corralIds = [...new Set(animals.map((animal) => animal.corral_id).filter(Boolean))] as string[];
      const corralMap = new Map<string, string>();
      if (corralIds.length > 0) {
        const { data: corrales } = await supabase.from("corrales").select("id, name").in("id", corralIds);
        (corrales || []).forEach((corral) => corralMap.set(corral.id, corral.name));
      }

      const benchmarkCache = new Map<string, Promise<BreedBenchmarks>>();
      const getBenchmarks = (breed: string) => {
        const key = breed || "default";
        if (!benchmarkCache.has(key)) benchmarkCache.set(key, getBreedBenchmarksWithCustom(breed, cabañaId));
        return benchmarkCache.get(key)!;
      };

      const rankedAnimals = await Promise.all(
        animals.map(async (animal) => {
          const d = scoreDataMap.get(animal.id) || {};
          const breed = animal.breed || String(d.breed || "");
          const sex = animal.sex || String(d.sex || "");
          const animalAgeMonths = ageInMonths(animal.birth_date);
          const category = deriveCategory(sex, animalAgeMonths);
          const benchmarks = await getBenchmarks(breed);

          const input: AnimalScoreInput = {
            sex: sex || "Macho",
            breed,
            birthDate: animal.birth_date ?? (d.birthDate as string | null) ?? null,
            pesoNacimiento: animal.peso_nacimiento ?? numberOrNull(d.pesoNacimiento),
            pesoDestete: animal.peso_destete ?? numberOrNull(d.pesoDestete),
            pesoFinal: animal.peso_final ?? numberOrNull(d.pesoFinal),
            pesoActual: animal.peso_actual_kg ?? numberOrNull(d.pesoActual),
            adg: animal.ganancia_diaria_kg ?? numberOrNull(d.adg),
            adgPercentile: numberOrNull(d.adgPercentile),
            weightRecordCount: numberOrNull(d.weightRecordCount) ?? 0,
            weightTrend: (d.weightTrend as AnimalScoreInput["weightTrend"]) ?? null,
            totalServices: numberOrNull(d.totalServices) ?? 0,
            totalPregnancies: numberOrNull(d.totalPregnancies) ?? 0,
            successfulPregnancies: numberOrNull(d.successfulPregnancies) ?? 0,
            totalOffspring: numberOrNull(d.totalOffspring) ?? 0,
            liveOffspring: numberOrNull(d.liveOffspring) ?? 0,
            daysOpen: numberOrNull(d.daysOpen),
            isPregnant: animal.esta_preñada || Boolean(d.isPregnant),
            requiredVaccines: numberOrNull(d.requiredVaccines) ?? 0,
            completedVaccines: numberOrNull(d.completedVaccines) ?? 0,
            overdueVaccines: numberOrNull(d.overdueVaccines) ?? 0,
            condicionCorporal: numberOrNull(animal.condicion_corporal) ?? numberOrNull(d.condicionCorporal),
            registrationLevel: animal.registration_level ?? (d.registrationLevel as string | null) ?? null,
            dnaVerified: animal.dna_verified || Boolean(d.dnaVerified),
            hasFather: Boolean(animal.father_id || d.hasFather),
            hasMother: Boolean(animal.mother_id || d.hasMother),
            fatherRegistration: animal.registration_father_level ?? (d.fatherRegistration as string | null) ?? null,
            motherRegistration: animal.registration_mother_level ?? (d.motherRegistration as string | null) ?? null,
            herdAvgScore: null,
            benchmarks,
          };

          return {
            animalId: animal.id,
            idTag: animal.id_tag || "—",
            name: animal.name || null,
            sex,
            breed,
            birthDate: animal.birth_date,
            ageMonths: animalAgeMonths,
            category,
            corralName: animal.corral_id ? corralMap.get(animal.corral_id) || null : null,
            status: animal.status || "",
            score: calculateAnimalScore(input),
            rank: 0,
          } satisfies RankedAnimal;
        }),
      );

      const categoryFiltered = filters.category
        ? rankedAnimals.filter((animal) => animal.category === filters.category)
        : rankedAnimals;
      const scoredAnimals = categoryFiltered.filter((animal) => animal.score.hasEnoughData);
      const avgOverall = scoredAnimals.length
        ? scoredAnimals.reduce((sum, animal) => sum + animal.score.overall, 0) / scoredAnimals.length
        : 0;

      scoredAnimals.forEach((animal) => {
        animal.score.vsHerdAvg = avgOverall > 1 ? Math.round(((animal.score.overall - avgOverall) / avgOverall) * 100) : null;
      });

      categoryFiltered.sort((a, b) => {
        if (!a.score.hasEnoughData && !b.score.hasEnoughData) return a.idTag.localeCompare(b.idTag);
        if (!a.score.hasEnoughData) return 1;
        if (!b.score.hasEnoughData) return -1;
        return b.score.overall - a.score.overall;
      });
      categoryFiltered.forEach((animal, index) => {
        animal.rank = index + 1;
      });

      const femalesWithScore = scoredAnimals.filter((animal) => animal.sex === "Hembra");
      const stats: HerdRankingStats = {
        totalScored: scoredAnimals.length,
        totalInsufficient: categoryFiltered.length - scoredAnimals.length,
        avgOverall: round1(avgOverall),
        avgProduction: scoredAnimals.length ? round1(scoredAnimals.reduce((sum, animal) => sum + animal.score.production, 0) / scoredAnimals.length) : 0,
        avgReproduction: femalesWithScore.length ? round1(femalesWithScore.reduce((sum, animal) => sum + animal.score.reproduction, 0) / femalesWithScore.length) : 0,
        topPerformers: scoredAnimals.filter((animal) => animal.score.overall >= 8).length,
        needsAttention: scoredAnimals.filter((animal) => animal.score.overall < 4).length,
      };

      return { animals: categoryFiltered, stats };
    },
    enabled: !!cabañaId,
    staleTime: 10 * 60 * 1000,
  });
}
