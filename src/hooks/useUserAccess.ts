/**
 * useUserAccess
 * -----------------------------------------------------------------------------
 * Single source of truth for "what is this user allowed to do right now?".
 *
 * All decisions come from the backend RPC `get_subscription_status` (which is
 * SECURITY DEFINER and reads the canonical `subscriptions` row). Nothing here
 * trusts localStorage or any client-side flag for access control.
 *
 *   accessLevel === 'paid'    → full access (active paid subscription)
 *   accessLevel === 'trial'   → full access, currently inside the 14-day trial
 *   accessLevel === 'free'    → free plan, can use the app up to plan limits
 *   accessLevel === 'blocked' → trial expired / subscription canceled → read-only
 *
 *   trialUsed === true        → the 14-day trial has already been consumed and
 *                               can NEVER be granted again to this cabaña.
 */
import { useMemo } from 'react';
import { useSubscription, type SubscriptionAccessLevel } from '@/hooks/useSubscription';

export interface UserAccess {
  loading: boolean;
  accessLevel: SubscriptionAccessLevel;
  hasPaidAccess: boolean;
  hasTrialAccess: boolean;
  hasFreeAccess: boolean;
  isBlocked: boolean;
  trialUsed: boolean;
  trialDaysRemaining: number;
  trialEndsAt: string | null;
  /** True if the user is eligible to start their first 14-day trial. */
  canStartTrial: boolean;
}

export function useUserAccess(): UserAccess {
  const { subscriptionStatus, loading } = useSubscription();

  return useMemo<UserAccess>(() => {
    const s = subscriptionStatus;
    const accessLevel: SubscriptionAccessLevel = s?.accessLevel ?? 'free';
    const trialUsed = !!s?.trialUsed;

    return {
      loading,
      accessLevel,
      hasPaidAccess: accessLevel === 'paid',
      hasTrialAccess: accessLevel === 'trial',
      hasFreeAccess: accessLevel === 'free' || accessLevel === 'trial' || accessLevel === 'paid',
      isBlocked: accessLevel === 'blocked',
      trialUsed,
      trialDaysRemaining: s?.trialDaysRemaining ?? 0,
      trialEndsAt: s?.trialEndDate ?? null,
      canStartTrial: !trialUsed,
    };
  }, [subscriptionStatus, loading]);
}
