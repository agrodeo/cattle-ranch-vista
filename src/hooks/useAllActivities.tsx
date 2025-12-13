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

export function useAllActivities() {
  const [activities, setActivities] = useState<UnifiedActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { session } = useSupabaseAuth();
  const isOnline = useConnectivity();

  // Load from IndexedDB cache first
  const loadFromCache = useCallback(async (cabañaId: string) => {
    try {
      const cached = await db.table('eventos_cache')
        .where('cabaña_id')
        .equals(cabañaId)
        .toArray();

      if (cached.length > 0) {
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
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error loading activities from cache:', error);
    }
  }, []);

  // Sync from server and update cache
  const syncFromServer = useCallback(async (cabañaId: string) => {
    if (!isOnline) return;

    try {
      const allActivities: UnifiedActivity[] = [];

      // 1. Fetch eventos with related data
      const { data: eventos, error: eventosError } = await supabase
        .from('eventos')
        .select('*')
        .eq('cabaña_id', cabañaId)
        .order('fecha', { ascending: false })
        .limit(100);

      if (eventosError) {
        console.error('Error fetching eventos:', eventosError);
      }

      if (eventos) {
        for (const evento of eventos) {
          const payload = evento.payload as any;
          let animalIds: string[] = [];
          const detalles: Record<string, any> = {};

          // Handle PESAJE - get animal_ids from pesajes table
          if (evento.tipo === 'PESAJE') {
            const { data: pesajesData } = await supabase
              .from('pesajes')
              .select('mediciones')
              .eq('evento_id', evento.id)
              .single();
            
            if (pesajesData?.mediciones) {
              const mediciones = pesajesData.mediciones as any[];
              animalIds = mediciones.map((m: any) => m.animal_id).filter(Boolean);
              detalles.peso_promedio = (
                mediciones.reduce((sum: number, m: any) => sum + (parseFloat(m.peso_kg) || 0), 0) / 
                mediciones.length
              ).toFixed(1);
            }
          } 
          // Handle TACTO - get animal_ids from tactos table
          else if (evento.tipo === 'TACTO') {
            const { data: tactosData } = await supabase
              .from('tactos')
              .select('resultados')
              .eq('evento_id', evento.id)
              .single();
            
            if (tactosData?.resultados) {
              const resultados = tactosData.resultados as any[];
              animalIds = resultados.map((r: any) => r.animal_id).filter(Boolean);
              const prenadas = resultados.filter((r: any) => r.resultado === 'preñada').length;
              const vacias = resultados.filter((r: any) => r.resultado === 'vacia').length;
              detalles.prenadas = prenadas;
              detalles.vacias = vacias;
            }
          }
          // Other event types - get animal_ids from payload
          else if (payload?.animales_ids) {
            animalIds = payload.animales_ids;
          } else if (payload?.animal_id) {
            animalIds = [payload.animal_id];
          }

          // Fetch animal details
          const animales: UnifiedActivity['animales'] = [];
          if (animalIds.length > 0) {
            const { data: animalsData } = await supabase
              .from('animals')
              .select('id, name, id_tag')
              .in('id', animalIds);

            if (animalsData) {
              animales.push(...animalsData.map(a => ({
                id: a.id,
                name: a.name || undefined,
                id_tag: a.id_tag || 'Sin ID'
              })));
            }
          }

          // Determine activity type and details
          let tipo: UnifiedActivity['tipo'] = 'GENERAL';
          let subtipo: string | undefined;

          if (evento.tipo === 'PESAJE') {
            tipo = 'PESAJE';
          } else if (evento.tipo === 'TACTO') {
            tipo = 'TACTO';
          } else if (evento.tipo === 'PARTO') {
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
            // General management activities
            tipo = 'GENERAL';
            subtipo = evento.tipo;
            Object.assign(detalles, payload || {});
          }

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

      // 2. Fetch vaccinations grouped by date + vaccine
      const { data: vaccines, error: vaccinesError } = await supabase
        .from('animal_vaccines')
        .select('id, animal_id, date, vaccine_code, dose, lot, route, created_by')
        .eq('cabaña_id', cabañaId)
        .order('date', { ascending: false })
        .limit(100);

      if (vaccinesError) {
        console.error('Error fetching vaccines:', vaccinesError);
      }

      if (vaccines) {
        // Group by date + vaccine_code
        const vaccineGroups = new Map<string, typeof vaccines>();
        vaccines.forEach(v => {
          const key = `${v.date}_${v.vaccine_code}`;
          if (!vaccineGroups.has(key)) {
            vaccineGroups.set(key, []);
          }
          vaccineGroups.get(key)!.push(v);
        });

        // Convert groups to activities
        for (const [key, group] of vaccineGroups.entries()) {
          const animalIds = group.map(v => v.animal_id);
          const { data: animalsData } = await supabase
            .from('animals')
            .select('id, name, id_tag')
            .in('id', animalIds);

          const animales: UnifiedActivity['animales'] = animalsData?.map(a => ({
            id: a.id,
            name: a.name || undefined,
            id_tag: a.id_tag || 'Sin ID'
          })) || [];

          // Get vaccine name from requirements
          const { data: reqData } = await supabase
            .from('cabaña_vaccination_requirements')
            .select('vaccine_name')
            .eq('vaccine_code', group[0].vaccine_code)
            .eq('cabaña_id', cabañaId)
            .single();

          allActivities.push({
            id: `vaccine_${key}`,
            tipo: 'VACUNACION',
            subtipo: reqData?.vaccine_name || group[0].vaccine_code,
            fecha: group[0].date,
            responsable: group[0].created_by || undefined,
            notas: undefined,
            animales,
            detalles: {
              vaccine_code: group[0].vaccine_code,
              vaccine_name: reqData?.vaccine_name,
              dose: group[0].dose,
              lot: group[0].lot,
              route: group[0].route,
              total_animals: group.length
            },
            created_at: group[0].date
          });
        }
      }

      // 3. Fetch artificial inseminations grouped by date + bull
      const { data: inseminations, error: iaError } = await supabase
        .from('artificial_inseminations')
        .select('id, female_id, bull_name, insemination_date, notes, created_by, created_at')
        .eq('cabaña_id', cabañaId)
        .order('insemination_date', { ascending: false })
        .limit(100);

      if (iaError) {
        console.error('Error fetching inseminations:', iaError);
      }

      if (inseminations) {
        // Group by date + bull_name
        const iaGroups = new Map<string, typeof inseminations>();
        inseminations.forEach(ia => {
          const key = `${ia.insemination_date}_${ia.bull_name}`;
          if (!iaGroups.has(key)) {
            iaGroups.set(key, []);
          }
          iaGroups.get(key)!.push(ia);
        });

        // Convert groups to activities
        for (const [key, group] of iaGroups.entries()) {
          const animalIds = group.map(ia => ia.female_id);
          const { data: animalsData } = await supabase
            .from('animals')
            .select('id, name, id_tag')
            .in('id', animalIds);

          const animales: UnifiedActivity['animales'] = animalsData?.map(a => ({
            id: a.id,
            name: a.name || undefined,
            id_tag: a.id_tag || 'Sin ID'
          })) || [];

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
      allActivities.sort((a, b) => {
        const dateA = new Date(a.fecha);
        const dateB = new Date(b.fecha);
        return dateB.getTime() - dateA.getTime();
      });

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

      // Clear old cached activities and replace with new ones
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
    if (!session?.user?.id) {
      setActivities([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get user's cabaña
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      const cabañaId = (profile as any)?.cabaña_id;
      
      if (!cabañaId) {
        setActivities([]);
        setIsLoading(false);
        return;
      }

      // Load from cache first for instant display
      await loadFromCache(cabañaId);

      // Then sync from server if online
      await syncFromServer(cabañaId);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
      setIsLoading(false);
    }
  }, [session?.user?.id, loadFromCache, syncFromServer]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  return {
    activities,
    isLoading,
    refresh: fetchActivities
  };
}
