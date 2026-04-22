import { supabase } from "@/integrations/supabase/client";
import type { OutboxEventType } from './offlineTypes';

export interface SyncEvent {
  id: string;
  type: OutboxEventType;
  payload: any;
  tempIds?: Record<string, string>;
}

export interface SyncResponse {
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
    realId?: string;
  }>;
  idMap?: Array<{
    tempId: string;
    realId: string;
  }>;
}

// Strip client-only fields and PK before sending to Supabase UPDATE.
// Sending `id` in the SET clause (even with same value) plus stale cache-only
// fields like `sync_status` causes "could not save" errors.
function sanitizeUpdatePayload(payload: any): any {
  if (!payload || typeof payload !== 'object') return payload;
  const { id, sync_status, _local, ...rest } = payload;
  // Remove keys whose value is undefined (Supabase rejects those)
  Object.keys(rest).forEach((k) => {
    if (rest[k] === undefined) delete rest[k];
  });
  return rest;
}

export async function postSyncBatch(events: SyncEvent[]): Promise<SyncResponse> {
  const results: SyncResponse['results'] = [];
  const idMap: SyncResponse['idMap'] = [];

  for (const event of events) {
    try {
      let result;
      const { id: eventId, type, payload, tempIds } = event;

      switch (type) {
        // ── Animals ──────────────────────────────────────
        case 'ANIMAL_INSERT':
          result = await supabase.from('animals').insert(payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true, realId: result.data.id });
          if (tempIds?.animalId) idMap.push({ tempId: tempIds.animalId, realId: result.data.id });
          break;

        case 'ANIMAL_UPDATE':
          result = await supabase.from('animals').update(payload).eq('id', payload.id).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        case 'ANIMAL_DELETE':
          result = await supabase.from('animals').delete().eq('id', payload.id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        // ── Corrales ─────────────────────────────────────
        case 'CORRAL_INSERT':
          result = await supabase.from('corrales').insert(payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true, realId: result.data.id });
          if (tempIds?.corralId) idMap.push({ tempId: tempIds.corralId, realId: result.data.id });
          break;

        case 'CORRAL_UPDATE':
          result = await supabase.from('corrales').update(payload).eq('id', payload.id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        case 'CORRAL_DELETE':
          result = await supabase.from('corrales').delete().eq('id', payload.id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        case 'CORRAL_ASSIGN_ANIMAL':
          result = await supabase.from('animals').update({ corral_id: payload.corral_id }).eq('id', payload.animal_id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        case 'CORRAL_REMOVE_ANIMAL':
          result = await supabase.from('animals').update({ corral_id: null }).eq('id', payload.animal_id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        // ── Vaccinations ─────────────────────────────────
        case 'VACCINE_INSERT':
          result = await supabase.from('animal_vaccines').insert(payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true, realId: result.data.id });
          if (tempIds?.vaccineId) idMap.push({ tempId: tempIds.vaccineId, realId: result.data.id });
          break;

        case 'VACCINE_UPDATE':
          result = await supabase.from('animal_vaccines').update(payload).eq('id', payload.id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        case 'VACCINE_DELETE':
          result = await supabase.from('animal_vaccines').delete().eq('id', payload.id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        // ── Weights ──────────────────────────────────────
        case 'WEIGHT_INSERT':
          result = await supabase.from('animal_weight_history').insert(payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true, realId: result.data.id });
          if (tempIds?.weightId) idMap.push({ tempId: tempIds.weightId, realId: result.data.id });
          break;

        case 'WEIGHT_UPDATE':
          result = await supabase.from('animal_weight_history').update(payload).eq('id', payload.id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        case 'WEIGHT_DELETE':
          result = await supabase.from('animal_weight_history').delete().eq('id', payload.id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        // ── Inseminations ────────────────────────────────
        case 'INSEMINATION_INSERT':
          result = await supabase.from('artificial_inseminations').insert(payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true, realId: result.data.id });
          if (tempIds?.inseminationId) idMap.push({ tempId: tempIds.inseminationId, realId: result.data.id });
          break;

        case 'INSEMINATION_UPDATE':
          result = await supabase.from('artificial_inseminations').update(payload).eq('id', payload.id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        case 'INSEMINATION_DELETE':
          result = await supabase.from('artificial_inseminations').delete().eq('id', payload.id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        // ── Pregnancies ──────────────────────────────────
        case 'PREGNANCY_INSERT':
          result = await supabase.from('preñeces' as any).insert(payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true, realId: result.data.id });
          if (tempIds?.pregnancyId) idMap.push({ tempId: tempIds.pregnancyId, realId: result.data.id });
          break;

        case 'PREGNANCY_UPDATE':
          result = await supabase.from('preñeces' as any).update(payload).eq('id', payload.id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        // ── Finances ─────────────────────────────────────
        case 'FINANCE_INSERT':
          result = await supabase.from('finances').insert(payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true, realId: result.data.id });
          if (tempIds?.financeId) idMap.push({ tempId: tempIds.financeId, realId: result.data.id });
          break;

        case 'FINANCE_UPDATE':
          result = await supabase.from('finances').update(payload).eq('id', payload.id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        case 'FINANCE_DELETE':
          result = await supabase.from('finances').delete().eq('id', payload.id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        // ── Animal Sales ─────────────────────────────────
        case 'ANIMAL_SALE_INSERT':
          result = await supabase.from('finances_animal_sales').insert(payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true, realId: result.data.id });
          if (tempIds?.saleId) idMap.push({ tempId: tempIds.saleId, realId: result.data.id });
          break;

        // ── Deaths ───────────────────────────────────────
        case 'DEATH_RECORD_INSERT':
          result = await supabase.from('defunciones').insert(payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true, realId: result.data.id });
          if (tempIds?.deathId) idMap.push({ tempId: tempIds.deathId, realId: result.data.id });
          break;

        // ── Events ───────────────────────────────────────
        case 'EVENTO_INSERT':
          result = await supabase.from('eventos').insert(payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true, realId: result.data.id });
          if (tempIds?.eventoId) idMap.push({ tempId: tempIds.eventoId, realId: result.data.id });
          break;

        case 'EVENTO_UPDATE':
          result = await supabase.from('eventos').update(payload).eq('id', payload.id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true });
          break;

        // ── Corral Movements ─────────────────────────────
        case 'CORRAL_MOVEMENT_INSERT':
          result = await supabase.from('corral_movements').insert(payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: eventId, success: true, realId: result.data.id });
          if (tempIds?.movementId) idMap.push({ tempId: tempIds.movementId, realId: result.data.id });
          break;

        default:
          results.push({ id: eventId, success: false, error: `Unsupported event type: ${type}` });
      }
    } catch (error: any) {
      results.push({ id: event.id, success: false, error: error.message });
    }
  }

  return { results, idMap };
}
