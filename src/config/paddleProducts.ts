// Paddle configuration — replace placeholders with real IDs from your Paddle dashboard
export const PADDLE_CLIENT_TOKEN = 'test_XXXXX'; // Replace with your Paddle client-side token
export const PADDLE_ENV: 'sandbox' | 'production' = 'sandbox';

export interface PaddlePriceIds {
  monthly: string;
  annual: string;
}

export const paddlePriceIds: Record<string, PaddlePriceIds> = {
  personal: { monthly: 'pri_personal_monthly', annual: 'pri_personal_annual' },
  avanzado: { monthly: 'pri_avanzado_monthly', annual: 'pri_avanzado_annual' },
  productor: { monthly: 'pri_productor_monthly', annual: 'pri_productor_annual' },
  cabana: { monthly: 'pri_cabana_monthly', annual: 'pri_cabana_annual' },
};

export const getPaddlePriceId = (planId: string, billingCycle: 'monthly' | 'annual'): string | null => {
  return paddlePriceIds[planId]?.[billingCycle] ?? null;
};
