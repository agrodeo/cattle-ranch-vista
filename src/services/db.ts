import Dexie, { Table } from 'dexie';

export type SyncStatus = 'pending' | 'failed' | 'failed_permanent' | 'synced';

export interface IdMap { 
  tempId: string; 
  realId: string; 
}

export interface OutboxEvent {
  id: string;            // uuid del evento
  type: 'ANIMAL_INSERT' | 'ANIMAL_UPDATE' | 'ACTIVITY_INSERT' | 'ACTIVITY_UPDATE';
  payload: any;          // datos a enviar al server
  tempIds?: Record<string,string>; // { animalId: 't_xxx', sireId: 't_yyy' }
  createdAt: string;
  retries: number;
  status: SyncStatus;
  reason?: string;       // conflicto, validación, etc.
}

export interface CachedAnimal {
  id: string;            // puede ser tempId (prefijo 't_')
  cabaña_id: string;
  id_tag?: string;
  name?: string;
  sex: 'Macho' | 'Hembra';
  birth_date?: string | null;
  status: 'activo' | 'vendido' | 'muerto';
  breed?: string;
  father_id?: string;
  mother_id?: string;
  updated_at: string;
  sync_status?: SyncStatus;
}

export interface CachedActivity {
  id: string;            // tempId posible
  cabaña_id: string;
  type: string;
  fecha: string;
  animal_ids?: string[];
  responsable?: string;
  notas?: string;
  payload?: any;
  updated_at: string;
  sync_status?: SyncStatus;
}

class AgroDB extends Dexie {
  animals_cache!: Table<CachedAnimal, string>;
  activities_cache!: Table<CachedActivity, string>;
  id_map!: Table<IdMap, string>;
  outbox!: Table<OutboxEvent, string>;

  constructor() {
    super('agrodeo');
    this.version(1).stores({
      animals_cache: 'id, cabaña_id, sync_status',
      activities_cache: 'id, cabaña_id, sync_status',
      id_map: 'tempId, realId',
      outbox: 'id, status, createdAt, type'
    });
  }
}

export const db = new AgroDB();