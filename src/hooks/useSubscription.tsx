
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/hooks/use-toast';
import { useConnectivity } from '@/services/connectivity';

export type SubscriptionAccessLevel = 'paid' | 'trial' | 'free' | 'blocked';

export interface SubscriptionStatus {
  plan: 'free' | 'personal' | 'avanzado' | 'productor' | 'cabana' | 'corporativo';
  /** Backend-resolved status: none | trial | active | past_due | canceled | expired */
  status: 'none' | 'trial' | 'active' | 'past_due' | 'canceled' | 'expired';
  /** True once the user has ever consumed their 14-day trial. NEVER goes back to false. */
  trialUsed: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  isSubscriptionActive: boolean;
  maxAnimals: number;
  currentAnimalsCount: number;
  canAddAnimals: boolean;
  isReadOnly: boolean;
  subscriptionEndDate: string | null;
  trialEndDate: string | null;
  subscriptionDaysRemaining: number | null;
  /** 7-day automatic trial granted at signup (server-resolved). */
  signupTrialActive: boolean;
  signupTrialDaysRemaining: number;
  signupTrialEndDate: string | null;
  /** Derived single-value access level the UI can switch on. */
  accessLevel: SubscriptionAccessLevel;
}

const PLAN_NAMES: Record<string, string> = {
  free: 'Free',
  personal: 'Personal',
  avanzado: 'Advanced',
  productor: 'Producer',
  cabana: 'Herd',
  cabaña: 'Herd',
  corporativo: 'Corporate'
};

const PLAN_PRICES = {
  personal: { monthly: 1999, annual: 19999 },
  avanzado: { monthly: 3499, annual: 34900 },
  productor: { monthly: 4999, annual: 49999 },
  cabana: { monthly: 8999, annual: 89900 },
  corporativo: { monthly: 0, annual: 0 }
};

export const useSubscription = () => {
  const { currentUser } = useSupabaseAuth();
  const { isOnline } = useConnectivity();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(() => {
    // Instantly load cached subscription status from localStorage
    try {
      const cached = localStorage.getItem('cached_subscription_status');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  });
  const [loading, setLoading] = useState(true);

  const fetchSubscriptionStatus = useCallback(async (retryCount = 0) => {
    if (!currentUser?.cabañaId) {
      console.warn('⚠️ No cabaña ID found, skipping subscription status fetch');
      // Don't clear subscriptionStatus if we have a cached value — wait for cabañaId
      // Only set loading false if we truly have no cached data either
      if (!subscriptionStatus) {
        // Keep loading true so the UI waits for cabañaId to arrive
      } else {
        setLoading(false);
      }
      return;
    }

    // Skip RPC when offline — use cached status
    if (!isOnline) {
      console.log('📴 Offline — using cached subscription status');
      setLoading(false);
      return;
    }

    try {
      console.log('📊 Fetching subscription status for cabaña:', currentUser.cabañaId);
      const { data, error } = await supabase.rpc('get_subscription_status', {
        cabana_uuid: currentUser.cabañaId
      });

      if (error) {
        console.error('Error fetching subscription status:', error);
        // Retry silently up to 2 times for transient errors (503, timeouts)
        if (retryCount < 2) {
          console.log(`🔄 Retrying subscription fetch (attempt ${retryCount + 2}/3)...`);
          setTimeout(() => fetchSubscriptionStatus(retryCount + 1), 2000 * (retryCount + 1));
          return;
        }
        // Silently fall back to cached status — no toast needed
        console.warn('⚠️ Subscription fetch failed after retries, using cached status');
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const status = data[0];
        console.log('✅ Subscription status:', status);
        
        // Calculate subscription days remaining
        let subDaysRemaining: number | null = null;
        if (status.is_subscription_active && status.subscription_end_date) {
          const endDate = new Date(status.subscription_end_date);
          const now = new Date();
          subDaysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
        }
        
        // The RPC now also returns subscription_status and trial_used.
        // We cast through `any` because the generated types lag the migration.
        const raw = status as any;
        const resolvedStatus: SubscriptionStatus['status'] =
          raw.subscription_status ?? (raw.is_subscription_active ? 'active' : raw.is_trial_active ? 'trial' : 'none');

        const signupTrialActive = !!raw.signup_trial_active;

        const accessLevel: SubscriptionAccessLevel =
          resolvedStatus === 'active'
            ? 'paid'
            : resolvedStatus === 'trial'
            ? 'trial'
            : signupTrialActive
            ? 'trial'
            : raw.is_read_only
            ? 'blocked'
            : 'free';

        const newStatus: SubscriptionStatus = {
          plan: status.plan as SubscriptionStatus['plan'],
          status: resolvedStatus,
          trialUsed: raw.trial_used ?? false,
          isTrialActive: status.is_trial_active,
          trialDaysRemaining: status.trial_days_remaining,
          isSubscriptionActive: status.is_subscription_active,
          maxAnimals: status.max_animals,
          currentAnimalsCount: status.current_animals_count,
          canAddAnimals: status.can_add_animals,
          isReadOnly: status.is_read_only,
          subscriptionEndDate: status.subscription_end_date || null,
          trialEndDate: status.trial_end_date || null,
          subscriptionDaysRemaining: subDaysRemaining,
          signupTrialActive,
          signupTrialDaysRemaining: raw.signup_trial_days_remaining ?? 0,
          signupTrialEndDate: raw.signup_trial_end_date ?? null,
          accessLevel,
        };
        setSubscriptionStatus(newStatus);
        try {
          localStorage.setItem('cached_subscription_status', JSON.stringify(newStatus));
        } catch {}
      }
    } catch (error) {
      console.error('Error in fetchSubscriptionStatus:', error);
      if (retryCount < 2) {
        setTimeout(() => fetchSubscriptionStatus(retryCount + 1), 2000 * (retryCount + 1));
        return;
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser?.cabañaId, isOnline]);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

  // Listen for purchase completion events to auto-refresh
  useEffect(() => {
    const handler = () => {
      console.log('🔄 subscription-updated event received, refreshing...');
      [0, 2500, 6000, 10000].forEach((delay) => {
        setTimeout(() => fetchSubscriptionStatus(), delay);
      });
    };
    window.addEventListener('subscription-updated', handler);
    return () => window.removeEventListener('subscription-updated', handler);
  }, [fetchSubscriptionStatus]);

  // Safety: if loading is still true after 10s (e.g. cabañaId never arrived), stop loading
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setLoading(false), 10000);
    return () => clearTimeout(timer);
  }, [loading]);

  const checkAnimalLimit = useCallback((): boolean => {
    if (!subscriptionStatus) return false;
    if (!subscriptionStatus.canAddAnimals) {
      toast({
        title: "Límite de animales alcanzado",
        description: `Has alcanzado el límite de ${subscriptionStatus.maxAnimals} animales para el plan ${PLAN_NAMES[subscriptionStatus.plan]}. Tienes ${subscriptionStatus.currentAnimalsCount} animales activos. Actualiza tu plan para agregar más.`,
        variant: "destructive"
      });
      return false;
    }
    return true;
  }, [subscriptionStatus]);


  /**
   * True while the cabaña is inside the automatic 7-day signup trial.
   * Resolved entirely from server data (`trial_started_at` in the DB) so the
   * client clock cannot be manipulated to extend it.
   */
  const isInFreeTrial = useCallback((): boolean => {
    return !!subscriptionStatus?.signupTrialActive;
  }, [subscriptionStatus]);

  const isFeatureAvailable = useCallback((feature: 'reports' | 'analytics' | 'export'): boolean => {
    if (!subscriptionStatus) return false;
    
    // Free plan has limited features
    if (subscriptionStatus.plan === 'free' && !subscriptionStatus.isTrialActive) {
      return false;
    }
    
    return !subscriptionStatus.isReadOnly;
  }, [subscriptionStatus]);

  const upgradePlan = useCallback(async (newPlan: 'personal' | 'avanzado' | 'productor' | 'cabana' | 'corporativo') => {
    if (!currentUser?.cabañaId) return;

    try {
      const { error } = await supabase.rpc('update_subscription_plan', {
        cabana_uuid: currentUser.cabañaId,
        new_plan: newPlan
      });

      if (error) {
        console.error('Error upgrading plan:', error);
        toast({
          title: "Error",
          description: "No se pudo actualizar el plan",
          variant: "destructive"
        });
        return false;
      }

      await fetchSubscriptionStatus();
      toast({
        title: "Plan actualizado",
        description: `Tu plan ha sido actualizado a ${PLAN_NAMES[newPlan]}`,
      });
      return true;
    } catch (error) {
      console.error('Error in upgradePlan:', error);
      return false;
    }
  }, [currentUser?.cabañaId, fetchSubscriptionStatus]);

  return {
    subscriptionStatus,
    loading,
    fetchSubscriptionStatus,
    checkAnimalLimit,
    isInFreeTrial,
    isFeatureAvailable,
    upgradePlan,
    planNames: PLAN_NAMES,
    planPrices: PLAN_PRICES
  };
};
