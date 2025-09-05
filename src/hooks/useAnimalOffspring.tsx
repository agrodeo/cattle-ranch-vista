import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Animal } from '@/types/animal';

interface OffspringData {
  offspring: Animal[];
  loading: boolean;
  totalCount: number;
  liveCount: number;
}

export function useAnimalOffspring(animalId: string, animalSex: string): OffspringData {
  const [offspring, setOffspring] = useState<Animal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOffspring = async () => {
      if (!animalId) return;
      
      setLoading(true);
      try {
        // Query for offspring based on sex
        const query = animalSex === 'Hembra' 
          ? supabase.from('animals').select('*').eq('mother_id', animalId)
          : supabase.from('animals').select('*').eq('father_id', animalId);

        const { data, error } = await query;

        if (error) {
          console.error('Error fetching offspring:', error);
          setOffspring([]);
        } else {
          setOffspring(data || []);
        }
      } catch (error) {
        console.error('Error fetching offspring:', error);
        setOffspring([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOffspring();
  }, [animalId, animalSex]);

  const totalCount = offspring.length;
  const liveCount = offspring.filter(child => child.status !== 'muerto').length;

  return {
    offspring,
    loading,
    totalCount,
    liveCount
  };
}