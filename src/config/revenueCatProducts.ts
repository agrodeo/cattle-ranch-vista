// RevenueCat product IDs matching App Store Connect subscriptions
export const REVENUECAT_PRODUCTS = {
  personal: {
    monthly: 'com.agrodeo.personal.monthly',
    annual: 'com.agrodeo.personal.annual'
  },
  avanzado: {
    monthly: 'com.agrodeo.avanzado.monthly',
    annual: 'com.agrodeo.avanzado.annual'
  },
  productor: {
    monthly: 'com.agrodeo.productor.monthly',
    annual: 'com.agrodeo.productor.annual'
  },
  cabana: {
    monthly: 'com.agrodeo.cabana.monthly',
    annual: 'com.agrodeo.cabana.annual'
  },
  corporativo: {
    monthly: 'com.agrodeo.corporativo.monthly',
    annual: 'com.agrodeo.corporativo.annual'
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
