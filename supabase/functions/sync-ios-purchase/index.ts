import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Map RevenueCat product IDs to internal plan codes
const PRODUCT_ID_TO_PLAN: Record<string, string> = {
  // New RevenueCat product IDs
  'Personal_Monthly': 'personal',
  'Personal_Yearly': 'personal',
  'Advanced_Monthly': 'avanzado',
  'Advanced_Yearly': 'avanzado',
  'Producer_Monthly': 'productor',
  'Producer_Yearly': 'productor',
  'Herd_Monthly': 'cabana',
  'Herd_Yearly': 'cabana',
  // Legacy product IDs (kept for backward compatibility)
  'prodc6836489e3': 'personal',
  'prodc8d8f05de3': 'personal',
  'prodc70244af0c': 'avanzado',
  'prod089fc06f3e': 'avanzado',
  'prod994aa82559': 'productor',
  'prod698531dc0f': 'productor',
  'prod303c757d05': 'cabana',
  'prodf140665f04': 'cabana',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { customerInfo } = await req.json();
    console.log('Syncing iOS purchase for user:', user.id);
    console.log('Customer info:', JSON.stringify(customerInfo, null, 2));

    // Extract subscription information
    const activeSubscriptions = customerInfo.activeSubscriptions || [];
    const entitlements = customerInfo.entitlements?.active || {};

    // Determine product code from active subscriptions
    let productCode = 'free';
    let status = 'active';
    
    if (activeSubscriptions.length > 0) {
      const productId = activeSubscriptions[0];
      
      // Direct lookup in our product ID map
      if (PRODUCT_ID_TO_PLAN[productId]) {
        productCode = PRODUCT_ID_TO_PLAN[productId];
      } else {
        // Fallback to string matching for legacy or unknown products
        console.log('Product ID not found in map, using fallback matching:', productId);
        if (productId.includes('personal')) productCode = 'personal';
        else if (productId.includes('avanzado') || productId.includes('advanced')) productCode = 'avanzado';
        else if (productId.includes('productor') || productId.includes('producer')) productCode = 'productor';
        else if (productId.includes('cabana') || productId.includes('herd')) productCode = 'cabana';
        else if (productId.includes('corporativo') || productId.includes('corporate')) productCode = 'corporativo';
      }
      
      console.log('Mapped product ID', productId, 'to product code:', productCode);
    } else {
      status = 'cancelled';
      console.log('No active subscriptions found');
    }

    // Check if customer record exists
    const { data: existingCustomer } = await supabase
      .from('billing_customers')
      .select('id')
      .eq('cabana_id', user.id)
      .single();

    if (!existingCustomer) {
      // Create customer record
      const { error: customerError } = await supabase
        .from('billing_customers')
        .insert({
          cabana_id: user.id,
          last_provider: 'ios',
          appstore_original_transaction_id: customerInfo.originalAppUserId
        });

      if (customerError) {
        console.error('Failed to create customer:', customerError);
        throw customerError;
      }
    } else {
      // Update customer record
      const { error: updateError } = await supabase
        .from('billing_customers')
        .update({
          last_provider: 'ios',
          appstore_original_transaction_id: customerInfo.originalAppUserId
        })
        .eq('cabana_id', user.id);

      if (updateError) {
        console.error('Failed to update customer:', updateError);
      }
    }

    // Check if subscription exists
    const { data: existingSubscription } = await supabase
      .from('billing_subscriptions')
      .select('id')
      .eq('cabana_id', user.id)
      .single();

    const subscriptionData = {
      cabana_id: user.id,
      product_code: productCode,
      provider: 'ios',
      status: status,
      external_id: customerInfo.originalAppUserId,
      updated_at: new Date().toISOString()
    };

    if (!existingSubscription) {
      // Create subscription
      const { error: subError } = await supabase
        .from('billing_subscriptions')
        .insert(subscriptionData);

      if (subError) {
        console.error('Failed to create subscription:', subError);
        throw subError;
      }
      console.log('Subscription created successfully');
    } else {
      // Update subscription
      const { error: updateError } = await supabase
        .from('billing_subscriptions')
        .update(subscriptionData)
        .eq('cabana_id', user.id);

      if (updateError) {
        console.error('Failed to update subscription:', updateError);
        throw updateError;
      }
      console.log('Subscription updated successfully');
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
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});
