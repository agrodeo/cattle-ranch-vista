import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';

export interface AnimalDEPs {
  id: string;
  animal_id: string;
  source: string | null;
  evaluation_date: string | null;
  accuracy: number | null;
  dep_peso_nacer: number | null;
  dep_peso_nacer_acc: number | null;
  dep_peso_destete: number | null;
  dep_peso_destete_acc: number | null;
  dep_peso_final: number | null;
  dep_peso_final_acc: number | null;
  dep_leche: number | null;
  dep_leche_acc: number | null;
  dep_circunferencia_escrotal: number | null;
  dep_circunferencia_escrotal_acc: number | null;
  dep_largo_gestacion: number | null;
  dep_largo_gestacion_acc: number | null;
  dep_area_ojo_bife: number | null;
  dep_area_ojo_bife_acc: number | null;
  dep_grasa_dorsal: number | null;
  dep_grasa_dorsal_acc: number | null;
  dep_grasa_cadera: number | null;
  dep_grasa_cadera_acc: number | null;
  dep_grasa_intramuscular: number | null;
  dep_grasa_intramuscular_acc: number | null;
  dep_docilidad: number | null;
  dep_docilidad_acc: number | null;
  notes: string | null;
}

// Cast to any until Supabase types regenerate for the new table.
const depsTable = () => (supabase as any).from('animal_deps');

export function useAnimalDEPs(animalId: string | undefined) {
  const { t } = useTranslation('deps');
  const { currentUser } = useSupabaseAuth();
  const queryClient = useQueryClient();

  const { data: deps, isLoading } = useQuery({
    queryKey: ['animal-deps', animalId],
    queryFn: async () => {
      if (!animalId) return null;
      const { data, error } = await depsTable()
        .select('*')
        .eq('animal_id', animalId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as AnimalDEPs | null;
    },
    enabled: !!animalId,
  });

  const saveDEPs = useMutation({
    mutationFn: async (values: Partial<AnimalDEPs>) => {
      if (!animalId) throw new Error('No animal');
      if (!currentUser?.cabañaId) throw new Error('No cabaña');

      const payload: Record<string, unknown> = {
        ...values,
        animal_id: animalId,
        'cabaña_id': currentUser.cabañaId,
        updated_at: new Date().toISOString(),
      };

      if (deps?.id) {
        const { error } = await depsTable().update(payload).eq('id', deps.id);
        if (error) throw error;
      } else {
        payload.created_by = currentUser.id;
        const { error } = await depsTable().insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animal-deps', animalId] });
      toast({ title: t('saved') });
    },
    onError: (err: unknown) => {
      console.error('DEPs save error:', err);
      toast({ title: t('save_error'), variant: 'destructive' });
    },
  });

  return { deps: deps ?? null, isLoading, saveDEPs };
}
