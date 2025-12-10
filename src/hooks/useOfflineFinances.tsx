import { useState, useEffect, useCallback } from 'react';
import { db, generateTempId, isTempId } from '@/services/db';
import { enqueue } from '@/services/outbox';
import { trySync } from '@/services/sync';
import { useConnectivity } from '@/services/connectivity';
import type { CachedFinance, CachedAnimalSale, SyncStatus } from '@/services/offlineTypes';

interface UseOfflineFinancesOptions {
  cabañaId: string | null;
}

interface FinanceInput {
  type: 'ingreso' | 'egreso';
  amount: number;
  date: string;
  description?: string;
  category_id?: string;
  buyer_name?: string;
  buyer_document?: string;
  buyer_destination?: string;
}

interface AnimalSaleInput {
  finance_id: string;
  animal_id: string;
  unit_price?: number;
}

export function useOfflineFinances(options: UseOfflineFinancesOptions) {
  const { cabañaId } = options;
  const { isOnline } = useConnectivity();
  const [finances, setFinances] = useState<CachedFinance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load finances from cache
  const loadFinances = useCallback(async () => {
    if (!cabañaId) {
      setFinances([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const cached = await db.finances_cache.where('cabaña_id').equals(cabañaId).toArray();
      // Sort by date descending
      cached.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
      setFinances(cached);
      setError(null);
    } catch (err: any) {
      console.error('Error loading offline finances:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [cabañaId]);

  useEffect(() => {
    loadFinances();
  }, [loadFinances]);

  // Create finance record
  const createFinance = useCallback(async (input: FinanceInput): Promise<string> => {
    if (!cabañaId) throw new Error('No cabaña selected');

    const tempId = generateTempId();
    const now = new Date().toISOString();

    const newFinance: CachedFinance = {
      id: tempId,
      cabaña_id: cabañaId,
      type: input.type,
      amount: input.amount,
      date: input.date,
      description: input.description,
      category_id: input.category_id,
      buyer_name: input.buyer_name,
      buyer_document: input.buyer_document,
      buyer_destination: input.buyer_destination,
      updated_at: now,
      sync_status: 'pending'
    };

    await db.finances_cache.add(newFinance);

    await enqueue({
      type: 'FINANCE_INSERT',
      payload: {
        cabaña_id: cabañaId,
        ...input
      },
      tempIds: { financeId: tempId }
    });

    if (isOnline) {
      trySync().catch(console.error);
    }

    await loadFinances();
    return tempId;
  }, [cabañaId, isOnline, loadFinances]);

  // Create animal sale (income + animal status update)
  const createAnimalSale = useCallback(async (
    financeData: Omit<FinanceInput, 'type'>,
    animalIds: string[],
    unitPrices?: Record<string, number>
  ): Promise<string> => {
    if (!cabañaId) throw new Error('No cabaña selected');

    // Create the finance record
    const financeId = await createFinance({
      ...financeData,
      type: 'ingreso'
    });

    // Create animal sale records and update animal status
    for (const animalId of animalIds) {
      const saleId = generateTempId();
      const now = new Date().toISOString();

      // Create sale record
      const sale: CachedAnimalSale = {
        id: saleId,
        finance_id: financeId,
        animal_id: animalId,
        unit_price: unitPrices?.[animalId],
        sync_status: 'pending'
      };
      await db.animal_sales_cache.add(sale);

      // Update animal status to sold
      const animal = await db.animals_cache.get(animalId);
      if (animal) {
        await db.animals_cache.update(animalId, {
          status: 'vendido',
          updated_at: now,
          sync_status: 'pending'
        });
      }

      // Queue the sale record
      await enqueue({
        type: 'ANIMAL_SALE_INSERT',
        payload: {
          finance_id: financeId,
          animal_id: animalId,
          unit_price: unitPrices?.[animalId]
        },
        tempIds: { saleId, financeId, animalId: isTempId(animalId) ? animalId : undefined }
      });
    }

    if (isOnline) {
      trySync().catch(console.error);
    }

    return financeId;
  }, [cabañaId, createFinance, isOnline]);

  // Update finance record
  const updateFinance = useCallback(async (id: string, changes: Partial<FinanceInput>): Promise<void> => {
    const now = new Date().toISOString();

    await db.finances_cache.update(id, {
      ...changes,
      updated_at: now,
      sync_status: 'pending'
    });

    if (!isTempId(id)) {
      await enqueue({
        type: 'FINANCE_UPDATE',
        payload: { id, ...changes }
      });
    }

    if (isOnline) {
      trySync().catch(console.error);
    }

    await loadFinances();
  }, [isOnline, loadFinances]);

  // Delete finance record
  const deleteFinance = useCallback(async (id: string): Promise<void> => {
    await db.finances_cache.delete(id);

    // Also delete related animal sales
    await db.animal_sales_cache.where('finance_id').equals(id).delete();

    if (!isTempId(id)) {
      await enqueue({
        type: 'FINANCE_DELETE',
        payload: { id }
      });
    }

    if (isOnline) {
      trySync().catch(console.error);
    }

    await loadFinances();
  }, [isOnline, loadFinances]);

  // Get summary stats
  const getSummary = useCallback(async (
    dateFrom?: string,
    dateTo?: string
  ): Promise<{ totalIncome: number; totalExpense: number; balance: number }> => {
    if (!cabañaId) return { totalIncome: 0, totalExpense: 0, balance: 0 };

    let filtered = finances;

    if (dateFrom) {
      filtered = filtered.filter(f => f.date && f.date >= dateFrom);
    }
    if (dateTo) {
      filtered = filtered.filter(f => f.date && f.date <= dateTo);
    }

    const totalIncome = filtered
      .filter(f => f.type === 'ingreso')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    const totalExpense = filtered
      .filter(f => f.type === 'egreso')
      .reduce((sum, f) => sum + (f.amount || 0), 0);

    return {
      totalIncome,
      totalExpense,
      balance: totalIncome - totalExpense
    };
  }, [cabañaId, finances]);

  // Get pending count
  const getPendingCount = useCallback(async (): Promise<number> => {
    if (!cabañaId) return 0;
    return await db.finances_cache
      .where('cabaña_id').equals(cabañaId)
      .filter(f => f.sync_status === 'pending')
      .count();
  }, [cabañaId]);

  return {
    finances,
    isLoading,
    error,
    createFinance,
    createAnimalSale,
    updateFinance,
    deleteFinance,
    getSummary,
    refresh: loadFinances,
    getPendingCount
  };
}
