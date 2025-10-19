import { db, OutboxEvent, IdMap } from './db';
import { postSyncBatch } from './syncApi';

// Generar UUID simple
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export async function enqueue(event: Omit<OutboxEvent,'id'|'createdAt'|'retries'|'status'>) {
  const ev: OutboxEvent = {
    ...event,
    id: generateUUID(),
    createdAt: new Date().toISOString(),
    retries: 0,
    status: 'pending'
  };
  await db.outbox.add(ev);
  return ev.id;
}

const MAX_RETRIES = 3;

export async function flushOutbox() {
  const pending = await db.outbox
    .where('status').equals('pending')
    .filter(event => (event.retries || 0) < MAX_RETRIES)
    .toArray();
  if (!pending.length) return { sent: 0, mapped: 0 };

  const payload = pending.map(p => ({
    id: p.id, 
    type: p.type, 
    payload: p.payload, 
    tempIds: p.tempIds
  }));

  try {
    const resp = await postSyncBatch(payload);
    const map: IdMap[] = resp.idMap || [];
    
    // Guardar mapeos temp→real
    for (const m of map) { 
      await db.id_map.put(m); 
    }

    // Marcar como sincronizado
    for (const p of pending) {
      const result = resp.results.find(r => r.id === p.id);
      if (result?.success) {
        await db.outbox.update(p.id, { status: 'synced' });
      } else {
        const newRetries = p.retries + 1;
        await db.outbox.update(p.id, { 
          status: newRetries >= MAX_RETRIES ? 'failed_permanent' : 'failed', 
          reason: result?.error || 'sync_error',
          retries: newRetries
        });
      }
    }
    
    return { sent: pending.length, mapped: map.length };
  } catch (e: any) {
    // Marcar como fallido
    for (const p of pending) {
      const newRetries = p.retries + 1;
      await db.outbox.update(p.id, { 
        status: newRetries >= MAX_RETRIES ? 'failed_permanent' : 'failed', 
        reason: e?.message || 'sync_error',
        retries: newRetries
      });
    }
    throw e;
  }
}

// Utilidad para reemplazar ids temporales en cache
export async function applyIdMapInCaches() {
  const maps = await db.id_map.toArray();
  if (!maps.length) return;
  
  // Animals
  for (const m of maps) {
    const animal = await db.animals_cache.get(m.tempId);
    if (animal) {
      animal.id = m.realId;
      animal.sync_status = 'synced';
      await db.animals_cache.delete(m.tempId);
      await db.animals_cache.put(animal);
    }
    
    // Activities
    const activities = await db.activities_cache.where('id').equals(m.tempId).toArray();
    for (const activity of activities) {
      activity.id = m.realId;
      activity.sync_status = 'synced';
      await db.activities_cache.delete(m.tempId);
      await db.activities_cache.put(activity);
    }
    
    // Limpiar mapeo usado
    await db.id_map.delete(m.tempId);
  }
}

export async function getOutboxStatus() {
  const pending = await db.outbox.where('status').equals('pending').count();
  const failed = await db.outbox.where('status').equals('failed').count();
  const synced = await db.outbox.where('status').equals('synced').count();
  
  return { pending, failed, synced };
}

export async function retryFailedEvents() {
  const failed = await db.outbox.where('status').equals('failed').toArray();
  
  for (const event of failed) {
    await db.outbox.update(event.id, { 
      status: 'pending',
      retries: event.retries + 1
    });
  }
  
  return failed.length;
}