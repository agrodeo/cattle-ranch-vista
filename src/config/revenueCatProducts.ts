export const REVENUECAT_PRODUCTS = {
  monthly: 'agrodeo_pro_monthly',
  yearly: 'agrodeo_pro_yearly',
  lifetime: 'agrodeo_pro_lifetime'
} as const;

export const ENTITLEMENTS = {
  PRO: 'agrodeo Pro'
} as const;

export type ProductType = keyof typeof REVENUECAT_PRODUCTS;
