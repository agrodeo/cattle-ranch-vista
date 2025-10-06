import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WeightRecord {
  id: string;
  fecha: string;
  peso: number;
  ganancia_diaria?: number;
  edad_dias?: number;
  tipo_pesaje?: 'nacimiento' | 'destete' | 'final' | 'control';
  peso_anterior?: number;
  dias_desde_ultimo?: number;
}

export function useAnimalWeights(animalId: string) {
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWeights = async () => {
    if (!animalId) return;
    
    setIsLoading(true);
    try {
      // Fetch from new animal_weight_history table
      const { data, error } = await supabase
        .rpc('get_animal_weight_history', { _animal_id: animalId });

      if (error) throw error;

      const weightRecords: WeightRecord[] = data?.map((record: any) => ({
        id: record.id,
        fecha: record.fecha,
        peso: record.peso_kg,
        ganancia_diaria: record.ganancia_diaria,
        edad_dias: record.edad_dias,
        tipo_pesaje: record.tipo_pesaje,
        peso_anterior: record.peso_anterior,
        dias_desde_ultimo: record.dias_desde_ultimo
      })) || [];

      setWeights(weightRecords);
    } catch (error) {
      console.error('Error fetching animal weights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWeights();
  }, [animalId]);

  return { weights, isLoading, refresh: fetchWeights };
}