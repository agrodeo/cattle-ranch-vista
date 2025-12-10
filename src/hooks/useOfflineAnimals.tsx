import { useState, useEffect, useCallback } from 'react';
import { db, generateTempId, isTempId } from '@/services/db';
import { enqueue } from '@/services/outbox';
import { trySync } from '@/services/sync';
import { useConnectivity } from '@/services/connectivity';
import { supabase } from '@/integrations/supabase/client';
import type { CachedAnimal, SyncStatus } from '@/services/offlineTypes';

interface UseOfflineAnimalsOptions {
  cabañaId: string | null;
  filters?: {
    status?: string;
    sex?: string;
    corralId?: string;
  };
}

interface AnimalInput {
  id_tag?: string;
  name?: string;
  sex: 'Macho' | 'Hembra';
  birth_date?: string | null;
  status?: string;
  breed?: string;
  father_id?: string;
  mother_id?: string;
  corral_id?: string;
  peso_nacimiento?: number;
  peso_actual_kg?: number;
  is_castrated?: boolean;
}

export function useOfflineAnimals(options: UseOfflineAnimalsOptions) {
  const { cabañaId, filters } = options;
  const { isOnline } = useConnectivity();
  const [animals, setAnimals] = useState<CachedAnimal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load animals from cache
  const loadAnimals = useCallback(async () => {
    if (!cabañaId) {
      setAnimals([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      let query = db.animals_cache.where('cabaña_id').equals(cabañaId);

      let result = await query.toArray();

      // Apply filters
      if (filters?.status) {
        result = result.filter(a => a.status === filters.status);
      }
      if (filters?.sex) {
        result = result.filter(a => a.sex === filters.sex);
      }
      if (filters?.corralId) {
        result = result.filter(a => a.corral_id === filters.corralId);
      }

      setAnimals(result);
      setError(null);
    } catch (err: any) {
      console.error('Error loading offline animals:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [cabañaId, filters?.status, filters?.sex, filters?.corralId]);

  useEffect(() => {
    loadAnimals();
  }, [loadAnimals]);

  // Sync from server if online
  const syncFromServer = useCallback(async () => {
    if (!isOnline || !cabañaId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('animals')
        .select('*')
        .eq('cabaña_id', cabañaId);

      if (fetchError) throw fetchError;
      if (!data) return;

      // Get pending local IDs to avoid overwriting
      const pendingIds = (await db.animals_cache.where('sync_status').equals('pending').toArray()).map(a => a.id);

      for (const animal of data) {
        if (pendingIds.includes(animal.id)) continue;

        await db.animals_cache.put({
          ...animal,
          cabaña_id: animal.cabaña_id || cabañaId,
          sex: animal.sex as 'Macho' | 'Hembra',
          status: (animal.status || 'activo') as 'activo' | 'vendido' | 'muerto',
          updated_at: new Date().toISOString(),
          sync_status: 'synced'
        });
      }

      await loadAnimals();
    } catch (err) {
      console.error('Error syncing animals from server:', err);
    }
  }, [isOnline, cabañaId, loadAnimals]);

  // Create new animal
  const createAnimal = useCallback(async (input: AnimalInput): Promise<string> => {
    if (!cabañaId) throw new Error('No cabaña selected');

    const tempId = generateTempId();
    const now = new Date().toISOString();

    const newAnimal: CachedAnimal = {
      id: tempId,
      cabaña_id: cabañaId,
      id_tag: input.id_tag,
      name: input.name,
      sex: input.sex,
      birth_date: input.birth_date,
      status: (input.status || 'activo') as 'activo' | 'vendido' | 'muerto',
      breed: input.breed,
      father_id: input.father_id,
      mother_id: input.mother_id,
      corral_id: input.corral_id,
      peso_nacimiento: input.peso_nacimiento,
      peso_actual_kg: input.peso_actual_kg,
      is_castrated: input.is_castrated,
      updated_at: now,
      sync_status: 'pending'
    };

    // Write to local cache
    await db.animals_cache.add(newAnimal);

    // Queue for sync
    await enqueue({
      type: 'ANIMAL_INSERT',
      payload: {
        cabaña_id: cabañaId,
        id_tag: input.id_tag,
        name: input.name,
        sex: input.sex,
        birth_date: input.birth_date,
        status: input.status || 'activo',
        breed: input.breed,
        father_id: input.father_id,
        mother_id: input.mother_id,
        corral_id: input.corral_id,
        peso_nacimiento: input.peso_nacimiento,
        peso_actual_kg: input.peso_actual_kg,
        is_castrated: input.is_castrated
      },
      tempIds: { animalId: tempId }
    });

    // Try to sync if online
    if (isOnline) {
      trySync().catch(console.error);
    }

    await loadAnimals();
    return tempId;
  }, [cabañaId, isOnline, loadAnimals]);

  // Update animal
  const updateAnimal = useCallback(async (id: string, changes: Partial<AnimalInput>): Promise<void> => {
    const now = new Date().toISOString();

    const updateData: Partial<CachedAnimal> = {
      ...changes,
      status: changes.status as 'activo' | 'vendido' | 'muerto' | undefined,
      updated_at: now,
      sync_status: 'pending'
    };

    await db.animals_cache.update(id, updateData);

    // Only queue sync for real IDs
    if (!isTempId(id)) {
      await enqueue({
        type: 'ANIMAL_UPDATE',
        payload: { id, ...changes }
      });
    }

    if (isOnline) {
      trySync().catch(console.error);
    }

    await loadAnimals();
  }, [isOnline, loadAnimals]);

  // Assign to corral
  const assignToCorral = useCallback(async (animalId: string, corralId: string | null): Promise<void> => {
    await updateAnimal(animalId, { corral_id: corralId || undefined });

    // Also create corral movement record
    if (!isTempId(animalId) && corralId) {
      const animal = await db.animals_cache.get(animalId);
      if (animal?.cabaña_id) {
        await enqueue({
          type: 'CORRAL_MOVEMENT_INSERT',
          payload: {
            animal_id: animalId,
            cabaña_id: animal.cabaña_id,
            corral_anterior_id: animal.corral_id,
            corral_nuevo_id: corralId,
            fecha_movimiento: new Date().toISOString().split('T')[0]
          }
        });
      }
    }
  }, [updateAnimal]);

  // Mark as dead
  const markAsDead = useCallback(async (
    animalId: string,
    deathData: { fecha_defuncion: string; causa_id?: string; causa_texto?: string; notas?: string; registrado_por: string }
  ): Promise<void> => {
    await updateAnimal(animalId, { status: 'muerto' as any });

    const animal = await db.animals_cache.get(animalId);
    if (animal?.cabaña_id && !isTempId(animalId)) {
      await enqueue({
        type: 'DEATH_RECORD_INSERT',
        payload: {
          animal_id: animalId,
          cabaña_id: animal.cabaña_id,
          ...deathData
        }
      });
    }

    if (isOnline) {
      trySync().catch(console.error);
    }
  }, [updateAnimal, isOnline]);

  // Mark as sold
  const markAsSold = useCallback(async (animalId: string): Promise<void> => {
    await updateAnimal(animalId, { status: 'vendido' as any });
  }, [updateAnimal]);

  // Get pending count
  const getPendingCount = useCallback(async (): Promise<number> => {
    if (!cabañaId) return 0;
    return await db.animals_cache
      .where('cabaña_id').equals(cabañaId)
      .filter(a => a.sync_status === 'pending')
      .count();
  }, [cabañaId]);

  // Get single animal by ID
  const getAnimal = useCallback(async (id: string): Promise<CachedAnimal | undefined> => {
    return await db.animals_cache.get(id);
  }, []);

  return {
    animals,
    isLoading,
    error,
    createAnimal,
    updateAnimal,
    assignToCorral,
    markAsDead,
    markAsSold,
    refresh: loadAnimals,
    syncFromServer,
    getPendingCount,
    getAnimal
  };
}
