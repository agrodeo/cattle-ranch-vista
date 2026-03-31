import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Scale, TrendingUp, Target, Award, ChevronDown, ChevronUp } from "lucide-react";
import { getWeightedBenchmarksWithCustom, evaluatePerformance, getBreedInfo, type BreedBenchmarks } from "@/lib/breedBenchmarks";
import { ReportsFilters, ReportFilters } from "./ReportsFilters";
import { AnimalProductionTable } from "./AnimalProductionTable";
import { categorizeAnimal } from "@/lib/animalCategories";
import { isOnline } from "@/services/connectivity";
import { db } from "@/services/db";
import { StaleDataBanner } from "./StaleDataBanner";
import { ReportKpiCard } from "./shared/ReportKpiCard";
import { ReportChartCard } from "./shared/ReportChartCard";
import { CHART_GRID_PROPS, CHART_X_AXIS_PROPS, CHART_Y_AXIS_PROPS, CHART_BAR_RADIUS, CHART_TOOLTIP_STYLE, CHART_CURSOR, BAR_COLORS } from "./shared/chartStyles";

interface ProductionStats {
  averageBirthWeight: number;
  averageWeaningWeight: number;
  averageFinalWeight: number;
  averageDailyGain: number;
  weightByAge: { ageMonths: number; avgWeight: number; count: number }[];
  weightByBreed: { breed: string; birthWeight: number; weaningWeight: number; finalWeight: number; breedInfo: { name: string; hasBenchmarks: boolean } }[];
  weightByGender: { gender: string; birthWeight: number; weaningWeight: number; finalWeight: number }[];
  growthTrends: { month: string; avgBirthWeight: number; avgWeaningWeight: number; avgFinalWeight: number }[];
  performanceIndicators: { metric: string; value: number; benchmark: number; status: string; breedSpecific: boolean }[];
  hasMultipleBreeds: boolean;
  benchmarks: BreedBenchmarks;
  breedDistribution: { breed: string; count: number }[];
}

interface ProductionAnalyticsProps {
  filters?: ReportFilters;
}

export const ProductionAnalytics = ({ filters: globalFilters }: ProductionAnalyticsProps) => {
  const { t } = useTranslation(['reports']);
  const { lang } = useLanguage();
  const { currentUser } = useSupabaseAuth();
  const [stats, setStats] = useState<ProductionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [animalTableExpanded, setAnimalTableExpanded] = useState(true);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const CACHE_KEY = `production:${currentUser?.cabañaId}:${JSON.stringify(globalFilters)}`;

  useEffect(() => {
    if (currentUser?.cabañaId) {
      fetchProductionStats();
    } else if (!isOnline()) {
      setLoading(false);
    }
  }, [currentUser, globalFilters]);

  const fetchProductionStats = async () => {
    if (!isOnline()) {
      try {
        const cached = await db.reports_cache.get(CACHE_KEY);
        if (cached) {
          setStats(cached.data);
          setIsStale(true);
          setLastUpdated(cached.updated_at);
        }
      } catch (e) { console.warn('Failed to load cached production report:', e); }
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setIsStale(false);
      let animalsQuery = supabase
        .from('animals')
        .select('*, animal_weight_history(*), is_castrated')
        .eq('cabaña_id', currentUser?.cabañaId);
      
      // Apply corral filter
      if (globalFilters?.corral_ids?.length) {
        animalsQuery = animalsQuery.in('corral_id', globalFilters.corral_ids);
      }
      
      // Apply breed filter
      if (globalFilters?.breed) {
        animalsQuery = animalsQuery.eq('breed', globalFilters.breed);
      }
      
      // Apply include_sold_dead filter
      if (!globalFilters?.include_sold_dead) {
        animalsQuery = animalsQuery
          .neq('status', 'vendido')
          .neq('status', 'muerto')
          .neq('status', 'Vendido')
          .neq('status', 'Muerto');
      }
      
      const { data: animals, error } = await animalsQuery;

      if (error) throw error;
      
      let filteredData = animals || [];
      
      // Apply category filter (client-side since category is computed from age)
      if (globalFilters?.category) {
        filteredData = filteredData.filter(animal => {
          const category = categorizeAnimal(animal, animal.is_castrated || false);
          return category === globalFilters.category;
        });
      }
      
      const prodStats = await calculateProductionStats(filteredData);
      setStats(prodStats);
      // Cache for offline
      try {
        await db.reports_cache.put({ key: CACHE_KEY, data: prodStats, updated_at: new Date().toISOString() });
      } catch (e) { console.warn('Failed to cache production report:', e); }
    } catch (error) {
      console.error("Error fetching production stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProductionStats = async (animals: any[]): Promise<ProductionStats> => {
    const animalsWithWeights = animals.filter(a => a.peso_nacimiento || a.peso_destete || a.peso_final);

    // Calculate breed distribution
    const breeds = [...new Set(animals.map(a => a.breed).filter(Boolean))];
    const breedDistribution = breeds.map(breed => ({
      breed,
      count: animals.filter(a => a.breed === breed).length
    }));

    // Get breed-specific benchmarks with custom overrides
    const benchmarks = await getWeightedBenchmarksWithCustom(breedDistribution, currentUser.cabañaId);

    // Average weights
    const birthWeights = animals.filter(a => a.peso_nacimiento).map(a => Number(a.peso_nacimiento));
    const weaningWeights = animals.filter(a => a.peso_destete).map(a => Number(a.peso_destete));
    const finalWeights = animals.filter(a => a.peso_final).map(a => Number(a.peso_final));

    const averageBirthWeight = birthWeights.length > 0 ? birthWeights.reduce((a, b) => a + b, 0) / birthWeights.length : 0;
    const averageWeaningWeight = weaningWeights.length > 0 ? weaningWeights.reduce((a, b) => a + b, 0) / weaningWeights.length : 0;
    const averageFinalWeight = finalWeights.length > 0 ? finalWeights.reduce((a, b) => a + b, 0) / finalWeights.length : 0;

    // Average daily gain (assuming weaning at 7 months)
    const averageDailyGain = averageWeaningWeight > 0 && averageBirthWeight > 0 
      ? (averageWeaningWeight - averageBirthWeight) / (7 * 30) 
      : 0;

    // Weight by age groups
    const weightByAge = [];
    const ageGroups = [
      { min: 0, max: 6, label: '0-6' },
      { min: 6, max: 12, label: '6-12' },
      { min: 12, max: 24, label: '12-24' },
      { min: 24, max: 999, label: '24+' }
    ];

    ageGroups.forEach(group => {
      const animalsInGroup = animals.filter(a => {
        if (!a.birth_date) return false;
        const ageInMonths = Math.floor((new Date().getTime() - new Date(a.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        return ageInMonths >= group.min && ageInMonths < group.max;
      });

      if (animalsInGroup.length > 0) {
        const weights = animalsInGroup.filter(a => a.peso_final || a.peso_destete).map(a => Number(a.peso_final || a.peso_destete));
        const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;
        
        weightByAge.push({
          ageMonths: (group.min + group.max) / 2,
          avgWeight,
          count: animalsInGroup.length
        });
      }
    });

    // Weight by breed
    const weightByBreed = breeds.map(breed => {
      const breedAnimals = animals.filter(a => a.breed === breed);
      const breedBirthWeights = breedAnimals.filter(a => a.peso_nacimiento).map(a => Number(a.peso_nacimiento));
      const breedWeaningWeights = breedAnimals.filter(a => a.peso_destete).map(a => Number(a.peso_destete));
      const breedFinalWeights = breedAnimals.filter(a => a.peso_final).map(a => Number(a.peso_final));

      return {
        breed,
        birthWeight: breedBirthWeights.length > 0 ? breedBirthWeights.reduce((a, b) => a + b, 0) / breedBirthWeights.length : 0,
        weaningWeight: breedWeaningWeights.length > 0 ? breedWeaningWeights.reduce((a, b) => a + b, 0) / breedWeaningWeights.length : 0,
        finalWeight: breedFinalWeights.length > 0 ? breedFinalWeights.reduce((a, b) => a + b, 0) / breedFinalWeights.length : 0,
        breedInfo: getBreedInfo(breed)
      };
    });
    const hasMultipleBreeds = breeds.length > 1;

    // Weight by gender
    const weightByGender = ['Macho', 'Hembra'].map(gender => {
      const genderAnimals = animals.filter(a => a.sex === gender);
      const genderBirthWeights = genderAnimals.filter(a => a.peso_nacimiento).map(a => Number(a.peso_nacimiento));
      const genderWeaningWeights = genderAnimals.filter(a => a.peso_destete).map(a => Number(a.peso_destete));
      const genderFinalWeights = genderAnimals.filter(a => a.peso_final).map(a => Number(a.peso_final));

      return {
        gender,
        birthWeight: genderBirthWeights.length > 0 ? genderBirthWeights.reduce((a, b) => a + b, 0) / genderBirthWeights.length : 0,
        weaningWeight: genderWeaningWeights.length > 0 ? genderWeaningWeights.reduce((a, b) => a + b, 0) / genderWeaningWeights.length : 0,
        finalWeight: genderFinalWeights.length > 0 ? genderFinalWeights.reduce((a, b) => a + b, 0) / genderFinalWeights.length : 0
      };
    });

    // Growth trends by month (last 12 months)
    const growthTrends = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthAnimals = animals.filter(a => {
        if (!a.birth_date) return false;
        const birthDate = new Date(a.birth_date);
        return birthDate.getMonth() === date.getMonth() && birthDate.getFullYear() === date.getFullYear();
      });

      if (monthAnimals.length > 0) {
        const monthBirthWeights = monthAnimals.filter(a => a.peso_nacimiento).map(a => Number(a.peso_nacimiento));
        const monthWeaningWeights = monthAnimals.filter(a => a.peso_destete).map(a => Number(a.peso_destete));
        const monthFinalWeights = monthAnimals.filter(a => a.peso_final).map(a => Number(a.peso_final));

        growthTrends.push({
          month: date.toLocaleString(lang, { month: 'short', year: '2-digit' }),
          avgBirthWeight: monthBirthWeights.length > 0 ? monthBirthWeights.reduce((a, b) => a + b, 0) / monthBirthWeights.length : 0,
          avgWeaningWeight: monthWeaningWeights.length > 0 ? monthWeaningWeights.reduce((a, b) => a + b, 0) / monthWeaningWeights.length : 0,
          avgFinalWeight: monthFinalWeights.length > 0 ? monthFinalWeights.reduce((a, b) => a + b, 0) / monthFinalWeights.length : 0
        });
      }
    }

    // Performance indicators using breed-specific benchmarks
    const birthWeightEval = evaluatePerformance(averageBirthWeight, benchmarks, 'birthWeight');
    const weaningWeightEval = evaluatePerformance(averageWeaningWeight, benchmarks, 'weaningWeight');
    const dailyGainEval = evaluatePerformance(averageDailyGain, benchmarks, 'dailyGain');

    const performanceIndicators = [
      { 
        metric: 'Peso al nacer', 
        value: averageBirthWeight, 
        benchmark: birthWeightEval.benchmark, 
        status: birthWeightEval.status,
        breedSpecific: breedDistribution.length > 0
      },
      { 
        metric: 'Peso al destete', 
        value: averageWeaningWeight, 
        benchmark: weaningWeightEval.benchmark, 
        status: weaningWeightEval.status,
        breedSpecific: breedDistribution.length > 0
      },
      { 
        metric: 'Ganancia diaria', 
        value: averageDailyGain, 
        benchmark: dailyGainEval.benchmark, 
        status: dailyGainEval.status,
        breedSpecific: breedDistribution.length > 0
      }
    ];

    return {
      averageBirthWeight,
      averageWeaningWeight,
      averageFinalWeight,
      averageDailyGain,
      weightByAge,
      weightByBreed,
      weightByGender,
      growthTrends,
      performanceIndicators,
      hasMultipleBreeds,
      benchmarks,
      breedDistribution
    };
  };

  if (loading) {
    return <div className="text-center p-8">{t('reports:production.loading')}</div>;
  }

  if (!stats) {
    return <div className="text-center p-8">{t('reports:production.error')}</div>;
  }

  const handleViewCorralAnimals = (corralId: string, corralName: string) => {
    // This would be handled by the global filters now
    console.log('View corral animals:', corralId, corralName);
  };

  return (
    <div className="space-y-6">
      {isStale && <StaleDataBanner lastUpdated={lastUpdated} />}
      {/* Animal Production Table - Collapsible */}
      <Card className="border-0 shadow-sm">
        <CardHeader 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setAnimalTableExpanded(!animalTableExpanded)}
        >
          <CardTitle className="flex items-center justify-between text-sm font-semibold">
            <span>{t('reports:production.animalProduction')}</span>
            {animalTableExpanded ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </CardTitle>
        </CardHeader>
        {animalTableExpanded && (
          <CardContent className="pt-0">
            <AnimalProductionTable filters={globalFilters || {}} />
          </CardContent>
        )}
      </Card>
      
      {/* Original Analytics */}
      <div className="grid gap-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard
          label={t('reports:production.avgBirthWeight')}
          value={`${stats.averageBirthWeight.toFixed(1)} kg`}
          icon={Scale}
          variant={stats.performanceIndicators[0].status === 'good' ? 'success' : stats.performanceIndicators[0].status === 'average' ? 'warning' : 'danger'}
        >
          <div className="flex items-center justify-between mt-1">
            <Badge variant={stats.performanceIndicators[0].status === 'good' ? "default" : stats.performanceIndicators[0].status === 'average' ? "secondary" : "destructive"} className="text-xs">
              {stats.performanceIndicators[0].status === 'good' ? t('reports:production.excellent') : stats.performanceIndicators[0].status === 'average' ? t('reports:production.good') : t('reports:production.improvable')}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {t('reports:production.vs')} {stats.performanceIndicators[0].benchmark.toFixed(1)}kg
            </span>
          </div>
        </ReportKpiCard>

        <ReportKpiCard
          label={t('reports:production.avgWeaningWeight')}
          value={`${stats.averageWeaningWeight.toFixed(1)} kg`}
          icon={Target}
          variant={stats.performanceIndicators[1].status === 'good' ? 'success' : stats.performanceIndicators[1].status === 'average' ? 'warning' : 'danger'}
        >
          <div className="flex items-center justify-between mt-1">
            <Badge variant={stats.performanceIndicators[1].status === 'good' ? "default" : stats.performanceIndicators[1].status === 'average' ? "secondary" : "destructive"} className="text-xs">
              {stats.performanceIndicators[1].status === 'good' ? t('reports:production.excellent') : stats.performanceIndicators[1].status === 'average' ? t('reports:production.good') : t('reports:production.improvable')}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {t('reports:production.vs')} {stats.performanceIndicators[1].benchmark.toFixed(1)}kg
            </span>
          </div>
        </ReportKpiCard>

        <ReportKpiCard
          label={t('reports:production.avgFinalWeight')}
          value={`${stats.averageFinalWeight.toFixed(1)} kg`}
          subtitle={t('reports:production.endOfPeriod')}
          icon={Award}
          variant="default"
        />

        <ReportKpiCard
          label={t('reports:production.avgDailyGain')}
          value={`${stats.averageDailyGain.toFixed(2)} ${t('reports:production.kgDay')}`}
          icon={TrendingUp}
          variant={stats.performanceIndicators[2].status === 'good' ? 'success' : stats.performanceIndicators[2].status === 'average' ? 'warning' : 'danger'}
        >
          <div className="flex items-center justify-between mt-1">
            <Badge variant={stats.performanceIndicators[2].status === 'good' ? "default" : stats.performanceIndicators[2].status === 'average' ? "secondary" : "destructive"} className="text-xs">
              {stats.performanceIndicators[2].status === 'good' ? t('reports:production.excellent') : stats.performanceIndicators[2].status === 'average' ? t('reports:production.good') : t('reports:production.improvable')}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {t('reports:production.vs')} {stats.performanceIndicators[2].benchmark.toFixed(2)}{t('reports:production.kgDay')}
            </span>
          </div>
        </ReportKpiCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weight by Age */}
        {stats.weightByAge.length > 0 && (
          <ReportChartCard title={t('reports:production.avgWeightByAge')}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.weightByAge}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="ageMonths" {...CHART_X_AXIS_PROPS} />
                <YAxis {...CHART_Y_AXIS_PROPS} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="avgWeight" stroke={BAR_COLORS.primary} strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ReportChartCard>
        )}

        {/* Weight by Gender */}
        <ReportChartCard
          title={t('reports:production.weightComparison')}
          legend={[
            { label: t('reports:production.birthWeight'), color: BAR_COLORS.tertiary },
            { label: t('reports:production.weaningWeight'), color: BAR_COLORS.primary },
            { label: t('reports:production.finalWeight'), color: BAR_COLORS.secondary },
          ]}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.weightByGender} barGap={4}>
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis dataKey="gender" {...CHART_X_AXIS_PROPS} />
              <YAxis {...CHART_Y_AXIS_PROPS} />
              <Tooltip {...CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR} />
              <Bar dataKey="birthWeight" fill={BAR_COLORS.tertiary} name={t('reports:production.birthWeight')} radius={CHART_BAR_RADIUS} />
              <Bar dataKey="weaningWeight" fill={BAR_COLORS.primary} name={t('reports:production.weaningWeight')} radius={CHART_BAR_RADIUS} />
              <Bar dataKey="finalWeight" fill={BAR_COLORS.secondary} name={t('reports:production.finalWeight')} radius={CHART_BAR_RADIUS} />
            </BarChart>
          </ResponsiveContainer>
        </ReportChartCard>

        {/* Weight by Breed */}
        {stats.hasMultipleBreeds && stats.weightByBreed.length > 1 && (
          <ReportChartCard
            title={t('reports:production.breedPerformance')}
            className="lg:col-span-2"
            legend={[
              { label: t('reports:production.birthWeight'), color: BAR_COLORS.tertiary },
              { label: t('reports:production.weaningWeight'), color: BAR_COLORS.primary },
              { label: t('reports:production.finalWeight'), color: BAR_COLORS.secondary },
            ]}
          >
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.weightByBreed} barGap={4}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="breed" {...CHART_X_AXIS_PROPS} />
                <YAxis {...CHART_Y_AXIS_PROPS} />
                <Tooltip {...CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR} />
                <Bar dataKey="birthWeight" fill={BAR_COLORS.tertiary} name={t('reports:production.birthWeight')} radius={CHART_BAR_RADIUS} />
                <Bar dataKey="weaningWeight" fill={BAR_COLORS.primary} name={t('reports:production.weaningWeight')} radius={CHART_BAR_RADIUS} />
                <Bar dataKey="finalWeight" fill={BAR_COLORS.secondary} name={t('reports:production.finalWeight')} radius={CHART_BAR_RADIUS} />
              </BarChart>
            </ResponsiveContainer>
          </ReportChartCard>
        )}

        {/* Growth Trends */}
        {stats.growthTrends.length > 0 && (
          <ReportChartCard
            title={t('reports:production.growthTrends')}
            className="lg:col-span-2"
            legend={[
              { label: t('reports:production.birthWeight'), color: BAR_COLORS.tertiary },
              { label: t('reports:production.weaningWeight'), color: BAR_COLORS.primary },
              { label: t('reports:production.finalWeight'), color: BAR_COLORS.secondary },
            ]}
          >
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.growthTrends}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="month" {...CHART_X_AXIS_PROPS} />
                <YAxis {...CHART_Y_AXIS_PROPS} />
                <Tooltip {...CHART_TOOLTIP_STYLE} />
                <Line type="monotone" dataKey="avgBirthWeight" stroke={BAR_COLORS.tertiary} name={t('reports:production.birthWeight')} strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="avgWeaningWeight" stroke={BAR_COLORS.primary} name={t('reports:production.weaningWeight')} strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="avgFinalWeight" stroke={BAR_COLORS.secondary} name={t('reports:production.finalWeight')} strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </ReportChartCard>
        )}
      </div>

      {/* Performance Indicators */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-semibold">
            {t('reports:production.performanceVsBenchmarks', 'Indicadores de Rendimiento vs Benchmarks')}
            {stats.breedDistribution.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground ml-2">
                ({t('reports:production.breedSpecific', 'Específicos por raza')})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.performanceIndicators.map((indicator, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                <div>
                  <h4 className="text-sm font-medium text-foreground">{indicator.metric}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t('reports:production.actual', 'Actual')}: {indicator.metric === 'Ganancia diaria' ? indicator.value.toFixed(3) : indicator.value.toFixed(1)} 
                    {indicator.metric === 'Ganancia diaria' ? ' kg/día' : ' kg'} | 
                    Benchmark: {indicator.metric === 'Ganancia diaria' ? indicator.benchmark.toFixed(3) : indicator.benchmark.toFixed(1)}
                    {indicator.metric === 'Ganancia diaria' ? ' kg/día' : ' kg'}
                    {indicator.breedSpecific && (
                      <span className="text-primary ml-1">✓ {t('reports:production.breedSpecific', 'Específico por raza')}</span>
                    )}
                  </p>
                </div>
                <Badge variant={indicator.status === 'good' ? "default" : indicator.status === 'average' ? "secondary" : "destructive"}>
                  {indicator.status === 'good' ? t('reports:production.excellent') : indicator.status === 'average' ? t('reports:production.good') : t('reports:production.improvable')}
                </Badge>
              </div>
            ))}
          </div>
          
          {stats.breedDistribution.length > 1 && (
            <div className="mt-4 p-3 bg-muted/30 rounded-xl">
              <h5 className="font-medium text-xs mb-2">{t('reports:production.breedDistribution', 'Distribución por Raza')}:</h5>
              <div className="flex flex-wrap gap-2">
                {stats.breedDistribution.map(({ breed, count }) => (
                  <Badge key={breed} variant="outline" className="text-xs">
                    {breed}: {count} {t('reports:production.animals', 'animales')}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t('reports:production.weightedBenchmarks', 'Los benchmarks mostrados son promedios ponderados según la distribución de razas')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
};