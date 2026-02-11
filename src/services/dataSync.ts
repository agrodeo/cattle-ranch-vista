import { supabase } from '@/integrations/supabase/client';
import { db, updateLastSyncTime, getLastSyncTime, isTempId } from './db';
import { isOnline } from './connectivity';
import type { CachedAnimal, CachedCorral, CachedEvento, CachedVaccine, CachedWeight, CachedInsemination, CachedPregnancy, CachedFinance, CachedVaccRequirement, CachedDeathCause, CachedBenchmark, CachedCorralMovement } from './offlineTypes';

export interface SyncResult {
  success: boolean;
  tablesSync: string[];
  errors: string[];
  recordsPulled: number;
  recordsPushed: number;
}

// Full sync - downloads ALL data for a cabaña
export async function fullSync(cabañaId: string): Promise<SyncResult> {
  if (!isOnline()) {
    return { success: false, tablesSync: [], errors: ['No internet connection'], recordsPulled: 0, recordsPushed: 0 };
  }

  const result: SyncResult = {
    success: true,
    tablesSync: [],
    errors: [],
    recordsPulled: 0,
    recordsPushed: 0
  };

  try {
    // Sync all tables in parallel
    const syncTasks = [
      syncAnimals(cabañaId),
      syncCorrales(cabañaId),
      syncEventos(cabañaId),
      syncVaccines(cabañaId),
      syncWeights(cabañaId),
      syncInseminations(cabañaId),
      syncPregnancies(cabañaId),
      syncFinances(cabañaId),
      syncVaccinationRequirements(cabañaId),
      syncDeathCauses(cabañaId),
      syncBenchmarks(cabañaId),
      syncCorralMovements(cabañaId)
    ];

    const results = await Promise.allSettled(syncTasks);

    results.forEach((r, i) => {
      const tableNames = ['animals', 'corrales', 'eventos', 'vaccines', 'weights', 'inseminations', 'pregnancies', 'finances', 'vaccination_requirements', 'death_causes', 'benchmarks', 'corral_movements'];
      if (r.status === 'fulfilled') {
        result.tablesSync.push(tableNames[i]);
        result.recordsPulled += r.value;
      } else {
        result.errors.push(`${tableNames[i]}: ${r.reason}`);
        result.success = false;
      }
    });

    console.log('Full sync completed:', result);
    return result;
  } catch (error: any) {
    console.error('Full sync failed:', error);
    return { ...result, success: false, errors: [error.message] };
  }
}

// Incremental sync - only changes since last sync
export async function incrementalSync(cabañaId: string): Promise<SyncResult> {
  if (!isOnline()) {
    return { success: false, tablesSync: [], errors: ['No internet connection'], recordsPulled: 0, recordsPushed: 0 };
  }

  const result: SyncResult = {
    success: true,
    tablesSync: [],
    errors: [],
    recordsPulled: 0,
    recordsPushed: 0
  };

  try {
    const tables = [
      { name: 'animals', sync: () => syncAnimalsIncremental(cabañaId) },
      { name: 'corrales', sync: () => syncCorralesIncremental(cabañaId) },
      { name: 'eventos', sync: () => syncEventosIncremental(cabañaId) },
      { name: 'vaccines', sync: () => syncVaccinesIncremental(cabañaId) },
      { name: 'weights', sync: () => syncWeightsIncremental(cabañaId) },
      { name: 'inseminations', sync: () => syncInseminationsIncremental(cabañaId) },
      { name: 'pregnancies', sync: () => syncPregnanciesIncremental(cabañaId) },
      { name: 'finances', sync: () => syncFinancesIncremental(cabañaId) }
    ];

    for (const table of tables) {
      try {
        const count = await table.sync();
        if (count > 0) {
          result.tablesSync.push(table.name);
          result.recordsPulled += count;
        }
      } catch (error: any) {
        result.errors.push(`${table.name}: ${error.message}`);
      }
    }

    return result;
  } catch (error: any) {
    return { ...result, success: false, errors: [error.message] };
  }
}

// Individual table sync functions
async function syncAnimals(cabañaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('animals')
    .select('*')
    .eq('cabaña_id', cabañaId);

  if (error) throw error;
  if (!data?.length) return 0;

  // Clear existing non-pending animals and insert fresh data
  const pendingIds = (await db.animals_cache.where('sync_status').equals('pending').toArray()).map(a => a.id);
  
  await db.animals_cache.where('cabaña_id').equals(cabañaId).filter(a => !pendingIds.includes(a.id)).delete();
  
  const cached: CachedAnimal[] = data.map(a => ({
    ...a,
    cabaña_id: a.cabaña_id || cabañaId,
    sex: a.sex as 'Macho' | 'Hembra',
    status: (a.status || 'activo') as 'activo' | 'vendido' | 'muerto',
    updated_at: new Date().toISOString(),
    sync_status: 'synced' as const
  }));

  await db.animals_cache.bulkPut(cached);
  await updateLastSyncTime('animals');
  return data.length;
}

async function syncAnimalsIncremental(cabañaId: string): Promise<number> {
  const lastSync = await getLastSyncTime('animals');
  let query = supabase.from('animals').select('*').eq('cabaña_id', cabañaId);
  
  if (lastSync) {
    query = query.gte('updated_at', lastSync);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return 0;

  for (const animal of data) {
    const existing = await db.animals_cache.get(animal.id);
    // Don't overwrite pending local changes
    if (existing?.sync_status === 'pending') continue;

    await db.animals_cache.put({
      ...animal,
      cabaña_id: animal.cabaña_id || cabañaId,
      sex: animal.sex as 'Macho' | 'Hembra',
      status: (animal.status || 'activo') as 'activo' | 'vendido' | 'muerto',
      updated_at: new Date().toISOString(),
      sync_status: 'synced'
    });
  }

  await updateLastSyncTime('animals');
  return data.length;
}

async function syncCorrales(cabañaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('corrales')
    .select('*')
    .eq('cabaña_id', cabañaId);

  if (error) throw error;
  if (!data?.length) return 0;

  const pendingIds = (await db.corrales_cache.where('sync_status').equals('pending').toArray()).map(c => c.id);
  await db.corrales_cache.where('cabaña_id').equals(cabañaId).filter(c => !pendingIds.includes(c.id)).delete();

  const cached: CachedCorral[] = data.map(c => ({
    ...c,
    cabaña_id: c.cabaña_id || cabañaId,
    updated_at: c.updated_at || new Date().toISOString(),
    sync_status: 'synced' as const
  }));

  await db.corrales_cache.bulkPut(cached);
  await updateLastSyncTime('corrales');
  return data.length;
}

async function syncCorralesIncremental(cabañaId: string): Promise<number> {
  const lastSync = await getLastSyncTime('corrales');
  let query = supabase.from('corrales').select('*').eq('cabaña_id', cabañaId);
  
  if (lastSync) {
    query = query.gte('updated_at', lastSync);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return 0;

  for (const corral of data) {
    const existing = await db.corrales_cache.get(corral.id);
    if (existing?.sync_status === 'pending') continue;

    await db.corrales_cache.put({
      ...corral,
      cabaña_id: corral.cabaña_id || cabañaId,
      updated_at: corral.updated_at || new Date().toISOString(),
      sync_status: 'synced'
    });
  }

  await updateLastSyncTime('corrales');
  return data.length;
}

async function syncEventos(cabañaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('eventos')
    .select('*')
    .eq('cabaña_id', cabañaId);

  if (error) throw error;
  if (!data?.length) return 0;

  const pendingIds = (await db.eventos_cache.where('sync_status').equals('pending').toArray()).map(e => e.id);
  await db.eventos_cache.where('cabaña_id').equals(cabañaId).filter(e => !pendingIds.includes(e.id)).delete();

  const cached: CachedEvento[] = data.map(e => ({
    ...e,
    updated_at: e.updated_at || new Date().toISOString(),
    sync_status: 'synced' as const
  }));

  await db.eventos_cache.bulkPut(cached);
  await updateLastSyncTime('eventos');
  return data.length;
}

async function syncEventosIncremental(cabañaId: string): Promise<number> {
  const lastSync = await getLastSyncTime('eventos');
  let query = supabase.from('eventos').select('*').eq('cabaña_id', cabañaId);
  
  if (lastSync) {
    query = query.gte('updated_at', lastSync);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return 0;

  for (const evento of data) {
    const existing = await db.eventos_cache.get(evento.id);
    if (existing?.sync_status === 'pending') continue;

    await db.eventos_cache.put({
      ...evento,
      updated_at: evento.updated_at || new Date().toISOString(),
      sync_status: 'synced'
    });
  }

  await updateLastSyncTime('eventos');
  return data.length;
}

async function syncVaccines(cabañaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('animal_vaccines')
    .select('*')
    .eq('cabaña_id', cabañaId);

  if (error) throw error;
  if (!data?.length) return 0;

  const pendingIds = (await db.vaccines_cache.where('sync_status').equals('pending').toArray()).map(v => v.id);
  await db.vaccines_cache.where('cabaña_id').equals(cabañaId).filter(v => !pendingIds.includes(v.id)).delete();

  const cached: CachedVaccine[] = data.map(v => ({
    ...v,
    updated_at: new Date().toISOString(),
    sync_status: 'synced' as const
  }));

  await db.vaccines_cache.bulkPut(cached);
  await updateLastSyncTime('vaccines');
  return data.length;
}

async function syncVaccinesIncremental(cabañaId: string): Promise<number> {
  const lastSync = await getLastSyncTime('vaccines');
  let query = supabase.from('animal_vaccines').select('*').eq('cabaña_id', cabañaId);
  
  if (lastSync) {
    query = query.gte('created_at', lastSync);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return 0;

  for (const vaccine of data) {
    const existing = await db.vaccines_cache.get(vaccine.id);
    if (existing?.sync_status === 'pending') continue;

    await db.vaccines_cache.put({
      ...vaccine,
      updated_at: new Date().toISOString(),
      sync_status: 'synced'
    });
  }

  await updateLastSyncTime('vaccines');
  return data.length;
}

async function syncWeights(cabañaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('animal_weight_history')
    .select('*')
    .eq('cabaña_id', cabañaId);

  if (error) throw error;
  if (!data?.length) return 0;

  const pendingIds = (await db.weights_cache.where('sync_status').equals('pending').toArray()).map(w => w.id);
  await db.weights_cache.where('cabaña_id').equals(cabañaId).filter(w => !pendingIds.includes(w.id)).delete();

  const cached: CachedWeight[] = data.map(w => ({
    ...w,
    updated_at: w.updated_at || new Date().toISOString(),
    sync_status: 'synced' as const
  }));

  await db.weights_cache.bulkPut(cached);
  await updateLastSyncTime('weights');
  return data.length;
}

async function syncWeightsIncremental(cabañaId: string): Promise<number> {
  const lastSync = await getLastSyncTime('weights');
  let query = supabase.from('animal_weight_history').select('*').eq('cabaña_id', cabañaId);
  
  if (lastSync) {
    query = query.gte('updated_at', lastSync);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return 0;

  for (const weight of data) {
    const existing = await db.weights_cache.get(weight.id);
    if (existing?.sync_status === 'pending') continue;

    await db.weights_cache.put({
      ...weight,
      updated_at: weight.updated_at || new Date().toISOString(),
      sync_status: 'synced'
    });
  }

  await updateLastSyncTime('weights');
  return data.length;
}

async function syncInseminations(cabañaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('artificial_inseminations')
    .select('*')
    .eq('cabaña_id', cabañaId);

  if (error) throw error;
  if (!data?.length) return 0;

  const pendingIds = (await db.inseminations_cache.where('sync_status').equals('pending').toArray()).map(i => i.id);
  await db.inseminations_cache.where('cabaña_id').equals(cabañaId).filter(i => !pendingIds.includes(i.id)).delete();

  const cached: CachedInsemination[] = data.map(i => ({
    ...i,
    updated_at: i.updated_at || new Date().toISOString(),
    sync_status: 'synced' as const
  }));

  await db.inseminations_cache.bulkPut(cached);
  await updateLastSyncTime('inseminations');
  return data.length;
}

async function syncInseminationsIncremental(cabañaId: string): Promise<number> {
  const lastSync = await getLastSyncTime('inseminations');
  let query = supabase.from('artificial_inseminations').select('*').eq('cabaña_id', cabañaId);
  
  if (lastSync) {
    query = query.gte('updated_at', lastSync);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return 0;

  for (const insemination of data) {
    const existing = await db.inseminations_cache.get(insemination.id);
    if (existing?.sync_status === 'pending') continue;

    await db.inseminations_cache.put({
      ...insemination,
      updated_at: insemination.updated_at || new Date().toISOString(),
      sync_status: 'synced'
    });
  }

  await updateLastSyncTime('inseminations');
  return data.length;
}

async function syncPregnancies(cabañaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('preñeces')
    .select('*')
    .eq('cabaña_id', cabañaId);

  if (error) throw error;
  if (!data?.length) return 0;

  const pendingIds = (await db.pregnancies_cache.where('sync_status').equals('pending').toArray()).map(p => p.id);
  await db.pregnancies_cache.where('cabaña_id').equals(cabañaId).filter(p => !pendingIds.includes(p.id)).delete();

  const cached: CachedPregnancy[] = data.map(p => ({
    ...p,
    updated_at: p.updated_at || new Date().toISOString(),
    sync_status: 'synced' as const
  }));

  await db.pregnancies_cache.bulkPut(cached);
  await updateLastSyncTime('pregnancies');
  return data.length;
}

async function syncPregnanciesIncremental(cabañaId: string): Promise<number> {
  const lastSync = await getLastSyncTime('pregnancies');
  let query = supabase.from('preñeces').select('*').eq('cabaña_id', cabañaId);
  
  if (lastSync) {
    query = query.gte('updated_at', lastSync);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return 0;

  for (const pregnancy of data) {
    const existing = await db.pregnancies_cache.get(pregnancy.id);
    if (existing?.sync_status === 'pending') continue;

    await db.pregnancies_cache.put({
      ...pregnancy,
      updated_at: pregnancy.updated_at || new Date().toISOString(),
      sync_status: 'synced'
    });
  }

  await updateLastSyncTime('pregnancies');
  return data.length;
}

async function syncFinances(cabañaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('finances')
    .select('*')
    .eq('cabaña_id', cabañaId);

  if (error) throw error;
  if (!data?.length) return 0;

  const pendingIds = (await db.finances_cache.where('sync_status').equals('pending').toArray()).map(f => f.id);
  await db.finances_cache.where('cabaña_id').equals(cabañaId).filter(f => !pendingIds.includes(f.id)).delete();

  const cached: CachedFinance[] = data.map(f => ({
    ...f,
    cabaña_id: f.cabaña_id || cabañaId,
    updated_at: new Date().toISOString(),
    sync_status: 'synced' as const
  }));

  await db.finances_cache.bulkPut(cached);
  await updateLastSyncTime('finances');
  return data.length;
}

async function syncFinancesIncremental(cabañaId: string): Promise<number> {
  const lastSync = await getLastSyncTime('finances');
  let query = supabase.from('finances').select('*').eq('cabaña_id', cabañaId);
  
  if (lastSync) {
    query = query.gte('updated_at', lastSync);
  }

  const { data, error } = await query;
  if (error) throw error;
  if (!data?.length) return 0;

  for (const finance of data) {
    const existing = await db.finances_cache.get(finance.id);
    if (existing?.sync_status === 'pending') continue;

    await db.finances_cache.put({
      ...finance,
      cabaña_id: finance.cabaña_id || cabañaId,
      updated_at: new Date().toISOString(),
      sync_status: 'synced'
    });
  }

  await updateLastSyncTime('finances');
  return data.length;
}

async function syncVaccinationRequirements(cabañaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('cabaña_vaccination_requirements')
    .select('*')
    .eq('cabaña_id', cabañaId);

  if (error) throw error;
  if (!data?.length) return 0;

  await db.vaccination_requirements_cache.where('cabaña_id').equals(cabañaId).delete();

  const cached: CachedVaccRequirement[] = data.map(v => ({
    ...v,
    updated_at: v.updated_at || new Date().toISOString(),
    sync_status: 'synced' as const
  }));

  await db.vaccination_requirements_cache.bulkPut(cached);
  await updateLastSyncTime('vaccination_requirements');
  return data.length;
}

async function syncDeathCauses(cabañaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('catalogo_causas')
    .select('*')
    .eq('cabaña_id', cabañaId);

  if (error) throw error;
  if (!data?.length) return 0;

  await db.death_causes_cache.where('cabaña_id').equals(cabañaId).delete();

  const cached: CachedDeathCause[] = data.map(c => ({
    ...c,
    updated_at: c.updated_at || new Date().toISOString(),
    sync_status: 'synced' as const
  }));

  await db.death_causes_cache.bulkPut(cached);
  await updateLastSyncTime('death_causes');
  return data.length;
}

async function syncBenchmarks(cabañaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('custom_benchmarks')
    .select('*')
    .eq('cabaña_id', cabañaId);

  if (error) throw error;
  if (!data?.length) return 0;

  await db.benchmarks_cache.where('cabaña_id').equals(cabañaId).delete();

  const cached: CachedBenchmark[] = data.map(b => ({
    ...b,
    updated_at: b.updated_at || new Date().toISOString(),
    sync_status: 'synced' as const
  }));

  await db.benchmarks_cache.bulkPut(cached);
  await updateLastSyncTime('benchmarks');
  return data.length;
}

async function syncCorralMovements(cabañaId: string): Promise<number> {
  const { data, error } = await supabase
    .from('corral_movements')
    .select('*')
    .eq('cabaña_id', cabañaId);

  if (error) throw error;
  if (!data?.length) return 0;

  await db.corral_movements_cache.where('cabaña_id').equals(cabañaId).delete();

  const cached: CachedCorralMovement[] = data.map(m => ({
    ...m,
    updated_at: m.created_at || new Date().toISOString(),
    sync_status: 'synced' as const
  }));

  await db.corral_movements_cache.bulkPut(cached);
  await updateLastSyncTime('corral_movements');
  return data.length;
}
