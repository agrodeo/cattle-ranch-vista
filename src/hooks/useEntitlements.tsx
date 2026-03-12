import { useState, useEffect, useCallback } from 'react';
import { revenueCatService } from '@/services/revenueCatService';
import { useRevenueCat } from '@/providers/RevenueCatProvider';
import { ENTITLEMENTS } from '@/config/revenueCatProducts';
import { isCapacitorNative } from '@/lib/platformDetection';
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
  const { isConfigured } = useRevenueCat();
  const [state, setState] = useState<EntitlementState>({
    isLoading: true,
    isPro: false,
    customerInfo: null,
    offerings: null,
    activeSubscriptions: [],
    expirationDate: null
  });

  const refreshCustomerInfo = useCallback(async () => {
    if (!isCapacitorNative()) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // ensureInitialized() inside getCustomerInfo will auto-retry if needed
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
      console.error('[useEntitlements] Failed to get customer info:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const loadOfferings = useCallback(async () => {
    if (!isNativeApp()) return;
    
    try {
      // ensureInitialized() inside getOfferings will auto-retry if needed
      const offerings = await revenueCatService.getOfferings();
      setState(prev => ({ ...prev, offerings }));
    } catch (error) {
      console.error('[useEntitlements] Failed to load offerings:', error);
    }
  }, []);

  // Wait for RevenueCat provider to finish initial config attempt
  useEffect(() => {
    if (!isConfigured) return;

    refreshCustomerInfo();
    loadOfferings();

    if (isNativeApp() && revenueCatService.isInitialized()) {
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
  }, [isConfigured, refreshCustomerInfo, loadOfferings]);

  return {
    ...state,
    refreshCustomerInfo,
    loadOfferings,
    checkProAccess: () => state.isPro
  };
};
