import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface WeightRecord {
  id: string;
  fecha: string;
  peso: number;
  ganancia_diaria?: number;
  edad_dias?: number;
}

export function useAnimalWeights(animalId: string) {
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWeights = async () => {
    if (!animalId) return;
    
    setIsLoading(true);
    try {
      // Fetch weighing events for this animal
      const { data: eventos, error: eventosError } = await supabase
        .from('eventos')
        .select(`
          id,
          fecha,
          pesajes (
            mediciones
          )
        `)
        .eq('tipo', 'pesaje')
        .contains('animales_ids', [animalId])
        .order('fecha', { ascending: false });

      if (eventosError) throw eventosError;

      const weightRecords: WeightRecord[] = [];
      
      eventos?.forEach(evento => {
        if (evento.pesajes?.[0]?.mediciones) {
          const mediciones = evento.pesajes[0].mediciones as any;
          // Find this animal's weight in the measurements
          if (Array.isArray(mediciones)) {
            const animalMeasurement = mediciones.find((m: any) => m.animal_id === animalId);
            if (animalMeasurement?.peso) {
              weightRecords.push({
                id: evento.id,
                fecha: evento.fecha,
                peso: animalMeasurement.peso,
                ganancia_diaria: animalMeasurement.ganancia_diaria,
                edad_dias: animalMeasurement.edad_dias
              });
            }
          }
        }
      });

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