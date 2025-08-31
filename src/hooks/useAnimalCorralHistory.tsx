import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CorralMovement {
  id: string;
  fecha: string;
  corral_anterior?: string;
  corral_nuevo: string;
  corral_nombre: string;
  dias_en_corral?: number;
}

export function useAnimalCorralHistory(animalId: string) {
  const [movements, setMovements] = useState<CorralMovement[]>([]);
  const [currentCorral, setCurrentCorral] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCorralHistory = async () => {
      if (!animalId) return;
      
      setIsLoading(true);
      try {
        // Get current animal corral
        const { data: animal, error: animalError } = await supabase
          .from('animals')
          .select(`
            corral_id,
            corral:corrales(name)
          `)
          .eq('id', animalId)
          .single();

        if (animalError) throw animalError;

        setCurrentCorral(animal?.corral?.name || null);

        // For now, we'll show the current corral as a single record
        // In a full implementation, you'd track corral movements in a separate table
        if (animal?.corral_id) {
          setMovements([{
            id: animal.corral_id,
            fecha: new Date().toISOString().split('T')[0],
            corral_nuevo: animal.corral_id,
            corral_nombre: animal.corral?.name || 'Sin nombre'
          }]);
        }

      } catch (error) {
        console.error('Error fetching corral history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCorralHistory();
  }, [animalId]);

  return { movements, currentCorral, isLoading };
}