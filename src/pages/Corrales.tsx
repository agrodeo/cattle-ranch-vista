import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { PageLoading } from "@/components/ui/page-loading";
import { useTranslation } from "react-i18next";
import { EmptyState } from "@/components/ui/empty-state";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Eye, 
  Plus, 
  Fence, 
  Move, 
  Users, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Shuffle, 
  Truck, 
  Syringe, 
  Scale, 
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Activity,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateCorralDialog } from "@/components/corrales/CreateCorralDialog";
import { CorralDetailDialog } from "@/components/corrales/CorralDetailDialog";
import { EditCorralDialog } from "@/components/corrales/EditCorralDialog";
import { MoveAnimalDialog } from "@/components/corrales/MoveAnimalDialog";
import { DeleteCorralDialog } from "@/components/corrales/DeleteCorralDialog";
import { CorralOptimizer } from "@/components/corrales/CorralOptimizer";
import { BulkMoveDialog } from "@/components/breeding/BulkMoveDialog";
import { CorralSuggestionsCard } from "@/components/corrales/CorralSuggestionsCard";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { analyzeCorralConsanguinity, Animal as ConsanguinityAnimal } from "@/lib/consanguinityAnalysis";
import { ReadOnlyProtectedAction } from "@/components/subscription/ReadOnlyProtectedAction";
import { useCorralKPIs } from "@/hooks/useCorralKPIs";
import { cn } from "@/lib/utils";
import { db } from "@/services/db";
import { useConnectivity } from "@/services/connectivity";
import type { CachedCorral } from "@/services/offlineTypes";

interface Corral {
  id: string;
  name: string;
  hectareas: number | null;
  animal_count: number;
  male_count: number;
  female_count: number;
  has_consanguinity_risk: boolean;
  risk_count: number;
  highest_severity: 'severe' | 'medium' | 'low' | null;
  vaccination_percentage?: number;
  vaccination_alerts?: number;
  avg_daily_gain?: number;
  recent_weighings_count?: number;
  last_weighing_date?: string;
  vaccination_status?: 'excellent' | 'good' | 'warning' | 'critical' | 'unknown';
  pregnancy_rate?: number;
  avg_weight?: number;
}

export default function Corrales() {
  const { t } = useTranslation(['corrals', 'common', 'animals']);
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();
  const { isOnline } = useConnectivity();
  const { kpis: corralKPIs, loading: kpisLoading } = useCorralKPIs();
  const [corrales, setCorrales] = useState<Corral[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalActiveAnimals, setTotalActiveAnimals] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showCorralOptimizer, setShowCorralOptimizer] = useState(false);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [selectedCorral, setSelectedCorral] = useState<string | null>(null);
  const [selectedCorralName, setSelectedCorralName] = useState<string>("");
  const [selectedCorralAnimalCount, setSelectedCorralAnimalCount] = useState<number>(0);

  // Load from cache first for instant display
  const loadFromCache = useCallback(async () => {
    if (!currentUser?.cabañaId) return;
    try {
      const cachedCorrales = await db.corrales_cache
        .where('cabaña_id')
        .equals(currentUser.cabañaId)
        .toArray();
      
      if (cachedCorrales.length > 0) {
        const processedCorrales: Corral[] = await Promise.all(
          cachedCorrales.map(async (corral) => {
            const animals = await db.animals_cache
              .where('corral_id')
              .equals(corral.id)
              .toArray();
            const activeAnimals = animals.filter(a => 
              a.status?.toLowerCase() === 'activo'
            );
            
            return {
              id: corral.id,
              name: corral.name,
              hectareas: corral.hectareas || null,
              animal_count: activeAnimals.length,
              male_count: activeAnimals.filter(a => a.sex === 'Macho').length,
              female_count: activeAnimals.filter(a => a.sex === 'Hembra').length,
              has_consanguinity_risk: false,
              risk_count: 0,
              highest_severity: null
            };
          })
        );
        
        setCorrales(processedCorrales);
        
        const allCachedAnimals = await db.animals_cache
          .where('cabaña_id')
          .equals(currentUser.cabañaId)
          .toArray();
        const activeCount = allCachedAnimals.filter(a => 
          a.status?.toLowerCase() === 'activo'
        ).length;
        setTotalActiveAnimals(activeCount);
      }
    } catch (err) {
      console.error('Error loading corrales from cache:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.cabañaId]);

  const syncFromServer = useCallback(async () => {
    if (!currentUser?.cabañaId || !isOnline) return;

    try {
      // Fetch total active animals count
      const { count: activeCount, error: countError } = await supabase
        .from('animals')
        .select('*', { count: 'exact', head: true })
        .eq('cabaña_id', currentUser.cabañaId)
        .eq('status', 'activo');

      if (countError) throw countError;
      setTotalActiveAnimals(activeCount || 0);

      // Fetch corrales with animals
      const { data: corralesData, error } = await supabase
        .from("corrales")
        .select(`
          id,
          name,
          hectareas,
          capacity,
          animals (
            id,
            name,
            id_tag,
            sex,
            birth_date,
            father_id,
            mother_id,
            status
          )
        `)
        .eq("cabaña_id", currentUser.cabañaId);

      if (error) throw error;

      // Get pending local IDs to avoid overwriting
      const pendingIds = (await db.corrales_cache
        .where('sync_status')
        .equals('pending')
        .toArray()
      ).map(c => c.id);

      // Update cache with server data
      for (const corral of corralesData || []) {
        if (pendingIds.includes(corral.id)) continue;
        
        await db.corrales_cache.put({
          id: corral.id,
          name: corral.name,
          hectareas: corral.hectareas,
          capacity: corral.capacity,
          cabaña_id: currentUser.cabañaId,
          updated_at: new Date().toISOString(),
          sync_status: 'synced'
        } as CachedCorral);
      }

      // Process data with consanguinity analysis
      const processedCorrales = await Promise.all(corralesData?.map(async (corral: any) => {
        const allAnimals = corral.animals || [];
        const activeAnimals = allAnimals.filter((a: any) => a.status?.toLowerCase() === "activo");
        const maleCount = activeAnimals.filter((a: any) => a.sex?.toLowerCase() === "macho").length;
        const femaleCount = activeAnimals.filter((a: any) => a.sex?.toLowerCase() === "hembra").length;
        
        let riskCount = 0;
        let highestSeverity: 'severe' | 'medium' | 'low' | null = null;
        
        if (activeAnimals.length > 0) {
          try {
            const risks = await analyzeCorralConsanguinity(
              activeAnimals as ConsanguinityAnimal[], 
              currentUser.cabañaId
            );
            riskCount = risks.length;
            
            if (risks.length > 0) {
              const severityOrder = { severe: 3, medium: 2, low: 1 };
              const maxSeverity = risks.reduce((prev, curr) => 
                severityOrder[curr.severity] > severityOrder[prev.severity] ? curr : prev
              );
              highestSeverity = maxSeverity.severity;
            }
          } catch (error) {
            console.error("Error analyzing consanguinity for corral:", corral.id, error);
          }
        }

        const kpiData = corralKPIs.find(kpi => kpi.corral_id === corral.id);

        return {
          id: corral.id,
          name: corral.name,
          hectareas: corral.hectareas,
          animal_count: activeAnimals.length,
          male_count: maleCount,
          female_count: femaleCount,
          has_consanguinity_risk: riskCount > 0,
          risk_count: riskCount,
          highest_severity: highestSeverity,
          vaccination_percentage: kpiData?.vaccination_percentage,
          vaccination_alerts: kpiData?.vaccination_alerts,
          avg_daily_gain: kpiData?.avg_daily_gain,
          recent_weighings_count: kpiData?.recent_weighings_count,
          last_weighing_date: kpiData?.last_weighing_date,
          vaccination_status: kpiData?.vaccination_status,
          pregnancy_rate: kpiData?.pregnancy_rate,
          avg_weight: kpiData?.avg_weight,
        };
      }) || []);

      setCorrales(processedCorrales);
    } catch (error) {
      console.error("Error syncing corrales:", error);
      if (corrales.length === 0) {
        toast({
          title: "Error",
          description: t('corrals:errors.loadError'),
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [currentUser?.cabañaId, isOnline, corralKPIs, corrales.length, t, toast]);

  const fetchCorrales = useCallback(async () => {
    if (!currentUser?.cabañaId) return;
    
    // Load from cache first
    await loadFromCache();
    
    // Then sync from server if online
    await syncFromServer();
  }, [currentUser?.cabañaId, loadFromCache, syncFromServer]);

  useEffect(() => {
    fetchCorrales();
  }, [fetchCorrales]);

  // Subscribe to vaccination changes in real-time to update KPIs
  useEffect(() => {
    if (!currentUser?.cabañaId) return;

    console.log('🔔 [Corrales] Subscribing to vaccination updates');
    
    const channel = supabase
      .channel('corrales-vaccination-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'animal_vaccines'
        },
        (payload) => {
          console.log('🔔 [Corrales] Vaccination update received, refreshing KPIs');
          // Refresh corrales data to update metrics
          fetchCorrales();
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 [Corrales] Unsubscribing from vaccination updates');
      supabase.removeChannel(channel);
    };
  }, [currentUser?.cabañaId]);

  const handleCreateSuccess = () => {
    fetchCorrales();
    setCreateDialogOpen(false);
  };

  const handleEditSuccess = () => {
    fetchCorrales();
    setEditDialogOpen(false);
  };

  const openDetailDialog = (corralId: string) => {
    setSelectedCorral(corralId);
    setDetailDialogOpen(true);
  };

  const openEditDialog = (corralId: string) => {
    setSelectedCorral(corralId);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (corralId: string, corralName: string, animalCount: number) => {
    setSelectedCorral(corralId);
    setSelectedCorralName(corralName);
    setSelectedCorralAnimalCount(animalCount);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    fetchCorrales();
    setDeleteDialogOpen(false);
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-primary';
  };

  const getOccupancyStatus = (percentage: number) => {
    if (percentage >= 90) return { label: t('corrals:status.overfull'), color: 'text-red-600' };
    if (percentage >= 75) return { label: t('corrals:status.full'), color: 'text-amber-600' };
    if (percentage >= 50) return { label: t('corrals:status.partial'), color: 'text-blue-600' };
    return { label: t('corrals:status.empty'), color: 'text-emerald-600' };
  };

  useEffect(() => {
    document.title = "Corrales | agrodeo";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Gestiona corrales y asignación de animales");
  }, []);

  // Calculate metrics
  const totalCorrales = corrales.length;
  const totalRisks = corrales.reduce((sum, corral) => sum + corral.risk_count, 0);
  
  // Calculate weighted average KPIs by animal count (so empty corrals don't drag down averages)
  const totalAnimalsInKPIs = corralKPIs.reduce((sum, kpi) => sum + (kpi.animal_count || 0), 0);
  const avgVaccinationPercentage = totalAnimalsInKPIs > 0 
    ? corralKPIs.reduce((sum, kpi) => {
        const animals = kpi.animal_count || 0;
        const percentage = kpi.vaccination_percentage || 0;
        return sum + (animals * percentage);
      }, 0) / totalAnimalsInKPIs
    : 0;
  const avgGDP = totalAnimalsInKPIs > 0 
    ? corralKPIs.reduce((sum, kpi) => {
        const animals = kpi.animal_count || 0;
        const gdp = kpi.avg_daily_gain || 0;
        return sum + (animals * gdp);
      }, 0) / totalAnimalsInKPIs
    : 0;

  const stats = [
    {
      title: t('corrals:metrics.totalCorrals'),
      value: totalCorrales,
      icon: Fence,
    },
    {
      title: t('corrals:metrics.totalAnimals'),
      value: totalActiveAnimals,
      icon: Users,
    },
    {
      title: t('corrals:metrics.avgVaccination'),
      value: `${avgVaccinationPercentage.toFixed(1)}%`,
      icon: Syringe,
    },
    {
      title: t('corrals:metrics.avgGDP'),
      value: `${avgGDP.toFixed(3)} kg/día`,
      icon: Scale,
    },
  ];

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
        <PageLoading cards={3} message={t('corrals:metrics.loading')} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
      <div className="space-y-6">
        <PageHeader 
          title={t('corrals:title')}
          subtitle={t('corrals:subtitle')}
          action={
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={() => setShowBulkMove(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Truck className="h-4 w-4" />
                {t('corrals:buttons.bulkMove')}
              </Button>
              <Button
                onClick={() => setShowCorralOptimizer(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Shuffle className="h-4 w-4" />
                {t('corrals:buttons.optimize')}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setMoveDialogOpen(true)}
              >
                <Move className="h-4 w-4 mr-2" />
                {t('corrals:buttons.moveAnimals')}
              </Button>
              <ReadOnlyProtectedAction>
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('corrals:buttons.newCorral')}
                </Button>
              </ReadOnlyProtectedAction>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 overflow-x-hidden">
          {/* Main Content */}
          <section className="lg:col-span-3 space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {stats.map((stat, index) => (
                <MetricCard
                  key={index}
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                />
              ))}
            </div>

            {/* Optimization Suggestions - Prominently displayed */}
            <CorralSuggestionsCard
              totalRisks={totalRisks}
              onOptimize={() => setShowCorralOptimizer(true)}
              loading={loading}
            />


            {/* Sticky Action Bar for Mobile */}
            <StickyActionBar>
              <div className="flex gap-2 w-full">
                <Button 
                  variant="outline"
                  onClick={() => setMoveDialogOpen(true)}
                  className="flex-1 h-11"
                >
                  <Move className="h-4 w-4 mr-1" />
                  {t('corrals:buttons.move')}
                </Button>
                <ReadOnlyProtectedAction>
                  <Button 
                    onClick={() => setCreateDialogOpen(true)}
                    className="flex-1 h-11"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t('corrals:buttons.new')}
                  </Button>
                </ReadOnlyProtectedAction>
              </div>
            </StickyActionBar>

            {/* Corrales List */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{t('corrals:corralList')}</h2>
                  <p className="text-sm text-muted-foreground">{corrales.length} {t('corrals:metrics.availableCorrals')}</p>
                </div>
              </div>

              {corrales.length === 0 ? (
                <EmptyState
                  icon={<Fence className="h-12 w-12" />}
                  title={t('corrals:empty.noCorrals')}
                  description={t('corrals:empty.createFirst')}
                  action={{
                    label: t('corrals:buttons.createFirst'),
                    onClick: () => setCreateDialogOpen(true)
                  }}
                />
              ) : (
                <div className="space-y-3">
                  {corrales.map((corral) => {
                    const corralKPI = corralKPIs.find(kpi => kpi.corral_id === corral.id);
                    
                    // Calculate capacity metrics (assuming 2 animals per hectare if hectareas exists)
                    const estimatedCapacity = corral.hectareas ? Math.round(corral.hectareas * 2) : null;
                    const occupancyPercentage = estimatedCapacity ? Math.round((corral.animal_count / estimatedCapacity) * 100) : 0;
                    const occupancyStatus = getOccupancyStatus(occupancyPercentage);
                    
                    return (
                      <Card key={corral.id} className="overflow-hidden transition-all duration-200 hover:shadow-md border-border/40">
                        <CardHeader className="pb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Fence className="h-5 w-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-medium text-foreground truncate">{corral.name}</h3>
                                  {corral.has_consanguinity_risk && (
                                    <Badge variant="destructive" className="text-xs">
                                      <AlertTriangle className="h-3 w-3 mr-1" />
                                      {corral.risk_count}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {corral.animal_count} {t('corrals:metrics.animals')}
                                  </span>
                                  <span>{corral.male_count}{t('animals:sex.maleAbbrev')} / {corral.female_count}{t('animals:sex.femaleAbbrev')}</span>
                                  {corral.hectareas && (
                                    <span className="text-xs bg-muted px-2 py-1 rounded">
                                      {corral.hectareas} {t('corrals:metrics.hectares')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                              {/* Quick metrics */}
                              <div className="hidden sm:flex items-center gap-2">
                                {corralKPI?.vaccination_percentage !== undefined && corralKPI.vaccination_percentage > 0 && (
                                  <Badge 
                                    variant={
                                      corralKPI.vaccination_status === 'excellent' ? 'default' : 
                                      corralKPI.vaccination_status === 'good' ? 'secondary' :
                                      corralKPI.vaccination_status === 'warning' ? 'outline' : 'destructive'
                                    }
                                    className="text-xs"
                                  >
                                    <Syringe className="h-3 w-3 mr-1" />
                                    {corralKPI.vaccination_percentage.toFixed(0)}%
                                  </Badge>
                                )}
                                {estimatedCapacity && (
                                  <Badge 
                                    variant="outline" 
                                    className={cn("text-xs", occupancyStatus.color)}
                                  >
                                    {occupancyPercentage}% {t('corrals:metrics.occupied')}
                                  </Badge>
                                )}
                              </div>

                              {/* Action menu */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => openDetailDialog(corral.id)}>
                                    <Eye className="h-4 w-4 mr-2" />
                                    {t('corrals:actions.view')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openEditDialog(corral.id)}>
                                    <Edit className="h-4 w-4 mr-2" />
                                    {t('corrals:actions.edit')}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => openDeleteDialog(corral.id, corral.name, corral.animal_count)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('corrals:actions.delete')}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>
                        </CardHeader>
                        
                        <CardContent className="pt-0 pb-4">
                          {/* Capacity Bar */}
                          {estimatedCapacity && (
                            <div className="space-y-2 mb-4">
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{t('corrals:occupancy.label')}</span>
                                <span className="font-medium">
                                  {corral.animal_count} / {estimatedCapacity} ({occupancyPercentage}%)
                                </span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div 
                                  className={cn("h-2 rounded-full transition-all", getOccupancyColor(occupancyPercentage))}
                                  style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                                />
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {Math.max(0, estimatedCapacity - corral.animal_count)} {t('corrals:metrics.freeSpaces')}
                              </div>
                            </div>
                          )}

                          {/* KPI Grid - Always visible */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                            {/* Health */}
                            {corralKPI && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-muted-foreground">{t('corrals:sections.health')}</h4>
                                <div className="space-y-1">
                                  {corralKPI.vaccination_percentage !== undefined && (
                                    <div className="flex justify-between text-sm">
                                      <span>{t('corrals:sections.vaccination')}</span>
                                      <span className="font-medium">{corralKPI.vaccination_percentage.toFixed(0)}%</span>
                                    </div>
                                  )}
                                  {corralKPI.vaccination_alerts > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span>{t('corrals:sections.alerts')}</span>
                                      <span className="font-medium text-amber-600">{corralKPI.vaccination_alerts}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Production */}
                            {corralKPI && (corralKPI.avg_daily_gain > 0 || corralKPI.avg_weight > 0) && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-muted-foreground">{t('corrals:sections.production')}</h4>
                                <div className="space-y-1">
                                  {corralKPI.avg_daily_gain > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span>GDP</span>
                                      <span className="font-medium">{corralKPI.avg_daily_gain.toFixed(2)} kg/día</span>
                                    </div>
                                  )}
                                  {corralKPI.avg_weight > 0 && (
                                    <div className="flex justify-between text-sm">
                                      <span>{t('corrals:sections.avgWeight')}</span>
                                      <span className="font-medium">{corralKPI.avg_weight.toFixed(0)} kg</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Reproductive */}
                            {corralKPI?.pregnancy_rate && corralKPI.pregnancy_rate > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-sm font-medium text-muted-foreground">{t('corrals:sections.reproduction')}</h4>
                                <div className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span>{t('corrals:sections.pregnancyRate')}</span>
                                    <span className="font-medium">{corralKPI.pregnancy_rate.toFixed(0)}%</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Details Sections */}
                          <div className="space-y-3">
                            {/* Vaccination Details */}
                            {corralKPI?.vaccination_percentage !== undefined && (
                              <div className="bg-muted/30 rounded-lg">
                                <div className="p-3 border-b border-muted/50">
                                  <div className="flex items-center gap-2">
                                    <Syringe className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{t('corrals:details.vaccinationDetails')}</span>
                                  </div>
                                </div>
                                <div className="p-3 space-y-2 text-sm">
                                  <div className="flex items-center justify-between">
                                    <span>{t('corrals:details.vaccinesApplied')}</span>
                                    <span className="font-medium">{corralKPI.total_vaccinations_given || 0} de {corralKPI.total_vaccinations_needed || 0}</span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span>{t('corrals:details.generalCompliance')}</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-20 bg-muted rounded-full h-1.5">
                                        <div 
                                          className={`h-1.5 rounded-full ${
                                            corralKPI.vaccination_percentage >= 80 ? 'bg-primary' :
                                            corralKPI.vaccination_percentage >= 60 ? 'bg-blue-500' :
                                            corralKPI.vaccination_percentage >= 40 ? 'bg-amber-500' :
                                            'bg-destructive'
                                          }`}
                                          style={{ width: `${corralKPI.vaccination_percentage}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-xs">{corralKPI.vaccination_percentage.toFixed(0)}%</span>
                                    </div>
                                  </div>
                                  {corralKPI.vaccination_alerts > 0 && (
                                    <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-500 mt-2">
                                      <AlertTriangle className="h-3 w-3" />
                                      <span>{corralKPI.vaccination_alerts} {corralKPI.vaccination_alerts === 1 ? t('corrals:details.animalRequires') : t('corrals:details.animalsRequire')} {t('corrals:details.requiresAttention')}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Pregnancy Rate Details */}
                            {corralKPI?.pregnancy_rate && corralKPI.pregnancy_rate > 0 && (
                              <div className="bg-muted/30 rounded-lg">
                                <div className="p-3 border-b border-muted/50">
                                  <div className="flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{t('corrals:details.pregnancyDetails')}</span>
                                  </div>
                                </div>
                                <div className="p-3 space-y-2 text-sm">
                                  <div className="flex items-center justify-between">
                                    <span>{t('corrals:details.pregnantFemales')}</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-20 bg-muted rounded-full h-1.5">
                                        <div 
                                          className="bg-pink-500 h-1.5 rounded-full" 
                                          style={{ width: `${corralKPI.pregnancy_rate}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-xs">
                                        {Math.round((corral.female_count * corralKPI.pregnancy_rate) / 100)} de {corral.female_count}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-xs text-muted-foreground block">
                                    {corralKPI.pregnancy_rate.toFixed(1)}% {t('corrals:details.femalesPregnant')}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Risk Indicators */}
                          {corral.has_consanguinity_risk && (
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mt-4">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-destructive" />
                                <span className="text-sm font-medium text-destructive">
                                  {t('corrals:risks.consanguinityRisk')}
                                </span>
                              </div>
                              <p className="text-xs text-destructive/80 mt-1">
                                {corral.risk_count} {corral.risk_count === 1 ? t('corrals:risks.pairPresents') : t('corrals:risks.pairsPresent')} {t('corrals:risks.consanguinityRiskText')} ({corral.highest_severity})
                              </p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex flex-wrap gap-2 mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDetailDialog(corral.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              {t('corrals:actions.view')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditDialog(corral.id)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              {t('corrals:actions.edit')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteDialog(corral.id, corral.name, corral.animal_count)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              {t('corrals:actions.delete')}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Right Sidebar */}
          <aside className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <div>
                    <h3 className="font-semibold">{t('corrals:risks.riskAlerts')}</h3>
                    <p className="text-sm text-muted-foreground">{totalRisks} {t('corrals:risks.risksDetected')}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {totalRisks > 0 ? (
                  <div className="space-y-2">
                    {corrales.filter(c => c.has_consanguinity_risk).map(corral => (
                      <div key={corral.id} className="flex items-center justify-between text-sm">
                        <span>{corral.name}</span>
                        <Badge variant="destructive" className="text-xs">
                          {corral.risk_count} {t('corrals:risks.risks')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('corrals:risks.noRisksDetected')}</p>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>

      {/* Dialogs */}
      <CreateCorralDialog 
        open={createDialogOpen} 
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      {selectedCorral && (
        <>
          <CorralDetailDialog 
            open={detailDialogOpen} 
            onOpenChange={setDetailDialogOpen}
            corralId={selectedCorral}
            onUpdate={fetchCorrales}
          />
          <EditCorralDialog 
            open={editDialogOpen} 
            onOpenChange={setEditDialogOpen}
            corralId={selectedCorral}
            onSuccess={handleEditSuccess}
          />
          <DeleteCorralDialog 
            open={deleteDialogOpen} 
            onOpenChange={setDeleteDialogOpen}
            corralId={selectedCorral}
            corralName={selectedCorralName}
            animalCount={selectedCorralAnimalCount}
            onSuccess={handleDeleteSuccess}
          />
        </>
      )}

      <MoveAnimalDialog 
        open={moveDialogOpen} 
        onOpenChange={setMoveDialogOpen}
        onSuccess={fetchCorrales}
      />

      {currentUser?.cabañaId && (
        <>
          <CorralOptimizer 
            open={showCorralOptimizer}
            onOpenChange={setShowCorralOptimizer}
            onSuccess={fetchCorrales}
          />

          <BulkMoveDialog 
            isOpen={showBulkMove}
            onClose={() => setShowBulkMove(false)}
            cabanaId={currentUser.cabañaId}
          />

        </>
      )}
    </div>
  );
}