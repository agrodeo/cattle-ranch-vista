// App Store product IDs (same as RevenueCat for iOS)
export const APP_STORE_PRODUCTS = {
  personal: {
    monthly: 'Personal_Monthly',
    annual: 'Personal_Yearly'
  },
  avanzado: {
    monthly: 'Advanced_Monthly',
    annual: 'Advanced_Yearly'
  },
  productor: {
    monthly: 'Producer_Monthly',
    annual: 'Producer_Yearly'
  },
  cabana: {
    monthly: 'Herd_Monthly',
    annual: 'Herd_Yearly'
  },
  corporativo: {
    monthly: '', // TODO: Add when available
    annual: ''   // TODO: Add when available
  }
} as const;

export type PlanId = keyof typeof APP_STORE_PRODUCTS;
export type BillingCycle = 'monthly' | 'annual';

export const getAppStoreProductId = (planId: PlanId, billingCycle: BillingCycle): string => {
  return APP_STORE_PRODUCTS[planId]?.[billingCycle] || '';
};
