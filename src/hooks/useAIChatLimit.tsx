import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

const PLAN_LIMITS: Record<string, number> = {
  free: 3,
  personal: 20,
  // advanced, producer, herd, corporate → unlimited
};

export interface AIChatLimitStatus {
  hasAccess: boolean;
  isUnlimited: boolean;
  messagesUsed: number;
  messagesRemaining: number;
  limitReached: boolean;
  monthlyLimit: number;
}

export const useAIChatLimit = () => {
  const { subscriptionStatus, loading: subscriptionLoading } = useSubscription();
  const { currentUser } = useSupabaseAuth();
  const [messagesUsed, setMessagesUsed] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchMonthlyUsage = useCallback(async () => {
    if (!currentUser?.cabañaId) {
      setLoading(false);
      return;
    }

    try {
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      const { count, error } = await supabase
        .from('ai_chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'user')
        .gte('created_at', firstDayOfMonth.toISOString());

      if (error) {
        console.error('Error fetching AI chat usage:', error);
      } else {
        setMessagesUsed(count || 0);
      }
    } catch (error) {
      console.error('Error in fetchMonthlyUsage:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.cabañaId]);

  useEffect(() => {
    fetchMonthlyUsage();
  }, [fetchMonthlyUsage]);

  const plan = subscriptionStatus?.plan || 'free';
  const monthlyLimit = PLAN_LIMITS[plan] ?? Infinity;
  
  // All plans have access now (free gets 3 msgs)
  const hasAccess = true;
  
  // Unlimited if no cap defined for the plan
  const isUnlimited = monthlyLimit === Infinity;
  
  // Calculate remaining messages
  const messagesRemaining = isUnlimited ? Infinity : Math.max(0, monthlyLimit - messagesUsed);
  
  // Check if limit is reached
  const limitReached = !isUnlimited && messagesUsed >= monthlyLimit;

  const incrementUsage = useCallback(() => {
    setMessagesUsed(prev => prev + 1);
  }, []);

  return {
    hasAccess,
    isUnlimited,
    messagesUsed,
    messagesRemaining,
    limitReached,
    loading: loading || subscriptionLoading,
    incrementUsage,
    refreshUsage: fetchMonthlyUsage,
    monthlyLimit
  };
};
