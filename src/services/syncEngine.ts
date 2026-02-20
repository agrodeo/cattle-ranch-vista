/**
 * Enhanced Sync Engine
 * 
 * Features:
 * - Sync lock to prevent double sync
 * - Exponential backoff retry
 * - Per-item failure handling
 * - Conflict resolution (last-write-wins)
 * - Persistent outbox with status tracking
 */

import { db, OutboxEvent } from './db';
import { postSyncBatch } from './syncApi';
import { isOnline } from './connectivity';
import { toast } from 'sonner';
import i18n from '@/i18n';

// Configuration
const MAX_RETRIES = 5;
const BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 60000;
const BATCH_SIZE = 50;

// Sync lock
let isSyncing = false;
let syncPromise: Promise<SyncResult> | null = null;

export interface SyncResult {
  success: boolean;
  sent: number;
  failed: number;
  mapped: number;
  errors: Array<{ id: string; error: string }>;
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(retryCount: number): number {
  const delay = Math.min(BASE_DELAY_MS * Math.pow(2, retryCount), MAX_DELAY_MS);
  // Add jitter to prevent thundering herd
  return delay + Math.random() * 1000;
}

/**
 * Sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate UUID
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Enqueue an event to the outbox
 */
export async function enqueue(
  event: Omit<OutboxEvent, 'id' | 'createdAt' | 'retries' | 'status'>
): Promise<string> {
  const ev: OutboxEvent = {
    ...event,
    id: generateUUID(),
    createdAt: new Date().toISOString(),
    retries: 0,
    status: 'pending'
  };
  await db.outbox.add(ev);
  console.log('[SyncEngine] Enqueued:', ev.type, ev.id);
  return ev.id;
}

/**
 * Get outbox status counts
 */
export async function getOutboxStatus(): Promise<{
  pending: number;
  failed: number;
  synced: number;
  failedPermanent: number;
}> {
  const pending = await db.outbox.where('status').equals('pending').count();
  const failed = await db.outbox.where('status').equals('failed').count();
  const synced = await db.outbox.where('status').equals('synced').count();
  const failedPermanent = await db.outbox.where('status').equals('failed_permanent').count();
  
  return { pending, failed, synced, failedPermanent };
}

/**
 * Main sync function with locking
 */
export async function syncOutbox(): Promise<SyncResult> {
  // If already syncing, return the existing promise
  if (isSyncing && syncPromise) {
    console.log('[SyncEngine] Sync already in progress, waiting...');
    return syncPromise;
  }
  
  // Check connectivity
  if (!isOnline()) {
    console.log('[SyncEngine] Offline, skipping sync');
    return { success: false, sent: 0, failed: 0, mapped: 0, errors: [] };
  }
  
  // Acquire lock
  isSyncing = true;
  
  syncPromise = (async () => {
    const result: SyncResult = {
      success: true,
      sent: 0,
      failed: 0,
      mapped: 0,
      errors: []
    };
    
    try {
      // Get pending events, sorted by creation time
      const pending = await db.outbox
        .where('status')
        .anyOf(['pending', 'failed'])
        .filter(event => (event.retries || 0) < MAX_RETRIES)
        .sortBy('createdAt');
      
      if (!pending.length) {
        console.log('[SyncEngine] No pending events');
        return result;
      }
      
      console.log(`[SyncEngine] Processing ${pending.length} events`);
      
      // Process in batches
      for (let i = 0; i < pending.length; i += BATCH_SIZE) {
        const batch = pending.slice(i, i + BATCH_SIZE);
        await processBatch(batch, result);
      }
      
      // Apply ID mappings to caches
      await applyIdMappings();
      
      // Clean up old synced events (keep last 100)
      await cleanupSyncedEvents();
      
      result.success = result.failed === 0;
      
    } catch (error: any) {
      console.error('[SyncEngine] Sync error:', error);
      result.success = false;
      result.errors.push({ id: 'batch', error: error.message });
    } finally {
      // Release lock
      isSyncing = false;
      syncPromise = null;
    }
    
    return result;
  })();
  
  return syncPromise;
}

/**
 * Process a batch of events
 */
async function processBatch(
  batch: OutboxEvent[],
  result: SyncResult
): Promise<void> {
  const payload = batch.map(p => ({
    id: p.id,
    type: p.type,
    payload: p.payload,
    tempIds: p.tempIds
  }));
  
  try {
    const resp = await postSyncBatch(payload);
    
    // Store ID mappings
    for (const m of (resp.idMap || [])) {
      await db.id_map.put(m);
      result.mapped++;
    }
    
    // Update event statuses based on results
    for (const event of batch) {
      const eventResult = resp.results.find(r => r.id === event.id);
      
      if (eventResult?.success) {
        await db.outbox.update(event.id, { status: 'synced' });
        result.sent++;
      } else {
        await handleEventFailure(event, eventResult?.error || 'Unknown error', result);
      }
    }
    
  } catch (error: any) {
    // Network/batch error - mark all as failed with retry
    for (const event of batch) {
      await handleEventFailure(event, error.message, result);
    }
    
    // Wait before retrying
    const delay = getBackoffDelay(batch[0]?.retries || 0);
    console.log(`[SyncEngine] Batch failed, waiting ${delay}ms before retry`);
    await sleep(delay);
  }
}

/**
 * Handle individual event failure
 */
async function handleEventFailure(
  event: OutboxEvent,
  error: string,
  result: SyncResult
): Promise<void> {
  const newRetries = (event.retries || 0) + 1;
  const isPermanent = newRetries >= MAX_RETRIES;
  
  await db.outbox.update(event.id, {
    status: isPermanent ? 'failed_permanent' : 'failed',
    reason: error,
    retries: newRetries
  });
  
  result.failed++;
  result.errors.push({ id: event.id, error });
  
  if (isPermanent) {
    console.error(`[SyncEngine] Event ${event.id} failed permanently:`, error);
  }
}

/**
 * Apply ID mappings to local caches
 * Implements last-write-wins conflict resolution
 */
export async function applyIdMappings(): Promise<void> {
  const maps = await db.id_map.toArray();
  if (!maps.length) return;
  
  for (const m of maps) {
    // Update animals cache
    const animal = await db.animals_cache.get(m.tempId);
    if (animal) {
      animal.id = m.realId;
      animal.sync_status = 'synced';
      animal.updated_at = new Date().toISOString(); // Conflict resolution timestamp
      await db.animals_cache.delete(m.tempId);
      await db.animals_cache.put(animal);
    }
    
    // Update corrales cache
    const corral = await db.corrales_cache.get(m.tempId);
    if (corral) {
      corral.id = m.realId;
      corral.sync_status = 'synced';
      corral.updated_at = new Date().toISOString();
      await db.corrales_cache.delete(m.tempId);
      await db.corrales_cache.put(corral);
    }
    
    // Update finances cache
    const finance = await db.finances_cache.get(m.tempId);
    if (finance) {
      finance.id = m.realId;
      finance.sync_status = 'synced';
      finance.updated_at = new Date().toISOString();
      await db.finances_cache.delete(m.tempId);
      await db.finances_cache.put(finance);
    }
    
    // Update eventos cache
    const evento = await db.eventos_cache.get(m.tempId);
    if (evento) {
      evento.id = m.realId;
      evento.sync_status = 'synced';
      evento.updated_at = new Date().toISOString();
      await db.eventos_cache.delete(m.tempId);
      await db.eventos_cache.put(evento);
    }
    
    // Update references in other records (parent_id, corral_id, etc.)
    await updateReferences(m.tempId, m.realId);
    
    // Clean up mapping
    await db.id_map.delete(m.tempId);
  }
  
  console.log(`[SyncEngine] Applied ${maps.length} ID mappings`);
}

/**
 * Update references in related records
 */
async function updateReferences(tempId: string, realId: string): Promise<void> {
  // Update corral_id references in animals
  const animalsWithCorral = await db.animals_cache
    .where('corral_id')
    .equals(tempId)
    .toArray();
  
  for (const animal of animalsWithCorral) {
    await db.animals_cache.update(animal.id, { corral_id: realId });
  }
  
  // Update animal_id references in finances
  const animalsInSales = await db.animal_sales_cache
    .where('animal_id')
    .equals(tempId)
    .toArray();
  
  for (const sale of animalsInSales) {
    await db.animal_sales_cache.update(sale.id, { animal_id: realId });
  }
}

/**
 * Clean up old synced events to prevent unbounded growth
 */
async function cleanupSyncedEvents(): Promise<void> {
  const synced = await db.outbox
    .where('status')
    .equals('synced')
    .sortBy('createdAt');
  
  // Keep only last 100 synced events
  if (synced.length > 100) {
    const toDelete = synced.slice(0, synced.length - 100);
    for (const event of toDelete) {
      await db.outbox.delete(event.id);
    }
    console.log(`[SyncEngine] Cleaned up ${toDelete.length} old synced events`);
  }
}

/**
 * Retry all failed events
 */
export async function retryFailedEvents(): Promise<number> {
  const failed = await db.outbox
    .where('status')
    .equals('failed')
    .filter(e => (e.retries || 0) < MAX_RETRIES)
    .toArray();
  
  for (const event of failed) {
    await db.outbox.update(event.id, { status: 'pending' });
  }
  
  console.log(`[SyncEngine] Reset ${failed.length} failed events for retry`);
  return failed.length;
}

/**
 * Manual sync trigger with UI feedback
 */
export async function manualSync(): Promise<SyncResult> {
  if (!isOnline()) {
    toast.error(i18n.t('common:toast.noConnection'));
    return { success: false, sent: 0, failed: 0, mapped: 0, errors: [] };
  }
  
  const status = await getOutboxStatus();
  const pendingCount = status.pending + status.failed;
  
  if (pendingCount > 0) {
    toast.loading(i18n.t('common:toast.syncingChanges', { count: pendingCount }), { id: 'manual-sync' });
  }
  
  const result = await syncOutbox();
  
  if (result.success) {
    toast.success(i18n.t('common:toast.syncedChanges', { count: result.sent }), { id: 'manual-sync' });
  } else if (result.failed > 0) {
    toast.error(i18n.t('common:toast.syncFailedCount', { count: result.failed }), { id: 'manual-sync' });
  } else {
    toast.success(i18n.t('common:toast.allSynced'), { id: 'manual-sync' });
  }
  
  return result;
}

/**
 * Check if sync is currently in progress
 */
export function isSyncInProgress(): boolean {
  return isSyncing;
}
