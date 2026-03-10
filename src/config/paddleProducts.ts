// Paddle configuration — replace placeholders with real IDs from your Paddle dashboard
export const PADDLE_CLIENT_TOKEN = 'live_b6aac267389501222e626273a8a';
export const PADDLE_ENV: 'sandbox' | 'production' = 'production';

export interface PaddlePriceIds {
  monthly: string;
  annual: string;
}

export const paddlePriceIds: Record<string, PaddlePriceIds> = {
  personal: { monthly: 'pri_01kk2r774yhyxjpnba3ejqs62d', annual: 'pri_01kk2r6pf6btx3wqsn7jvqgzer' },
  avanzado: { monthly: 'pri_01kk2qvb715hth3rqsvecej1at', annual: 'pri_01kk2r58q4y7jjzjgm78yxwqxt' },
  productor: { monthly: 'pri_01kk2qx43k51pwns7zayrg9z6z', annual: 'pri_01kk2r49eemxkj94an05qgh7g6' },
  cabana: { monthly: 'pri_01kk2qz2g4dkds653mj27fbzqs', annual: 'pri_01kk2r33w832qdnf1z039w1qkp' },
};

export const getPaddlePriceId = (planId: string, billingCycle: 'monthly' | 'annual'): string | null => {
  return paddlePriceIds[planId]?.[billingCycle] ?? null;
};
