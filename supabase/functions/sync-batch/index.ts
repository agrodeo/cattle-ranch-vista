import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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

    const { events, cabañaId, lastSyncTimestamp } = await req.json();
    
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
    console.error('[sync-batch] Fatal error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

async function processEvent(supabase: any, event: SyncEvent, cabañaId: string): Promise<SyncResult> {
  const { type, payload, id } = event;
  
  // Replace temp IDs in payload with real IDs if needed
  const processedPayload = { ...payload };
  
  switch (type) {
    // Animals
    case 'ANIMAL_INSERT': {
      const { data, error } = await supabase.from('animals').insert(processedPayload).select().single();
      if (error) throw new Error(error.message);
      return { id, success: true, realId: data.id };
    }
    case 'ANIMAL_UPDATE': {
      const { error } = await supabase.from('animals').update(processedPayload).eq('id', processedPayload.id);
      if (error) throw new Error(error.message);
      return { id, success: true };
    }
    case 'ANIMAL_DELETE': {
      const { error } = await supabase.from('animals').delete().eq('id', processedPayload.id);
      if (error) throw new Error(error.message);
      return { id, success: true };
    }

    // Corrales
    case 'CORRAL_INSERT': {
      const { data, error } = await supabase.from('corrales').insert(processedPayload).select().single();
      if (error) throw new Error(error.message);
      return { id, success: true, realId: data.id };
    }
    case 'CORRAL_UPDATE': {
      const { error } = await supabase.from('corrales').update(processedPayload).eq('id', processedPayload.id);
      if (error) throw new Error(error.message);
      return { id, success: true };
    }
    case 'CORRAL_DELETE': {
      const { error } = await supabase.from('corrales').delete().eq('id', processedPayload.id);
      if (error) throw new Error(error.message);
      return { id, success: true };
    }

    // Vaccines
    case 'VACCINE_INSERT': {
      const { data, error } = await supabase.from('animal_vaccines').insert(processedPayload).select().single();
      if (error) throw new Error(error.message);
      return { id, success: true, realId: data.id };
    }
    case 'VACCINE_UPDATE': {
      const { error } = await supabase.from('animal_vaccines').update(processedPayload).eq('id', processedPayload.id);
      if (error) throw new Error(error.message);
      return { id, success: true };
    }
    case 'VACCINE_DELETE': {
      const { error } = await supabase.from('animal_vaccines').delete().eq('id', processedPayload.id);
      if (error) throw new Error(error.message);
      return { id, success: true };
    }

    // Weights
    case 'WEIGHT_INSERT': {
      const { data, error } = await supabase.from('animal_weight_history').insert(processedPayload).select().single();
      if (error) throw new Error(error.message);
      return { id, success: true, realId: data.id };
    }
    case 'WEIGHT_UPDATE': {
      const { error } = await supabase.from('animal_weight_history').update(processedPayload).eq('id', processedPayload.id);
      if (error) throw new Error(error.message);
      return { id, success: true };
    }
    case 'WEIGHT_DELETE': {
      const { error } = await supabase.from('animal_weight_history').delete().eq('id', processedPayload.id);
      if (error) throw new Error(error.message);
      return { id, success: true };
    }

    // Inseminations
    case 'INSEMINATION_INSERT': {
      const { data, error } = await supabase.from('artificial_inseminations').insert(processedPayload).select().single();
      if (error) throw new Error(error.message);
      return { id, success: true, realId: data.id };
    }
    case 'INSEMINATION_UPDATE': {
      const { error } = await supabase.from('artificial_inseminations').update(processedPayload).eq('id', processedPayload.id);
      if (error) throw new Error(error.message);
      return { id, success: true };
    }
    case 'INSEMINATION_DELETE': {
      const { error } = await supabase.from('artificial_inseminations').delete().eq('id', processedPayload.id);
      if (error) throw new Error(error.message);
      return { id, success: true };
    }

    // Tactos
    case 'TACTO_INSERT': {
      const { data, error } = await supabase.from('reproductive_activities').insert({
        ...processedPayload,
        tipo_actividad: 'tacto'
      }).select().single();
      if (error) throw new Error(error.message);
      return { id, success: true, realId: data.id };
    }
    case 'TACTO_UPDATE': {
      const { error } = await supabase.from('reproductive_activities').update(processedPayload).eq('id', processedPayload.id);
      if (error) throw new Error(error.message);
      return { id, success: true };
    }

    // Pregnancies
    case 'PREGNANCY_INSERT': {
      const { data, error } = await supabase.from('preñeces').insert(processedPayload).select().single();
      if (error) throw new Error(error.message);
      return { id, success: true, realId: data.id };
    }
    case 'PREGNANCY_UPDATE': {
      const { error } = await supabase.from('preñeces').update(processedPayload).eq('id', processedPayload.id);
      if (error) throw new Error(error.message);
      return { id, success: true };
    }

    // Finances
    case 'FINANCE_INSERT': {
      const { data, error } = await supabase.from('finances').insert(processedPayload).select().single();
      if (error) throw new Error(error.message);
      return { id, success: true, realId: data.id };
    }
    case 'FINANCE_UPDATE': {
      const { error } = await supabase.from('finances').update(processedPayload).eq('id', processedPayload.id);
      if (error) throw new Error(error.message);
      return { id, success: true };
    }
    case 'FINANCE_DELETE': {
      const { error } = await supabase.from('finances').delete().eq('id', processedPayload.id);
      if (error) throw new Error(error.message);
      return { id, success: true };
    }

    // Events (Eventos)
    case 'EVENTO_INSERT': {
      const { data, error } = await supabase.from('eventos').insert(processedPayload).select().single();
      if (error) throw new Error(error.message);
      return { id, success: true, realId: data.id };
    }
    case 'EVENTO_UPDATE': {
      const { error } = await supabase.from('eventos').update(processedPayload).eq('id', processedPayload.id);
      if (error) throw new Error(error.message);
      return { id, success: true };
    }

    // Deaths
    case 'DEATH_RECORD_INSERT': {
      const { data, error } = await supabase.from('defunciones').insert(processedPayload).select().single();
      if (error) throw new Error(error.message);
      // Also update animal status
      await supabase.from('animals').update({ 
        status: 'muerto',
        fecha_muerte: processedPayload.fecha_defuncion,
        defuncion_id: data.id
      }).eq('id', processedPayload.animal_id);
      return { id, success: true, realId: data.id };
    }

    // Corral movements
    case 'CORRAL_MOVEMENT_INSERT': {
      const { data, error } = await supabase.from('corral_movements').insert(processedPayload).select().single();
      if (error) throw new Error(error.message);
      // Update animal's corral_id
      await supabase.from('animals').update({ 
        corral_id: processedPayload.corral_nuevo_id 
      }).eq('id', processedPayload.animal_id);
      return { id, success: true, realId: data.id };
    }

    default:
      return { id, success: false, error: `Unknown event type: ${type}` };
  }
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
