import { useState, useEffect, useCallback } from 'react';
import { db, generateTempId, isTempId } from '@/services/db';
import { enqueue } from '@/services/outbox';
import { trySync } from '@/services/sync';
import { useConnectivity } from '@/services/connectivity';
import type { OutboxEventType, SyncStatus } from '@/services/offlineTypes';
import type { Table } from 'dexie';

interface UseOfflineDataOptions<T> {
  table: Table<T, string>;
  cabañaId: string | null;
  insertEventType: OutboxEventType;
  updateEventType: OutboxEventType;
  deleteEventType?: OutboxEventType;
  idField?: string;
}

interface UseOfflineDataResult<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
  create: (item: Omit<T, 'id' | 'sync_status' | 'updated_at'>) => Promise<string>;
  update: (id: string, changes: Partial<T>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  getPendingCount: () => Promise<number>;
}

export function useOfflineData<T extends { id: string; cabaña_id: string; sync_status?: SyncStatus; updated_at?: string }>(
  options: UseOfflineDataOptions<T>
): UseOfflineDataResult<T> {
  const { table, cabañaId, insertEventType, updateEventType, deleteEventType, idField = 'id' } = options;
  const { isOnline } = useConnectivity();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load data from local cache
  const loadData = useCallback(async () => {
    if (!cabañaId) {
      setData([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const cached = await table.where('cabaña_id').equals(cabañaId).toArray();
      setData(cached);
      setError(null);
    } catch (err: any) {
      console.error('Error loading offline data:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [table, cabañaId]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Create new item
  const create = useCallback(async (item: Omit<T, 'id' | 'sync_status' | 'updated_at'>): Promise<string> => {
    if (!cabañaId) throw new Error('No cabaña selected');

    const tempId = generateTempId();
    const now = new Date().toISOString();

    const newItem = {
      ...item,
      id: tempId,
      cabaña_id: cabañaId,
      updated_at: now,
      sync_status: 'pending' as SyncStatus
    } as T;

    // Write to local cache immediately
    await table.add(newItem);

    // Queue for sync
    await enqueue({
      type: insertEventType,
      payload: { ...item, cabaña_id: cabañaId },
      tempIds: { [idField]: tempId }
    });

    // Try to sync if online
    if (isOnline) {
      trySync().catch(console.error);
    }

    // Refresh local data
    await loadData();

    return tempId;
  }, [cabañaId, table, insertEventType, idField, isOnline, loadData]);

  // Update existing item
  const update = useCallback(async (id: string, changes: Partial<T>): Promise<void> => {
    const now = new Date().toISOString();

    // Update local cache
    await table.update(id, {
      ...changes,
      updated_at: now,
      sync_status: 'pending'
    } as any);

    // Only queue for sync if it's a real ID (not temp)
    if (!isTempId(id)) {
      await enqueue({
        type: updateEventType,
        payload: { id, ...changes }
      });
    }

    // Try to sync if online
    if (isOnline) {
      trySync().catch(console.error);
    }

    // Refresh local data
    await loadData();
  }, [table, updateEventType, isOnline, loadData]);

  // Delete item
  const remove = useCallback(async (id: string): Promise<void> => {
    // Remove from local cache
    await table.delete(id);

    // Only queue for sync if it's a real ID and we have a delete event type
    if (!isTempId(id) && deleteEventType) {
      await enqueue({
        type: deleteEventType,
        payload: { id }
      });
    }

    // Try to sync if online
    if (isOnline) {
      trySync().catch(console.error);
    }

    // Refresh local data
    await loadData();
  }, [table, deleteEventType, isOnline, loadData]);

  // Get count of pending items
  const getPendingCount = useCallback(async (): Promise<number> => {
    if (!cabañaId) return 0;
    return await table.where('sync_status').equals('pending').count();
  }, [table, cabañaId]);

  return {
    data,
    isLoading,
    error,
    create,
    update,
    remove,
    refresh: loadData,
    getPendingCount
  };
}
