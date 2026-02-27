import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Apple's JWKS endpoint for verifying App Store Server Notifications V2
const APPLE_JWKS = jose.createRemoteJWKSet(
  new URL('https://appleid.apple.com/auth/keys')
);

// Map RevenueCat product IDs to internal plan codes
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

/** Verify a signed JWT from Apple using their public JWKS */
async function verifyAppleJWT(signedPayload: string): Promise<any> {
  try {
    const { payload } = await jose.jwtVerify(signedPayload, APPLE_JWKS);
    return payload;
  } catch (error) {
    console.error('Apple JWT verification failed:', error);
    throw new Error('Invalid Apple JWT signature');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { signedPayload } = await req.json();

    if (!signedPayload || typeof signedPayload !== 'string') {
      return new Response('Bad Request: missing signedPayload', { status: 400, headers: corsHeaders });
    }

    console.log('Received Apple webhook notification');

    // Cryptographically verify the JWT signature against Apple's JWKS
    const payload = await verifyAppleJWT(signedPayload);
    console.log('Verified payload notification type:', payload.notificationType);

    const notificationType = payload.notificationType;
    const data = payload.data || {};
    const transactionInfo = data.signedTransactionInfo;

    // Decode and verify transaction info if present
    let transaction: any = {};
    if (transactionInfo) {
      try {
        transaction = await verifyAppleJWT(transactionInfo);
        console.log('Verified transaction productId:', transaction.productId);
      } catch (error) {
        console.error('Failed to verify transaction JWT:', error);
      }
    }

    const originalTransactionId = transaction.originalTransactionId || data.originalTransactionId;
    const productId = transaction.productId;
    
    if (!originalTransactionId) {
      throw new Error('Missing originalTransactionId');
    }

    // Find customer by transaction ID
    const { data: customer, error: customerError } = await supabase
      .from('billing_customers')
      .select('cabana_id')
      .eq('appstore_original_transaction_id', originalTransactionId)
      .single();

    if (customerError || !customer) {
      console.error('Customer not found for transaction ID:', originalTransactionId);
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const cabanaId = customer.cabana_id;

    // Map product ID to product code
    let productCode = 'free';
    if (productId) {
      if (PRODUCT_ID_TO_PLAN[productId]) {
        productCode = PRODUCT_ID_TO_PLAN[productId];
      } else {
        console.log('Product ID not found in map, using fallback matching:', productId);
        if (productId.includes('personal')) productCode = 'personal';
        else if (productId.includes('avanzado') || productId.includes('advanced')) productCode = 'avanzado';
        else if (productId.includes('productor') || productId.includes('producer')) productCode = 'productor';
        else if (productId.includes('cabana') || productId.includes('herd')) productCode = 'cabana';
        else if (productId.includes('corporativo') || productId.includes('corporate')) productCode = 'corporativo';
      }
    }
    
    console.log('Mapped product ID', productId, 'to product code:', productCode);

    switch (notificationType) {
      case 'SUBSCRIBED':
      case 'DID_RENEW':
      case 'DID_CHANGE_RENEWAL_STATUS':
        console.log('Activating subscription for cabana:', cabanaId);
        await activateSubscription(supabase, cabanaId, productCode, originalTransactionId);
        break;

      case 'EXPIRED':
      case 'DID_FAIL_TO_RENEW':
      case 'GRACE_PERIOD_EXPIRED':
        console.log('Expiring subscription for cabana:', cabanaId);
        await expireSubscription(supabase, cabanaId);
        break;

      case 'REFUND':
        console.log('Processing refund for cabana:', cabanaId);
        await handleRefund(supabase, cabanaId, transaction);
        break;

      case 'REVOKE':
        console.log('Revoking subscription for cabana:', cabanaId);
        await expireSubscription(supabase, cabanaId);
        break;

      default:
        console.log('Unhandled notification type:', notificationType);
    }

    return new Response('OK', { status: 200, headers: corsHeaders });

  } catch (error) {
    console.error('Apple webhook error:', error);
    return new Response('OK', { status: 200, headers: corsHeaders });
  }
});

async function activateSubscription(
  supabase: any,
  cabanaId: string,
  productCode: string,
  transactionId: string
) {
  const { error } = await supabase
    .from('billing_subscriptions')
    .upsert({
      cabana_id: cabanaId,
      product_code: productCode,
      provider: 'ios',
      status: 'active',
      external_id: transactionId,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'cabana_id'
    });

  if (error) {
    console.error('Failed to activate subscription:', error);
    throw error;
  }
  console.log('Subscription activated successfully');
}

async function expireSubscription(supabase: any, cabanaId: string) {
  const { error } = await supabase
    .from('billing_subscriptions')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('cabana_id', cabanaId);

  if (error) {
    console.error('Failed to expire subscription:', error);
    throw error;
  }
  console.log('Subscription expired successfully');
}

async function handleRefund(supabase: any, cabanaId: string, transaction: any) {
  const { error: paymentError } = await supabase
    .from('billing_payments')
    .insert({
      cabana_id: cabanaId,
      provider: 'ios',
      status: 'refunded',
      external_payment_id: transaction.transactionId || transaction.originalTransactionId,
      raw: transaction
    });

  if (paymentError) {
    console.error('Failed to record refund:', paymentError);
  }

  await expireSubscription(supabase, cabanaId);
}
