import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Paddle webhook
 * -----------------------------------------------------------------------------
 * This handler is the ONLY place that grants/revokes subscription access for a
 * cabaña. Trial entitlement is granted exactly once, via `start_trial_for_cabana`
 * which atomically writes the global `trial_consumed_identities` ledger.
 *
 * Events handled:
 *   - subscription.created  → may grant a 14-day trial (only if eligible)
 *   - subscription.updated  → sync paid status / period end
 *   - subscription.canceled → flip to canceled (will become read-only at period end)
 *   - transaction.completed → log payment
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, paddle-signature',
};

const PADDLE_ID_TO_PLAN: Record<string, string> = {
  'pri_01kk2r774yhyxjpnba3ejqs62d': 'personal',
  'pri_01kk2r6pf6btx3wqsn7jvqgzer': 'personal',
  'pri_01kk2qvb715hth3rqsvecej1at': 'avanzado',
  'pri_01kk2r58q4y7jjzjgm78yxwqxt': 'avanzado',
  'pri_01kk2qx43k51pwns7zayrg9z6z': 'productor',
  'pri_01kk2r49eemxkj94an05qgh7g6': 'productor',
  'pri_01kk2qz2g4dkds653mj27fbzqs': 'cabana',
  'pri_01kk2r33w832qdnf1z039w1qkp': 'cabana',
};

const resolveProductCode = (priceId: string, productId: string): string | null => {
  if (PADDLE_ID_TO_PLAN[priceId]) return PADDLE_ID_TO_PLAN[priceId];
  if (PADDLE_ID_TO_PLAN[productId]) return PADDLE_ID_TO_PLAN[productId];
  return null;
};

/** Map Paddle's status to our internal subscription_status values. */
const mapStatus = (paddleStatus: string): 'active' | 'trial' | 'past_due' | 'paused' | 'canceled' => {
  switch (paddleStatus) {
    case 'active':       return 'active';
    case 'trialing':     return 'trial';
    case 'past_due':     return 'past_due';
    case 'paused':       return 'paused';
    case 'canceled':
    case 'cancelled':    return 'canceled';
    default:             return paddleStatus as any;
  }
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const webhookSecret = Deno.env.get('PADDLE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('PADDLE_WEBHOOK_SECRET not configured');
      return new Response('Server misconfigured', { status: 500 });
    }

    // -------- Verify signature --------
    const signature = req.headers.get('paddle-signature');
    const rawBody = await req.text();

    if (signature) {
      const parts = signature.split(';').reduce((acc: Record<string, string>, part) => {
        const [k, v] = part.split('=');
        acc[k] = v;
        return acc;
      }, {});
      const ts = parts['ts'];
      const h1 = parts['h1'];
      if (ts && h1) {
        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
          'raw', enc.encode(webhookSecret),
          { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const sig = await crypto.subtle.sign('HMAC', key, enc.encode(`${ts}:${rawBody}`));
        const expected = Array.from(new Uint8Array(sig))
          .map(b => b.toString(16).padStart(2, '0')).join('');
        if (expected !== h1) {
          console.error('Webhook signature verification failed');
          return new Response('Invalid signature', { status: 401 });
        }
      }
    }

    const payload = JSON.parse(rawBody);
    console.log('Paddle webhook received:', payload.event_type);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const eventType = payload.event_type as string;
    const data = payload.data ?? {};
    const cabanaId: string | undefined = data?.custom_data?.cabanaId;
    if (!cabanaId) {
      console.warn('No cabanaId in custom_data, skipping:', eventType);
      return new Response('OK', { status: 200 });
    }

    const paddleCustomerId: string | null = data?.customer_id ?? null;
    const paddleSubscriptionId: string | null = data?.id ?? null;

    // Pull the customer email from Paddle (best-effort, used for trial-once email
    // ledger). Falls back to nothing — cabana_id alone is still sufficient.
    let customerEmail: string | null = null;
    if (paddleCustomerId) {
      const { data: cust } = await supabase
        .from('billing_customers')
        .select('cabana_id')
        .eq('cabana_id', cabanaId)
        .maybeSingle();
      // We don't store the email in billing_customers — read it from the
      // cabaña owner's profile instead.
      const { data: cab } = await supabase
        .from('cabañas')
        .select('owner_id')
        .eq('id', cabanaId)
        .maybeSingle();
      if (cab?.owner_id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('user_id', cab.owner_id)
          .maybeSingle();
        customerEmail = profile?.email ?? null;
      }
      void cust; // silence unused
    }

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.updated': {
        const status = mapStatus(data.status);
        const productId = data.items?.[0]?.price?.product_id || '';
        const priceId   = data.items?.[0]?.price?.id || '';
        const productCode = resolveProductCode(priceId, productId);
        if (!productCode) {
          console.error('Unable to map Paddle product to internal plan', { productId, priceId, cabanaId });
          return new Response('OK', { status: 200 });
        }

        const periodStart = data.current_billing_period?.starts_at || new Date().toISOString();
        const periodEnd   = data.current_billing_period?.ends_at   || null;
        const managementUrl =
          data.management_urls?.update_payment_method ||
          data.management_urls?.cancel || null;

        // Mirror into billing_* tables (history)
        const { error: subErr } = await supabase
          .from('billing_subscriptions')
          .upsert({
            cabana_id: cabanaId,
            product_code: productCode,
            provider: 'paddle',
            status,
            external_id: paddleSubscriptionId,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            currency: data.currency_code || 'USD',
            management_url: managementUrl,
          }, { onConflict: 'cabana_id,provider' });
        if (subErr) throw subErr;

        await supabase.from('billing_customers').upsert({
          cabana_id: cabanaId,
          last_provider: 'paddle',
        }, { onConflict: 'cabana_id' });

        // ----- Drive the canonical `subscriptions` row -----
        if (status === 'trial') {
          // Atomic, trial-once. Will refuse to grant a second trial.
          const { data: trialEnd, error: trialErr } = await supabase.rpc('start_trial_for_cabana', {
            p_cabana_id: cabanaId,
            p_plan: productCode,
            p_email: customerEmail,
            p_paddle_customer_id: paddleCustomerId,
            p_paddle_subscription_id: paddleSubscriptionId,
            p_trial_days: 14,
          });
          if (trialErr) {
            console.error('start_trial_for_cabana failed:', trialErr);
          } else if (trialEnd) {
            console.log(`Trial granted for cabana ${cabanaId} until ${trialEnd}`);
          } else {
            // Trial already consumed — DO NOT block the new subscription.
            // Paddle will charge at the end of its own trial window and send
            // `subscription.updated` with status=active. Until then we just
            // record the Paddle IDs so the active event can find this cabaña.
            console.log(`Trial REFUSED for cabana ${cabanaId} (already consumed). Waiting for Paddle to send active.`);
            await supabase
              .from('subscriptions')
              .update({
                paddle_customer_id: paddleCustomerId,
                paddle_subscription_id: paddleSubscriptionId,
                updated_at: new Date().toISOString(),
              })
              .eq('cabaña_id', cabanaId);
          }
        } else if (status === 'active') {
          // Flip to paid and update plan tier limits
          await supabase.rpc('update_subscription_plan', {
            cabana_uuid: cabanaId,
            new_plan: productCode,
          });
          await supabase
            .from('subscriptions')
            .update({
              is_trial_active: false,
              is_active: true,
              subscription_status: 'active',
              subscription_start_date: new Date().toISOString(),
              subscription_end_date: periodEnd,
              paddle_customer_id: paddleCustomerId,
              paddle_subscription_id: paddleSubscriptionId,
              updated_at: new Date().toISOString(),
            })
            .eq('cabaña_id', cabanaId);
        } else if (status === 'past_due' || status === 'paused') {
          await supabase
            .from('subscriptions')
            .update({
              subscription_status: status === 'paused' ? 'canceled' : 'past_due',
              updated_at: new Date().toISOString(),
            })
            .eq('cabaña_id', cabanaId);
        }

        console.log(`Subscription ${eventType} processed for cabana ${cabanaId}, status: ${status}, plan: ${productCode}`);
        break;
      }

      case 'subscription.canceled': {
        await supabase
          .from('billing_subscriptions')
          .update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('cabana_id', cabanaId)
          .eq('provider', 'paddle');

        // Move to free plan + canceled status. trial_used STAYS true (irreversible).
        await supabase.rpc('update_subscription_plan', {
          cabana_uuid: cabanaId,
          new_plan: 'free',
        });
        await supabase
          .from('subscriptions')
          .update({
            is_active: false,
            is_trial_active: false,
            subscription_status: 'canceled',
            updated_at: new Date().toISOString(),
          })
          .eq('cabaña_id', cabanaId);

        console.log(`Subscription canceled for cabana ${cabanaId}`);
        break;
      }

      case 'transaction.completed': {
        const txnId = data.id;
        const total = data.details?.totals?.total ? parseInt(data.details.totals.total, 10) : null;
        const { error } = await supabase.from('billing_payments').insert({
          cabana_id: cabanaId,
          provider: 'paddle',
          external_payment_id: txnId,
          status: 'completed',
          amount_cents: total,
          currency: data.currency_code || 'USD',
          raw: data,
        });
        if (error) throw error;
        console.log(`Transaction ${txnId} recorded for cabana ${cabanaId}`);
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
