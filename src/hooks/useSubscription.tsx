import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSimpleAuth } from './useSimpleAuth';
import { toast } from '@/hooks/use-toast';

export interface SubscriptionStatus {
  plan: 'free' | 'personal' | 'productor' | 'cabana' | 'corporativo';
  isTrialActive: boolean;
  trialDaysRemaining: number;
  isSubscriptionActive: boolean;
  maxAnimals: number;
  maxUsers: number;
  currentAnimalsCount: number;
  currentUsersCount: number;
  canAddAnimals: boolean;
  canAddUsers: boolean;
  isReadOnly: boolean;
}

const PLAN_NAMES = {
  free: 'Gratuito',
  personal: 'Personal',
  productor: 'Productor',
  cabana: 'Cabaña',
  corporativo: 'Corporativo'
};

const PLAN_PRICES = {
  personal: { monthly: 2900, annual: 29000 },
  productor: { monthly: 8900, annual: 89000 },
  cabana: { monthly: 29900, annual: 299000 },
  corporativo: { monthly: 89900, annual: 899000 }
};

export const useSubscription = () => {
  const { currentUser } = useSimpleAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscriptionStatus = useCallback(async () => {
    if (!currentUser?.cabañaId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc('get_subscription_status', {
        cabana_uuid: currentUser.cabañaId
      });

      if (error) {
        console.error('Error fetching subscription status:', error);
        toast({
          title: "Error",
          description: "No se pudo obtener el estado de la suscripción",
          variant: "destructive"
        });
        return;
      }

      if (data && data.length > 0) {
        const status = data[0];
        setSubscriptionStatus({
          plan: status.plan,
          isTrialActive: status.is_trial_active,
          trialDaysRemaining: status.trial_days_remaining,
          isSubscriptionActive: status.is_subscription_active,
          maxAnimals: status.max_animals,
          maxUsers: status.max_users,
          currentAnimalsCount: status.current_animals_count,
          currentUsersCount: status.current_users_count,
          canAddAnimals: status.can_add_animals,
          canAddUsers: status.can_add_users,
          isReadOnly: status.is_read_only
        });
      }
    } catch (error) {
      console.error('Error in fetchSubscriptionStatus:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.cabañaId]);

  useEffect(() => {
    fetchSubscriptionStatus();
  }, [fetchSubscriptionStatus]);

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

  const checkUserLimit = useCallback((): boolean => {
    if (!subscriptionStatus) return false;
    if (!subscriptionStatus.canAddUsers) {
      toast({
        title: "Límite alcanzado",
        description: `Has alcanzado el límite de ${subscriptionStatus.maxUsers} usuarios para el plan ${PLAN_NAMES[subscriptionStatus.plan]}. Actualiza tu plan para agregar más usuarios.`,
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

  const upgradePlan = useCallback(async (newPlan: 'personal' | 'productor' | 'cabana' | 'corporativo') => {
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
    checkUserLimit,
    isFeatureAvailable,
    upgradePlan,
    planNames: PLAN_NAMES,
    planPrices: PLAN_PRICES
  };
};