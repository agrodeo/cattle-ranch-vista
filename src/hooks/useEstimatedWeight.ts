import { useMemo } from 'react';
import { useAnimalWeights } from '@/hooks/useAnimalWeights';
import { estimateWeight, type WeightEstimation, type AnimalWeightInput } from '@/lib/weightEstimation';

export function useEstimatedWeight(animal: AnimalWeightInput | null) {
  const { weights, isLoading } = useAnimalWeights(animal?.id || '');

  const estimation = useMemo<WeightEstimation | null>(() => {
    if (!animal) return null;
    return estimateWeight(animal, weights);
  }, [animal, weights]);

  return { estimation, isLoading };
}
