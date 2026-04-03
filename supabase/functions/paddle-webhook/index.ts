import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, paddle-signature',
};

const PADDLE_ID_TO_PLAN: Record<string, string> = {
  // Personal
  'pri_01kk2r774yhyxjpnba3ejqs62d': 'personal',
  'pri_01kk2r6pf6btx3wqsn7jvqgzer': 'personal',
  // Avanzado
  'pri_01kk2qvb715hth3rqsvecej1at': 'avanzado',
  'pri_01kk2r58q4y7jjzjgm78yxwqxt': 'avanzado',
  // Productor
  'pri_01kk2qx43k51pwns7zayrg9z6z': 'productor',
  'pri_01kk2r49eemxkj94an05qgh7g6': 'productor',
  // Cabaña/Herd
  'pri_01kk2qz2g4dkds653mj27fbzqs': 'cabana',
  'pri_01kk2r33w832qdnf1z039w1qkp': 'cabana',
};

const resolveProductCode = (priceId: string, productId: string): string | null => {
  if (PADDLE_ID_TO_PLAN[priceId]) return PADDLE_ID_TO_PLAN[priceId];
  if (PADDLE_ID_TO_PLAN[productId]) return PADDLE_ID_TO_PLAN[productId];
  return null;
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

    const signature = req.headers.get('paddle-signature');
    const rawBody = await req.text();

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
    const cabanaId = data?.custom_data?.cabanaId;

    if (!cabanaId) {
      console.warn('No cabanaId in custom_data, skipping:', eventType);
      return new Response('OK', { status: 200 });
    }

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
        const productCode = resolveProductCode(priceId, productId);

        if (!productCode) {
          console.error('Unable to map Paddle product to internal plan', { productId, priceId, cabanaId });
          return new Response('OK', { status: 200 });
        }

        const currentPeriodStart = data.current_billing_period?.starts_at || new Date().toISOString();
        const currentPeriodEnd = data.current_billing_period?.ends_at || null;
        const managementUrl = data.management_urls?.update_payment_method || data.management_urls?.cancel || null;

        const { error: subscriptionError } = await supabaseClient
          .from('billing_subscriptions')
          .upsert({
            cabana_id: cabanaId,
            product_code: productCode,
            provider: 'paddle',
            status,
            external_id: subscriptionId,
            current_period_start: currentPeriodStart,
            current_period_end: currentPeriodEnd,
            currency: data.currency_code || 'USD',
            management_url: managementUrl,
          }, {
            onConflict: 'cabana_id,provider'
          });

        if (subscriptionError) throw subscriptionError;

        const { error: customerError } = await supabaseClient
          .from('billing_customers')
          .upsert({
            cabana_id: cabanaId,
            last_provider: 'paddle',
          }, {
            onConflict: 'cabana_id'
          });

        if (customerError) throw customerError;

        if (status === 'active') {
          const { error: planError } = await supabaseClient.rpc('update_subscription_plan', {
            cabana_uuid: cabanaId,
            new_plan: productCode,
          });

          if (planError) {
            console.error('Failed to update subscription plan from Paddle webhook:', planError);
          }

          const subscriptionUpdate: Record<string, unknown> = {
            is_trial_active: false,
            is_active: true,
            subscription_start_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          if (currentPeriodEnd) {
            subscriptionUpdate.subscription_end_date = currentPeriodEnd;
          }

          const { error: trialError } = await supabaseClient
            .from('subscriptions')
            .update(subscriptionUpdate)
            .eq('cabaña_id', cabanaId);

          if (trialError) {
            console.error('Failed to sync subscriptions table from Paddle webhook:', trialError);
          }
        }

        console.log(`Subscription ${eventType} processed for cabana ${cabanaId}, status: ${status}, plan: ${productCode}`);
        break;
      }

      case 'subscription.canceled': {
        const { error: cancelError } = await supabaseClient
          .from('billing_subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('cabana_id', cabanaId)
          .eq('provider', 'paddle');

        if (cancelError) throw cancelError;

        await supabaseClient.rpc('update_subscription_plan', {
          cabana_uuid: cabanaId,
          new_plan: 'free',
        });

        await supabaseClient
          .from('subscriptions')
          .update({
            is_active: false,
            is_trial_active: false,
            updated_at: new Date().toISOString(),
          })
          .eq('cabaña_id', cabanaId);

        console.log(`Subscription canceled for cabana ${cabanaId}`);
        break;
      }

      case 'transaction.completed': {
        const transactionId = data.id;
        const amountTotal = data.details?.totals?.total
          ? parseInt(data.details.totals.total, 10)
          : null;

        const { error: paymentError } = await supabaseClient
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

        if (paymentError) throw paymentError;

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
