import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.4'
import { authErrorResponse, requireCabanaAccess } from '../_shared/tenant.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ActivityPayload {
  tipo_actividad: string
  animales_ids: string[]
  detalles: Record<string, any>
  responsable?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { evento_id } = await req.json()

    console.log('Processing general activity for evento:', evento_id)

    // Get event details
    const { data: evento, error: eventoError } = await supabase
      .from('eventos')
      .select('*, payload')
      .eq('id', evento_id)
      .single()

    if (eventoError) throw eventoError
    if (!evento) throw new Error('Event not found')

    // Authorization: the caller must belong to the ranch that owns this event
    await requireCabanaAccess(req, evento['cabaña_id'])

    const payload = evento.payload as ActivityPayload
    const { tipo_actividad, animales_ids: rawAnimalIds, detalles } = payload

    // Only animals of that same ranch may be mutated
    const { data: ownAnimals } = await supabase
      .from('animals')
      .select('id')
      .eq('cabaña_id', evento['cabaña_id'])
      .in('id', rawAnimalIds || [])
    const animales_ids = (ownAnimals || []).map((a: any) => a.id)

    console.log(`Processing ${tipo_actividad} for ${animales_ids.length} animals`)

    // Process based on activity type
    switch (tipo_actividad) {
      case 'castracion':
        await processCastration(supabase, animales_ids)
        break
      
      case 'destete':
        await processWeaning(supabase, animales_ids, detalles)
        break
      
      case 'traslado':
        await processTransfer(supabase, animales_ids, detalles)
        break
      
      case 'parto':
        await processBirth(supabase, animales_ids, detalles, evento.cabaña_id, evento.fecha)
        break
      
      // Other activities are just recorded, no animal updates needed
      case 'marcacion':
      case 'descorne':
      case 'tratamiento':
      case 'revision':
      case 'apareamiento':
        console.log(`Activity ${tipo_actividad} recorded, no animal updates needed`)
        break
      
      default:
        console.log(`Unknown activity type: ${tipo_actividad}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    const authResponse = authErrorResponse(error, corsHeaders)
    if (authResponse) return authResponse
    console.error('Error processing general activity:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})

async function processCastration(supabase: any, animalIds: string[]) {
  console.log('Processing castration for animals:', animalIds)
  
  for (const animalId of animalIds) {
    // Get animal info
    const { data: animal, error: fetchError } = await supabase
      .from('animals')
      .select('sex, birth_date, is_castrated')
      .eq('id', animalId)
      .single()
    
    if (fetchError) {
      console.error(`Error fetching animal ${animalId}:`, fetchError)
      continue
    }

    // Only process if male and not already castrated
    if (animal.sex === 'Macho' && !animal.is_castrated) {
      console.log(`Castrating male ${animalId} - marking as castrated (novillo)`)
      
      // Update animal - mark as castrated and remove reproductive data
      const { error: updateError } = await supabase
        .from('animals')
        .update({
          is_castrated: true,
          // Remove any breeding indicators
          toro_servicio_id: null,
          fecha_servicio: null,
        })
        .eq('id', animalId)
      
      if (updateError) {
        console.error(`Error updating animal ${animalId}:`, updateError)
      } else {
        console.log(`Successfully castrated animal ${animalId}`)
      }
    } else if (animal.sex !== 'Macho') {
      console.log(`Animal ${animalId} is not male, skipping castration`)
    } else if (animal.is_castrated) {
      console.log(`Animal ${animalId} is already castrated`)
    }
  }
}

async function processWeaning(supabase: any, animalIds: string[], detalles: Record<string, any>) {
  console.log('Processing weaning for animals:', animalIds)
  
  const weaningWeight = detalles.peso_destete ? parseFloat(detalles.peso_destete) : null
  
  for (const animalId of animalIds) {
    const updates: any = {
      fecha_destete: new Date().toISOString().split('T')[0],
    }
    
    if (weaningWeight) {
      updates.peso_destete = weaningWeight
    }
    
    const { error } = await supabase
      .from('animals')
      .update(updates)
      .eq('id', animalId)
    
    if (error) {
      console.error(`Error updating weaning for animal ${animalId}:`, error)
    }
  }
}

async function processTransfer(supabase: any, animalIds: string[], detalles: Record<string, any>) {
  console.log('Processing transfer for animals:', animalIds)
  
  const destinationCorral = detalles.corral_destino
  
  if (!destinationCorral) {
    console.log('No destination corral specified')
    return
  }
  
  for (const animalId of animalIds) {
    const { error } = await supabase
      .from('animals')
      .update({ corral_id: destinationCorral })
      .eq('id', animalId)
    
    if (error) {
      console.error(`Error transferring animal ${animalId}:`, error)
    }
  }
}

async function processBirth(
  supabase: any,
  animalIds: string[],
  detalles: Record<string, any>,
  cabanaId: string,
  fecha: string
) {
  console.log('Processing birth records for mothers:', animalIds)
  
  for (const motherId of animalIds) {
    // Update mother's pregnancy status
    const { error: motherError } = await supabase
      .from('animals')
      .update({
        esta_preñada: false,
        fecha_probable_parto: null,
      })
      .eq('id', motherId)
    
    if (motherError) {
      console.error(`Error updating mother ${motherId}:`, motherError)
      continue
    }
    
    // Find and complete active pregnancy
    const { error: pregnancyError } = await supabase
      .from('preñeces')
      .update({
        estado_final: 'exitosa',
        fecha_parto_real: fecha,
        resultado_parto: detalles.vitalidad || 'vivo',
      })
      .eq('animal_id', motherId)
      .eq('estado_final', 'activa')
    
    if (pregnancyError) {
      console.error(`Error updating pregnancy for mother ${motherId}:`, pregnancyError)
    }
  }
}
