import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';
import { useAchievements } from './useAchievements';

/**
 * Hook that automatically triggers achievement checks based on user data.
 * Call this on Dashboard load to check all achievement categories.
 */
export function useAchievementTriggers() {
  const { currentUser } = useSupabaseAuth();
  const { checkAndUnlockAchievements } = useAchievements();

  const checkAllAchievements = useCallback(async () => {
    if (!currentUser?.id || !currentUser?.cabañaId) return;

    const cabanaId = currentUser.cabañaId;
    console.log('🏆 Checking achievements for cabaña:', cabanaId);

    try {
      // 1. Herd achievement - count active animals
      const { count: animalsCount } = await supabase
        .from('animals')
        .select('id', { count: 'exact', head: true })
        .eq('cabaña_id', cabanaId)
        .not('status', 'in', '("vendido","muerto","Vendido","Muerto")');

      if (animalsCount && animalsCount > 0) {
        console.log(`🐄 Animals count: ${animalsCount}`);
        await checkAndUnlockAchievements('herd', animalsCount);
      }

      // 2. Activities achievement - count all activities (eventos)
      const { count: eventosCount } = await supabase
        .from('eventos')
        .select('id', { count: 'exact', head: true })
        .eq('cabaña_id', cabanaId);

      if (eventosCount && eventosCount > 0) {
        console.log(`📋 Activities count: ${eventosCount}`);
        await checkAndUnlockAchievements('activities', eventosCount);
      }

      // 3. Vaccination achievement - count unique vaccination records
      const { count: vaccinesCount } = await supabase
        .from('animal_vaccines')
        .select('id', { count: 'exact', head: true })
        .eq('cabaña_id', cabanaId);

      if (vaccinesCount && vaccinesCount > 0) {
        console.log(`💉 Vaccinations count: ${vaccinesCount}`);
        await checkAndUnlockAchievements('vaccination', vaccinesCount);
      }

      // 4. Finance achievement - count finance movements
      const { count: financesCount } = await supabase
        .from('finances')
        .select('id', { count: 'exact', head: true })
        .eq('cabaña_id', cabanaId);

      if (financesCount && financesCount > 0) {
        console.log(`💰 Finance movements count: ${financesCount}`);
        await checkAndUnlockAchievements('finance', financesCount);
      }

      // 5. Corral achievement - count corrals
      const { count: corralsCount } = await supabase
        .from('corrales')
        .select('id', { count: 'exact', head: true })
        .eq('cabaña_id', cabanaId);

      if (corralsCount && corralsCount > 0) {
        console.log(`🏠 Corrals count: ${corralsCount}`);
        await checkAndUnlockAchievements('corrals', corralsCount);
      }

      // 6. Streak achievement - calculate consecutive days with activity
      const streakDays = await calculateStreak(cabanaId);
      if (streakDays > 0) {
        console.log(`🔥 Streak days: ${streakDays}`);
        await checkAndUnlockAchievements('streak', streakDays);
      }

      console.log('✅ Achievement check complete');
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }, [currentUser?.id, currentUser?.cabañaId, checkAndUnlockAchievements]);

  // Auto-check on mount when user is available
  useEffect(() => {
    if (currentUser?.cabañaId) {
      checkAllAchievements();
    }
  }, [currentUser?.cabañaId, checkAllAchievements]);

  return { checkAllAchievements };
}

/**
 * Calculate consecutive days with at least one activity
 */
async function calculateStreak(cabanaId: string): Promise<number> {
  try {
    // Get all activity dates from last 100 days
    const hundredDaysAgo = new Date();
    hundredDaysAgo.setDate(hundredDaysAgo.getDate() - 100);

    const [eventosRes, vaccinesRes, inseminationsRes] = await Promise.all([
      supabase
        .from('eventos')
        .select('fecha')
        .eq('cabaña_id', cabanaId)
        .gte('fecha', hundredDaysAgo.toISOString().split('T')[0]),
      supabase
        .from('animal_vaccines')
        .select('date')
        .eq('cabaña_id', cabanaId)
        .gte('date', hundredDaysAgo.toISOString().split('T')[0]),
      supabase
        .from('artificial_inseminations')
        .select('insemination_date')
        .eq('cabaña_id', cabanaId)
        .gte('insemination_date', hundredDaysAgo.toISOString().split('T')[0])
    ]);

    // Collect all unique dates
    const dates = new Set<string>();
    (eventosRes.data || []).forEach(e => dates.add(e.fecha));
    (vaccinesRes.data || []).forEach(v => dates.add(v.date));
    (inseminationsRes.data || []).forEach(i => dates.add(i.insemination_date));

    // Calculate streak from today going backwards
    let streak = 0;
    const today = new Date();
    
    for (let i = 0; i <= 100; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      if (dates.has(dateStr)) {
        streak++;
      } else if (i > 0) {
        // Allow today to be missing (user hasn't done anything yet today)
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Error calculating streak:', error);
    return 0;
  }
}
