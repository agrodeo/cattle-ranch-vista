import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateLinkRequest {
  cabanaId: string
  productCode: string
  payerEmail?: string
}

interface MercadoPagoPreapprovalResponse {
  id: string
  init_point: string
  sandbox_init_point: string
  status: string
  external_reference: string
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { cabanaId, productCode, payerEmail }: CreateLinkRequest = await req.json()

    if (!cabanaId || !productCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Creating subscription link for cabana ${cabanaId}, product ${productCode}`)

    // Get price info for the product
    const { data: priceData, error: priceError } = await supabaseClient
      .from('billing_prices')
      .select('*')
      .eq('product_code', productCode)
      .eq('provider', 'mp')
      .eq('active', true)
      .single()

    if (priceError || !priceData) {
      console.error('Price lookup error:', priceError)
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
    if (!mpAccessToken) {
      return new Response(
        JSON.stringify({ error: 'MP configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create preapproval subscription in Mercado Pago
    const externalReference = `${cabanaId}:${productCode}`
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || 'https://cattle-ranch-vista.lovable.app'

    const preapprovalPayload = {
      reason: `Suscripción ${priceData.product_code} - agrodeo`,
      external_reference: externalReference,
      payer_email: payerEmail || "",
      back_url: `${appBaseUrl}/billing/success`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: priceData.amount_cents / 100,
        currency_id: "ARS"
      },
      status: "pending"
    }

    console.log('Creating MP preapproval with payload:', JSON.stringify(preapprovalPayload, null, 2))

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preapprovalPayload)
    })

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text()
      console.error('MP API error:', mpResponse.status, errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to create subscription link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const mpData: MercadoPagoPreapprovalResponse = await mpResponse.json()
    console.log('MP preapproval created:', mpData.id)

    // Upsert billing customer
    await supabaseClient
      .from('billing_customers')
      .upsert({
        cabana_id: cabanaId,
        last_provider: 'mp',
        mp_payer_id: null
      }, {
        onConflict: 'cabana_id'
      })

    // Return consistent response with both keys for backward compat
    const url = mpData.init_point || mpData.sandbox_init_point
    return new Response(
      JSON.stringify({ 
        url,
        init_point: url,
        preapproval_id: mpData.id
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
