import { useState, useEffect, useCallback } from 'react';
import { revenueCatService } from '@/services/revenueCatService';
import { ENTITLEMENTS } from '@/config/revenueCatProducts';
import { isNativeApp } from '@/lib/platformDetection';
import type { CustomerInfo, PurchasesOfferings } from '@revenuecat/purchases-capacitor';

export interface EntitlementState {
  isLoading: boolean;
  isPro: boolean;
  customerInfo: CustomerInfo | null;
  offerings: PurchasesOfferings | null;
  activeSubscriptions: string[];
  expirationDate: string | null;
}

export const useEntitlements = () => {
  const [state, setState] = useState<EntitlementState>({
    isLoading: true,
    isPro: false,
    customerInfo: null,
    offerings: null,
    activeSubscriptions: [],
    expirationDate: null
  });

  const refreshCustomerInfo = useCallback(async () => {
    if (!isNativeApp()) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const customerInfo = await revenueCatService.getCustomerInfo();
      const proEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PRO];
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPro: proEntitlement?.isActive ?? false,
        customerInfo,
        activeSubscriptions: customerInfo.activeSubscriptions,
        expirationDate: proEntitlement?.expirationDate ?? null
      }));
    } catch (error) {
      console.error('Failed to get customer info:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const loadOfferings = useCallback(async () => {
    if (!isNativeApp()) return;
    
    try {
      const offerings = await revenueCatService.getOfferings();
      setState(prev => ({ ...prev, offerings }));
    } catch (error) {
      console.error('Failed to load offerings:', error);
    }
  }, []);

  useEffect(() => {
    refreshCustomerInfo();
    loadOfferings();

    if (isNativeApp()) {
      const cleanup = revenueCatService.addCustomerInfoUpdateListener((customerInfo) => {
        const proEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PRO];
        setState(prev => ({
          ...prev,
          isPro: proEntitlement?.isActive ?? false,
          customerInfo,
          activeSubscriptions: customerInfo.activeSubscriptions,
          expirationDate: proEntitlement?.expirationDate ?? null
        }));
      });
      return cleanup;
    }
  }, [refreshCustomerInfo, loadOfferings]);

  return {
    ...state,
    refreshCustomerInfo,
    loadOfferings,
    checkProAccess: () => state.isPro
  };
};
