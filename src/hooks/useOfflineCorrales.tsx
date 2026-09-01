import { useState, useEffect, useCallback } from 'react';
import { db, generateTempId, isTempId } from '@/services/db';
import { enqueue } from '@/services/outbox';
import { trySync } from '@/services/sync';
import { useConnectivity } from '@/services/connectivity';
import { supabase } from '@/integrations/supabase/client';
import type { CachedCorral, SyncStatus } from '@/services/offlineTypes';

interface UseOfflineCorralesOptions {
  cabañaId: string | null;
}

interface CorralInput {
  name: string;
  capacity?: number;
  hectareas?: number;
}

interface CorralWithCount extends CachedCorral {
  animal_count: number;
}

export function useOfflineCorrales(options: UseOfflineCorralesOptions) {
  const { cabañaId } = options;
  const { isOnline } = useConnectivity();
  const [corrales, setCorrales] = useState<CorralWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load corrales from cache with animal counts
  const loadCorrales = useCallback(async () => {
    if (!cabañaId) {
      setCorrales([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const cachedCorrales = await db.corrales_cache.where('cabaña_id').equals(cabañaId).toArray();

      // Get animal counts for each corral
      const corralesWithCounts: CorralWithCount[] = await Promise.all(
        cachedCorrales.map(async (corral) => {
          const count = await db.animals_cache
            .where('corral_id').equals(corral.id)
            .filter(a => String(a.status || 'activo').trim().toLowerCase() === 'activo')
            .count();
          return { ...corral, animal_count: count };
        })
      );

      setCorrales(corralesWithCounts);
      setError(null);
    } catch (err: any) {
      console.error('Error loading offline corrales:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [cabañaId]);

  useEffect(() => {
    loadCorrales();
  }, [loadCorrales]);

  // Sync from server if online
  const syncFromServer = useCallback(async () => {
    if (!isOnline || !cabañaId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('corrales')
        .select('*')
        .eq('cabaña_id', cabañaId);

      if (fetchError) throw fetchError;
      if (!data) return;

      // Get pending local IDs
      const pendingIds = (await db.corrales_cache.where('sync_status').equals('pending').toArray()).map(c => c.id);

      for (const corral of data) {
        if (pendingIds.includes(corral.id)) continue;

        await db.corrales_cache.put({
          ...corral,
          cabaña_id: corral.cabaña_id || cabañaId,
          updated_at: corral.updated_at || new Date().toISOString(),
          sync_status: 'synced'
        });
      }

      await loadCorrales();
    } catch (err) {
      console.error('Error syncing corrales from server:', err);
    }
  }, [isOnline, cabañaId, loadCorrales]);

  // Create new corral
  const createCorral = useCallback(async (input: CorralInput): Promise<string> => {
    if (!cabañaId) throw new Error('No cabaña selected');

    const tempId = generateTempId();
    const now = new Date().toISOString();

    const newCorral: CachedCorral = {
      id: tempId,
      cabaña_id: cabañaId,
      name: input.name,
      capacity: input.capacity,
      hectareas: input.hectareas,
      updated_at: now,
      sync_status: 'pending'
    };

    await db.corrales_cache.add(newCorral);

    await enqueue({
      type: 'CORRAL_INSERT',
      payload: {
        cabaña_id: cabañaId,
        name: input.name,
        capacity: input.capacity,
        hectareas: input.hectareas
      },
      tempIds: { corralId: tempId }
    });

    if (isOnline) {
      trySync().catch(console.error);
    }

    await loadCorrales();
    return tempId;
  }, [cabañaId, isOnline, loadCorrales]);

  // Update corral
  const updateCorral = useCallback(async (id: string, changes: Partial<CorralInput>): Promise<void> => {
    const now = new Date().toISOString();

    await db.corrales_cache.update(id, {
      ...changes,
      updated_at: now,
      sync_status: 'pending'
    });

    if (!isTempId(id)) {
      await enqueue({
        type: 'CORRAL_UPDATE',
        payload: { id, ...changes }
      });
    }

    if (isOnline) {
      trySync().catch(console.error);
    }

    await loadCorrales();
  }, [isOnline, loadCorrales]);

  // Delete corral
  const deleteCorral = useCallback(async (id: string): Promise<void> => {
    // First, remove all animals from this corral
    const animalsInCorral = await db.animals_cache.where('corral_id').equals(id).toArray();
    for (const animal of animalsInCorral) {
      await db.animals_cache.update(animal.id, { corral_id: undefined });
    }

    await db.corrales_cache.delete(id);

    if (!isTempId(id)) {
      await enqueue({
        type: 'CORRAL_DELETE',
        payload: { id }
      });
    }

    if (isOnline) {
      trySync().catch(console.error);
    }

    await loadCorrales();
  }, [isOnline, loadCorrales]);

  // Get animals in corral
  const getAnimalsInCorral = useCallback(async (corralId: string) => {
    return await db.animals_cache
      .where('corral_id').equals(corralId)
      .filter(a => String(a.status || 'activo').trim().toLowerCase() === 'activo')
      .toArray();
  }, []);

  // Get pending count
  const getPendingCount = useCallback(async (): Promise<number> => {
    if (!cabañaId) return 0;
    return await db.corrales_cache
      .where('cabaña_id').equals(cabañaId)
      .filter(c => c.sync_status === 'pending')
      .count();
  }, [cabañaId]);

  // Get single corral by ID
  const getCorral = useCallback(async (id: string): Promise<CachedCorral | undefined> => {
    return await db.corrales_cache.get(id);
  }, []);

  return {
    corrales,
    isLoading,
    error,
    createCorral,
    updateCorral,
    deleteCorral,
    getAnimalsInCorral,
    refresh: loadCorrales,
    syncFromServer,
    getPendingCount,
    getCorral
  };
}
