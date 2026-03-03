import Dexie, { Table } from 'dexie';
import type {
  SyncStatus,
  CachedAnimal,
  CachedCorral,
  CachedCabaña,
  CachedEvento,
  CachedVaccine,
  CachedWeight,
  CachedInsemination,
  CachedPregnancy,
  CachedFinance,
  CachedAnimalSale,
  CachedVaccRequirement,
  CachedDeathRecord,
  CachedDeathCause,
  CachedBenchmark,
  CachedCorralMovement,
  CachedUserProfile,
  SyncMetadata,
  OutboxEvent,
  IdMap
} from './offlineTypes';

// Re-export types for backward compatibility
export type { SyncStatus, OutboxEvent, IdMap, CachedUserProfile };

class AgroDB extends Dexie {
  // Core entities
  animals_cache!: Table<CachedAnimal, string>;
  corrales_cache!: Table<CachedCorral, string>;
  cabañas_cache!: Table<CachedCabaña, string>;

  // Activities & Events
  eventos_cache!: Table<CachedEvento, string>;
  vaccines_cache!: Table<CachedVaccine, string>;
  weights_cache!: Table<CachedWeight, string>;
  inseminations_cache!: Table<CachedInsemination, string>;
  pregnancies_cache!: Table<CachedPregnancy, string>;
  corral_movements_cache!: Table<CachedCorralMovement, string>;

  // Finance
  finances_cache!: Table<CachedFinance, string>;
  animal_sales_cache!: Table<CachedAnimalSale, string>;

  // Configuration
  vaccination_requirements_cache!: Table<CachedVaccRequirement, string>;
  death_causes_cache!: Table<CachedDeathCause, string>;
  death_records_cache!: Table<CachedDeathRecord, string>;
  benchmarks_cache!: Table<CachedBenchmark, string>;

  // User profile for offline auth
  user_profile!: Table<CachedUserProfile, string>;

  // Sync infrastructure
  id_map!: Table<IdMap, string>;
  outbox!: Table<OutboxEvent, string>;
  sync_metadata!: Table<SyncMetadata, string>;

  // Auth session persistence
  auth_storage!: Table<{ key: string; value: string }, string>;

  // Reports cache for offline access
  reports_cache!: Table<{ key: string; data: any; updated_at: string }, string>;

  // Legacy compatibility (keep for existing code)
  activities_cache!: Table<any, string>;

  constructor() {
    super('agrodeo');

    this.version(3).stores({
      // Core entities
      animals_cache: 'id, cabaña_id, corral_id, sync_status, status, sex',
      corrales_cache: 'id, cabaña_id, sync_status',
      cabañas_cache: 'id, owner_id',

      // Activities & Events
      eventos_cache: 'id, cabaña_id, tipo, fecha, sync_status',
      vaccines_cache: 'id, cabaña_id, animal_id, vaccine_code, date, sync_status',
      weights_cache: 'id, cabaña_id, animal_id, fecha, sync_status',
      inseminations_cache: 'id, cabaña_id, female_id, insemination_date, sync_status',
      pregnancies_cache: 'id, cabaña_id, animal_id, estado, sync_status',
      corral_movements_cache: 'id, cabaña_id, animal_id, fecha_movimiento, sync_status',

      // Finance
      finances_cache: 'id, cabaña_id, type, date, sync_status',
      animal_sales_cache: 'id, finance_id, animal_id, sync_status',

      // Configuration
      vaccination_requirements_cache: 'id, cabaña_id, vaccine_code, is_active, sync_status',
      death_causes_cache: 'id, cabaña_id, activo, sync_status',
      death_records_cache: 'id, cabaña_id, animal_id, fecha_defuncion, sync_status',
      benchmarks_cache: 'id, cabaña_id, breed, sync_status',

      // User profile for offline auth
      user_profile: 'id, user_id, cabañaId',

      // Sync infrastructure
      id_map: 'tempId, realId',
      outbox: 'id, status, createdAt, type',
      sync_metadata: 'id, table_name, last_sync_at',

      // Legacy compatibility
      activities_cache: 'id, cabaña_id, sync_status'
    }).upgrade(tx => {
      console.log('Upgrading database to v3 with user profile for offline auth');
    });

    this.version(4).stores({
      // Add auth session persistence table
      auth_storage: 'key'
    }).upgrade(tx => {
      console.log('Upgrading database to v4 with auth_storage for persistent sessions');
    });

    this.version(5).stores({
      // Add reports cache table for offline reports
      reports_cache: 'key'
    }).upgrade(tx => {
      console.log('Upgrading database to v5 with reports_cache for offline reports');
    });
  }
}

export const db = new AgroDB();

// Helper to generate temp IDs
export function generateTempId(): string {
  return `t_${generateUUID()}`;
}

export function isTempId(id: string): boolean {
  return id.startsWith('t_');
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Clear all cache data (useful for logout)
export async function clearAllCaches(): Promise<void> {
  await Promise.all([
    db.animals_cache.clear(),
    db.corrales_cache.clear(),
    db.cabañas_cache.clear(),
    db.eventos_cache.clear(),
    db.vaccines_cache.clear(),
    db.weights_cache.clear(),
    db.inseminations_cache.clear(),
    db.pregnancies_cache.clear(),
    db.corral_movements_cache.clear(),
    db.finances_cache.clear(),
    db.animal_sales_cache.clear(),
    db.vaccination_requirements_cache.clear(),
    db.death_causes_cache.clear(),
    db.death_records_cache.clear(),
    db.benchmarks_cache.clear(),
    db.sync_metadata.clear(),
    db.activities_cache.clear()
  ]);
}

// Get last sync time for a table
export async function getLastSyncTime(tableName: string): Promise<string | null> {
  const metadata = await db.sync_metadata.where('table_name').equals(tableName).first();
  return metadata?.last_sync_at || null;
}

// Update last sync time for a table
export async function updateLastSyncTime(tableName: string): Promise<void> {
  const now = new Date().toISOString();
  await db.sync_metadata.put({
    id: tableName,
    table_name: tableName,
    last_sync_at: now
  });
}
