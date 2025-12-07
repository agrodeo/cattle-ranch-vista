// App Store product IDs (same as RevenueCat for iOS)
export const APP_STORE_PRODUCTS = {
  personal: {
    monthly: 'prodc6836489e3',
    annual: 'prodc8d8f05de3'
  },
  avanzado: {
    monthly: 'prodc70244af0c',
    annual: 'prod089fc06f3e'
  },
  productor: {
    monthly: 'prod994aa82559',
    annual: 'prod698531dc0f'
  },
  cabana: {
    monthly: 'prod303c757d05',
    annual: 'prodf140665f04'
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
