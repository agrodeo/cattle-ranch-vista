import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, paddle-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('PADDLE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('PADDLE_WEBHOOK_SECRET not configured');
      return new Response('Server misconfigured', { status: 500 });
    }

    // Paddle sends the signature in the Paddle-Signature header
    const signature = req.headers.get('paddle-signature');
    const rawBody = await req.text();

    // Verify webhook signature (ts;h1 format)
    if (signature) {
      const parts = signature.split(';').reduce((acc: Record<string, string>, part) => {
        const [key, value] = part.split('=');
        acc[key] = value;
        return acc;
      }, {});

      const ts = parts['ts'];
      const h1 = parts['h1'];

      if (ts && h1) {
        const encoder = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(webhookSecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const signedPayload = `${ts}:${rawBody}`;
        const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
        const expectedSig = Array.from(new Uint8Array(signatureBytes))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');

        if (expectedSig !== h1) {
          console.error('Webhook signature verification failed');
          return new Response('Invalid signature', { status: 401 });
        }
      }
    }

    const payload = JSON.parse(rawBody);
    console.log('Paddle webhook received:', payload.event_type);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const eventType = payload.event_type;
    const data = payload.data;

    // Extract cabanaId from custom_data
    const cabanaId = data?.custom_data?.cabanaId;

    if (!cabanaId) {
      console.warn('No cabanaId in custom_data, skipping:', eventType);
      return new Response('OK', { status: 200 });
    }

    // Map Paddle subscription status to our internal status
    const mapStatus = (paddleStatus: string): string => {
      switch (paddleStatus) {
        case 'active':
        case 'trialing':
          return 'active';
        case 'past_due':
          return 'past_due';
        case 'paused':
          return 'paused';
        case 'canceled':
        case 'cancelled':
          return 'canceled';
        default:
          return paddleStatus;
      }
    };

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.updated': {
        const subscriptionId = data.id;
        const status = mapStatus(data.status);
        const productId = data.items?.[0]?.price?.product_id || '';
        const priceId = data.items?.[0]?.price?.id || '';

        // Try to resolve product_code from the price or product
        // We store the priceId as external_id for reference
        const currentPeriodStart = data.current_billing_period?.starts_at || new Date().toISOString();
        const currentPeriodEnd = data.current_billing_period?.ends_at || null;

        await supabaseClient
          .from('billing_subscriptions')
          .upsert({
            cabana_id: cabanaId,
            product_code: productId || priceId,
            provider: 'paddle',
            status,
            external_id: subscriptionId,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            currency: data.currency_code || 'USD',
          }, {
            onConflict: 'cabana_id,provider'
          });

        // Upsert billing customer
        await supabaseClient
          .from('billing_customers')
          .upsert({
            cabana_id: cabanaId,
            last_provider: 'paddle',
          }, {
            onConflict: 'cabana_id'
          });

        console.log(`Subscription ${eventType} processed for cabana ${cabanaId}, status: ${status}`);
        break;
      }

      case 'subscription.canceled': {
        await supabaseClient
          .from('billing_subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('cabana_id', cabanaId)
          .eq('provider', 'paddle');

        console.log(`Subscription canceled for cabana ${cabanaId}`);
        break;
      }

      case 'transaction.completed': {
        const transactionId = data.id;
        const amountTotal = data.details?.totals?.total
          ? parseInt(data.details.totals.total, 10)
          : null;

        await supabaseClient
          .from('billing_payments')
          .insert({
            cabana_id: cabanaId,
            provider: 'paddle',
            external_payment_id: transactionId,
            status: 'completed',
            amount_cents: amountTotal,
            currency: data.currency_code || 'USD',
            raw: data,
          });

        console.log(`Transaction ${transactionId} recorded for cabana ${cabanaId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${eventType}`);
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('Paddle webhook error:', error);
    return new Response('Error', { status: 500 });
  }
});
