import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';
import { db } from '@/services/db';
import { useConnectivity } from '@/services/connectivity';

export interface UnifiedActivity {
  id: string;
  tipo: 'VACUNACION' | 'PESAJE' | 'TACTO' | 'GENERAL' | 'IA' | 'PARTO' | 'PERDIDA_PREÑEZ' | 'MUERTE';
  subtipo?: string;
  fecha: string;
  responsable?: string;
  notas?: string;
  animales: {
    id: string;
    name?: string;
    id_tag: string;
  }[];
  detalles: Record<string, any>;
  created_at: string;
}

interface CachedActivity {
  id: string;
  cabaña_id: string;
  tipo: string;
  subtipo?: string;
  fecha: string;
  responsable?: string;
  notas?: string;
  animales: string; // JSON string
  detalles: string; // JSON string
  created_at: string;
  updated_at: string;
  sync_status: 'synced' | 'pending' | 'failed';
}

// Helper to batch-fetch animal details for a list of IDs
async function batchFetchAnimals(animalIds: string[]): Promise<Map<string, { id: string; name?: string; id_tag: string }>> {
  const map = new Map<string, { id: string; name?: string; id_tag: string }>();
  if (animalIds.length === 0) return map;

  const uniqueIds = [...new Set(animalIds)];
  // Supabase .in() supports up to ~300 items; chunk if needed
  const CHUNK = 300;
  for (let i = 0; i < uniqueIds.length; i += CHUNK) {
    const chunk = uniqueIds.slice(i, i + CHUNK);
    const { data } = await supabase
      .from('animals')
      .select('id, name, id_tag')
      .in('id', chunk);
    if (data) {
      data.forEach(a => map.set(a.id, { id: a.id, name: a.name || undefined, id_tag: a.id_tag || 'Sin ID' }));
    }
  }
  return map;
}

export function useAllActivities() {
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useSupabaseAuth();
  const { isOnline } = useConnectivity();

  // Load from IndexedDB cache first
  const loadFromCache = useCallback(async (cabañaId: string) => {
    try {
      const cached = await db.table('eventos_cache')
        .where('cabaña_id')
        .equals(cabañaId)
        .toArray();

      const parsedActivities: UnifiedActivity[] = cached.map((c: CachedActivity) => ({
        id: c.id,
        tipo: c.tipo as UnifiedActivity['tipo'],
        subtipo: c.subtipo,
        fecha: c.fecha,
        responsable: c.responsable,
        notas: c.notas,
        animales: JSON.parse(c.animales || '[]'),
        detalles: JSON.parse(c.detalles || '{}'),
        created_at: c.created_at
      }));
      
      parsedActivities.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
      setActivities(parsedActivities);
    } catch (error) {
      console.error('Error loading activities from cache:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync from server and update cache — batched queries
  const syncFromServer = useCallback(async (cabañaId: string) => {
    if (!isOnline) return;

    try {
      const allActivities: UnifiedActivity[] = [];

      // ── 1. Fetch eventos + related pesajes/tactos in bulk ──
      const { data: eventos, error: eventosError } = await supabase
        .from('eventos')
        .select('*')
        .eq('cabaña_id', cabañaId)
        .order('fecha', { ascending: false })
        .limit(100);

      if (eventosError) console.error('Error fetching eventos:', eventosError);

      if (eventos && eventos.length > 0) {
        // Collect evento IDs by type for batch fetch
        const pesajeEventoIds = eventos.filter(e => e.tipo === 'PESAJE').map(e => e.id);
        const tactoEventoIds = eventos.filter(e => e.tipo === 'TACTO').map(e => e.id);

        // Batch fetch pesajes and tactos in parallel
        const [pesajesResult, tactosResult] = await Promise.all([
          pesajeEventoIds.length > 0
            ? supabase.from('pesajes').select('evento_id, mediciones').in('evento_id', pesajeEventoIds)
            : Promise.resolve({ data: [] as any[] }),
          tactoEventoIds.length > 0
            ? supabase.from('tactos').select('evento_id, resultados').in('evento_id', tactoEventoIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const pesajesMap = new Map<string, any>();
        (pesajesResult.data || []).forEach((p: any) => pesajesMap.set(p.evento_id, p.mediciones));

        const tactosMap = new Map<string, any>();
        (tactosResult.data || []).forEach((t: any) => tactosMap.set(t.evento_id, t.resultados));

        // Collect ALL animal IDs from all eventos first
        const allAnimalIds: string[] = [];

        const eventoParsed = eventos.map(evento => {
          const payload = evento.payload as any;
          let animalIds: string[] = [];
          const detalles: Record<string, any> = {};

          if (evento.tipo === 'PESAJE') {
            const mediciones = pesajesMap.get(evento.id) as any[] | undefined;
            if (mediciones) {
              animalIds = mediciones.map((m: any) => m.animal_id).filter(Boolean);
              detalles.peso_promedio = (
                mediciones.reduce((sum: number, m: any) => sum + (parseFloat(m.peso_kg) || 0), 0) /
                mediciones.length
              ).toFixed(1);
            }
          } else if (evento.tipo === 'TACTO') {
            const resultados = tactosMap.get(evento.id) as any[] | undefined;
            if (resultados) {
              animalIds = resultados.map((r: any) => r.animal_id).filter(Boolean);
              detalles.prenadas = resultados.filter((r: any) => r.resultado === 'preñada').length;
              detalles.vacias = resultados.filter((r: any) => r.resultado === 'vacia').length;
            }
          } else if (payload?.animales_ids) {
            animalIds = payload.animales_ids;
          } else if (payload?.animal_id) {
            animalIds = [payload.animal_id];
          }

          allAnimalIds.push(...animalIds);

          let tipo: UnifiedActivity['tipo'] = 'GENERAL';
          let subtipo: string | undefined;

          if (evento.tipo === 'PESAJE') tipo = 'PESAJE';
          else if (evento.tipo === 'TACTO') tipo = 'TACTO';
          else if (evento.tipo === 'PARTO') {
            tipo = 'PARTO';
            if (payload?.tipo_parto) detalles.tipo_parto = payload.tipo_parto;
            if (payload?.crias) detalles.crias = payload.crias;
          } else if (evento.tipo === 'PERDIDA_PREÑEZ') {
            tipo = 'PERDIDA_PREÑEZ';
            if (payload?.causa) detalles.causa = payload.causa;
          } else if (evento.tipo === 'MUERTE') {
            tipo = 'MUERTE';
            if (payload?.causa) detalles.causa = payload.causa;
          } else {
            subtipo = evento.tipo;
            Object.assign(detalles, payload || {});
          }

          return { evento, tipo, subtipo, animalIds, detalles };
        });

        // Single batch fetch for all animal data from eventos
        const animalsMap = await batchFetchAnimals(allAnimalIds);

        // Build activities using the map
        for (const { evento, tipo, subtipo, animalIds, detalles } of eventoParsed) {
          const animales = animalIds
            .map(id => animalsMap.get(id))
            .filter(Boolean) as UnifiedActivity['animales'];

          allActivities.push({
            id: evento.id,
            tipo,
            subtipo,
            fecha: evento.fecha,
            responsable: evento.creado_por,
            notas: evento.notas || undefined,
            animales,
            detalles,
            created_at: evento.created_at
          });
        }
      }

      // ── 2. Fetch vaccinations ──
      const { data: vaccines, error: vaccinesError } = await supabase
        .from('animal_vaccines')
        .select('id, animal_id, date, vaccine_code, dose, lot, route, created_by')
        .eq('cabaña_id', cabañaId)
        .order('date', { ascending: false })
        .limit(100);

      if (vaccinesError) console.error('Error fetching vaccines:', vaccinesError);

      if (vaccines && vaccines.length > 0) {
        // Group by date + vaccine_code
        const vaccineGroups = new Map<string, typeof vaccines>();
        vaccines.forEach(v => {
          const key = `${v.date}_${v.vaccine_code}`;
          if (!vaccineGroups.has(key)) vaccineGroups.set(key, []);
          vaccineGroups.get(key)!.push(v);
        });

        // Batch fetch all vaccine animal IDs + all vaccine requirements at once
        const allVaccineAnimalIds = vaccines.map(v => v.animal_id);
        const uniqueVaccineCodes = [...new Set(vaccines.map(v => v.vaccine_code))];

        const [vaccineAnimalsMap, reqsResult] = await Promise.all([
          batchFetchAnimals(allVaccineAnimalIds),
          supabase
            .from('cabaña_vaccination_requirements')
            .select('vaccine_code, vaccine_name')
            .eq('cabaña_id', cabañaId)
            .in('vaccine_code', uniqueVaccineCodes),
        ]);

        const vaccineNamesMap = new Map<string, string>();
        (reqsResult.data || []).forEach((r: any) => vaccineNamesMap.set(r.vaccine_code, r.vaccine_name));

        for (const [key, group] of vaccineGroups.entries()) {
          const animales = group
            .map(v => vaccineAnimalsMap.get(v.animal_id))
            .filter(Boolean) as UnifiedActivity['animales'];

          const vaccineName = vaccineNamesMap.get(group[0].vaccine_code);

          allActivities.push({
            id: `vaccine_${key}`,
            tipo: 'VACUNACION',
            subtipo: vaccineName || group[0].vaccine_code,
            fecha: group[0].date,
            responsable: group[0].created_by || undefined,
            notas: undefined,
            animales,
            detalles: {
              vaccine_code: group[0].vaccine_code,
              vaccine_name: vaccineName,
              dose: group[0].dose,
              lot: group[0].lot,
              route: group[0].route,
              total_animals: group.length
            },
            created_at: group[0].date
          });
        }
      }

      // ── 3. Fetch artificial inseminations ──
      const { data: inseminations, error: iaError } = await supabase
        .from('artificial_inseminations')
        .select('id, female_id, bull_name, insemination_date, notes, created_by, created_at')
        .eq('cabaña_id', cabañaId)
        .order('insemination_date', { ascending: false })
        .limit(100);

      if (iaError) console.error('Error fetching inseminations:', iaError);

      if (inseminations && inseminations.length > 0) {
        // Group by date + bull_name
        const iaGroups = new Map<string, typeof inseminations>();
        inseminations.forEach(ia => {
          const key = `${ia.insemination_date}_${ia.bull_name}`;
          if (!iaGroups.has(key)) iaGroups.set(key, []);
          iaGroups.get(key)!.push(ia);
        });

        // Batch fetch all IA animal IDs
        const allIaAnimalIds = inseminations.map(ia => ia.female_id);
        const iaAnimalsMap = await batchFetchAnimals(allIaAnimalIds);

        for (const [key, group] of iaGroups.entries()) {
          const animales = group
            .map(ia => iaAnimalsMap.get(ia.female_id))
            .filter(Boolean) as UnifiedActivity['animales'];

          allActivities.push({
            id: `ia_${key}`,
            tipo: 'IA',
            subtipo: undefined,
            fecha: group[0].insemination_date,
            responsable: group[0].created_by || undefined,
            notas: group[0].notes || undefined,
            animales,
            detalles: {
              bull_name: group[0].bull_name,
              total_animals: group.length
            },
            created_at: group[0].created_at
          });
        }
      }

      // Sort all activities by date (most recent first)
      allActivities.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

      // Cache activities in IndexedDB
      const now = new Date().toISOString();
      const activitiesToCache: CachedActivity[] = allActivities.map(a => ({
        id: a.id,
        cabaña_id: cabañaId,
        tipo: a.tipo,
        subtipo: a.subtipo,
        fecha: a.fecha,
        responsable: a.responsable,
        notas: a.notas,
        animales: JSON.stringify(a.animales),
        detalles: JSON.stringify(a.detalles),
        created_at: a.created_at,
        updated_at: now,
        sync_status: 'synced' as const
      }));

      await db.table('eventos_cache').where('cabaña_id').equals(cabañaId).delete();
      if (activitiesToCache.length > 0) {
        await db.table('eventos_cache').bulkPut(activitiesToCache);
      }

      setActivities(allActivities);
    } catch (error) {
      console.error('Error syncing activities from server:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isOnline]);

  const fetchActivities = useCallback(async () => {
    if (!currentUser?.cabañaId) {
      setActivities([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const cabañaId = currentUser.cabañaId;

      // Always load from cache first (works offline)
      await loadFromCache(cabañaId);
      
      // Only sync from server if online
      if (isOnline) {
        await syncFromServer(cabañaId);
      }
    } catch (error) {
      console.error('Error fetching activities:', error);
      // Don't clear activities — keep cached data
      setIsLoading(false);
    }
  }, [currentUser?.cabañaId, isOnline, loadFromCache, syncFromServer]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    isLoading,
    refresh: fetchActivities
  };
}
