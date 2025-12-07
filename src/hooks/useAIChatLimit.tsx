import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

const PERSONAL_MONTHLY_LIMIT = 20;

export interface AIChatLimitStatus {
  hasAccess: boolean;
  isUnlimited: boolean;
  messagesUsed: number;
  messagesRemaining: number;
  limitReached: boolean;
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
      // Get the first day of current month
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
  
  // Free plan has no access
  const hasAccess = plan !== 'free';
  
  // Personal plan has limited access, all others are unlimited
  const isUnlimited = hasAccess && plan !== 'personal';
  
  // Calculate remaining messages for personal plan
  const messagesRemaining = isUnlimited ? Infinity : Math.max(0, PERSONAL_MONTHLY_LIMIT - messagesUsed);
  
  // Check if limit is reached (only for personal plan)
  const limitReached = !isUnlimited && messagesUsed >= PERSONAL_MONTHLY_LIMIT;

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
    monthlyLimit: PERSONAL_MONTHLY_LIMIT
  };
};
