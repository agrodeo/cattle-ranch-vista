import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export type StartPlanStepKey =
  | "animals"
  | "corrals"
  | "weights"
  | "vaccines"
  | "genealogy"
  | "reproduction"
  | "finances";

export interface StartPlanStep {
  key: StartPlanStepKey;
  done: boolean;
  /** Progress hint, e.g. "3 / 2 animales con dos pesadas" */
  progress?: string;
  route: string;
}

const countRows = async (table: string, cabañaId: string) => {
  const { count } = await supabase
    .from(table as never)
    .select("id", { count: "exact", head: true })
    .eq("cabaña_id", cabañaId);
  return count ?? 0;
};

/**
 * Reads the real state of the ranch and returns the seven data milestones
 * that unlock already-built analytics (ADG, ranking, estimated weight,
 * genealogy, inbreeding, reproductive KPIs, corral comparison).
 */
export const useStartPlan = () => {
  const { currentUser } = useSupabaseAuth();
  const cabañaId = currentUser?.cabañaId;

  const query = useQuery({
    queryKey: ["start-plan", cabañaId],
    enabled: !!cabañaId,
    staleTime: 60_000,
    queryFn: async (): Promise<StartPlanStep[]> => {
      const id = cabañaId as string;

      const [
        animals,
        corrals,
        weightRows,
        vaccineReqs,
        vaccineDoses,
        pedigree,
        inseminations,
        pregnancies,
        finances,
      ] = await Promise.all([
        countRows("animals", id),
        countRows("corrales", id),
        supabase
          .from("animal_weight_history")
          .select("animal_id")
          .eq("cabaña_id", id)
          .limit(20000),
        countRows("cabaña_vaccination_requirements", id),
        countRows("animal_vaccines", id),
        supabase
          .from("animals")
          .select("id")
          .eq("cabaña_id", id)
          .or("father_id.not.is.null,mother_id.not.is.null")
          .limit(2000),
        countRows("artificial_inseminations", id),
        countRows("preñeces", id),
        countRows("finances", id),
      ]);

      const perAnimal = new Map<string, number>();
      (weightRows.data || []).forEach((r: { animal_id: string }) => {
        perAnimal.set(r.animal_id, (perAnimal.get(r.animal_id) || 0) + 1);
      });
      const animalsWithTwoWeights = Array.from(perAnimal.values()).filter((n) => n >= 2).length;
      const pedigreeCount = pedigree.data?.length ?? 0;

      return [
        { key: "animals", done: animals > 0, progress: String(animals), route: "/animals" },
        { key: "corrals", done: corrals > 0, progress: String(corrals), route: "/corrales" },
        {
          key: "weights",
          done: animalsWithTwoWeights > 0,
          progress: String(animalsWithTwoWeights),
          route: "/activities",
        },
        {
          key: "vaccines",
          done: vaccineReqs > 0 && vaccineDoses > 0,
          progress: String(vaccineDoses),
          route: "/settings",
        },
        {
          key: "genealogy",
          done: pedigreeCount > 0,
          progress: String(pedigreeCount),
          route: "/animals",
        },
        {
          key: "reproduction",
          done: inseminations + pregnancies > 0,
          progress: String(inseminations + pregnancies),
          route: "/activities",
        },
        { key: "finances", done: finances > 0, progress: String(finances), route: "/finances" },
      ];
    },
  });

  const steps = query.data || [];
  const completed = steps.filter((s) => s.done).length;

  return {
    steps,
    completed,
    total: steps.length || 7,
    allDone: steps.length > 0 && completed === steps.length,
    isLoading: query.isLoading,
  };
};
