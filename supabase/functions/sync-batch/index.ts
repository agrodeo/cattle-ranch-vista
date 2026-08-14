import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { authErrorResponse, requireCabanaAccess } from '../_shared/tenant.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SyncEvent {
  id: string;
  type: string;
  payload: any;
  tempIds?: Record<string, string>;
}

interface SyncResult {
  id: string;
  success: boolean;
  error?: string;
  realId?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { 
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    );

    const { events, cabañaId: requestedCabanaId, lastSyncTimestamp } = await req.json();

    // Authorization: the caller may only sync their own ranch's data.
    const caller = await requireCabanaAccess(req, requestedCabanaId);
    const cabañaId = caller.cabanaId as string;

    console.log(`[sync-batch] Processing ${events?.length || 0} events for cabaña ${cabañaId}`);

    const results: SyncResult[] = [];
    const idMap: Array<{ tempId: string; realId: string }> = [];

    // Process each event
    for (const event of (events || [])) {
      try {
        const result = await processEvent(supabase, event, cabañaId);
        results.push(result);
        
        if (result.realId && event.tempIds) {
          const tempIdKey = Object.keys(event.tempIds)[0];
          if (tempIdKey && event.tempIds[tempIdKey]) {
            idMap.push({ tempId: event.tempIds[tempIdKey], realId: result.realId });
          }
        }
      } catch (error: any) {
        console.error(`[sync-batch] Error processing event ${event.id}:`, error);
        results.push({ id: event.id, success: false, error: error.message });
      }
    }

    // Get server changes since last sync (for pull)
    let serverChanges: any = null;
    if (lastSyncTimestamp && cabañaId) {
      serverChanges = await getServerChanges(supabase, cabañaId, lastSyncTimestamp);
    }

    const response = {
      results,
      idMap,
      serverChanges,
      syncTimestamp: new Date().toISOString()
    };

    console.log(`[sync-batch] Completed: ${results.filter(r => r.success).length}/${results.length} successful`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    const authResponse = authErrorResponse(error, corsHeaders);
    if (authResponse) return authResponse;
    console.error('[sync-batch] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

/** Event type -> table mapping. Every table here is scoped by cabaña_id. */
const TABLE_BY_PREFIX: Record<string, string> = {
  ANIMAL: 'animals',
  CORRAL: 'corrales',
  VACCINE: 'animal_vaccines',
  WEIGHT: 'animal_weight_history',
  INSEMINATION: 'artificial_inseminations',
  TACTO: 'reproductive_activities',
  PREGNANCY: 'preñeces',
  FINANCE: 'finances',
  EVENTO: 'eventos',
  DEATH_RECORD: 'defunciones',
  CORRAL_MOVEMENT: 'corral_movements',
};

function resolveEvent(type: string): { table: string; action: string } | null {
  const match = type.match(/^(.*)_(INSERT|UPDATE|DELETE)$/);
  if (!match) return null;
  const table = TABLE_BY_PREFIX[match[1]];
  if (!table) return null;
  return { table, action: match[2] };
}

async function processEvent(supabase: any, event: SyncEvent, cabañaId: string): Promise<SyncResult> {
  const { type, payload, id } = event;

  const resolved = resolveEvent(type);
  if (!resolved) {
    return { id, success: false, error: `Unknown event type: ${type}` };
  }
  const { table, action } = resolved;

  // Never trust a cabaña id coming from the client payload: always stamp the
  // caller's own verified ranch, and scope every mutation to it.
  const processedPayload: Record<string, any> = { ...payload, 'cabaña_id': cabañaId };
  if (type === 'TACTO_INSERT') processedPayload.tipo_actividad = 'tacto';

  if (action === 'INSERT') {
    const { data, error } = await supabase.from(table).insert(processedPayload).select().single();
    if (error) throw new Error(error.message);

    if (type === 'DEATH_RECORD_INSERT') {
      await supabase.from('animals').update({
        status: 'muerto',
        fecha_muerte: processedPayload.fecha_defuncion,
        defuncion_id: data.id,
      }).eq('id', processedPayload.animal_id).eq('cabaña_id', cabañaId);
    }

    if (type === 'CORRAL_MOVEMENT_INSERT') {
      await supabase.from('animals').update({
        corral_id: processedPayload.corral_nuevo_id,
      }).eq('id', processedPayload.animal_id).eq('cabaña_id', cabañaId);
    }

    return { id, success: true, realId: data.id };
  }

  if (!processedPayload.id) {
    return { id, success: false, error: 'Missing record id' };
  }

  if (action === 'UPDATE') {
    const { data, error } = await supabase
      .from(table)
      .update(processedPayload)
      .eq('id', processedPayload.id)
      .eq('cabaña_id', cabañaId)
      .select('id');
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) return { id, success: false, error: 'Record not found' };
    return { id, success: true };
  }

  const { data, error } = await supabase
    .from(table)
    .delete()
    .eq('id', processedPayload.id)
    .eq('cabaña_id', cabañaId)
    .select('id');
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return { id, success: false, error: 'Record not found' };
  return { id, success: true };
}

async function getServerChanges(supabase: any, cabañaId: string, since: string) {
  const timestamp = new Date(since).toISOString();
  
  // Fetch changes from all relevant tables since last sync
  const [
    animals,
    corrales,
    vaccines,
    weights,
    inseminations,
    eventos,
    finances,
    pregnancies
  ] = await Promise.all([
    supabase.from('animals').select('*').eq('cabaña_id', cabañaId).gte('updated_at', timestamp),
    supabase.from('corrales').select('*').eq('cabaña_id', cabañaId).gte('updated_at', timestamp),
    supabase.from('animal_vaccines').select('*').eq('cabaña_id', cabañaId).gte('created_at', timestamp),
    supabase.from('animal_weight_history').select('*').eq('cabaña_id', cabañaId).gte('updated_at', timestamp),
    supabase.from('artificial_inseminations').select('*').eq('cabaña_id', cabañaId).gte('updated_at', timestamp),
    supabase.from('eventos').select('*').eq('cabaña_id', cabañaId).gte('updated_at', timestamp),
    supabase.from('finances').select('*').eq('cabaña_id', cabañaId).gte('date', timestamp),
    supabase.from('preñeces').select('*').eq('cabaña_id', cabañaId).gte('updated_at', timestamp),
  ]);

  return {
    animals: animals.data || [],
    corrales: corrales.data || [],
    vaccines: vaccines.data || [],
    weights: weights.data || [],
    inseminations: inseminations.data || [],
    eventos: eventos.data || [],
    finances: finances.data || [],
    pregnancies: pregnancies.data || []
  };
}
