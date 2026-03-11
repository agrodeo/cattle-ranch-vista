// RevenueCat product IDs from RevenueCat Dashboard
export const REVENUECAT_PRODUCTS = {
  personal: {
    monthly: 'personal_monthly',
    annual: 'personal_yearly'
  },
  avanzado: {
    monthly: 'advanced_monthly',
    annual: 'advanced_yearly'
  },
  productor: {
    monthly: 'producer_monthly',
    annual: 'producer_yearly'
  },
  cabana: {
    monthly: 'herd_monthly',
    annual: 'herd_yearly'
  },
  corporativo: {
    monthly: '', // TODO: Add when available
    annual: ''   // TODO: Add when available
  }
} as const;

export const ENTITLEMENTS = {
  PRO: 'agrodeo Pro'
} as const;

export type PlanId = keyof typeof REVENUECAT_PRODUCTS;
export type BillingCycle = 'monthly' | 'annual';

export const getRevenueCatProductId = (planId: PlanId, billingCycle: BillingCycle): string => {
  return REVENUECAT_PRODUCTS[planId]?.[billingCycle] || '';
};
