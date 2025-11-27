import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.4";
import * as jose from "https://deno.land/x/jose@v4.14.4/index.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { signedPayload } = await req.json();
    console.log('Received Apple webhook notification');

    // Verify JWT signature from Apple (simplified - in production use proper verification)
    let payload: any;
    try {
      const decoded = jose.decodeJwt(signedPayload);
      payload = decoded;
      console.log('Decoded payload:', JSON.stringify(payload, null, 2));
    } catch (error) {
      console.error('Failed to decode JWT:', error);
      throw new Error('Invalid signature');
    }

    const notificationType = payload.notificationType;
    const data = payload.data || {};
    const transactionInfo = data.signedTransactionInfo;
    
    console.log('Notification type:', notificationType);

    // Decode transaction info if present
    let transaction: any = {};
    if (transactionInfo) {
      try {
        transaction = jose.decodeJwt(transactionInfo);
        console.log('Transaction info:', JSON.stringify(transaction, null, 2));
      } catch (error) {
        console.error('Failed to decode transaction:', error);
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
      // Still return 200 to acknowledge receipt
      return new Response('OK', { status: 200, headers: corsHeaders });
    }

    const cabanaId = customer.cabana_id;

    // Map product ID to product code
    let productCode = 'free';
    if (productId) {
      if (productId.includes('personal')) productCode = 'personal';
      else if (productId.includes('avanzado')) productCode = 'avanzado';
      else if (productId.includes('productor')) productCode = 'productor';
      else if (productId.includes('cabana')) productCode = 'cabana';
      else if (productId.includes('corporativo')) productCode = 'corporativo';
    }

    // Handle different notification types
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
    // Always return 200 to acknowledge receipt, even on error
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
  // Record refund payment
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

  // Cancel subscription
  await expireSubscription(supabase, cabanaId);
}
