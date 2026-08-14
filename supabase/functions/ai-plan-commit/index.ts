import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { authErrorResponse, requireCabanaAccess } from "../_shared/tenant.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { cabanaId: requestedCabanaId, plan, options = {} } = await req.json();
    const { createMoves = false } = options; // Solo permitir movimientos, no servicios de IA

    // Authorization: caller must belong to the target ranch
    const caller = await requireCabanaAccess(req, requestedCabanaId);
    const cabanaId = caller.cabanaId as string;
    const user = { id: caller.id };

    console.log(`Committing corral distribution plan for cabana ${cabanaId}`);

    const results = {
      moves_created: 0,
      errors: [] as string[]
    };

    // Solo procesar movimientos de corrales, no crear servicios de IA

    // Create movement activities
    if (createMoves && plan.corral_plan?.length > 0) {
      try {
        // Only corrales owned by the caller's ranch can be targeted
        const { data: ownCorrales } = await supabaseClient
          .from('corrales')
          .select('id')
          .eq('cabaña_id', cabanaId);
        const allowedCorrales = new Set((ownCorrales || []).map((c: any) => c.id));

        for (const corralMove of plan.corral_plan) {
          if (!allowedCorrales.has(corralMove.corral_id)) {
            results.errors.push(`Corral ${corralMove.corral_id} no pertenece a tu cabaña`);
            continue;
          }
          // Create moves for animals moving into this corral
          for (const animalId of corralMove.moves_in || []) {
            const { error: moveError } = await supabaseClient
              .from('activities')
              .insert({
                animal_id: animalId,
                type: 'MOVE',
                date: new Date().toISOString().split('T')[0],
                user_id: user.id,
                'cabaña_id': cabanaId,
                description: `Movido a ${corralMove.corral_id} - Plan IA`
              });

            if (moveError) {
              console.error('Error creating move activity:', moveError);
              results.errors.push(`Error moving animal ${animalId}: ${moveError.message}`);
            } else {
              // Update animal's corral (scoped to the caller's ranch)
              const { error: updateError } = await supabaseClient
                .from('animals')
                .update({ corral_id: corralMove.corral_id })
                .eq('id', animalId)
                .eq('cabaña_id', cabanaId);

              if (updateError) {
                console.error('Error updating animal corral:', updateError);
                results.errors.push(`Error updating corral for animal ${animalId}: ${updateError.message}`);
              } else {
                results.moves_created++;
              }
            }
          }
        }
      } catch (error) {
        console.error('Error creating movements:', error);
        results.errors.push(`Error creating movements: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    const response = {
      success: true,
      results,
      message: `Plan de distribución ejecutado: ${results.moves_created} movimientos de corrales`
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const authResponse = authErrorResponse(error, corsHeaders);
    if (authResponse) return authResponse;
    console.error('Error in ai-plan-commit:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});