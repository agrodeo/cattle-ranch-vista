import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
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
  pregnancyPercentage: number;
  reproductiveFemales: number;
  pregnantFemales: number;
}

interface RecentActivity {
  id: string;
  type: string;
  date: string;
  description: string;
  animal_name?: string;
  animal_id?: string;
  user?: string;
  animalCount?: number;
  details?: {
    vacuna?: string;
    lote?: string;
    dosis?: string;
    via?: string;
    toro_nombre?: string;
    raza_toro?: string;
    positivos?: number;
    negativos?: number;
    peso_promedio?: number;
    notas?: string;
  };
}

interface UpcomingActivity {
  id: string;
  type: string;
  date: string;
  description: string;
  animal_name?: string;
}

interface DashboardWarning {
  id: string;
  type: 'consanguinity' | 'vaccination' | 'vaccination_due' | 'vaccination_overdue' | 'birth_upcoming' | 'birth_overdue' | 'reproductive';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  affected_count?: number;
  animal_id?: string;
  animal_name?: string;
  animal_tag?: string;
  expected_date?: string;
  days_until?: number;
  days_overdue?: number;
  vaccine_name?: string;
  alert_type?: string;
}

interface DashboardWarnings {
  noCabana: boolean;
  nearAnimalLimit: boolean;
  overAnimalLimit: boolean;
  alerts: DashboardWarning[];
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
  recentActivities: RecentActivity[];
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
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentUser } = useSupabaseAuth();
  const { subscriptionStatus } = useSubscription();
  
  const [cabana, setCabana] = useState<CabanaInfo | null>(null);
  const [counts, setCounts] = useState<DashboardCounts>({
    animalsActive: 0,
    corrals: 0,
    activitiesLast7d: 0,
    servicesTotal: 0,
    pregnancyPercentage: 0,
    reproductiveFemales: 0,
    pregnantFemales: 0,
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [upcoming, setUpcoming] = useState<{ activitiesNext7d: UpcomingActivity[] }>({
    activitiesNext7d: [],
  });
  const [warnings, setWarnings] = useState<DashboardWarnings>({
    noCabana: false,
    nearAnimalLimit: false,
    overAnimalLimit: false,
    alerts: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any[]>([]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      setIsError(false);

      // Validate user is available
      if (!currentUser?.id) {
        console.log('⚠️ No current user available');
        setIsLoading(false);
        return;
      }

      console.log('🏠 Fetching cabaña for user:', currentUser.id);
      
      // Get the user's cabaña using the same RPC as Animals.tsx with proper parameter
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_user_cabana_info', {
        user_uuid: currentUser.id
      });
      
      console.log('RPC response:', { data: rpcData, error: rpcError });
      
      if (rpcError) {
        console.error('❌ Error getting cabaña:', rpcError);
        throw new Error(`Error getting cabaña: ${rpcError.message}`);
      }
      
      if (!rpcData || rpcData.length === 0) {
        console.log('⚠️ No cabaña found for user');
        setWarnings(prev => ({ ...prev, noCabana: true }));
        setCabana(null);
        setIsLoading(false);
        return;
      }
      
      const userCabana = rpcData[0];
      const cabanaId = userCabana.cabana_id;
      console.log('✅ Setting userCabaña to:', cabanaId);
      
      const cabanaInfo: CabanaInfo = {
        id: cabanaId,
        name: userCabana.cabana_name || 'Mi Cabaña',
        plan: subscriptionStatus?.plan || 'free',
        animal_limit: subscriptionStatus?.maxAnimals || 50,
      };
      
      setCabana(cabanaInfo);
      setWarnings(prev => ({ ...prev, noCabana: false }));
      
      // -------- DIAGNÓSTICO: probar varias combinaciones de filtros ----------
      const runCount = async (label: string, filters: any) => {
        try {
          const q = supabase.from('animals').select('id', { count: 'exact', head: true });
          if (filters.cabana && cabanaId) q.eq('cabaña_id', cabanaId);
          if (filters.status) q.in('status', filters.status);
          const { count, error } = await q;
          return { label, count: count ?? 0, error: error?.message ?? null, filters, cabanaId };
        } catch (e: any) {
          return { label, count: 0, error: e.message, filters, cabanaId };
        }
      };

      const diag = [];
      diag.push(await runCount('Total animals (no filters)', { cabana: false, status: null }));
      diag.push(await runCount('Animals in cabaña', { cabana: true, status: null }));
      diag.push(await runCount('Active animals (lowercase)', { cabana: true, status: ['activo'] }));
      diag.push(await runCount('Active animals (uppercase)', { cabana: true, status: ['Activo'] }));
      diag.push(await runCount('Active animals (both)', { cabana: true, status: ['activo', 'Activo'] }));

      setDiagnostics(diag);
      console.group('🔍 Dashboard Animal Count Diagnostics');
      console.table(diag.map(d => ({ ...d.filters, label: d.label, count: d.count, error: d.error, cabanaId: d.cabanaId })));
      console.groupEnd();

      // Calculate date ranges
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      const sevenDaysFromNow = new Date(today);
      sevenDaysFromNow.setDate(today.getDate() + 7);

      // Count active animals - exclude only sold/dead (match subscription logic)
      const { count: animalsCount, error: animalsError } = await supabase
        .from('animals')
        .select('id', { count: 'exact', head: true })
        .eq('cabaña_id', cabanaId)
        .not('status', 'in', '("vendido","muerto")');

      if (animalsError) {
        console.error('Error counting animals:', animalsError);
        console.log('Animals count result:', { animalsCount, animalsError });
      } else {
        console.log(`✅ Found ${animalsCount} active animals in cabaña ${cabanaId}`);
      }

      // Count corrals
      const { count: corralsCount, error: corralsError } = await supabase
        .from('corrales')
        .select('id', { count: 'exact', head: true })
        .eq('cabaña_id', cabanaId);

      if (corralsError) {
        console.error('Error counting corrals:', corralsError);
        throw corralsError;
      }

      // Count activities from last 7 days (using eventos table like in the app)
      const { count: activitiesCount, error: activitiesError } = await supabase
        .from('eventos')
        .select('id', { count: 'exact', head: true })
        .eq('cabaña_id', cabanaId)
        .gte('fecha', thirtyDaysAgo.toISOString().split('T')[0]);

      if (activitiesError) {
        console.error('Error counting activities:', activitiesError);
        throw activitiesError;
      }

      // Count total AI services
      const { count: servicesCount, error: servicesError } = await supabase
        .from('artificial_inseminations')
        .select('id', { count: 'exact', head: true })
        .eq('cabaña_id', cabanaId);

      if (servicesError) {
        console.error('Error counting services:', servicesError);
        throw servicesError;
      }

      // Count reproductive females (≥15 months, active)
      const { data: reproductiveFemalesData, error: reproFemalesError } = await supabase
        .from('animals')
        .select('id, birth_date, esta_preñada')
        .eq('cabaña_id', cabanaId)
        .eq('sex', 'Hembra')
        .not('status', 'in', '("vendido","muerto")');

      let reproductiveFemalesCount = 0;
      let pregnantFemalesCount = 0;

      if (!reproFemalesError && reproductiveFemalesData) {
        reproductiveFemalesData.forEach((animal: any) => {
          if (animal.birth_date) {
            const birthDate = new Date(animal.birth_date);
            const ageMonths = (today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
            if (ageMonths >= 15) {
              reproductiveFemalesCount++;
              if (animal.esta_preñada) {
                pregnantFemalesCount++;
              }
            }
          }
        });
      }

      const pregnancyPercentage = reproductiveFemalesCount > 0 
        ? Math.round((pregnantFemalesCount / reproductiveFemalesCount) * 100)
        : 0;

      // Get recent activities (últimas 5 actividades sin importar fecha)
      console.log('🔍 Fetching recent activities');
      const { data: recentData, error: recentError } = await supabase
        .from('eventos')
        .select(`
          id, 
          tipo, 
          fecha, 
          notas,
          payload,
          creado_por,
          vacunaciones(vacuna, lote, dosis, via, animales_ids),
          ia(toro_nombre, raza_toro, animales_ids),
          tactos(resultados)
        `)
        .eq('cabaña_id', cabanaId)
        .order('fecha', { ascending: false })
        .limit(5);
      
      console.log('📊 Recent activities result:', { count: recentData?.length, error: recentError, data: recentData });

      if (recentError) {
        console.error('Error fetching recent activities:', recentError);
      }

      // Get upcoming activities (next 7 days) - using eventos table
      const { data: upcomingData, error: upcomingError } = await supabase
        .from('eventos')
        .select('id, tipo, fecha')
        .eq('cabaña_id', cabanaId)
        .gte('fecha', today.toISOString().split('T')[0])
        .lte('fecha', sevenDaysFromNow.toISOString().split('T')[0])
        .order('fecha', { ascending: true })
        .limit(5);

      if (upcomingError) {
        console.error('Error fetching upcoming activities:', upcomingError);
      }

      // Get warnings: consanguinity and vaccination alerts
      const warnings: DashboardWarning[] = [];

      // Check for consanguinity warnings
      const { data: consanguinityData, error: consanguinityError } = await supabase
        .from('animals')
        .select(`
          id,
          name,
          father_id,
          mother_id,
          corrales(name)
        `)
        .eq('cabaña_id', cabanaId)
        .not('father_id', 'is', null)
        .not('mother_id', 'is', null);

      if (!consanguinityError && consanguinityData) {
        // Simple consanguinity check - animals in same corral with common parents
        const corralGroups = new Map<string, any[]>();
        consanguinityData.forEach(animal => {
          if (animal.corrales?.name) {
            const corralName = animal.corrales.name;
            if (!corralGroups.has(corralName)) {
              corralGroups.set(corralName, []);
            }
            corralGroups.get(corralName)!.push(animal);
          }
        });

        let consanguinityCount = 0;
        corralGroups.forEach((animals, corralName) => {
          if (animals.length > 1) {
            const parentPairs = new Set();
            animals.forEach(animal => {
              parentPairs.add(`${animal.father_id}-${animal.mother_id}`);
            });
            if (parentPairs.size < animals.length) {
              consanguinityCount++;
            }
          }
        });

        if (consanguinityCount > 0) {
          warnings.push({
            id: 'consanguinity',
            type: 'consanguinity',
            title: 'Riesgo de Consanguinidad',
            description: `${consanguinityCount} corral(es) con posible consanguinidad detectada`,
            severity: 'high',
            affected_count: consanguinityCount
          });
        }
      }

      // Fetch vaccination alerts (due soon and overdue)
      const sevenDaysFromToday = new Date(today);
      sevenDaysFromToday.setDate(today.getDate() + 7);

      const { data: vaccinationAlerts, error: vaccinationError } = await supabase
        .from('animal_vaccines')
        .select(`
          id,
          animal_id,
          vaccine_code,
          next_due,
          animals!inner(id, id_tag, name, status)
        `)
        .eq('animals.cabaña_id', cabanaId)
        .not('animals.status', 'in', '("vendido","muerto")')
        .not('next_due', 'is', null)
        .eq('is_complete', false);

      if (!vaccinationError && vaccinationAlerts) {
        vaccinationAlerts.forEach((vaccine: any) => {
          if (vaccine.next_due && vaccine.animals) {
            const dueDate = new Date(vaccine.next_due);
            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
              // Overdue vaccine
              warnings.push({
                id: `vaccination_overdue_${vaccine.id}`,
                type: 'vaccination_overdue',
                title: t('common:notifications.vaccinationOverdue'),
                description: `${vaccine.animals.name || vaccine.animals.id_tag} - ${vaccine.vaccine_code}`,
                severity: 'high',
                animal_id: vaccine.animal_id,
                animal_name: vaccine.animals.name,
                animal_tag: vaccine.animals.id_tag,
                vaccine_name: vaccine.vaccine_code,
                days_overdue: Math.abs(diffDays),
              });
            } else if (diffDays <= 7) {
              // Due soon vaccine
              warnings.push({
                id: `vaccination_due_${vaccine.id}`,
                type: 'vaccination_due',
                title: t('common:notifications.vaccinationDue'),
                description: `${vaccine.animals.name || vaccine.animals.id_tag} - ${vaccine.vaccine_code}`,
                severity: 'medium',
                animal_id: vaccine.animal_id,
                animal_name: vaccine.animals.name,
                animal_tag: vaccine.animals.id_tag,
                vaccine_name: vaccine.vaccine_code,
                expected_date: vaccine.next_due,
                days_until: diffDays,
              });
            }
          }
        });
      }

      // Fetch birth/calving alerts (upcoming and overdue)
      const fourteenDaysFromToday = new Date(today);
      fourteenDaysFromToday.setDate(today.getDate() + 14);

      const { data: pregnancyAlerts, error: pregnancyError } = await supabase
        .from('preñeces')
        .select(`
          id,
          animal_id,
          fecha_estimada_parto,
          animals!inner(id, id_tag, name, status)
        `)
        .eq('estado_final', 'activa')
        .eq('animals.cabaña_id', cabanaId)
        .not('animals.status', 'in', '("vendido","muerto")')
        .not('fecha_estimada_parto', 'is', null);

      if (!pregnancyError && pregnancyAlerts) {
        pregnancyAlerts.forEach((pregnancy: any) => {
          if (pregnancy.fecha_estimada_parto && pregnancy.animals) {
            const expectedDate = new Date(pregnancy.fecha_estimada_parto);
            const diffTime = expectedDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays < 0) {
              // Overdue birth
              warnings.push({
                id: `birth_overdue_${pregnancy.id}`,
                type: 'birth_overdue',
                title: t('common:notifications.overdueBirths'),
                description: `${pregnancy.animals.name || pregnancy.animals.id_tag}`,
                severity: 'high',
                animal_id: pregnancy.animal_id,
                animal_name: pregnancy.animals.name,
                animal_tag: pregnancy.animals.id_tag,
                expected_date: pregnancy.fecha_estimada_parto,
                days_overdue: Math.abs(diffDays),
              });
            } else if (diffDays <= 14) {
              // Upcoming birth
              warnings.push({
                id: `birth_upcoming_${pregnancy.id}`,
                type: 'birth_upcoming',
                title: t('common:notifications.upcomingBirths'),
                description: `${pregnancy.animals.name || pregnancy.animals.id_tag}`,
                severity: 'medium',
                animal_id: pregnancy.animal_id,
                animal_name: pregnancy.animals.name,
                animal_tag: pregnancy.animals.id_tag,
                expected_date: pregnancy.fecha_estimada_parto,
                days_until: diffDays,
              });
            }
          }
        });
      }

      // Fetch reproductive alerts
      const { data: reproductiveAlertsData, error: reproductiveError } = await supabase
        .from('reproductive_alerts')
        .select(`
          id,
          animal_id,
          alert_type,
          alert_date,
          expected_date,
          days_overdue,
          animals!inner(id, id_tag, name, status)
        `)
        .eq('status', 'pending')
        .eq('animals.cabaña_id', cabanaId)
        .not('animals.status', 'in', '("vendido","muerto")');

      if (!reproductiveError && reproductiveAlertsData) {
        reproductiveAlertsData.forEach((alert: any) => {
          if (alert.animals) {
            warnings.push({
              id: `reproductive_${alert.id}`,
              type: 'reproductive',
              title: t('common:notifications.reproductiveAlerts'),
              description: `${alert.animals.name || alert.animals.id_tag} - ${alert.alert_type}`,
              severity: 'high',
              animal_id: alert.animal_id,
              animal_name: alert.animals.name,
              animal_tag: alert.animals.id_tag,
              alert_type: alert.alert_type,
              expected_date: alert.expected_date,
              days_overdue: alert.days_overdue,
            });
          }
        });
      }

      // Update counts
      setCounts({
        animalsActive: animalsCount || 0,
        corrals: corralsCount || 0,
        activitiesLast7d: activitiesCount || 0,
        servicesTotal: servicesCount || 0,
        pregnancyPercentage,
        reproductiveFemales: reproductiveFemalesCount,
        pregnantFemales: pregnantFemalesCount,
      });

      // Update recent activities with detailed information
      const enrichedActivities = (recentData || []).map(activity => {
        const details: any = {};
        let animalCount = 0;

        // Vaccination details no longer from old vacunaciones table
        // Now handled through animal_vaccines table with activities

        // Extract AI details
        if (activity.ia && activity.ia.length > 0) {
          const ia = activity.ia[0];
          details.toro_nombre = ia.toro_nombre;
          details.raza_toro = ia.raza_toro;
          animalCount = ia.animales_ids?.length || 0;
        }

        // Extract tacto details
        if (activity.tactos && activity.tactos.length > 0) {
          const tacto = activity.tactos[0];
          if (tacto.resultados && Array.isArray(tacto.resultados)) {
            const positivos = tacto.resultados.filter((r: any) => r.resultado === 'preñada').length;
            const negativos = tacto.resultados.filter((r: any) => r.resultado === 'vacia').length;
            details.positivos = positivos;
            details.negativos = negativos;
            animalCount = tacto.resultados.length;
          }
        }

        // Extract payload details for weighing and other activities
        if (activity.payload && typeof activity.payload === 'object') {
          const payload = activity.payload as any;
          if (activity.tipo.toLowerCase().includes('pesa') && payload.pesajes) {
            const pesajes = payload.pesajes;
            if (Array.isArray(pesajes) && pesajes.length > 0) {
              const totalPeso = pesajes.reduce((sum: number, p: any) => sum + (p.peso_kg || 0), 0);
              details.peso_promedio = Math.round(totalPeso / pesajes.length);
              animalCount = pesajes.length;
            }
          }
        }

        // Add notes if available
        if (activity.notas) {
          details.notas = activity.notas;
        }

        return {
          id: activity.id,
          type: activity.tipo || 'General',
          date: activity.fecha || '',
          description: activity.notas || activity.tipo || '',
          user: undefined, // Will be populated below
          user_id: activity.creado_por,
          animalCount,
          details: Object.keys(details).length > 0 ? details : undefined,
        };
      });

      // Fetch user names for all activities at once
      const userIds = [...new Set(enrichedActivities.map(a => a.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds);
        
        if (profilesData) {
          const profileMap = new Map(profilesData.map(p => [p.user_id, p.full_name]));
          enrichedActivities.forEach(activity => {
            if (activity.user_id) {
              activity.user = profileMap.get(activity.user_id);
            }
          });
        }
      }

      setRecentActivities(enrichedActivities);

      // Update upcoming activities
      setUpcoming({
        activitiesNext7d: upcomingData?.map(activity => ({
          id: activity.id,
          type: activity.tipo || 'General',
          date: activity.fecha || '',
          description: activity.tipo || '',
        })) || [],
      });

      // Calculate warnings - only if we have valid subscription data
      const animalRatio = (animalsCount || 0) / cabanaInfo.animal_limit;
      const hasValidSubscription = subscriptionStatus !== null && subscriptionStatus.maxAnimals > 0;
      
      console.log('📊 Warning calculation:', {
        animalsCount,
        animalLimit: cabanaInfo.animal_limit,
        animalRatio,
        hasValidSubscription,
        subscriptionStatus
      });
      
      setWarnings({
        noCabana: false,
        nearAnimalLimit: hasValidSubscription && animalRatio >= 0.85 && animalRatio < 1.0,
        overAnimalLimit: hasValidSubscription && animalRatio >= 1.0,
        alerts: warnings,
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [subscriptionStatus, currentUser]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Set up real-time subscriptions for auto-refresh
  useEffect(() => {
    if (!cabana?.id) return;

    const channel = supabase
      .channel('dashboard-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'animals' },
        () => fetchDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'eventos' },
        () => fetchDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'corrales' },
        () => fetchDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'animal_vaccines' },
        () => fetchDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'preñeces' },
        () => fetchDashboardData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reproductive_alerts' },
        () => fetchDashboardData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cabana?.id, fetchDashboardData]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!cabana?.id) return;

    const channel = supabase
      .channel('dashboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'animals',
          filter: `cabaña_id=eq.${cabana.id}`,
        },
        () => {
          console.log('🔄 Animals changed, refetching dashboard data');
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'eventos',
          filter: `cabaña_id=eq.${cabana.id}`,
        },
        () => {
          console.log('🔄 Eventos changed, refetching dashboard data');
          fetchDashboardData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'corrales',
          filter: `cabaña_id=eq.${cabana.id}`,
        },
        () => {
          console.log('🔄 Corrales changed, refetching dashboard data');
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cabana?.id, fetchDashboardData]);

  return {
    cabana,
    counts,
    recentActivities,
    upcoming,
    warnings,
    isLoading,
    isError,
    diagnostics,
    refetch: fetchDashboardData,
  };
};