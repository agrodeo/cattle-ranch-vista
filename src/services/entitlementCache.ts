/**
 * Entitlement Cache Service
 * 
 * Caches RevenueCat entitlement status locally for offline access.
 * Implements grace period logic for subscription verification.
 */

import { db } from './db';

// Grace period: 7 days of offline access before requiring verification
const GRACE_PERIOD_DAYS = 7;
const GRACE_PERIOD_MS = GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;

export interface CachedEntitlement {
  id: string;
  userId: string;
  isPremium: boolean;
  planId: string | null;
  expirationDate: string | null;
  lastVerifiedAt: string;
  activeSubscriptions: string[];
  customerInfo: any; // Full RevenueCat CustomerInfo for reference
}

const ENTITLEMENT_KEY = 'cached_entitlement';

/**
 * Save entitlement status to local cache
 */
export async function cacheEntitlement(
  userId: string,
  isPremium: boolean,
  planId: string | null,
  expirationDate: string | null,
  activeSubscriptions: string[],
  customerInfo: any
): Promise<void> {
  const cached: CachedEntitlement = {
    id: ENTITLEMENT_KEY,
    userId,
    isPremium,
    planId,
    expirationDate,
    lastVerifiedAt: new Date().toISOString(),
    activeSubscriptions,
    customerInfo
  };
  
  await db.table('sync_metadata').put({
    id: ENTITLEMENT_KEY,
    table_name: 'entitlement',
    last_sync_at: cached.lastVerifiedAt,
    data: JSON.stringify(cached)
  });
  
  console.log('[EntitlementCache] Cached entitlement:', { isPremium, planId, expirationDate });
}

/**
 * Get cached entitlement status
 */
export async function getCachedEntitlement(): Promise<CachedEntitlement | null> {
  try {
    const record = await db.table('sync_metadata').get(ENTITLEMENT_KEY);
    if (record?.data) {
      return JSON.parse(record.data);
    }
    return null;
  } catch (error) {
    console.error('[EntitlementCache] Error reading cache:', error);
    return null;
  }
}

/**
 * Check if cached entitlement is within grace period
 */
export function isWithinGracePeriod(cached: CachedEntitlement): boolean {
  const lastVerified = new Date(cached.lastVerifiedAt).getTime();
  const now = Date.now();
  const elapsed = now - lastVerified;
  
  return elapsed < GRACE_PERIOD_MS;
}

/**
 * Calculate days remaining in grace period
 */
export function getGracePeriodRemaining(cached: CachedEntitlement): number {
  const lastVerified = new Date(cached.lastVerifiedAt).getTime();
  const now = Date.now();
  const elapsed = now - lastVerified;
  const remaining = GRACE_PERIOD_MS - elapsed;
  
  return Math.max(0, Math.ceil(remaining / (24 * 60 * 60 * 1000)));
}

/**
 * Determine if subscription needs online verification
 */
export function needsVerification(cached: CachedEntitlement | null): boolean {
  if (!cached) {
    // Never verified - needs internet
    return true;
  }
  
  if (!cached.isPremium) {
    // Free user - no verification needed
    return false;
  }
  
  // Premium user - check grace period
  return !isWithinGracePeriod(cached);
}

/**
 * Clear cached entitlement (on logout)
 */
export async function clearCachedEntitlement(): Promise<void> {
  await db.table('sync_metadata').delete(ENTITLEMENT_KEY);
  console.log('[EntitlementCache] Cleared cached entitlement');
}

/**
 * Get entitlement status with offline support
 * 
 * Logic:
 * 1. If online, always use fresh data from RevenueCat
 * 2. If offline and cached premium is within grace period, honor it
 * 3. If offline and grace period expired, treat as free
 * 4. If never verified (first time), require connection
 */
export async function getOfflineEntitlementStatus(
  isOnline: boolean,
  freshPremiumStatus: boolean | null
): Promise<{
  isPremium: boolean;
  isOffline: boolean;
  lastVerifiedAt: string | null;
  needsConnectionToVerify: boolean;
  gracePeriodDaysRemaining: number | null;
  source: 'online' | 'cached' | 'expired' | 'none';
}> {
  const cached = await getCachedEntitlement();
  
  // Case 1: Online with fresh data
  if (isOnline && freshPremiumStatus !== null) {
    return {
      isPremium: freshPremiumStatus,
      isOffline: false,
      lastVerifiedAt: new Date().toISOString(),
      needsConnectionToVerify: false,
      gracePeriodDaysRemaining: null,
      source: 'online'
    };
  }
  
  // Case 2: Offline with valid cache
  if (cached) {
    if (cached.isPremium && isWithinGracePeriod(cached)) {
      const daysRemaining = getGracePeriodRemaining(cached);
      return {
        isPremium: true,
        isOffline: !isOnline,
        lastVerifiedAt: cached.lastVerifiedAt,
        needsConnectionToVerify: daysRemaining <= 2, // Warn when close to expiry
        gracePeriodDaysRemaining: daysRemaining,
        source: 'cached'
      };
    }
    
    // Grace period expired
    if (cached.isPremium && !isWithinGracePeriod(cached)) {
      return {
        isPremium: false, // Downgrade to free until verified
        isOffline: !isOnline,
        lastVerifiedAt: cached.lastVerifiedAt,
        needsConnectionToVerify: true,
        gracePeriodDaysRemaining: 0,
        source: 'expired'
      };
    }
    
    // Cached as free user
    return {
      isPremium: false,
      isOffline: !isOnline,
      lastVerifiedAt: cached.lastVerifiedAt,
      needsConnectionToVerify: false,
      gracePeriodDaysRemaining: null,
      source: 'cached'
    };
  }
  
  // Case 3: No cache - first time, need connection
  return {
    isPremium: false,
    isOffline: !isOnline,
    lastVerifiedAt: null,
    needsConnectionToVerify: true,
    gracePeriodDaysRemaining: null,
    source: 'none'
  };
}
