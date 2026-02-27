import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://deno.land/x/supabase@1.2.0/mod.ts";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VerifyPurchaseSchema = z.object({
  platform: z.enum(['ios', 'android']),
  receiptData: z.object({
    planId: z.string().min(1).max(100),
    receiptData: z.string().max(100000).optional(),
    productId: z.string().max(200).optional(),
    purchaseToken: z.string().max(1000).optional(),
  }),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.api.getUser(token);
    if (userError || !userData) throw userError;

    const body = await req.json();
    const parsed = VerifyPurchaseSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid input', details: parsed.error.flatten().fieldErrors }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { platform, receiptData } = parsed.data;
    console.log(`Verifying ${platform} purchase for user ${userData.id}`);

    let verificationResult = false;
    const planId = receiptData.planId;

    switch (platform) {
      case 'ios':
        verificationResult = await verifyIOSReceipt(receiptData);
        break;
      case 'android':
        verificationResult = await verifyAndroidPurchase(receiptData);
        break;
    }

    if (verificationResult) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('cabana_id')
        .eq('user_id', userData.id)
        .single();

      if (profile?.cabana_id) {
        await supabaseClient.rpc('activate_subscription', {
          cabana_uuid: profile.cabana_id,
          plan_name: planId,
          duration_months: 1
        });

        console.log(`Subscription activated for cabaña ${profile.cabana_id} with plan ${planId}`);
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
      error: 'Purchase verification failed'
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function verifyIOSReceipt(receiptData: any): Promise<boolean> {
  try {
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
    console.log('Apple verification status:', result.status);
    
    return result.status === 0 && result.receipt?.in_app?.length > 0;
  } catch (error) {
    console.error('iOS receipt verification failed:', error);
    return false;
  }
}

async function verifyAndroidPurchase(purchaseData: any): Promise<boolean> {
  try {
    const googleApiUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${Deno.env.get("ANDROID_PACKAGE_NAME")}/purchases/subscriptions/${purchaseData.productId}/tokens/${purchaseData.purchaseToken}`;
    
    const response = await fetch(googleApiUrl, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get("GOOGLE_PLAY_ACCESS_TOKEN")}`,
      }
    });

    const result = await response.json();
    console.log('Google Play verification completed');
    
    return result.paymentState === 1;
  } catch (error) {
    console.error('Android purchase verification failed:', error);
    return false;
  }
}
