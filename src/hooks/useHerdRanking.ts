import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import {
  calculateAnimalScore,
  resolveCategory,
  isFemaleSex,
  type AnimalCategory,
  type AnimalScore,
  type AnimalScoreInput,
} from "@/lib/animalScore";
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
  /** Percentile (0-100) of the overall score inside its own category. */
  categoryPercentile: number | null;
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

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Percentile of `value` inside an ascending-sorted list (0-100, ties averaged). */
function percentileOf(sorted: number[], value: number): number | null {
  if (!sorted.length) return null;
  if (sorted.length === 1) return 50;
  let below = 0;
  let equal = 0;
  for (const item of sorted) {
    if (item < value) below++;
    else if (item === value) equal++;
  }
  return Math.round(((below + equal / 2) / sorted.length) * 100);
}

const DEP_FIELDS = [
  "dep_peso_destete",
  "dep_peso_final",
  "dep_leche",
  "dep_area_ojo_bife",
  "dep_circunferencia_escrotal",
] as const;

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

      // Herd-wide lightweight context: parentage, services and DEPs.
      const [{ data: herdRows }, { data: depRows }, { data: pregnancyRows }] = await Promise.all([
        supabase
          .from("animals")
          .select("id, sex, status, father_id, mother_id, toro_servicio_id, \"esta_preñada\", birth_date")
          .eq("cabaña_id", cabañaId),
        supabase
          .from("animal_deps")
          .select(`animal_id, ${DEP_FIELDS.join(", ")}`)
          .eq("cabaña_id", cabañaId),
        supabase
          .from("preñeces")
          .select("animal_id, fecha_parto_real")
          .eq("cabaña_id", cabañaId)
          .not("fecha_parto_real", "is", null),
      ]);

      type HerdRow = {
        id: string;
        sex: string | null;
        status: string | null;
        father_id: string | null;
        mother_id: string | null;
        toro_servicio_id: string | null;
        esta_preñada: boolean | null;
        birth_date: string | null;
      };
      const herd = (herdRows || []) as unknown as HerdRow[];
      const isDead = (status: string | null) => ["muerto", "Muerto", "dead", "fallecido"].includes(status || "");

      // --- Bull reproductive metrics ---------------------------------------
      const servedByBull = new Map<string, string[]>();
      const offspringByFather = new Map<string, { total: number; live: number }>();
      const offspringMothersByFather = new Map<string, Set<string>>();
      const pregnantFemales = new Set<string>();

      herd.forEach((row) => {
        if (row.toro_servicio_id) {
          const list = servedByBull.get(row.toro_servicio_id) || [];
          list.push(row.id);
          servedByBull.set(row.toro_servicio_id, list);
        }
        if (row.esta_preñada) pregnantFemales.add(row.id);
        if (row.father_id) {
          const stats = offspringByFather.get(row.father_id) || { total: 0, live: 0 };
          stats.total++;
          if (!isDead(row.status)) stats.live++;
          offspringByFather.set(row.father_id, stats);
          if (row.mother_id) {
            const mothers = offspringMothersByFather.get(row.father_id) || new Set<string>();
            mothers.add(row.mother_id);
            offspringMothersByFather.set(row.father_id, mothers);
          }
        }
      });

      // --- Cow calving interval --------------------------------------------
      const calvingsByCow = new Map<string, string[]>();
      (pregnancyRows || []).forEach((row) => {
        if (!row.animal_id || !row.fecha_parto_real) return;
        const list = calvingsByCow.get(row.animal_id) || [];
        list.push(row.fecha_parto_real);
        calvingsByCow.set(row.animal_id, list);
      });
      const calvingIntervalByCow = new Map<string, number>();
      calvingsByCow.forEach((dates, cowId) => {
        if (dates.length < 2) return;
        const sorted = [...dates].sort();
        const intervals: number[] = [];
        for (let i = 1; i < sorted.length; i++) {
          const days = (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) / 86400000;
          if (days > 250 && days < 1200) intervals.push(days);
        }
        if (intervals.length) {
          calvingIntervalByCow.set(cowId, Math.round(intervals.reduce((sum, d) => sum + d, 0) / intervals.length));
        }
      });

      // --- DEP index percentiles ------------------------------------------
      type DepRow = Record<string, unknown> & { animal_id: string };
      const depValues = new Map<string, number[]>();
      const depRowsSafe = (depRows || []) as unknown as DepRow[];
      DEP_FIELDS.forEach((field) => {
        const values = depRowsSafe
          .map((row) => numberOrNull(row[field]))
          .filter((value): value is number => value != null)
          .sort((a, b) => a - b);
        depValues.set(field, values);
      });
      const depIndexByAnimal = new Map<string, number>();
      depRowsSafe.forEach((row) => {
        const percentiles: number[] = [];
        DEP_FIELDS.forEach((field) => {
          const value = numberOrNull(row[field]);
          const pool = depValues.get(field) || [];
          if (value == null || pool.length < 3) return;
          const pct = percentileOf(pool, value);
          if (pct != null) percentiles.push(pct);
        });
        if (percentiles.length) {
          depIndexByAnimal.set(row.animal_id, percentiles.reduce((sum, p) => sum + p, 0) / percentiles.length);
        }
      });
      const depIndexPool = [...depIndexByAnimal.values()].sort((a, b) => a - b);

      // --- Corral names ----------------------------------------------------
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

      // ---------- Pass 1: raw metrics + peer groups -------------------------
      interface RawMetrics {
        animal: (typeof animals)[number];
        data: ScoreData;
        breed: string;
        sex: string;
        ageMonths: number;
        category: AnimalCategory;
        adg: number | null;
        weaning: number | null;
      }

      const rawList: RawMetrics[] = animals.map((animal) => {
        const d = scoreDataMap.get(animal.id) || {};
        const breed = animal.breed || String(d.breed || "");
        const sex = animal.sex || String(d.sex || "");
        const months = ageInMonths(animal.birth_date);
        return {
          animal,
          data: d,
          breed,
          sex,
          ageMonths: months,
          category: resolveCategory(sex, animal.birth_date ? months : null),
          adg: animal.ganancia_diaria_kg ?? numberOrNull(d.adg),
          weaning: animal.peso_destete ?? numberOrNull(d.pesoDestete),
        };
      });

      const groupKeyBreed = (item: RawMetrics) => `${item.category}|${(item.breed || "").toLowerCase()}`;
      const groupKeyCategory = (item: RawMetrics) => item.category;
      const countBy = (keyFn: (item: RawMetrics) => string) => {
        const map = new Map<string, RawMetrics[]>();
        rawList.forEach((item) => {
          const key = keyFn(item);
          const list = map.get(key) || [];
          list.push(item);
          map.set(key, list);
        });
        return map;
      };
      const byBreedCategory = countBy(groupKeyBreed);
      const byCategory = countBy(groupKeyCategory);

      const peerGroupFor = (item: RawMetrics): RawMetrics[] => {
        const breedGroup = byBreedCategory.get(groupKeyBreed(item)) || [];
        if (breedGroup.length >= 5) return breedGroup;
        return byCategory.get(groupKeyCategory(item)) || [];
      };

      const sortedPool = (group: RawMetrics[], pick: (item: RawMetrics) => number | null) =>
        group
          .map(pick)
          .filter((value): value is number => value != null && value > 0)
          .sort((a, b) => a - b);

      const poolCache = new Map<string, { adg: number[]; weaning: number[]; size: number }>();
      const poolsFor = (item: RawMetrics) => {
        const group = peerGroupFor(item);
        const key = group === (byBreedCategory.get(groupKeyBreed(item)) || []) && group.length >= 5 ? groupKeyBreed(item) : groupKeyCategory(item);
        if (!poolCache.has(key)) {
          poolCache.set(key, {
            adg: sortedPool(group, (peer) => peer.adg),
            weaning: sortedPool(group, (peer) => peer.weaning),
            size: group.length,
          });
        }
        return poolCache.get(key)!;
      };

      // ---------- Pass 2: final score --------------------------------------
      const rankedAnimals = await Promise.all(
        rawList.map(async (item) => {
          const { animal, data: d, breed, sex, ageMonths: months, category } = item;
          const benchmarks = await getBenchmarks(breed);
          const pools = poolsFor(item);
          const depIndex = depIndexByAnimal.get(animal.id);

          const servedFemales = servedByBull.get(animal.id) || [];
          const fatherOffspring = offspringByFather.get(animal.id);
          const mothersWithOffspring = offspringMothersByFather.get(animal.id) || new Set<string>();
          const bullSuccesses = servedFemales.filter(
            (femaleId) => pregnantFemales.has(femaleId) || mothersWithOffspring.has(femaleId),
          ).length;

          const input: AnimalScoreInput = {
            sex: sex || "Macho",
            breed,
            birthDate: animal.birth_date ?? (d.birthDate as string | null) ?? null,
            pesoNacimiento: animal.peso_nacimiento ?? numberOrNull(d.pesoNacimiento),
            pesoDestete: item.weaning,
            pesoFinal: animal.peso_final ?? numberOrNull(d.pesoFinal),
            pesoActual: animal.peso_actual_kg ?? numberOrNull(d.pesoActual),
            adg: item.adg,
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
            ageMonths: animal.birth_date ? months : null,
            peerAdgPercentile: item.adg != null && item.adg > 0 ? percentileOf(pools.adg, item.adg) : null,
            peerWeaningPercentile: item.weaning != null && item.weaning > 0 ? percentileOf(pools.weaning, item.weaning) : null,
            peerGroupSize: pools.size,
            depPercentile: depIndex != null && depIndexPool.length >= 3 ? percentileOf(depIndexPool, depIndex) : null,
            scrotalCircumference: numberOrNull(animal.circunferencia_escrotal),
            bullServedFemales: category === "Toro" ? servedFemales.length : null,
            bullPregnancyRate:
              category === "Toro" && servedFemales.length > 0 ? (bullSuccesses + 1) / (servedFemales.length + 2) : null,
            bullLiveOffspring: category === "Toro" ? fatherOffspring?.live ?? 0 : null,
            reproductiveYears: null,
            calvingIntervalDays: calvingIntervalByCow.get(animal.id) ?? null,
          };

          return {
            animalId: animal.id,
            idTag: animal.id_tag || "—",
            name: animal.name || null,
            sex,
            breed,
            birthDate: animal.birth_date,
            ageMonths: months,
            category,
            corralName: animal.corral_id ? corralMap.get(animal.corral_id) || null : null,
            status: animal.status || "",
            score: calculateAnimalScore(input),
            rank: 0,
            categoryPercentile: null,
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

      // Category percentile makes scores comparable across categories: the
      // mixed listing is ranked by relative standing, not by raw score.
      const scoresByCategory = new Map<string, number[]>();
      scoredAnimals.forEach((animal) => {
        const list = scoresByCategory.get(animal.category) || [];
        list.push(animal.score.overall);
        scoresByCategory.set(animal.category, list);
      });
      scoresByCategory.forEach((list, key) => scoresByCategory.set(key, list.sort((a, b) => a - b)));
      scoredAnimals.forEach((animal) => {
        animal.categoryPercentile = percentileOf(scoresByCategory.get(animal.category) || [], animal.score.overall);
      });

      categoryFiltered.sort((a, b) => {
        if (!a.score.hasEnoughData && !b.score.hasEnoughData) return a.idTag.localeCompare(b.idTag);
        if (!a.score.hasEnoughData) return 1;
        if (!b.score.hasEnoughData) return -1;
        const aKey = filters.category ? a.score.overall : a.categoryPercentile ?? a.score.overall * 10;
        const bKey = filters.category ? b.score.overall : b.categoryPercentile ?? b.score.overall * 10;
        if (bKey !== aKey) return bKey - aKey;
        return b.score.overall - a.score.overall;
      });
      categoryFiltered.forEach((animal, index) => {
        animal.rank = index + 1;
      });

      const femalesWithScore = scoredAnimals.filter((animal) => isFemaleSex(animal.sex) && animal.score.applicable.reproduction);
      const withProduction = scoredAnimals.filter((animal) => animal.score.applicable.production);
      const stats: HerdRankingStats = {
        totalScored: scoredAnimals.length,
        totalInsufficient: categoryFiltered.length - scoredAnimals.length,
        avgOverall: round1(avgOverall),
        avgProduction: withProduction.length
          ? round1(withProduction.reduce((sum, animal) => sum + animal.score.production, 0) / withProduction.length)
          : 0,
        avgReproduction: femalesWithScore.length
          ? round1(femalesWithScore.reduce((sum, animal) => sum + animal.score.reproduction, 0) / femalesWithScore.length)
          : 0,
        topPerformers: scoredAnimals.filter((animal) => animal.score.overall >= 8).length,
        needsAttention: scoredAnimals.filter((animal) => animal.score.overall < 4).length,
      };

      return { animals: categoryFiltered, stats };
    },
    enabled: !!cabañaId,
    staleTime: 10 * 60 * 1000,
  });
}
