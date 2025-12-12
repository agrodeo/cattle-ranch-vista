import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, Heart, TrendingUp, Calendar, Users, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { PregnantAnimalsReport } from "./PregnantAnimalsReport";
import { calculatePregnancyRate } from "@/lib/reproductiveCalculations";
import { getTranslatedCategory } from "@/lib/translations";
import type { AnimalReproductiveData, PregnancyRecord, ServiceRecord, OffspringRecord } from "@/types/reproductive";

interface ReportFilters {
  date_from?: string;
  date_to?: string;
  corral_ids?: string[];
  include_sold_dead?: boolean;
  category?: string;
  breed?: string;
  status?: string;
}

interface SummaryMetrics {
  totalFemales: number;
  currentlyPregnant: number;
  totalServices: number;
  pregnancyRate: number;
  calvingRate: number;
  openFemales: number;
  avgDaysOpen: number;
  successfulPregnancies?: number;
  failedPregnancies?: number;
  activePregnancies?: number;
  totalReproductiveYears?: number;
  completedPregnancies?: number;
}

interface ReproductiveFemale {
  animal_id: string;
  id_tag: string;
  name: string;
  age_months: number;
  category: string;
  corral_id: string;
  corral_name: string;
  is_pregnant: boolean;
  pregnancy_date: string;
  expected_calving_date: string;
  last_service_date: string;
  days_open: number;
  reproductive_years: number;
  total_offspring: number;
  lifetime_services: number;
  lifetime_pregnancies: number;
  lifetime_calvings: number;
  individual_pregnancy_rate: number;
  individual_calving_rate: number;
  performance_level: string;
  active_alerts: number;
  alert_types: string[];
  current_state: string;
}

interface YearlyReproductiveRate {
  year: number;
  pregnancySuccessRate: number; // Successful pregnancies / Total pregnancies
  calvingRate: number; // Births / Reproductive females
  totalPregnancies: number; // Births + failed pregnancies
  successfulPregnancies: number; // = births (each birth = successful pregnancy)
  failedPregnancies: number;
  totalBirths: number;
  reproductiveFemalesCount: number;
}

interface ReproductiveAnalyticsProps {
  filters?: ReportFilters;
}

const ReproductiveAnalytics = ({ filters = {} }: ReproductiveAnalyticsProps) => {
  const { t } = useTranslation(['reports', 'animals']);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics>({
    totalFemales: 0,
    currentlyPregnant: 0,
    totalServices: 0,
    pregnancyRate: 0,
    calvingRate: 0,
    openFemales: 0,
    avgDaysOpen: 0,
  });
  
  const [reproductiveFemales, setReproductiveFemales] = useState<ReproductiveFemale[]>([]);
  const [yearlyRates, setYearlyRates] = useState<YearlyReproductiveRate[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortColumn, setSortColumn] = useState<keyof ReproductiveFemale | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const fetchReproductiveData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user and their cabaña_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
      setError(t('reports:reproductive.loadingError'));
      return;
    }

    const { data: userInfo, error: userError } = await supabase.rpc('get_user_cabana_info', { user_uuid: user.id });

    if (userError || !userInfo?.[0]?.cabana_id) {
      setError(t('reports:reproductive.loadingError'));
      return;
    }

      const cabanaId = userInfo[0].cabana_id;

      // Fetch animals
      let animalsQuery = supabase
        .from('animals')
        .select('*')
        .eq('cabaña_id', cabanaId)
        .eq('sex', 'Hembra');
      
      // Apply corral filter
      if (filters?.corral_ids?.length) {
        animalsQuery = animalsQuery.in('corral_id', filters.corral_ids);
      }
      
      // Apply breed filter
      if (filters?.breed) {
        animalsQuery = animalsQuery.eq('breed', filters.breed);
      }
      
      // Apply filter for sold/dead animals if needed
      if (!filters.include_sold_dead) {
        animalsQuery = animalsQuery
          .neq('status', 'vendido')
          .neq('status', 'muerto');
      }
      
      const { data: animals, error: animalsError } = await animalsQuery;

      if (animalsError) throw animalsError;

      // Filter females 15+ months old
      const reproductiveFemales = (animals || []).filter(animal => {
        if (!animal.birth_date) return true; // Include animals without birth date
        const ageMonths = (new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        return ageMonths >= 15;
      });

      // Get all pregnancy records for these animals
      const animalIds = reproductiveFemales.map(a => a.id);
      const { data: pregnancies, error: pregnanciesError } = await supabase
        .from('preñeces')
        .select('*')
        .in('animal_id', animalIds);

      if (pregnanciesError) throw pregnanciesError;

      // Get all service records (IA)
      const { data: services, error: servicesError } = await supabase
        .from('ia')
        .select('id, evento_id, animales_ids');

      if (servicesError) throw servicesError;

      // Get all offspring for these animals
      const { data: offspring, error: offspringError } = await supabase
        .from('animals')
        .select('id, mother_id, father_id, status, birth_date')
        .in('mother_id', animalIds);

      if (offspringError) throw offspringError;

      // Get corral information
      const { data: corrales, error: corralesError } = await supabase
        .from('corrales')
        .select('id, name')
        .eq('cabaña_id', cabanaId);

      if (corralesError) throw corralesError;

      // Get ALL births from cabaña for yearly stats (not filtered by current reproductive females)
      const { data: allBirths, error: allBirthsError } = await supabase
        .from('animals')
        .select('id, mother_id, birth_date')
        .eq('cabaña_id', cabanaId)
        .not('mother_id', 'is', null)
        .not('birth_date', 'is', null);

      if (allBirthsError) throw allBirthsError;

      // Get ALL pregnancies from cabaña for yearly stats
      const { data: allPregnancies, error: allPregnanciesError } = await supabase
        .from('preñeces')
        .select('*')
        .eq('cabaña_id', cabanaId);

      if (allPregnanciesError) throw allPregnanciesError;

      // Get ALL reproductive females for yearly stats (females 15+ months born in cabaña)
      const { data: allFemales, error: allFemalesError } = await supabase
        .from('animals')
        .select('id, birth_date, sex')
        .eq('cabaña_id', cabanaId)
        .eq('sex', 'Hembra')
        .not('birth_date', 'is', null);

      if (allFemalesError) throw allFemalesError;

      const corralesMap = new Map(corrales?.map(c => [c.id, c.name]) || []);

      // Calculate metrics for each animal
      let reproductiveData: ReproductiveFemale[] = reproductiveFemales.map(animal => {
        // Get data for this animal
        const animalPregnancies = (pregnancies || []).filter(p => p.animal_id === animal.id);
        const animalServices = (services || []).filter(s => s.animales_ids?.includes(animal.id));
        const animalOffspring = (offspring || []).filter(o => o.mother_id === animal.id);

        // Convert to proper types
        const animalData: AnimalReproductiveData = {
          id: animal.id,
          id_tag: animal.id_tag,
          name: animal.name,
          birth_date: animal.birth_date,
          esta_preñada: animal.esta_preñada,
          fecha_ultima_preñez: animal.fecha_ultima_preñez,
          fecha_probable_parto: animal.fecha_probable_parto,
          sex: animal.sex,
          status: animal.status,
          corral_id: animal.corral_id
        };

        const pregnancyRecords: PregnancyRecord[] = animalPregnancies.map(p => ({
          id: p.id,
          animal_id: p.animal_id,
          estado: p.estado,
          estado_final: (p.estado_final as 'activa' | 'exitosa' | 'fallida') || 'activa',
          fecha_inicio: p.fecha_inicio,
          fecha_estimada_parto: p.fecha_estimada_parto,
          fecha_finalizacion: p.fecha_finalizacion,
          motivo_finalizacion: p.motivo_finalizacion,
          cria_id: p.cria_id
        }));

        const serviceRecords: ServiceRecord[] = animalServices.map(s => ({
          id: s.id,
          animales_ids: s.animales_ids,
          evento_id: s.evento_id
        }));

        const offspringRecords: OffspringRecord[] = animalOffspring.map(o => ({
          id: o.id,
          mother_id: o.mother_id,
          father_id: o.father_id,
          status: o.status
        }));

        // Calculate reproductive metrics
        const metrics = calculatePregnancyRate(animalData, pregnancyRecords, serviceRecords, offspringRecords);

        // Calculate age and category
        const ageMonths = animal.birth_date 
          ? Math.floor((new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
          : 24;
        
        const category = ageMonths < 12 ? 'Ternera' : ageMonths < 24 ? 'Vaquillona' : 'Vaca';

        // Determine current reproductive state (store in Spanish to match UI checks)
        let currentState = 'Vacía';
        if (animal.esta_preñada) {
          currentState = 'Preñada';
        } else if (animalOffspring.length > 0) {
          const lastCalving = animalOffspring
            .filter(o => o.birth_date)
            .sort((a, b) => new Date(b.birth_date!).getTime() - new Date(a.birth_date!).getTime())[0];
          
          if (lastCalving && lastCalving.birth_date) {
            const daysSinceCalving = Math.floor((new Date().getTime() - new Date(lastCalving.birth_date).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceCalving <= 60) {
              currentState = 'Post-parto';
            }
          }
        }

        return {
          animal_id: animal.id,
          id_tag: animal.id_tag || '',
          name: animal.name || '',
          age_months: ageMonths,
          category,
          corral_id: animal.corral_id || '',
          corral_name: corralesMap.get(animal.corral_id) || '',
          is_pregnant: animal.esta_preñada || false,
          pregnancy_date: animal.fecha_ultima_preñez || '',
          expected_calving_date: animal.fecha_probable_parto || '',
          last_service_date: '', // TODO: Calculate from service records
          days_open: 0, // TODO: Calculate from calving to next service
          reproductive_years: metrics.reproductive_years,
          total_offspring: animalOffspring.length,
          lifetime_services: animalServices.length,
          lifetime_pregnancies: pregnancyRecords.length,
          lifetime_calvings: metrics.total_calvings,
          individual_pregnancy_rate: metrics.pregnancy_rate,
          individual_calving_rate: metrics.calving_rate,
          performance_level: metrics.performance_level,
          active_alerts: 0, // TODO: Get from alerts table
          alert_types: [], // TODO: Get from alerts table
          current_state: currentState
        };
      });
      
      // Apply category filter (client-side since category is computed from age)
      if (filters?.category) {
        reproductiveData = reproductiveData.filter(f => f.category === filters.category);
      }
      
      // Apply reproductive status filter
      if (filters?.status === 'pregnant') {
        reproductiveData = reproductiveData.filter(f => f.is_pregnant);
      } else if (filters?.status === 'open') {
        reproductiveData = reproductiveData.filter(f => !f.is_pregnant);
      }

      setReproductiveFemales(reproductiveData);

      // Calculate herd summary metrics
      const totalFemales = reproductiveData.length;
      const currentlyPregnant = reproductiveData.filter(f => f.is_pregnant).length;
      
      // Calculate overall service and calving counts
      let totalServices = 0;
      let totalPregnancies = 0;
      let totalCalvings = 0;
      let totalReproductiveYears = 0;
      
      reproductiveData.forEach(female => {
        totalServices += female.lifetime_services;
        totalPregnancies += female.lifetime_pregnancies;
        totalCalvings += female.lifetime_calvings;
        totalReproductiveYears += female.reproductive_years;
      });

      // PREGNANCY RATE: Current snapshot only
      // Formula: currently pregnant females / total reproductive females × 100
      const herdPregnancyRate = totalFemales > 0
        ? Math.round((currentlyPregnant / totalFemales) * 100)
        : 0;
      
      // Calving rate: average of individual animal calving rates
      const validCalvingRates = reproductiveData
        .map(animal => animal.individual_calving_rate)
        .filter(rate => !isNaN(rate) && rate >= 0);

      const herdCalvingRate = validCalvingRates.length > 0
        ? Math.round(validCalvingRates.reduce((sum, rate) => sum + rate, 0) / validCalvingRates.length)
        : 0;

      setSummaryMetrics({
        totalFemales,
        currentlyPregnant,
        totalServices,
        pregnancyRate: herdPregnancyRate,
        calvingRate: herdCalvingRate,
        openFemales: totalFemales - currentlyPregnant,
        avgDaysOpen: 0,
        successfulPregnancies: totalCalvings,
        failedPregnancies: totalPregnancies - totalCalvings,
        activePregnancies: currentlyPregnant,
        totalReproductiveYears,
        completedPregnancies: totalPregnancies
      });

      // Calculate yearly reproductive rates using ALL cabaña data (not filtered)
      const yearlyDataMap = new Map<number, {
        totalPregnancies: number;
        successfulPregnancies: number;
        failedPregnancies: number;
        totalBirths: number;
        reproductiveFemalesCount: number;
      }>();

      // Get all pregnancies grouped by year (from ALL pregnancies in cabaña)
      // First, count births by year - each birth = 1 successful pregnancy
      (allBirths || []).forEach(o => {
        const year = new Date(o.birth_date).getFullYear();
        if (!yearlyDataMap.has(year)) {
          yearlyDataMap.set(year, { totalPregnancies: 0, successfulPregnancies: 0, failedPregnancies: 0, totalBirths: 0, reproductiveFemalesCount: 0 });
        }
        const data = yearlyDataMap.get(year)!;
        data.totalBirths += 1;
        data.successfulPregnancies += 1; // Each birth = 1 successful pregnancy
        data.totalPregnancies += 1; // Count as a pregnancy
      });

      // Add failed pregnancies from preñeces table
      (allPregnancies || []).forEach(p => {
        const year = new Date(p.fecha_inicio).getFullYear();
        if (!yearlyDataMap.has(year)) {
          yearlyDataMap.set(year, { totalPregnancies: 0, successfulPregnancies: 0, failedPregnancies: 0, totalBirths: 0, reproductiveFemalesCount: 0 });
        }
        const data = yearlyDataMap.get(year)!;
        // Only count failed pregnancies (not exitosa, no cria_id linked)
        if (p.estado_final === 'fallida' || p.tipo_perdida) {
          data.failedPregnancies += 1;
          data.totalPregnancies += 1;
        }
      });

      // Count reproductive females per year (ALL females that were 15+ months in that year)
      (allFemales || []).forEach(female => {
        if (female.birth_date) {
          const birthDate = new Date(female.birth_date);
          const currentYear = new Date().getFullYear();
          for (let year = birthDate.getFullYear() + 1; year <= currentYear; year++) {
            const ageAtYearStart = (new Date(year, 0, 1).getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44);
            if (ageAtYearStart >= 15) {
              if (!yearlyDataMap.has(year)) {
                yearlyDataMap.set(year, { totalPregnancies: 0, successfulPregnancies: 0, failedPregnancies: 0, totalBirths: 0, reproductiveFemalesCount: 0 });
              }
              const data = yearlyDataMap.get(year)!;
              data.reproductiveFemalesCount += 1;
            }
          }
        }
      });

      // Convert to array and calculate rates
      const yearlyRatesData: YearlyReproductiveRate[] = Array.from(yearlyDataMap.entries())
        .map(([year, data]) => ({
          year,
          totalPregnancies: data.totalPregnancies,
          successfulPregnancies: data.successfulPregnancies,
          failedPregnancies: data.failedPregnancies,
          totalBirths: data.totalBirths,
          reproductiveFemalesCount: data.reproductiveFemalesCount,
          // Pregnancy success rate = successful / total pregnancies
          pregnancySuccessRate: data.totalPregnancies > 0 
            ? Math.round((data.successfulPregnancies / data.totalPregnancies) * 100) 
            : 0,
          // Calving rate = births / reproductive females
          calvingRate: data.reproductiveFemalesCount > 0 
            ? Math.round((data.totalBirths / data.reproductiveFemalesCount) * 100) 
            : 0
        }))
        .filter(d => d.totalPregnancies > 0 || d.totalBirths > 0)
        .sort((a, b) => b.year - a.year)
        .slice(0, 10); // Show up to 10 years

      setYearlyRates(yearlyRatesData);

    } catch (error) {
      console.error('Error in fetchReproductiveData:', error);
      setError(t('reports:reproductive.loadingError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReproductiveData();
  }, [filters]);

  const handleRefresh = () => {
    fetchReproductiveData();
    toast({
      title: t('reports:reproductive.dataUpdated'),
      description: t('reports:reproductive.dataUpdatedDesc')
    });
  };

  const handleSort = (column: keyof ReproductiveFemale) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const sortedFemales = [...reproductiveFemales].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const SortableHeader = ({ column, children }: { column: keyof ReproductiveFemale; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-accent/50 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column && (
          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </TableHead>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">{t('reports:reproductive.loadingError')}</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh}>
            {t('reports:reproductive.retryButton')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports:reproductive.reproductiveFemales')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.totalFemales}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports:reproductive.ageMinimum')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports:reproductive.pregnancyRate')}</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryMetrics.pregnancyRate !== undefined && !isNaN(summaryMetrics.pregnancyRate) 
                ? summaryMetrics.pregnancyRate 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t('reports:reproductive.confirmedPregnancies')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports:reproductive.calvingRate')}</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summaryMetrics.calvingRate !== undefined && !isNaN(summaryMetrics.calvingRate) 
                ? summaryMetrics.calvingRate 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              {t('reports:reproductive.successfulCalvings')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports:reproductive.currentlyPregnant')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.currentlyPregnant}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports:reproductive.activePregancy')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Yearly Reproductive Rates */}
      {yearlyRates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {t('reports:reproductive.yearlyRates')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {yearlyRates.map((rate) => (
                <Card key={rate.year} className="min-w-[160px] flex-shrink-0 border-2">
                  <CardContent className="p-4">
                    <div className="text-lg font-bold text-center mb-3">{rate.year}</div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {t('reports:reproductive.yearlyPregnancyRate')}
                        </div>
                        <div className={`text-xl font-bold ${
                          rate.pregnancySuccessRate >= 80 ? 'text-emerald-600' :
                          rate.pregnancySuccessRate >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {rate.pregnancySuccessRate}%
                        </div>
                      </div>
                      
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">
                          {t('reports:reproductive.yearlyCalvingRate')}
                        </div>
                        <div className={`text-xl font-bold ${
                          rate.calvingRate >= 90 ? 'text-emerald-600' :
                          rate.calvingRate >= 75 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {rate.calvingRate}%
                        </div>
                      </div>
                      
                      <div className="pt-2 border-t text-xs text-muted-foreground">
                        <div>{rate.totalBirths} {t('reports:reproductive.births')}</div>
                        {rate.failedPregnancies > 0 && (
                          <div className="text-red-500">{rate.failedPregnancies} {t('reports:reproductive.losses')}</div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expandable Reproductive Females Detail */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto whitespace-normal">
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  {t('reports:reproductive.reproductiveFemales')}
                  <Badge variant="secondary" className="ml-2">
                    {reproductiveFemales.length} {t('reports:reproductive.animals')}
                  </Badge>
                </CardTitle>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {reproductiveFemales.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-lg font-medium">{t('reports:reproductive.noFemalesFound')}</p>
                  <p className="text-sm mt-2">
                    {t('reports:reproductive.noFemalesMinAge')}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    {t('reports:reproductive.allFemalesUnder15')}
                  </p>
                </div>
              ) : isMobile ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <Select
                      value={sortColumn || ""}
                      onValueChange={(value) => {
                        if (value) {
                          handleSort(value as keyof ReproductiveFemale);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder={t('reports:production.sortBy')} />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="id_tag">{t('reports:reproductive.tableTag')}</SelectItem>
                        <SelectItem value="name">{t('reports:reproductive.tableName')}</SelectItem>
                        <SelectItem value="category">{t('reports:reproductive.tableCategory')}</SelectItem>
                        <SelectItem value="corral_name">{t('reports:reproductive.tableCorral')}</SelectItem>
                        <SelectItem value="current_state">{t('reports:reproductive.tableCurrentState')}</SelectItem>
                        <SelectItem value="individual_pregnancy_rate">{t('reports:reproductive.tablePregnancyPct')}</SelectItem>
                        <SelectItem value="individual_calving_rate">{t('reports:reproductive.tableCalvingPct')}</SelectItem>
                        <SelectItem value="total_offspring">{t('reports:reproductive.tableOffspring')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {sortColumn && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                        className="h-9 px-3"
                      >
                        {sortDirection === 'asc' ? '↑' : '↓'}
                      </Button>
                    )}
                  </div>
                  {sortedFemales.map((animal) => (
                    <Card 
                      key={animal.animal_id}
                      className="hover:bg-accent/50 transition-colors"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-base truncate">
                              {animal.name || animal.id_tag}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {animal.id_tag} • {getTranslatedCategory(animal.category, t)}
                            </div>
                          </div>
                          <Badge variant="outline" className="ml-2 flex-shrink-0">
                            {animal.corral_name || '-'}
                          </Badge>
                        </div>

                        <div className="space-y-2 mb-3">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">{t('reports:reproductive.tableCurrentState')}</div>
                            <Badge 
                              variant={
                                animal.current_state === 'Preñada' ? 'default' :
                                animal.current_state === 'Post-parto' ? 'secondary' :
                                'outline'
                              }
                              className={
                                animal.current_state === 'Preñada' ? 'bg-emerald-100 text-emerald-800' :
                                animal.current_state === 'Post-parto' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }
                            >
                              {animal.current_state === 'Preñada' ? t('reports:reproductive.pregnant') :
                               animal.current_state === 'Post-parto' ? t('reports:reproductive.postpartum') :
                               t('reports:reproductive.empty')}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">{t('reports:reproductive.tablePregnancyPct')}</div>
                            <span className={`font-medium text-sm ${
                              animal.individual_pregnancy_rate >= 80 ? 'text-emerald-600' :
                              animal.individual_pregnancy_rate >= 60 ? 'text-blue-600' :
                              animal.individual_pregnancy_rate >= 40 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {animal.individual_pregnancy_rate.toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">{t('reports:reproductive.tableCalvingPct')}</div>
                            <span className={`font-medium text-sm ${
                              animal.individual_calving_rate >= 90 ? 'text-emerald-600' :
                              animal.individual_calving_rate >= 75 ? 'text-blue-600' :
                              animal.individual_calving_rate >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {animal.individual_calving_rate.toFixed(1)}%
                            </span>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">{t('reports:reproductive.tableOffspring')}</div>
                            <Badge variant="secondary">
                              {animal.total_offspring}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableHeader column="id_tag">{t('reports:reproductive.tableTag')}</SortableHeader>
                        <SortableHeader column="name">{t('reports:reproductive.tableName')}</SortableHeader>
                        <SortableHeader column="category">{t('reports:reproductive.tableCategory')}</SortableHeader>
                        <SortableHeader column="corral_name">{t('reports:reproductive.tableCorral')}</SortableHeader>
                        <SortableHeader column="current_state">{t('reports:reproductive.tableCurrentState')}</SortableHeader>
                        <SortableHeader column="individual_pregnancy_rate">{t('reports:reproductive.tablePregnancyPct')}</SortableHeader>
                        <SortableHeader column="individual_calving_rate">{t('reports:reproductive.tableCalvingPct')}</SortableHeader>
                        <SortableHeader column="total_offspring">{t('reports:reproductive.tableOffspring')}</SortableHeader>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedFemales.map((animal) => (
                        <TableRow key={animal.animal_id}>
                          <TableCell className="font-medium">{animal.id_tag}</TableCell>
                          <TableCell>{animal.name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{getTranslatedCategory(animal.category, t)}</Badge>
                          </TableCell>
                          <TableCell>{animal.corral_name || '-'}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                animal.current_state === 'Preñada' ? 'default' :
                                animal.current_state === 'Post-parto' ? 'secondary' :
                                'outline'
                              }
                              className={
                                animal.current_state === 'Preñada' ? 'bg-emerald-100 text-emerald-800' :
                                animal.current_state === 'Post-parto' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }
                            >
                              {animal.current_state === 'Preñada' ? t('reports:reproductive.pregnant') :
                               animal.current_state === 'Post-parto' ? t('reports:reproductive.postpartum') :
                               t('reports:reproductive.empty')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-medium ${
                              animal.individual_pregnancy_rate >= 80 ? 'text-emerald-600' :
                              animal.individual_pregnancy_rate >= 60 ? 'text-blue-600' :
                              animal.individual_pregnancy_rate >= 40 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {animal.individual_pregnancy_rate.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-medium ${
                              animal.individual_calving_rate >= 90 ? 'text-emerald-600' :
                              animal.individual_calving_rate >= 75 ? 'text-blue-600' :
                              animal.individual_calving_rate >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {animal.individual_calving_rate.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">
                              {animal.total_offspring}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Pregnant Animals Report */}
      <div className="grid grid-cols-1 gap-6">
        <PregnantAnimalsReport filters={filters} />
      </div>
    </div>
  );
};

export default ReproductiveAnalytics;