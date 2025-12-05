import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { type CustomBenchmark } from "@/lib/breedBenchmarks";

export interface BreedingTargets {
  birth_weight: number;
  weaning_weight: number;
  final_weight: number;
  ce_cm: number;
}

const DEFAULT_TARGETS: BreedingTargets = {
  birth_weight: 32,
  weaning_weight: 200,
  final_weight: 450,
  ce_cm: 36
};

export function useBenchmarks() {
  const { currentUser } = useSupabaseAuth();
  const [benchmarks, setBenchmarks] = useState<CustomBenchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBenchmarks = useCallback(async () => {
    if (!currentUser?.cabañaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from("custom_benchmarks")
        .select("*")
        .eq("cabaña_id", currentUser.cabañaId)
        .order("breed", { nullsFirst: false });

      if (fetchError) throw fetchError;
      setBenchmarks(data || []);
    } catch (err) {
      console.error("Error fetching benchmarks:", err);
      setError("Failed to load benchmarks");
    } finally {
      setLoading(false);
    }
  }, [currentUser?.cabañaId]);

  useEffect(() => {
    fetchBenchmarks();
  }, [fetchBenchmarks]);

  // Get breeding targets from configured benchmarks
  // Uses the default (no-breed) benchmark if available, otherwise falls back to defaults
  const getBreedingTargets = useCallback((): BreedingTargets => {
    // First try to find the default benchmark (breed === null)
    const defaultBenchmark = benchmarks.find(b => b.breed === null);
    
    if (defaultBenchmark) {
      return {
        birth_weight: defaultBenchmark.birth_weight_excellent,
        weaning_weight: defaultBenchmark.weaning_weight_excellent,
        final_weight: defaultBenchmark.weaning_weight_excellent * 2.25, // Estimate final from weaning
        ce_cm: 36 // Default CE since not in benchmarks
      };
    }

    // If no default, use the first benchmark as reference
    if (benchmarks.length > 0) {
      const first = benchmarks[0];
      return {
        birth_weight: first.birth_weight_excellent,
        weaning_weight: first.weaning_weight_excellent,
        final_weight: first.weaning_weight_excellent * 2.25,
        ce_cm: 36
      };
    }

    return DEFAULT_TARGETS;
  }, [benchmarks]);

  // Check if user has configured any benchmarks
  const hasBenchmarks = benchmarks.length > 0;

  return {
    benchmarks,
    loading,
    error,
    hasBenchmarks,
    getBreedingTargets,
    refetch: fetchBenchmarks
  };
}
