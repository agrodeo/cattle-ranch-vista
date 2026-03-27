// RevenueCat product IDs from RevenueCat Dashboard
export const REVENUECAT_PRODUCTS = {
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

export const ENTITLEMENTS = {
  PRO: 'agrodeo Pro'
} as const;

export type PlanId = keyof typeof REVENUECAT_PRODUCTS;
export type BillingCycle = 'monthly' | 'annual';

export const getRevenueCatProductId = (planId: PlanId, billingCycle: BillingCycle): string => {
  return REVENUECAT_PRODUCTS[planId]?.[billingCycle] || '';
};
