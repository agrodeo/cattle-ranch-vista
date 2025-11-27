import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';
import { ACHIEVEMENT_DEFINITIONS, calculateProgress, type MedalTier } from '@/lib/achievements';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface UnlockedAchievement {
  id: string;
  achievement_code: string;
  achievement_category: string;
  medal_tier: MedalTier;
  unlocked_at: string;
  progress_value: number;
  shared_count: number;
}

export function useAchievements() {
  const { currentUser } = useSupabaseAuth();
  const { t } = useTranslation(['common']);
  const [achievements, setAchievements] = useState<UnlockedAchievement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAchievements = async () => {
    if (!currentUser?.id) return;

    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('unlocked_at', { ascending: false });

    if (!error && data) {
      setAchievements(data as UnlockedAchievement[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAchievements();
  }, [currentUser?.id]);

  const checkAndUnlockAchievements = async (category: string, currentValue: number) => {
    if (!currentUser?.id || !currentUser?.cabañaId) return;

    const relevantAchievements = ACHIEVEMENT_DEFINITIONS.filter(
      def => def.category === category
    );

    for (const definition of relevantAchievements) {
      const { currentTier } = calculateProgress(currentValue, definition);
      
      if (currentTier) {
        // Check if already unlocked
        const existing = achievements.find(
          a => a.achievement_code === definition.code && a.medal_tier === currentTier
        );

        if (!existing) {
          // Unlock achievement
          const { data, error } = await supabase
            .from('user_achievements')
            .insert({
              user_id: currentUser.id,
              cabaña_id: currentUser.cabañaId,
              achievement_code: definition.code,
              achievement_category: category,
              medal_tier: currentTier,
              progress_value: currentValue
            })
            .select()
            .single();

          if (!error && data) {
            setAchievements(prev => [data as UnlockedAchievement, ...prev]);
            
            // Show celebration toast
            toast.success(
              t('common:achievements.medal_unlocked', { tier: t(`common:achievements.tiers.${currentTier}`) }),
              {
                description: t(definition.nameKey),
                duration: 5000
              }
            );
          }
        }
      }
    }
  };

  const incrementShareCount = async (achievementId: string) => {
    await supabase.rpc('increment_achievement_share', {
      achievement_id: achievementId
    });
    
    setAchievements(prev => 
      prev.map(a => 
        a.id === achievementId 
          ? { ...a, shared_count: a.shared_count + 1 }
          : a
      )
    );
  };

  return {
    achievements,
    loading,
    checkAndUnlockAchievements,
    incrementShareCount,
    refetch: fetchAchievements
  };
}