// Paddle configuration — replace placeholders with real IDs from your Paddle dashboard
export const PADDLE_CLIENT_TOKEN = 'live_b6aac267389501222e626273a8a';
export const PADDLE_ENV: 'sandbox' | 'production' = 'production';

export interface PaddlePriceIds {
  monthly: string;
  annual: string;
}

// Prices WITH the 14-day Paddle trial. Used for users who have NOT yet consumed their trial.
export const paddlePriceIds: Record<string, PaddlePriceIds> = {
  personal: { monthly: 'pri_01kk2r774yhyxjpnba3ejqs62d', annual: 'pri_01kk2r6pf6btx3wqsn7jvqgzer' },
  avanzado: { monthly: 'pri_01kk2qvb715hth3rqsvecej1at', annual: 'pri_01kk2r58q4y7jjzjgm78yxwqxt' },
  productor: { monthly: 'pri_01kk2qx43k51pwns7zayrg9z6z', annual: 'pri_01kk2r49eemxkj94an05qgh7g6' },
  cabana: { monthly: 'pri_01kk2qz2g4dkds653mj27fbzqs', annual: 'pri_01kk2r33w832qdnf1z039w1qkp' },
};

// Prices WITHOUT trial — charge immediately. Used for users who have already consumed their trial,
// to prevent abuse via cancel-and-re-trial loops.
export const paddleNoTrialPriceIds: Record<string, PaddlePriceIds> = {
  personal: { monthly: 'pri_01kprvqqdbbpd9jrv531dgx98c', annual: 'pri_01kprvsss5ncbgf50yns6ejwqk' },
  avanzado: { monthly: 'pri_01kprvv6xcdmq8ht2fxwtx2xhg', annual: 'pri_01kprvx4eztaejcx0fcgf4jy1a' },
  productor: { monthly: 'pri_01kprvyntqgd0gkch241htp02f', annual: 'pri_01kprw05h7d1wdkyyg4a9sd94r' },
  cabana: { monthly: 'pri_01kprw1psv4dydc5f74yg9b6jh', annual: 'pri_01kprw2tx643a8rc2az6ats8td' },
};

export const getPaddlePriceId = (
  planId: string,
  billingCycle: 'monthly' | 'annual',
  options?: { trialUsed?: boolean }
): string | null => {
  const map = options?.trialUsed ? paddleNoTrialPriceIds : paddlePriceIds;
  return map[planId]?.[billingCycle] ?? null;
};
