import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4';

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
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { cabanaId, plan, options = {} } = await req.json();
    const { createServices = true, createMoves = true } = options;

    console.log(`Committing breeding plan for cabana ${cabanaId}`);

    // Get user ID from auth
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    const results = {
      services_created: 0,
      moves_created: 0,
      errors: []
    };

    // Create breeding services/AI activities
    if (createServices && plan.pairings?.length > 0) {
      try {
        // Create event first
        const { data: evento, error: eventoError } = await supabaseClient
          .from('eventos')
          .insert({
            cabaña_id: cabanaId,
            tipo: 'IA',
            fecha: new Date().toISOString().split('T')[0],
            creado_por: user.id,
            notas: `Plan IA generado automáticamente - ${plan.season}`
          })
          .select()
          .single();

        if (eventoError) throw eventoError;

        // Group pairings by bull for efficient batch processing
        const bullGroups = new Map<string, string[]>();
        for (const pairing of plan.pairings) {
          if (!bullGroups.has(pairing.bull_id)) {
            bullGroups.set(pairing.bull_id, []);
          }
          bullGroups.get(pairing.bull_id)!.push(pairing.cow_id);
        }

        // Create IA records for each bull group
        for (const [bullId, cowIds] of bullGroups.entries()) {
          const { error: iaError } = await supabaseClient
            .from('ia')
            .insert({
              evento_id: evento.id,
              toro_id: bullId,
              toro_nombre: `Toro ${bullId.slice(0, 8)}`, // Simplified, should get actual name
              animales_ids: cowIds
            });

          if (iaError) {
            console.error('Error creating IA record:', iaError);
            results.errors.push(`Error creating service for bull ${bullId}: ${iaError.message}`);
          } else {
            results.services_created += cowIds.length;
          }
        }
      } catch (error) {
        console.error('Error creating breeding services:', error);
        results.errors.push(`Error creating breeding services: ${error.message}`);
      }
    }

    // Create movement activities
    if (createMoves && plan.corral_plan?.length > 0) {
      try {
        for (const corralMove of plan.corral_plan) {
          // Create moves for animals moving into this corral
          for (const animalId of corralMove.moves_in || []) {
            const { error: moveError } = await supabaseClient
              .from('activities')
              .insert({
                animal_id: animalId,
                type: 'MOVE',
                date: new Date().toISOString().split('T')[0],
                user_id: user.id,
                description: `Movido a ${corralMove.corral_id} - Plan IA`
              });

            if (moveError) {
              console.error('Error creating move activity:', moveError);
              results.errors.push(`Error moving animal ${animalId}: ${moveError.message}`);
            } else {
              // Update animal's corral
              const { error: updateError } = await supabaseClient
                .from('animals')
                .update({ corral_id: corralMove.corral_id })
                .eq('id', animalId);

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
        results.errors.push(`Error creating movements: ${error.message}`);
      }
    }

    const response = {
      success: true,
      results,
      message: `Plan ejecutado: ${results.services_created} servicios, ${results.moves_created} movimientos`
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-plan-commit:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});