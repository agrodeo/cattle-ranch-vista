export const APP_STORE_PRODUCTS = {
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

export type PlanId = keyof typeof APP_STORE_PRODUCTS;
export type BillingCycle = 'monthly' | 'annual';

export const getAppStoreProductId = (planId: PlanId, billingCycle: BillingCycle): string => {
  return APP_STORE_PRODUCTS[planId]?.[billingCycle] || '';
};
