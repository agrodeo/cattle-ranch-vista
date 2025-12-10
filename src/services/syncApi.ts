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

export async function postSyncBatch(events: SyncEvent[]): Promise<SyncResponse> {
  const results: SyncResponse['results'] = [];
  const idMap: SyncResponse['idMap'] = [];

  for (const event of events) {
    try {
      let result;
      
      switch (event.type) {
        case 'ANIMAL_INSERT':
          result = await supabase
            .from('animals')
            .insert(event.payload)
            .select()
            .single();
          
          if (result.error) throw new Error(result.error.message);
          
          results.push({ id: event.id, success: true, realId: result.data.id });
          if (event.tempIds?.animalId) {
            idMap.push({ tempId: event.tempIds.animalId, realId: result.data.id });
          }
          break;
          
        case 'ANIMAL_UPDATE':
          result = await supabase
            .from('animals')
            .update(event.payload)
            .eq('id', event.payload.id)
            .select()
            .single();
          
          if (result.error) throw new Error(result.error.message);
          results.push({ id: event.id, success: true });
          break;

        case 'CORRAL_INSERT':
          result = await supabase.from('corrales').insert(event.payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: event.id, success: true, realId: result.data.id });
          if (event.tempIds?.corralId) {
            idMap.push({ tempId: event.tempIds.corralId, realId: result.data.id });
          }
          break;

        case 'CORRAL_UPDATE':
          result = await supabase.from('corrales').update(event.payload).eq('id', event.payload.id);
          if (result.error) throw new Error(result.error.message);
          results.push({ id: event.id, success: true });
          break;

        case 'VACCINE_INSERT':
          result = await supabase.from('animal_vaccines').insert(event.payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: event.id, success: true, realId: result.data.id });
          if (event.tempIds?.vaccineId) {
            idMap.push({ tempId: event.tempIds.vaccineId, realId: result.data.id });
          }
          break;

        case 'WEIGHT_INSERT':
          result = await supabase.from('animal_weight_history').insert(event.payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: event.id, success: true, realId: result.data.id });
          if (event.tempIds?.weightId) {
            idMap.push({ tempId: event.tempIds.weightId, realId: result.data.id });
          }
          break;

        case 'INSEMINATION_INSERT':
          result = await supabase.from('artificial_inseminations').insert(event.payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: event.id, success: true, realId: result.data.id });
          if (event.tempIds?.inseminationId) {
            idMap.push({ tempId: event.tempIds.inseminationId, realId: result.data.id });
          }
          break;

        case 'FINANCE_INSERT':
          result = await supabase.from('finances').insert(event.payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: event.id, success: true, realId: result.data.id });
          if (event.tempIds?.financeId) {
            idMap.push({ tempId: event.tempIds.financeId, realId: result.data.id });
          }
          break;

        case 'EVENTO_INSERT':
          result = await supabase.from('eventos').insert(event.payload).select().single();
          if (result.error) throw new Error(result.error.message);
          results.push({ id: event.id, success: true, realId: result.data.id });
          if (event.tempIds?.eventoId) {
            idMap.push({ tempId: event.tempIds.eventoId, realId: result.data.id });
          }
          break;
          
        default:
          results.push({ id: event.id, success: false, error: `Unsupported event type: ${event.type}` });
      }
    } catch (error: any) {
      results.push({ id: event.id, success: false, error: error.message });
    }
  }

  return { results, idMap };
}
