import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { normalizeStatus } from '@/lib/status';
import { isValidUUID } from '@/lib/cabana';

interface DashboardCounts {
  animalsActive: number;
  corrals: number;
  activitiesLast7d: number;
  servicesTotal: number;
}

interface UpcomingActivity {
  id: string;
  type: string;
  date: string;
  description: string;
  animal_name?: string;
}

interface DashboardWarnings {
  noCabana: boolean;
  nearAnimalLimit: boolean;
  overAnimalLimit: boolean;
}

interface CabanaInfo {
  id: string;
  name: string;
  plan: string;
  animal_limit: number;
}

interface DashboardSummary {
  cabana: CabanaInfo | null;
  counts: DashboardCounts;
  upcoming: {
    activitiesNext7d: UpcomingActivity[];
  };
  warnings: DashboardWarnings;
  isLoading: boolean;
  isError: boolean;
  diagnostics: any[];
  refetch: () => void;
}

export const useDashboardSummary = (): DashboardSummary => {
  const { currentUser } = useSupabaseAuth();
  const { subscriptionStatus } = useSubscription();
  
  const [cabana, setCabana] = useState<CabanaInfo | null>(null);
  const [counts, setCounts] = useState<DashboardCounts>({
    animalsActive: 0,
    corrals: 0,
    activitiesLast7d: 0,
    servicesTotal: 0,
  });
  const [upcoming, setUpcoming] = useState<{ activitiesNext7d: UpcomingActivity[] }>({
    activitiesNext7d: [],
  });
  const [warnings, setWarnings] = useState<DashboardWarnings>({
    noCabana: false,
    nearAnimalLimit: false,
    overAnimalLimit: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    if (!currentUser?.cabañaId) {
      setWarnings(prev => ({ ...prev, noCabana: true }));
      setCabana(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setIsError(false);

      // -------- DIAGNÓSTICO: probar varias combinaciones de filtros ----------
      const runCount = async (label: string, filters: any) => {
        try {
          const q = supabase.from('animals').select('id', { count: 'exact', head: true });
          if (filters.cabana) q.eq('cabaña_id', currentUser.cabañaId);
          if (filters.status) q.in('status', filters.status);
          if (filters.noPlaceholder) q.is('is_placeholder', false);
          const { count, error } = await q;
          return { label, count: count ?? 0, error: error?.message ?? null, filters };
        } catch (e: any) {
          return { label, count: 0, error: e.message, filters };
        }
      };

      const diag = [];
      diag.push(await runCount('Total animals (no filters)', { cabana: false, status: null, noPlaceholder: false }));
      diag.push(await runCount('Animals in cabaña', { cabana: true, status: null, noPlaceholder: false }));
      diag.push(await runCount('Active animals (normalized)', { cabana: true, status: ['active'], noPlaceholder: true }));
      diag.push(await runCount('Active animals (both)', { cabana: true, status: ['activo', 'active'], noPlaceholder: true }));

      setDiagnostics(diag);
      console.group('🔍 Dashboard Animal Count Diagnostics');
      console.table(diag.map(d => ({ ...d.filters, label: d.label, count: d.count, error: d.error })));
      console.groupEnd();

      // Get cabaña info (use maybeSingle to avoid errors)
      const { data: cabanaData, error: cabanaError } = await supabase
        .from('cabañas')
        .select('id, name')
        .eq('id', currentUser.cabañaId)
        .maybeSingle();

      if (cabanaError) {
        console.error('Error fetching cabaña:', cabanaError);
        setWarnings(prev => ({ ...prev, noCabana: true }));
        setCabana(null);
        setIsLoading(false);
        return;
      }

      if (!cabanaData) {
        console.warn('No cabaña found for user:', currentUser.cabañaId);
        setWarnings(prev => ({ ...prev, noCabana: true }));
        setCabana(null);
        setIsLoading(false);
        return;
      }

      const cabanaInfo: CabanaInfo = {
        id: cabanaData.id,
        name: cabanaData.name,
        plan: subscriptionStatus?.plan || 'free',
        animal_limit: subscriptionStatus?.maxAnimals || 50,
      };
      setCabana(cabanaInfo);

      // Calculate date ranges
      const today = new Date();
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);

      // Count active animals (robust query with diagnostics)
      const { count: animalsCount, error: animalsError } = await supabase
        .from('animals')
        .select('id', { count: 'exact', head: true })
        .eq('cabaña_id', currentUser.cabañaId)
        .in('status', ['active', 'activo']) // Support both normalized and legacy values
        .neq('status', 'sold')
        .neq('status', 'vendido')
        .neq('status', 'dead')
        .neq('status', 'muerto');

      if (animalsError) {
        console.error('Error counting animals:', animalsError);
        console.log('Animals count result:', { animalsCount, animalsError });
      } else {
        console.log(`✅ Found ${animalsCount} active animals in cabaña ${currentUser.cabañaId}`);
      }

      // Count corrals
      const { count: corralsCount, error: corralsError } = await supabase
        .from('corrales')
        .select('id', { count: 'exact', head: true })
        .eq('cabaña_id', currentUser.cabañaId);

      if (corralsError) {
        console.error('Error counting corrals:', corralsError);
        throw corralsError;
      }

      // Count activities from last 7 days
      const { count: activitiesCount, error: activitiesError } = await supabase
        .from('activities')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .gte('date', sevenDaysAgo.toISOString().split('T')[0]);

      if (activitiesError) {
        console.error('Error counting activities:', activitiesError);
        throw activitiesError;
      }

      // Count total AI services
      const { count: servicesCount, error: servicesError } = await supabase
        .from('artificial_inseminations')
        .select('id', { count: 'exact', head: true })
        .eq('cabaña_id', currentUser.cabañaId);

      if (servicesError) {
        console.error('Error counting services:', servicesError);
        throw servicesError;
      }

      // Get upcoming activities (next 7 days) - simplified query for now
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('activities')
        .select('id, type, date, description')
        .eq('user_id', currentUser.id)
        .gte('date', today.toISOString().split('T')[0])
        .lte('date', sevenDaysFromNow.toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(5);

      if (upcomingError) {
        console.error('Error fetching upcoming activities:', upcomingError);
      }

      // Update counts
      setCounts({
        animalsActive: animalsCount || 0,
        corrals: corralsCount || 0,
        activitiesLast7d: activitiesCount || 0,
        servicesTotal: servicesCount || 0,
      });

      // Update upcoming activities
      setUpcoming({
        activitiesNext7d: upcomingData?.map(activity => ({
          id: activity.id,
          type: activity.type || 'General',
          date: activity.date || '',
          description: activity.description || '',
        })) || [],
      });

      // Calculate warnings
      const animalRatio = (animalsCount || 0) / cabanaInfo.animal_limit;
      setWarnings({
        noCabana: false,
        nearAnimalLimit: animalRatio >= 0.85 && animalRatio < 1.0,
        overAnimalLimit: animalRatio >= 1.0,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.cabañaId, currentUser?.id, subscriptionStatus]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!currentUser?.cabañaId) return;

    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'animals',
          filter: `cabaña_id=eq.${currentUser.cabañaId}`,
        },
        () => {
          console.log('Animals changed, refetching dashboard data');
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activities',
        },
        () => {
          console.log('Activities changed, refetching dashboard data');
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'corrales',
          filter: `cabaña_id=eq.${currentUser.cabañaId}`,
        },
        () => {
          console.log('Corrales changed, refetching dashboard data');
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.cabañaId, fetchDashboardData]);

  return {
    cabana,
    counts,
    upcoming,
    warnings,
    isLoading,
    isError,
    diagnostics,
    refetch: fetchDashboardData,
  };
};