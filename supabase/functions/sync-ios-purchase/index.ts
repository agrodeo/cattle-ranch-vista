import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PRODUCT_ID_TO_PLAN: Record<string, string> = {
  'Personal_Monthly': 'personal',
  'Personal_Yearly': 'personal',
  'Advanced_Monthly': 'avanzado',
  'Advanced_Yearly': 'avanzado',
  'Producer_Monthly': 'productor',
  'Producer_Yearly': 'productor',
  'Herd_Monthly': 'cabana',
  'Herd_Yearly': 'cabana',
  'prodc6836489e3': 'personal',
  'prodc8d8f05de3': 'personal',
  'prodc70244af0c': 'avanzado',
  'prod089fc06f3e': 'avanzado',
  'prod994aa82559': 'productor',
  'prod698531dc0f': 'productor',
  'prod303c757d05': 'cabana',
  'prodf140665f04': 'cabana',
};

const CustomerInfoSchema = z.object({
  customerInfo: z.object({
    activeSubscriptions: z.array(z.string().max(200)).optional().default([]),
    entitlements: z.object({
      active: z.record(z.any()).optional(),
    }).optional(),
    originalAppUserId: z.string().max(500).optional(),
    latestExpirationDate: z.string().max(100).optional().nullable(),
  }),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization")!;
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const body = await req.json();
    const parsed = CustomerInfoSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: parsed.error.flatten().fieldErrors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { customerInfo } = parsed.data;
    console.log('Syncing iOS purchase for user:', user.id);

    // Look up the user's cabaña_id from profiles (NOT user.id)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('cabaña_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.['cabaña_id']) {
      console.error('Could not find cabaña for user:', user.id, profileError);
      return new Response(
        JSON.stringify({ error: 'User profile or cabaña not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cabanaId = profile['cabaña_id'];
    console.log('Resolved cabaña_id:', cabanaId, 'for user:', user.id);

    const activeSubscriptions = customerInfo.activeSubscriptions || [];

    const resolveProductCode = (rawProductId: string): string => {
      const productId = rawProductId?.trim();
      if (!productId) return 'free';

      const directMatch = PRODUCT_ID_TO_PLAN[productId];
      if (directMatch) return directMatch;

      const normalized = productId.toLowerCase();
      if (normalized.includes('personal')) return 'personal';
      if (normalized.includes('avanzado') || normalized.includes('advanced')) return 'avanzado';
      if (normalized.includes('productor') || normalized.includes('producer')) return 'productor';
      if (normalized.includes('cabana') || normalized.includes('herd')) return 'cabana';
      if (normalized.includes('corporativo') || normalized.includes('corporate')) return 'corporativo';

      return 'free';
    };

    let productCode = 'free';
    let status = 'active';

    if (activeSubscriptions.length > 0) {
      const productId = String(activeSubscriptions[0] ?? '');
      productCode = resolveProductCode(productId);

      if (productCode === 'free') {
        console.warn('Could not map product ID to internal plan code:', productId);
      }

      console.log('Mapped product ID', productId, 'to product code:', productCode);
    } else {
      status = 'cancelled';
      console.log('No active subscriptions found');
    }

    // Upsert billing_customers with the correct cabaña_id
    const { data: existingCustomer } = await supabase
      .from('billing_customers')
      .select('id')
      .eq('cabana_id', cabanaId)
      .single();

    if (!existingCustomer) {
      const { error: customerError } = await supabase
        .from('billing_customers')
        .insert({
          cabana_id: cabanaId,
          last_provider: 'ios',
          appstore_original_transaction_id: customerInfo.originalAppUserId
        });

      if (customerError) {
        console.error('Failed to create customer:', customerError);
        throw customerError;
      }
    } else {
      const { error: updateError } = await supabase
        .from('billing_customers')
        .update({
          last_provider: 'ios',
          appstore_original_transaction_id: customerInfo.originalAppUserId
        })
        .eq('cabana_id', cabanaId);

      if (updateError) {
        console.error('Failed to update customer:', updateError);
      }
    }

    // Upsert billing_subscriptions with the correct cabaña_id
    // Extract expiration date from RevenueCat customerInfo
    const expirationDate = customerInfo.latestExpirationDate || null;
    // Also try entitlements for expiration
    let effectiveExpiration = expirationDate;
    if (!effectiveExpiration && customerInfo.entitlements?.active) {
      const activeEntitlements = Object.values(customerInfo.entitlements.active);
      for (const ent of activeEntitlements) {
        if (ent?.expirationDate) {
          effectiveExpiration = ent.expirationDate;
          break;
        }
      }
    }

    const subscriptionData = {
      cabana_id: cabanaId,
      product_code: productCode,
      provider: 'ios',
      status: status,
      external_id: customerInfo.originalAppUserId,
      current_period_end: effectiveExpiration,
      current_period_start: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error: subError } = await supabase
      .from('billing_subscriptions')
      .upsert(subscriptionData, {
        onConflict: 'cabana_id,provider'
      });

    if (subError) {
      console.error('Failed to upsert subscription:', subError);
      throw subError;
    }
    console.log('Subscription upserted for cabaña:', cabanaId);

    // Also update the `subscriptions` table (used by get_subscription_status RPC)
    // so the plan, limits, and trial state stay in sync.
    // On native platforms Apple/Google manage the free-trial period, so we
    // deactivate the backend-managed trial to avoid doubling it.
    if (status === 'active' && productCode !== 'free') {
      // 1. Update plan + limits via the existing helper function
      const { error: planError } = await supabase.rpc('update_subscription_plan', {
        cabana_uuid: cabanaId,
        new_plan: productCode,
      });
      if (planError) {
        console.error('Failed to update subscription plan:', planError);
      }

      // 2. Deactivate the backend trial — Apple/Google handle their own trials
      const { error: trialError } = await supabase
        .from('subscriptions')
        .update({
          is_trial_active: false,
          is_active: true,
          subscription_start_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('cabaña_id', cabanaId);
      if (trialError) {
        console.error('Failed to deactivate trial:', trialError);
      } else {
        console.log('Backend trial deactivated for native purchase, cabaña:', cabanaId);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        productCode,
        status
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error syncing iOS purchase:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to sync purchase' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});