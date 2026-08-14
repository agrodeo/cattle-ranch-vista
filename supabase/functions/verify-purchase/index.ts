import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";
import { authErrorResponse, getAuthenticatedUser } from "../_shared/tenant.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const VerifyPurchaseSchema = z.object({
  platform: z.enum(['ios', 'android']),
  receiptData: z.object({
    receiptData: z.string().max(100000).optional(),
    productId: z.string().max(200).optional(),
    purchaseToken: z.string().max(1000).optional(),
  }),
});

/**
 * Store product id -> internal plan. The plan is ALWAYS derived from the
 * product id confirmed by the store, never from a client-supplied plan name.
 */
const PRODUCT_TO_PLAN: Record<string, { plan: string; months: number }> = {
  Personal_Monthly: { plan: 'personal', months: 1 },
  Personal_Yearly: { plan: 'personal', months: 12 },
  Advanced_Monthly: { plan: 'avanzado', months: 1 },
  Advanced_Yearly: { plan: 'avanzado', months: 12 },
  Producer_Monthly: { plan: 'productor', months: 1 },
  Producer_Yearly: { plan: 'productor', months: 12 },
  Herd_Monthly: { plan: 'cabana', months: 1 },
  Herd_Yearly: { plan: 'cabana', months: 12 },
};

function resolvePlan(productId?: string | null) {
  if (!productId) return null;
  return PRODUCT_TO_PLAN[productId] ?? null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const caller = await getAuthenticatedUser(req);

    const body = await req.json();
    const parsed = VerifyPurchaseSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid input' }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const { platform, receiptData } = parsed.data;
    console.log(`Verifying ${platform} purchase for user ${caller.id}`);

    // Verify against the store and get back the product id the store confirms.
    let verifiedProductId: string | null = null;
    if (platform === 'ios') {
      verifiedProductId = await verifyIOSReceipt(receiptData);
    } else {
      verifiedProductId = await verifyAndroidPurchase(receiptData);
    }

    const resolved = resolvePlan(verifiedProductId);

    if (!resolved) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Purchase verification failed',
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('cabaña_id')
      .eq('user_id', caller.id)
      .maybeSingle();

    const cabanaId = (profile as any)?.['cabaña_id'];

    if (cabanaId) {
      await supabaseClient.rpc('activate_subscription', {
        cabana_uuid: cabanaId,
        plan_name: resolved.plan,
        duration_months: resolved.months,
      });
      console.log(`Subscription activated for cabaña ${cabanaId} with plan ${resolved.plan}`);
    }

    return new Response(JSON.stringify({
      success: true,
      plan: resolved.plan,
      message: 'Purchase verified and subscription activated',
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const authResponse = authErrorResponse(error, corsHeaders);
    if (authResponse) return authResponse;
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

/** Returns the product id Apple confirms was purchased, or null. */
async function verifyIOSReceipt(receiptData: any): Promise<string | null> {
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

    if (result.status !== 0) return null;

    const purchases: any[] = result.latest_receipt_info?.length
      ? result.latest_receipt_info
      : result.receipt?.in_app ?? [];

    const active = purchases
      .filter((p) => !p.expires_date_ms || Number(p.expires_date_ms) > Date.now())
      .find((p) => PRODUCT_TO_PLAN[p.product_id]);

    return active?.product_id ?? null;
  } catch (error) {
    console.error('iOS receipt verification failed:', error);
    return null;
  }
}

/** Returns the product id Google confirms was purchased, or null. */
async function verifyAndroidPurchase(purchaseData: any): Promise<string | null> {
  try {
    if (!purchaseData.productId || !purchaseData.purchaseToken) return null;

    const googleApiUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${Deno.env.get("ANDROID_PACKAGE_NAME")}/purchases/subscriptions/${encodeURIComponent(purchaseData.productId)}/tokens/${encodeURIComponent(purchaseData.purchaseToken)}`;

    const response = await fetch(googleApiUrl, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get("GOOGLE_PLAY_ACCESS_TOKEN")}`,
      }
    });

    if (!response.ok) return null;

    const result = await response.json();
    console.log('Google Play verification completed');

    const active = result.paymentState === 1 &&
      (!result.expiryTimeMillis || Number(result.expiryTimeMillis) > Date.now());

    return active ? purchaseData.productId : null;
  } catch (error) {
    console.error('Android purchase verification failed:', error);
    return null;
  }
}
