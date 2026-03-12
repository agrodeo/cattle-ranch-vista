import { getNativePlatform } from '@/lib/platformDetection';

// RevenueCat product IDs from RevenueCat Dashboard
// iOS uses simple product IDs; Android uses subscriptionId:basePlanId format
export const REVENUECAT_PRODUCTS = {
  personal: {
    monthly: { ios: 'personal_monthly', android: 'personal_monthly:personal-monthly' },
    annual: { ios: 'personal_yearly', android: 'personal_yearly:personal-yearly' }
  },
  avanzado: {
    monthly: { ios: 'advanced_monthly', android: 'advanced_monthly:advanced-monthly' },
    annual: { ios: 'advanced_yearly', android: 'advanced_yearly:advanced-yearly' }
  },
  productor: {
    monthly: { ios: 'producer_monthly', android: 'producer_monthly:producer-monthly' },
    annual: { ios: 'producer_yearly', android: 'producer_yearly:producer-yearly' }
  },
  cabana: {
    monthly: { ios: 'herd_monthly', android: 'herd_monthly:herd-monthly' },
    annual: { ios: 'herd_yearly', android: 'herd_yearly:herd-yearly' }
  },
  corporativo: {
    monthly: { ios: '', android: '' },
    annual: { ios: '', android: '' }
  }
} as const;

export const ENTITLEMENTS = {
  PRO: 'agrodeo Pro'
} as const;

export type PlanId = keyof typeof REVENUECAT_PRODUCTS;
export type BillingCycle = 'monthly' | 'annual';

export const getRevenueCatProductId = (planId: PlanId, billingCycle: BillingCycle): string => {
  const entry = REVENUECAT_PRODUCTS[planId]?.[billingCycle];
  if (!entry) return '';
  
  // If it's a simple string (legacy), return as-is
  if (typeof entry === 'string') return entry;
  
  const platform = getNativePlatform();
  if (platform === 'android') return entry.android;
  return entry.ios; // Default to iOS for ios/null
};
