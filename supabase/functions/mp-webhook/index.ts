import { createClient } from "https://deno.land/x/supabase@1.2.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const webhookSecret = url.searchParams.get('sec')
    
    if (webhookSecret !== Deno.env.get('MP_WEBHOOK_SECRET')) {
      return new Response('Unauthorized', { status: 401 })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    console.log('MP Webhook received:', JSON.stringify(payload, null, 2))

    // Handle preapproval events
    if (payload.type === 'preapproval' && payload.data?.id) {
      const mpAccessToken = Deno.env.get('MP_ACCESS_TOKEN')
      
      // Get preapproval details from MP
      const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${payload.data.id}`, {
        headers: { 'Authorization': `Bearer ${mpAccessToken}` }
      })
      
      if (mpResponse.ok) {
        const preapprovalData = await mpResponse.json()
        const externalRef = preapprovalData.external_reference
        
        if (externalRef && externalRef.includes(':')) {
          const [cabanaId, productCode] = externalRef.split(':')
          
          // Update subscription status
          await supabaseClient
            .from('billing_subscriptions')
            .upsert({
              cabana_id: cabanaId,
              product_code: productCode,
              provider: 'mp',
              status: preapprovalData.status === 'authorized' ? 'active' : 'canceled',
              external_id: payload.data.id,
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            }, {
              onConflict: 'cabana_id,provider'
            })
        }
      }
    }

    return new Response('OK', { status: 200 })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response('Error', { status: 500 })
  }
})