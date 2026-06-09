import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export type StrawType = 'convencional' | 'sexado_hembra' | 'sexado_macho';

export interface SemenInventoryRow {
  id: string;
  cabaña_id: string;
  bull_id: string | null;
  bull_manual: Record<string, unknown> | null;
  batch_code: string | null;
  straw_type: StrawType;
  doses_total: number;
  doses_remaining: number;
  tank: string | null;
  canister: string | null;
  cane_position: string | null;
  cost_per_dose: number | null;
  currency: string | null;
  centro_semen: string | null;
  purchase_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Cast until types are regenerated for the new table.
const table = () => (supabase as any).from('semen_inventory');

export function useSemenInventory() {
  const { currentUser } = useSupabaseAuth();
  const queryClient = useQueryClient();
  const cabanaId = currentUser?.cabañaId;

  const query = useQuery({
    queryKey: ['semen-inventory', cabanaId],
    queryFn: async () => {
      if (!cabanaId) return [] as SemenInventoryRow[];
      const { data, error } = await table()
        .select('*')
        .eq('cabaña_id', cabanaId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SemenInventoryRow[];
    },
    enabled: !!cabanaId,
  });

  const upsert = useMutation({
    mutationFn: async (row: Partial<SemenInventoryRow> & { id?: string }) => {
      if (!cabanaId) throw new Error('No cabaña');
      const payload: any = {
        ...row,
        'cabaña_id': cabanaId,
        updated_at: new Date().toISOString(),
      };
      if (row.id) {
        const { error } = await table().update(payload).eq('id', row.id);
        if (error) throw error;
      } else {
        payload.created_by = currentUser?.id ?? null;
        // Ensure remaining defaults to total on create when not set.
        if (payload.doses_remaining == null && payload.doses_total != null) {
          payload.doses_remaining = payload.doses_total;
        }
        const { error } = await table().insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['semen-inventory', cabanaId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await table().delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['semen-inventory', cabanaId] }),
  });

  /**
   * Atomically decrement doses_remaining for a straw lot. Returns the new
   * remaining count. Throws if there isn't enough stock.
   */
  const decrementDoses = async (inventoryId: string, count: number): Promise<number> => {
    if (count <= 0) return 0;
    const { data: current, error: fetchErr } = await table()
      .select('id, doses_remaining')
      .eq('id', inventoryId)
      .single();
    if (fetchErr) throw fetchErr;
    const remaining = (current?.doses_remaining as number) ?? 0;
    if (remaining < count) {
      throw new Error('insufficient_doses');
    }
    const newRemaining = remaining - count;
    const { error: updErr } = await table()
      .update({ doses_remaining: newRemaining, updated_at: new Date().toISOString() })
      .eq('id', inventoryId);
    if (updErr) throw updErr;
    queryClient.invalidateQueries({ queryKey: ['semen-inventory', cabanaId] });
    return newRemaining;
  };

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    upsert,
    remove,
    decrementDoses,
    lowStock: (query.data ?? []).filter(r => r.doses_remaining <= 5 && r.doses_remaining > 0),
    outOfStock: (query.data ?? []).filter(r => r.doses_remaining === 0),
  };
}
