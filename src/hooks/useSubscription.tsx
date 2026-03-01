
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { toast } from '@/hooks/use-toast';
import { useConnectivity } from '@/services/connectivity';

export interface SubscriptionStatus {
  plan: 'free' | 'personal' | 'avanzado' | 'productor' | 'cabana' | 'corporativo';
  isTrialActive: boolean;
  trialDaysRemaining: number;
  isSubscriptionActive: boolean;
  maxAnimals: number;
  currentAnimalsCount: number;
  canAddAnimals: boolean;
  isReadOnly: boolean;
}

const PLAN_NAMES = {
  free: 'Free',
  personal: 'Personal',
  avanzado: 'Advanced',
  productor: 'Producer',
  cabana: 'Herd',
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
        // Only show toast after all retries exhausted
        toast({
          title: "Error",
          description: "No se pudo obtener el estado de la suscripción. Intenta recargar la página.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const status = data[0];
        console.log('✅ Subscription status:', status);
        const newStatus: SubscriptionStatus = {
          plan: status.plan,
          isTrialActive: status.is_trial_active,
          trialDaysRemaining: status.trial_days_remaining,
          isSubscriptionActive: status.is_subscription_active,
          maxAnimals: status.max_animals,
          currentAnimalsCount: status.current_animals_count,
          canAddAnimals: status.can_add_animals,
          isReadOnly: status.is_read_only
        };
        setSubscriptionStatus(newStatus);
        // Cache to localStorage for offline access
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
      // Small delay to let the backend finish writing
      setTimeout(() => fetchSubscriptionStatus(), 1500);
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
        title: "Límite alcanzado",
        description: `Has alcanzado el límite de ${subscriptionStatus.maxAnimals} animales para el plan ${PLAN_NAMES[subscriptionStatus.plan]}. Actualiza tu plan para agregar más animales.`,
        variant: "destructive"
      });
      return false;
    }
    return true;
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
    isFeatureAvailable,
    upgradePlan,
    planNames: PLAN_NAMES,
    planPrices: PLAN_PRICES
  };
};
