import { supabase } from "@/integrations/supabase/client";

export interface SyncEvent {
  id: string;
  type: 'ANIMAL_INSERT' | 'ANIMAL_UPDATE' | 'ACTIVITY_INSERT' | 'ACTIVITY_UPDATE';
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

// En producción esto podría apuntar a una Edge Function /functions/v1/sync
// Por ahora implementamos sync directo usando las APIs existentes
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
          
          results.push({
            id: event.id,
            success: true,
            realId: result.data.id
          });
          
          // Mapear tempId → realId si existe
          if (event.tempIds?.animalId) {
            idMap.push({
              tempId: event.tempIds.animalId,
              realId: result.data.id
            });
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
          
          results.push({
            id: event.id,
            success: true
          });
          break;
          
        case 'ACTIVITY_INSERT':
          // Insertar en tabla eventos
          result = await supabase
            .from('eventos')
            .insert({
              cabaña_id: event.payload.cabaña_id,
              tipo: event.payload.type,
              fecha: event.payload.fecha,
              creado_por: event.payload.creado_por || '',
              notas: event.payload.notas
            })
            .select()
            .single();
          
          if (result.error) throw new Error(result.error.message);
          
          results.push({
            id: event.id,
            success: true,
            realId: result.data.id
          });
          
          if (event.tempIds?.activityId) {
            idMap.push({
              tempId: event.tempIds.activityId,
              realId: result.data.id
            });
          }
          break;
          
        default:
          throw new Error(`Unsupported event type: ${event.type}`);
      }
    } catch (error: any) {
      results.push({
        id: event.id,
        success: false,
        error: error.message
      });
    }
  }

  return { results, idMap };
}