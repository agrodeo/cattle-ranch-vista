/**
 * useSubscriptionStatus - Single source of truth for subscription state
 * 
 * This hook provides subscription status that works both online and offline.
 * It integrates with RevenueCat for native apps and falls back to Supabase
 * for web users.
 * 
 * Key features:
 * - Caches entitlement status locally for offline access
 * - Implements 7-day grace period for offline premium users
 * - Syncs entitlement status to Supabase when online
 * - Provides clear state for UI gating
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useConnectivity } from '@/services/connectivity';
import { isCapacitorNative } from '@/lib/platformDetection';
import { revenueCatService } from '@/services/revenueCatService';
import { ENTITLEMENTS } from '@/config/revenueCatProducts';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';
import {
  cacheEntitlement,
  getCachedEntitlement,
  getOfflineEntitlementStatus,
  clearCachedEntitlement
} from '@/services/entitlementCache';
import type { CustomerInfo } from '@revenuecat/purchases-capacitor';

export interface SubscriptionState {
  // Core status
  isPremium: boolean;
  isLoading: boolean;
  
  // Offline handling
  isOffline: boolean;
  lastEntitlementCheckAt: string | null;
  needsConnectionToVerify: boolean;
  gracePeriodDaysRemaining: number | null;
  
  // Plan details
  planId: string | null;
  expirationDate: string | null;
  activeSubscriptions: string[];
  
  // Status source
  source: 'online' | 'cached' | 'expired' | 'none' | 'loading';
  
  // Actions
  refresh: () => Promise<void>;
  clearCache: () => Promise<void>;
}

export function useSubscriptionStatus(): SubscriptionState {
  const { isOnline } = useConnectivity();
  const { currentUser, session } = useSupabaseAuth();
  
  const [state, setState] = useState<Omit<SubscriptionState, 'refresh' | 'clearCache'>>({
    isPremium: false,
    isLoading: true,
    isOffline: false,
    lastEntitlementCheckAt: null,
    needsConnectionToVerify: false,
    gracePeriodDaysRemaining: null,
    planId: null,
    expirationDate: null,
    activeSubscriptions: [],
    source: 'loading'
  });

  // Sync entitlement status to Supabase for server-side enforcement
  const syncToSupabase = useCallback(async (isPremiumStatus: boolean, planIdValue: string | null) => {
    if (!session?.user?.id || !isOnline) return;
    
    try {
      // Get user's cabana_id using raw select to avoid type issues with special characters
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .single();
      
      const cabanaId = (profile as any)?.['cabaña_id'];
      
      if (cabanaId) {
        // Update billing_subscriptions status
        const { error } = await supabase
          .from('billing_subscriptions')
          .upsert({
            cabana_id: cabanaId,
            provider: 'revenuecat',
            product_code: planIdValue || 'free',
            status: isPremiumStatus ? 'active' : 'cancelled',
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'cabana_id'
          });
        
        if (error) {
          console.error('[SubscriptionStatus] Failed to sync to Supabase:', error);
        } else {
          console.log('[SubscriptionStatus] Synced to Supabase:', { isPremiumStatus, planIdValue });
        }
      }
    } catch (error) {
      console.error('[SubscriptionStatus] Supabase sync error:', error);
    }
  }, [session?.user?.id, isOnline]);

  // Fetch fresh entitlement from RevenueCat
  const fetchRevenueCatStatus = useCallback(async (): Promise<{
    isPremium: boolean;
    planId: string | null;
    expirationDate: string | null;
    activeSubscriptions: string[];
    customerInfo: CustomerInfo | null;
  } | null> => {
    if (!isCapacitorNative()) return null;
    
    try {
      const customerInfo = await revenueCatService.getCustomerInfo();
      const proEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PRO];
      
      return {
        isPremium: proEntitlement?.isActive ?? false,
        planId: proEntitlement?.productIdentifier ?? null,
        expirationDate: proEntitlement?.expirationDate ?? null,
        activeSubscriptions: customerInfo.activeSubscriptions || [],
        customerInfo
      };
    } catch (error) {
      console.error('[SubscriptionStatus] RevenueCat fetch error:', error);
      return null;
    }
  }, []);

  // Main refresh function
  const refresh = useCallback(async () => {
    const userId = currentUser?.id || session?.user?.id;
    
    if (!userId) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPremium: false,
        source: 'none'
      }));
      return;
    }

    try {
      let freshPremiumStatus: boolean | null = null;
      let freshData: {
        isPremium: boolean;
        planId: string | null;
        expirationDate: string | null;
        activeSubscriptions: string[];
        customerInfo: CustomerInfo | null;
      } | null = null;

      // Try to get fresh data from RevenueCat if online and native
      if (isOnline && isCapacitorNative()) {
        freshData = await fetchRevenueCatStatus();
        if (freshData) {
          freshPremiumStatus = freshData.isPremium;
          
          // Cache the fresh data
          await cacheEntitlement(
            userId,
            freshData.isPremium,
            freshData.planId,
            freshData.expirationDate,
            freshData.activeSubscriptions,
            freshData.customerInfo
          );
          
          // Sync to Supabase for server-side enforcement
          await syncToSupabase(freshData.isPremium, freshData.planId);
        }
      }

      // Get offline-aware status
      const offlineStatus = await getOfflineEntitlementStatus(isOnline, freshPremiumStatus);
      
      // Get cached data for plan details if we didn't get fresh data
      const cached = await getCachedEntitlement();
      
      setState({
        isPremium: offlineStatus.isPremium,
        isLoading: false,
        isOffline: offlineStatus.isOffline,
        lastEntitlementCheckAt: offlineStatus.lastVerifiedAt,
        needsConnectionToVerify: offlineStatus.needsConnectionToVerify,
        gracePeriodDaysRemaining: offlineStatus.gracePeriodDaysRemaining,
        planId: freshData?.planId ?? cached?.planId ?? null,
        expirationDate: freshData?.expirationDate ?? cached?.expirationDate ?? null,
        activeSubscriptions: freshData?.activeSubscriptions ?? cached?.activeSubscriptions ?? [],
        source: offlineStatus.source
      });
      
    } catch (error) {
      console.error('[SubscriptionStatus] Refresh error:', error);
      
      // Fallback to cached status on error
      const offlineStatus = await getOfflineEntitlementStatus(false, null);
      const cached = await getCachedEntitlement();
      
      setState({
        isPremium: offlineStatus.isPremium,
        isLoading: false,
        isOffline: true,
        lastEntitlementCheckAt: offlineStatus.lastVerifiedAt,
        needsConnectionToVerify: offlineStatus.needsConnectionToVerify,
        gracePeriodDaysRemaining: offlineStatus.gracePeriodDaysRemaining,
        planId: cached?.planId ?? null,
        expirationDate: cached?.expirationDate ?? null,
        activeSubscriptions: cached?.activeSubscriptions ?? [],
        source: offlineStatus.source
      });
    }
  }, [currentUser?.id, session?.user?.id, isOnline, fetchRevenueCatStatus, syncToSupabase]);

  // Clear cache (on logout)
  const clearCache = useCallback(async () => {
    await clearCachedEntitlement();
    setState({
      isPremium: false,
      isLoading: false,
      isOffline: !isOnline,
      lastEntitlementCheckAt: null,
      needsConnectionToVerify: false,
      gracePeriodDaysRemaining: null,
      planId: null,
      expirationDate: null,
      activeSubscriptions: [],
      source: 'none'
    });
  }, [isOnline]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Refresh when coming back online
  useEffect(() => {
    if (isOnline && state.source !== 'loading') {
      refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  // Listen for RevenueCat updates
  useEffect(() => {
    if (!isNativeApp() || !revenueCatService.isInitialized()) return;
    
    const cleanup = revenueCatService.addCustomerInfoUpdateListener(async (customerInfo) => {
      const proEntitlement = customerInfo.entitlements.active[ENTITLEMENTS.PRO];
      const isPremium = proEntitlement?.isActive ?? false;
      const planId = proEntitlement?.productIdentifier ?? null;
      const expirationDate = proEntitlement?.expirationDate ?? null;
      const activeSubscriptions = customerInfo.activeSubscriptions || [];
      
      const userId = currentUser?.id || session?.user?.id;
      if (userId) {
        await cacheEntitlement(userId, isPremium, planId, expirationDate, activeSubscriptions, customerInfo);
        await syncToSupabase(isPremium, planId);
      }
      
      setState(prev => ({
        ...prev,
        isPremium,
        planId,
        expirationDate,
        activeSubscriptions,
        lastEntitlementCheckAt: new Date().toISOString(),
        needsConnectionToVerify: false,
        source: 'online'
      }));
    });
    
    return cleanup;
  }, [currentUser?.id, session?.user?.id, syncToSupabase]);

  return useMemo(() => ({
    ...state,
    refresh,
    clearCache
  }), [state, refresh, clearCache]);
}
