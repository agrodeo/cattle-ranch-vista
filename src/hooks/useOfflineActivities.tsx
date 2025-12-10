import { useState, useEffect, useCallback } from 'react';
import { db, generateTempId, isTempId } from '@/services/db';
import { enqueue } from '@/services/outbox';
import { trySync } from '@/services/sync';
import { useConnectivity } from '@/services/connectivity';
import type { CachedVaccine, CachedWeight, CachedInsemination, CachedEvento, SyncStatus } from '@/services/offlineTypes';

interface UseOfflineActivitiesOptions {
  cabañaId: string | null;
}

// Vaccination input
interface VaccinationInput {
  animal_id: string;
  vaccine_code: string;
  date: string;
  dose?: string;
  dose_number?: number;
  lot?: string;
  route?: string;
  requirement_id?: string;
  created_by: string;
}

// Weight input
interface WeightInput {
  animal_id: string;
  fecha: string;
  peso_kg: number;
  tipo_pesaje?: string;
  notas?: string;
}

// Insemination input
interface InseminationInput {
  female_id: string;
  bull_id?: string;
  bull_name: string;
  insemination_date: string;
  notes?: string;
  created_by?: string;
}

// Generic event input
interface EventoInput {
  tipo: string;
  fecha: string;
  notas?: string;
  payload?: any;
  creado_por: string;
}

export function useOfflineActivities(options: UseOfflineActivitiesOptions) {
  const { cabañaId } = options;
  const { isOnline } = useConnectivity();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Record vaccination
  const recordVaccination = useCallback(async (input: VaccinationInput): Promise<string> => {
    if (!cabañaId) throw new Error('No cabaña selected');

    const tempId = generateTempId();
    const now = new Date().toISOString();

    const newVaccine: CachedVaccine = {
      id: tempId,
      cabaña_id: cabañaId,
      animal_id: input.animal_id,
      vaccine_code: input.vaccine_code,
      date: input.date,
      dose: input.dose,
      dose_number: input.dose_number,
      lot: input.lot,
      route: input.route,
      requirement_id: input.requirement_id,
      created_by: input.created_by,
      updated_at: now,
      sync_status: 'pending'
    };

    await db.vaccines_cache.add(newVaccine);

    await enqueue({
      type: 'VACCINE_INSERT',
      payload: {
        cabaña_id: cabañaId,
        ...input
      },
      tempIds: { vaccineId: tempId }
    });

    if (isOnline) {
      trySync().catch(console.error);
    }

    return tempId;
  }, [cabañaId, isOnline]);

  // Record batch vaccinations
  const recordBatchVaccinations = useCallback(async (
    animalIds: string[],
    vaccineData: Omit<VaccinationInput, 'animal_id'>
  ): Promise<string[]> => {
    const ids: string[] = [];
    for (const animalId of animalIds) {
      const id = await recordVaccination({ ...vaccineData, animal_id: animalId });
      ids.push(id);
    }
    return ids;
  }, [recordVaccination]);

  // Record weight
  const recordWeight = useCallback(async (input: WeightInput): Promise<string> => {
    if (!cabañaId) throw new Error('No cabaña selected');

    const tempId = generateTempId();
    const now = new Date().toISOString();

    // Get previous weight for calculations
    const previousWeights = await db.weights_cache
      .where('animal_id').equals(input.animal_id)
      .sortBy('fecha');
    
    const lastWeight = previousWeights[previousWeights.length - 1];
    let ganancia_diaria: number | undefined;
    let dias_desde_ultimo_pesaje: number | undefined;

    if (lastWeight) {
      const lastDate = new Date(lastWeight.fecha);
      const currentDate = new Date(input.fecha);
      dias_desde_ultimo_pesaje = Math.floor((currentDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (dias_desde_ultimo_pesaje > 0) {
        ganancia_diaria = (input.peso_kg - lastWeight.peso_kg) / dias_desde_ultimo_pesaje;
      }
    }

    const newWeight: CachedWeight = {
      id: tempId,
      cabaña_id: cabañaId,
      animal_id: input.animal_id,
      fecha: input.fecha,
      peso_kg: input.peso_kg,
      tipo_pesaje: input.tipo_pesaje,
      notas: input.notas,
      peso_anterior: lastWeight?.peso_kg,
      ganancia_diaria,
      dias_desde_ultimo_pesaje,
      updated_at: now,
      sync_status: 'pending'
    };

    await db.weights_cache.add(newWeight);

    // Update animal's current weight
    const animal = await db.animals_cache.get(input.animal_id);
    if (animal) {
      await db.animals_cache.update(input.animal_id, {
        peso_actual_kg: input.peso_kg,
        ganancia_diaria_kg: ganancia_diaria,
        updated_at: now,
        sync_status: animal.sync_status === 'synced' ? 'pending' : animal.sync_status
      });
    }

    await enqueue({
      type: 'WEIGHT_INSERT',
      payload: {
        cabaña_id: cabañaId,
        ...input
      },
      tempIds: { weightId: tempId }
    });

    if (isOnline) {
      trySync().catch(console.error);
    }

    return tempId;
  }, [cabañaId, isOnline]);

  // Record batch weights
  const recordBatchWeights = useCallback(async (
    weights: Array<{ animal_id: string; peso_kg: number }>,
    fecha: string,
    tipo_pesaje?: string
  ): Promise<string[]> => {
    const ids: string[] = [];
    for (const w of weights) {
      const id = await recordWeight({
        animal_id: w.animal_id,
        fecha,
        peso_kg: w.peso_kg,
        tipo_pesaje
      });
      ids.push(id);
    }
    return ids;
  }, [recordWeight]);

  // Record insemination
  const recordInsemination = useCallback(async (input: InseminationInput): Promise<string> => {
    if (!cabañaId) throw new Error('No cabaña selected');

    const tempId = generateTempId();
    const now = new Date().toISOString();

    const newInsemination: CachedInsemination = {
      id: tempId,
      cabaña_id: cabañaId,
      female_id: input.female_id,
      bull_id: input.bull_id,
      bull_name: input.bull_name,
      insemination_date: input.insemination_date,
      notes: input.notes,
      created_by: input.created_by,
      updated_at: now,
      sync_status: 'pending'
    };

    await db.inseminations_cache.add(newInsemination);

    // Update female's service date - queue for sync separately
    const animal = await db.animals_cache.get(input.female_id);
    if (animal && !isTempId(input.female_id)) {
      await enqueue({
        type: 'ANIMAL_UPDATE',
        payload: { id: input.female_id, toro_servicio_id: input.bull_id }
      });
    }

    await enqueue({
      type: 'INSEMINATION_INSERT',
      payload: {
        cabaña_id: cabañaId,
        ...input
      },
      tempIds: { inseminationId: tempId }
    });

    if (isOnline) {
      trySync().catch(console.error);
    }

    return tempId;
  }, [cabañaId, isOnline]);

  // Record batch inseminations
  const recordBatchInseminations = useCallback(async (
    femaleIds: string[],
    inseminationData: Omit<InseminationInput, 'female_id'>
  ): Promise<string[]> => {
    const ids: string[] = [];
    for (const femaleId of femaleIds) {
      const id = await recordInsemination({ ...inseminationData, female_id: femaleId });
      ids.push(id);
    }
    return ids;
  }, [recordInsemination]);

  // Record generic event
  const recordEvento = useCallback(async (input: EventoInput): Promise<string> => {
    if (!cabañaId) throw new Error('No cabaña selected');

    const tempId = generateTempId();
    const now = new Date().toISOString();

    const newEvento: CachedEvento = {
      id: tempId,
      cabaña_id: cabañaId,
      tipo: input.tipo,
      fecha: input.fecha,
      notas: input.notas,
      payload: input.payload,
      creado_por: input.creado_por,
      updated_at: now,
      sync_status: 'pending'
    };

    await db.eventos_cache.add(newEvento);

    await enqueue({
      type: 'EVENTO_INSERT',
      payload: {
        cabaña_id: cabañaId,
        ...input
      },
      tempIds: { eventoId: tempId }
    });

    if (isOnline) {
      trySync().catch(console.error);
    }

    return tempId;
  }, [cabañaId, isOnline]);

  // Get vaccinations for animal
  const getAnimalVaccinations = useCallback(async (animalId: string): Promise<CachedVaccine[]> => {
    return await db.vaccines_cache.where('animal_id').equals(animalId).toArray();
  }, []);

  // Get weights for animal
  const getAnimalWeights = useCallback(async (animalId: string): Promise<CachedWeight[]> => {
    return await db.weights_cache.where('animal_id').equals(animalId).sortBy('fecha');
  }, []);

  // Get inseminations for animal
  const getAnimalInseminations = useCallback(async (animalId: string): Promise<CachedInsemination[]> => {
    return await db.inseminations_cache.where('female_id').equals(animalId).toArray();
  }, []);

  // Get recent events
  const getRecentEvents = useCallback(async (limit: number = 20): Promise<CachedEvento[]> => {
    if (!cabañaId) return [];
    const events = await db.eventos_cache.where('cabaña_id').equals(cabañaId).toArray();
    return events.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).slice(0, limit);
  }, [cabañaId]);

  // Get pending activities count
  const getPendingCount = useCallback(async (): Promise<number> => {
    if (!cabañaId) return 0;
    
    const [vaccines, weights, inseminations, eventos] = await Promise.all([
      db.vaccines_cache.where('sync_status').equals('pending').count(),
      db.weights_cache.where('sync_status').equals('pending').count(),
      db.inseminations_cache.where('sync_status').equals('pending').count(),
      db.eventos_cache.where('sync_status').equals('pending').count()
    ]);

    return vaccines + weights + inseminations + eventos;
  }, [cabañaId]);

  return {
    isLoading,
    error,
    // Vaccinations
    recordVaccination,
    recordBatchVaccinations,
    getAnimalVaccinations,
    // Weights
    recordWeight,
    recordBatchWeights,
    getAnimalWeights,
    // Inseminations
    recordInsemination,
    recordBatchInseminations,
    getAnimalInseminations,
    // Events
    recordEvento,
    getRecentEvents,
    // Status
    getPendingCount
  };
}
