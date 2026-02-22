import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from './useSupabaseAuth';
import { useAchievements } from './useAchievements';

/**
 * Hook that automatically triggers achievement checks based on user data.
 * Call this on Dashboard load to check all achievement categories.
 * All queries run in parallel for near-instant loading.
 */
export function useAchievementTriggers() {
  const { currentUser } = useSupabaseAuth();
  const { checkAndUnlockAchievements } = useAchievements();
  const hasChecked = useRef(false);

  const checkAllAchievements = useCallback(async () => {
    if (!currentUser?.id || !currentUser?.cabañaId) return;
    // Only check once per session
    if (hasChecked.current) return;
    hasChecked.current = true;

    const cabanaId = currentUser.cabañaId;

    try {
      // Calculate date range for streak
      const hundredDaysAgo = new Date();
      hundredDaysAgo.setDate(hundredDaysAgo.getDate() - 100);
      const hundredDaysAgoStr = hundredDaysAgo.toISOString().split('T')[0];

      // Run ALL queries in parallel (counts + streak data)
      const [
        animalsRes,
        eventosRes,
        vaccinesRes,
        financesRes,
        corralsRes,
        streakEventosRes,
        streakVaccinesRes,
        streakInseminationsRes,
      ] = await Promise.all([
        supabase.from('animals').select('id', { count: 'exact', head: true })
          .eq('cabaña_id', cabanaId)
          .not('status', 'in', '("vendido","muerto","Vendido","Muerto")'),
        supabase.from('eventos').select('id', { count: 'exact', head: true })
          .eq('cabaña_id', cabanaId),
        supabase.from('animal_vaccines').select('id', { count: 'exact', head: true })
          .eq('cabaña_id', cabanaId),
        supabase.from('finances').select('id', { count: 'exact', head: true })
          .eq('cabaña_id', cabanaId),
        supabase.from('corrales').select('id', { count: 'exact', head: true })
          .eq('cabaña_id', cabanaId),
        supabase.from('eventos').select('fecha')
          .eq('cabaña_id', cabanaId)
          .gte('fecha', hundredDaysAgoStr),
        supabase.from('animal_vaccines').select('date')
          .eq('cabaña_id', cabanaId)
          .gte('date', hundredDaysAgoStr),
        supabase.from('artificial_inseminations').select('insemination_date')
          .eq('cabaña_id', cabanaId)
          .gte('insemination_date', hundredDaysAgoStr),
      ]);

      // Calculate streak from pre-fetched data
      const dates = new Set<string>();
      (streakEventosRes.data || []).forEach(e => dates.add(e.fecha));
      (streakVaccinesRes.data || []).forEach(v => dates.add(v.date));
      (streakInseminationsRes.data || []).forEach(i => dates.add(i.insemination_date));

      let streak = 0;
      const today = new Date();
      for (let i = 0; i <= 100; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toISOString().split('T')[0];
        if (dates.has(dateStr)) {
          streak++;
        } else if (i > 0) {
          break;
        }
      }

      // Now check achievements with pre-fetched counts (these are fast, in-memory)
      const checks: Array<[string, number]> = [];
      if (animalsRes.count && animalsRes.count > 0) checks.push(['herd', animalsRes.count]);
      if (eventosRes.count && eventosRes.count > 0) checks.push(['activities', eventosRes.count]);
      if (vaccinesRes.count && vaccinesRes.count > 0) checks.push(['vaccination', vaccinesRes.count]);
      if (financesRes.count && financesRes.count > 0) checks.push(['finance', financesRes.count]);
      if (corralsRes.count && corralsRes.count > 0) checks.push(['corrals', corralsRes.count]);
      if (streak > 0) checks.push(['streak', streak]);

      // Run all unlock checks
      for (const [category, value] of checks) {
        await checkAndUnlockAchievements(category, value);
      }

      console.log('✅ Achievement check complete');
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  }, [currentUser?.id, currentUser?.cabañaId, checkAndUnlockAchievements]);

  useEffect(() => {
    if (currentUser?.cabañaId) {
      checkAllAchievements();
    }
  }, [currentUser?.cabañaId, checkAllAchievements]);

  return { checkAllAchievements };
}
