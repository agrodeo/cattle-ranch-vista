import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;

    const { platform, receiptData } = await req.json();
    console.log(`Verifying ${platform} purchase for user ${userData.user.id}`);

    let verificationResult = false;
    let planId = '';

    switch (platform) {
      case 'ios':
        verificationResult = await verifyIOSReceipt(receiptData);
        planId = receiptData.planId;
        break;
      case 'android':
        verificationResult = await verifyAndroidPurchase(receiptData);
        planId = receiptData.planId;
        break;
      case 'web':
        // Web purchases are handled by Mercado Pago webhooks
        throw new Error("Web purchases don't use this endpoint");
    }

    if (verificationResult) {
      // Get user's cabaña
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('cabaña_id')
        .eq('user_id', userData.user.id)
        .single();

      if (profile?.cabaña_id) {
        // Update subscription
        await supabaseClient.rpc('activate_subscription', {
          cabana_uuid: profile.cabaña_id,
          plan_name: planId,
          duration_months: 1
        });

        console.log(`Subscription activated for cabaña ${profile.cabaña_id} with plan ${planId}`);
      }
    }

    return new Response(JSON.stringify({ 
      success: verificationResult,
      message: verificationResult ? 'Purchase verified and subscription activated' : 'Purchase verification failed'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error('Purchase verification error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function verifyIOSReceipt(receiptData: any): Promise<boolean> {
  try {
    // Verify with Apple's servers
    const appleVerifyUrl = Deno.env.get("APPLE_SANDBOX") === "true" 
      ? "https://sandbox.itunes.apple.com/verifyReceipt"
      : "https://buy.itunes.apple.com/verifyReceipt";

    const response = await fetch(appleVerifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'receipt-data': receiptData.receiptData,
        'password': Deno.env.get("APPLE_SHARED_SECRET"),
        'exclude-old-transactions': true
      })
    });

    const result = await response.json();
    console.log('Apple verification result:', result.status);
    
    return result.status === 0 && result.receipt?.in_app?.length > 0;
  } catch (error) {
    console.error('iOS receipt verification failed:', error);
    return false;
  }
}

async function verifyAndroidPurchase(purchaseData: any): Promise<boolean> {
  try {
    // Verify with Google Play API
    const googleApiUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${Deno.env.get("ANDROID_PACKAGE_NAME")}/purchases/subscriptions/${purchaseData.productId}/tokens/${purchaseData.purchaseToken}`;
    
    const response = await fetch(googleApiUrl, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get("GOOGLE_PLAY_ACCESS_TOKEN")}`,
      }
    });

    const result = await response.json();
    console.log('Google Play verification result:', result);
    
    return result.paymentState === 1; // 1 = Purchased
  } catch (error) {
    console.error('Android purchase verification failed:', error);
    return false;
  }
}