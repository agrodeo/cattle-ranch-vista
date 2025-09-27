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

    const {
      cabanaId,
      to_corral_id,
      filters = {},
      dryRun = true,
      density_per_hectare = 1.5
    } = await req.json();

    console.log(`Bulk move animals for cabana ${cabanaId}, dryRun: ${dryRun}`);

    // Build query based on filters
    let query = supabaseClient
      .from('animals')
      .select('id, id_tag, name, sex, birth_date, corral_id, status')
      .eq('cabaña_id', cabanaId)
      .not('status', 'in', '("vendido","muerto")'); // Exclude sold/dead animals

    if (filters.sex) {
      query = query.eq('sex', filters.sex);
    }

    if (filters.current_corral_ids?.length > 0) {
      query = query.in('corral_id', filters.current_corral_ids);
    }

    const { data: animals, error: animalsError } = await query;
    if (animalsError) throw animalsError;

    // Filter by age if specified
    let filteredAnimals = animals || [];
    if (filters.age_from || filters.age_to) {
      const currentDate = new Date();
      filteredAnimals = filteredAnimals.filter(animal => {
        if (!animal.birth_date) return false;
        
        const ageMonths = calculateAgeMonths(animal.birth_date, currentDate);
        
        if (filters.age_from && ageMonths < filters.age_from) return false;
        if (filters.age_to && ageMonths > filters.age_to) return false;
        
        return true;
      });
    }

    // Filter by category if specified
    if (filters.category) {
      filteredAnimals = filteredAnimals.filter(animal => {
        if (!animal.birth_date) return false;
        const category = categorizeAnimal(animal.birth_date, animal.sex);
        return category === filters.category;
      });
    }

    // Get target corral info
    const { data: targetCorral, error: corralError } = await supabaseClient
      .from('corrales')
      .select('*')
      .eq('id', to_corral_id)
      .eq('cabaña_id', cabanaId)
      .single();

    if (corralError) throw corralError;

    // Get current animals in target corral
    const { data: currentAnimalsInTarget, error: currentError } = await supabaseClient
      .from('animals')
      .select('id')
      .eq('corral_id', to_corral_id)
      .eq('cabaña_id', cabanaId)
      .not('status', 'in', '("vendido","muerto")');

    if (currentError) throw currentError;

    const currentCount = currentAnimalsInTarget?.length || 0;
    const newCount = currentCount + filteredAnimals.length;
    const capacity = targetCorral.capacity || Math.round((targetCorral.hectareas || 0) * density_per_hectare);
    
    const preview = {
      animals_to_move: filteredAnimals.length,
      animals_found: filteredAnimals.map(a => ({
        id: a.id,
        tag: a.id_tag,
        name: a.name,
        sex: a.sex,
        current_corral: a.corral_id
      })),
      target_corral: {
        id: targetCorral.id,
        name: targetCorral.name,
        current_count: currentCount,
        new_count: newCount,
        capacity: capacity,
        capacity_ok: newCount <= capacity,
        utilization_pct: capacity > 0 ? Math.round((newCount / capacity) * 100) : null
      },
      conflicts: newCount > capacity ? [`El corral excederá la capacidad por ${newCount - capacity} animales`] : []
    };

    if (dryRun) {
      return new Response(JSON.stringify({
        success: true,
        preview,
        message: `Vista previa: ${filteredAnimals.length} animales serían movidos`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Execute the move
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    let movedCount = 0;
    const errors: string[] = [];

    for (const animal of filteredAnimals) {
      try {
        // Create move activity
        const { error: activityError } = await supabaseClient
          .from('activities')
          .insert({
            animal_id: animal.id,
            type: 'MOVE',
            date: new Date().toISOString().split('T')[0],
            user_id: user.id,
            description: `Movimiento masivo a ${targetCorral.name}`
          });

        if (activityError) {
          errors.push(`Error creating activity for ${animal.id_tag}: ${activityError.message}`);
          continue;
        }

        // Update animal corral
        const { error: updateError } = await supabaseClient
          .from('animals')
          .update({ corral_id: to_corral_id })
          .eq('id', animal.id);

        if (updateError) {
          errors.push(`Error updating corral for ${animal.id_tag}: ${updateError.message}`);
          continue;
        }

        movedCount++;
      } catch (error) {
        errors.push(`Error moving ${animal.id_tag}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      preview,
      results: {
        moved_count: movedCount,
        errors
      },
      message: `Movimiento completado: ${movedCount} animales movidos`
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in bulk-move-animals:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateAgeMonths(birthDate: string, currentDate: Date): number {
  const birth = new Date(birthDate);
  const diffTime = currentDate.getTime() - birth.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 30.44);
}

function categorizeAnimal(birthDate: string, sex: string): string {
  const ageMonths = calculateAgeMonths(birthDate, new Date());
  
  if (sex === 'Macho') {
    if (ageMonths < 12) return 'Ternero';
    if (ageMonths < 24) return 'Torete';
    return 'Toro';
  } else if (sex === 'Hembra') {
    if (ageMonths < 12) return 'Ternera';
    if (ageMonths < 24) return 'Vaquillona';
    return 'Vaca';
  }
  
  return 'Desconocido';
}