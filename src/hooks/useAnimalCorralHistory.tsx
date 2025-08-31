import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CorralMovement {
  id: string;
  fecha_movimiento: string;
  corral_anterior_id?: string;
  corral_nuevo_id?: string;
  corral_anterior_nombre?: string;
  corral_nuevo_nombre?: string;
  motivo?: string;
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

        // Get corral movement history
        const { data: movementsData, error: movementsError } = await supabase
          .from('corral_movements')
          .select(`
            id,
            fecha_movimiento,
            corral_anterior_id,
            corral_nuevo_id,
            motivo
          `)
          .eq('animal_id', animalId)
          .order('fecha_movimiento', { ascending: false });

        if (movementsError) {
          console.error('Error fetching movements:', movementsError);
          // Fallback to showing current corral only
          if (animal?.corral_id) {
            setMovements([{
              id: animal.corral_id,
              fecha_movimiento: new Date().toISOString().split('T')[0],
              corral_nuevo_id: animal.corral_id,
              corral_nuevo_nombre: animal.corral?.name || 'Sin nombre'
            }]);
          }
          return;
        }

        // Get corral names for movements
        const movementsWithNames = await Promise.all(
          (movementsData || []).map(async (movement, index) => {
            let diasEnCorral = null;
            let corralAnteriorNombre = null;
            let corralNuevoNombre = null;
            
            // Get corral names
            if (movement.corral_anterior_id) {
              const { data: anteriorCorral } = await supabase
                .from('corrales')
                .select('name')
                .eq('id', movement.corral_anterior_id)
                .single();
              corralAnteriorNombre = anteriorCorral?.name;
            }
            
            if (movement.corral_nuevo_id) {
              const { data: nuevoCorral } = await supabase
                .from('corrales')
                .select('name')
                .eq('id', movement.corral_nuevo_id)
                .single();
              corralNuevoNombre = nuevoCorral?.name;
            }
            
            // Calculate days in corral
            if (index < movementsData.length - 1) {
              const currentDate = new Date(movement.fecha_movimiento);
              const nextDate = new Date(movementsData[index + 1].fecha_movimiento);
              diasEnCorral = Math.ceil((nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
            } else if (movement.corral_nuevo_id === animal?.corral_id) {
              const currentDate = new Date(movement.fecha_movimiento);
              const today = new Date();
              diasEnCorral = Math.ceil((today.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
            }

            return {
              ...movement,
              corral_anterior_nombre: corralAnteriorNombre,
              corral_nuevo_nombre: corralNuevoNombre,
              dias_en_corral: diasEnCorral
            };
          })
        );

        setMovements(movementsWithNames);

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