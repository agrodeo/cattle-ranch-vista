import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Shield, AlertTriangle, CheckCircle, Clock, ChevronDown, ChevronRight, AlertCircle, Info } from "lucide-react";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";
import { categorizeAnimal } from "@/lib/animalCategories";
import { isOnline } from "@/services/connectivity";
import { db } from "@/services/db";
import { StaleDataBanner } from "./StaleDataBanner";

interface VaccinationAnalyticsProps {
  filters?: any;
}

// ============= PHASE 1 & 2: Batch Processing with Error Handling =============
interface AnimalStatusResult {
  animal: any;
  statusData: any[] | null;
  error: any;
  category?: string;
  reason?: string;
  issues?: any[];
  vaccines?: any[];
}

const BATCH_SIZE = 20;

const fetchAnimalStatus = async (animal: any, cabanaId: string): Promise<AnimalStatusResult> => {
  try {
    const { data, error } = await supabase
      .rpc('calculate_vaccination_status', {
        _animal_id: animal.id,
        _cabana_id: cabanaId
      });
    
    if (error) {
      console.warn(`⚠️ Error fetching status for ${animal.id_tag}:`, error);
      return { animal, statusData: null, error };
    }
    
    return { animal, statusData: data || [], error: null };
  } catch (e) {
    console.error(`❌ Exception for ${animal.id_tag}:`, e);
    return { animal, statusData: null, error: e };
  }
};

const processAnimalsBatch = async (animals: any[], cabanaId: string): Promise<AnimalStatusResult[]> => {
  const results: AnimalStatusResult[] = [];
  
  for (let i = 0; i < animals.length; i += BATCH_SIZE) {
    const batch = animals.slice(i, i + BATCH_SIZE);
    console.log(`🔄 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(animals.length / BATCH_SIZE)}`);
    
    const batchResults = await Promise.allSettled(
      batch.map(animal => fetchAnimalStatus(animal, cabanaId))
    );
    
    batchResults.forEach(result => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        console.error('❌ Batch promise rejected:', result.reason);
        results.push({ 
          animal: null, 
          statusData: null, 
          error: result.reason 
        });
      }
    });
  }
  
  return results;
};

// ============= PHASE 3 & 4: Clear Category Classification =============
type AnimalCategory = 'compliant' | 'overdue' | 'pending' | 'missing_mandatory' | 'no_requirements' | 'error';

interface ClassificationResult {
  category: AnimalCategory;
  reason: string;
  issues?: any[];
  vaccines?: any[];
}

const classifyAnimal = (animal: any, statusData: any[] | null, error: any, t: any): ClassificationResult => {
  // Error category
  if (error || !statusData) {
    return { 
      category: 'error', 
      reason: error ? `${t('reports:vaccination.errorProcessing')}: ${error.message || t('common:unknown')}` : t('reports:vaccination.noStatusData')
    };
  }
  
  // No requirements category
  if (statusData.length === 0) {
    return { 
      category: 'no_requirements', 
      reason: t('reports:vaccination.noRequirementsApplicable')
    };
  }
  
  const mandatoryVaccines = statusData.filter(s => s.is_mandatory);
  const overdueVaccines = statusData.filter(s => s.status === 'vencida');
  const pendingVaccines = statusData.filter(s => s.status === 'pendiente');
  const completeVaccines = statusData.filter(s => s.status === 'completa');
  
  // Priority 1: Overdue vaccines
  if (overdueVaccines.length > 0) {
    return { 
      category: 'overdue', 
      reason: `${overdueVaccines.length} ${overdueVaccines.length === 1 ? t('reports:vaccination.vaccineExpiredReason') : t('reports:vaccination.vaccinesExpiredReason')}`,
      issues: overdueVaccines.map(v => ({
        vaccine_name: v.vaccine_name,
        status: t('reports:vaccination.statusExpired'),
        days_overdue: v.days_overdue
      }))
    };
  }
  
  // Priority 2: Pending vaccines
  if (pendingVaccines.length > 0) {
    return { 
      category: 'pending', 
      reason: `${pendingVaccines.length} ${pendingVaccines.length === 1 ? t('reports:vaccination.vaccinePendingReason') : t('reports:vaccination.vaccinesPendingReason')}`,
      issues: pendingVaccines.map(v => ({
        vaccine_name: v.vaccine_name,
        status: t('reports:vaccination.statusPending'),
        next_due: v.next_due_date
      }))
    };
  }
  
  // Priority 3: Check mandatory vaccines
  if (mandatoryVaccines.length === 0) {
    return { 
      category: 'compliant', 
      reason: t('reports:vaccination.noMandatoryApplicable'),
      vaccines: completeVaccines.map(v => ({
        vaccine_name: v.vaccine_name,
        last_date: v.last_vaccination_date,
        next_due: v.next_due_date
      }))
    };
  }
  
  const mandatoryComplete = mandatoryVaccines.filter(s => s.status === 'completa');
  
  if (mandatoryComplete.length === mandatoryVaccines.length) {
    return { 
      category: 'compliant', 
      reason: `${t('reports:vaccination.allMandatoryComplete')} (${mandatoryComplete.length}/${mandatoryVaccines.length})`,
      vaccines: completeVaccines.map(v => ({
        vaccine_name: v.vaccine_name,
        last_date: v.last_vaccination_date,
        next_due: v.next_due_date
      }))
    };
  }
  
  // Priority 4: Missing mandatory vaccines
  const mandatoryMissing = mandatoryVaccines.filter(s => s.status === 'no_aplicada');
  return { 
    category: 'missing_mandatory', 
    reason: `${mandatoryMissing.length} ${mandatoryMissing.length === 1 ? t('reports:vaccination.mandatoryNotAppliedCount') : t('reports:vaccination.mandatoryNotAppliedCountPlural')}`,
    issues: mandatoryMissing.map(v => ({
      vaccine_name: v.vaccine_name,
      status: t('reports:vaccination.statusNotAppliedMandatory'),
      is_mandatory: true
    }))
  };
};

export const VaccinationAnalytics = ({ filters: globalFilters }: VaccinationAnalyticsProps) => {
  const { user, currentUser } = useSupabaseAuth();
  const { requirements } = useVaccinationRequirements();
  const { t } = useTranslation('reports');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  
  // Separate state for each category
  const [animalsCompliant, setAnimalsCompliant] = useState<any[]>([]);
  const [animalsOverdue, setAnimalsOverdue] = useState<any[]>([]);
  const [animalsPending, setAnimalsPending] = useState<any[]>([]);
  const [animalsMissingMandatory, setAnimalsMissingMandatory] = useState<any[]>([]);
  const [animalsNoRequirements, setAnimalsNoRequirements] = useState<any[]>([]);
  const [animalsWithErrors, setAnimalsWithErrors] = useState<any[]>([]);
  
  const [expandedAnimal, setExpandedAnimal] = useState<string | null>(null);
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const CACHE_KEY = `vaccination:${currentUser?.cabañaId}:${JSON.stringify(globalFilters)}`;

  useEffect(() => {
    if (user && currentUser?.cabañaId) {
      fetchVaccinationStats();
    } else if (!isOnline()) {
      setLoading(false);
    }
  }, [user, currentUser?.cabañaId, globalFilters]);

  // ============= PHASE 5 & 6: Updated Dashboard Metrics with Comprehensive Logging =============
  const fetchVaccinationStats = async () => {
    if (!user || !currentUser?.cabañaId) return;
    
    if (!isOnline()) {
      try {
        const cached = await db.reports_cache.get(CACHE_KEY);
        if (cached) {
          const { stats: s, compliant, overdue, pending, missingMandatory, noRequirements, withErrors } = cached.data;
          setStats(s);
          setAnimalsCompliant(compliant);
          setAnimalsOverdue(overdue);
          setAnimalsPending(pending);
          setAnimalsMissingMandatory(missingMandatory);
          setAnimalsNoRequirements(noRequirements);
          setAnimalsWithErrors(withErrors);
          setIsStale(true);
          setLastUpdated(cached.updated_at);
        }
      } catch (e) { console.warn('Failed to load cached vaccination report:', e); }
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setIsStale(false);
      console.log('🚀 Starting vaccination analytics fetch...');
      
      // Fetch active animals
      let animalsQuery = supabase
        .from('animals')
        .select('id, name, id_tag, sex, birth_date, corral_id')
        .eq('cabaña_id', currentUser.cabañaId)
        .neq('status', 'vendido')
        .neq('status', 'muerto')
        .neq('status', 'Vendido')
        .neq('status', 'Muerto');
      
      // Apply corral filter
      if (globalFilters?.corral_ids?.length) {
        animalsQuery = animalsQuery.in('corral_id', globalFilters.corral_ids);
      }
      
      // Apply breed filter
      if (globalFilters?.breed) {
        animalsQuery = animalsQuery.eq('breed', globalFilters.breed);
      }
      
      const { data: animals, error: animalsError } = await animalsQuery;

      if (animalsError) {
        console.error('❌ Error fetching animals:', animalsError);
        throw animalsError;
      }

      console.log(`📊 Found ${animals?.length || 0} active animals`);

      if (!animals || animals.length === 0) {
        console.log('ℹ️ No active animals found');
        setStats({
          totalAnimals: 0,
          totalRequirements: 0,
          mandatoryRequirements: 0,
          animalsCompliant: 0,
          animalsWithOverdue: 0,
          animalsWithPending: 0,
          animalsWithMissingMandatory: 0,
          animalsNoRequirements: 0,
          animalsWithErrors: 0,
          totalOverdueVaccines: 0,
          totalPendingVaccines: 0
        });
        setAnimalsCompliant([]);
        setAnimalsOverdue([]);
        setAnimalsPending([]);
        setAnimalsMissingMandatory([]);
        setAnimalsNoRequirements([]);
        setAnimalsWithErrors([]);
        setLoading(false);
        return;
      }

      // Fetch vaccination requirements count for context
      const { data: requirementsData, error: reqError } = await supabase
        .from('cabaña_vaccination_requirements')
        .select('id, vaccine_name, is_mandatory')
        .eq('cabaña_id', currentUser.cabañaId)
        .eq('is_active', true);

      if (reqError) {
        console.error('❌ Error fetching requirements:', reqError);
      }

      const totalRequirements = requirementsData?.length || 0;
      const mandatoryRequirements = requirementsData?.filter(r => r.is_mandatory).length || 0;

      console.log(`📋 Found ${totalRequirements} active requirements (${mandatoryRequirements} mandatory)`);

      // Process animals in batches with error handling
      const results = await processAnimalsBatch(animals, currentUser.cabañaId);
      
      console.log(`✅ Processed ${results.length} animals`);

      // Classify all animals
      let classified = results.map(result => {
        const classification = classifyAnimal(result.animal, result.statusData, result.error, t);
        return {
          ...result,
          ...classification
        };
      });
      
      // Apply category filter (client-side)
      if (globalFilters?.category) {
        classified = classified.filter(item => {
          if (!item.animal) return false;
          const category = categorizeAnimal(item.animal, item.animal.is_castrated || false);
          return category === globalFilters.category;
        });
      }
      
      // Apply vaccination status filter
      if (globalFilters?.vaccination_status === 'compliant') {
        classified = classified.filter(item => item.category === 'compliant');
      } else if (globalFilters?.vaccination_status === 'needs_attention') {
        classified = classified.filter(item => 
          ['overdue', 'pending', 'missing_mandatory'].includes(item.category || '')
        );
      }

      // Separate by category
      const compliant: any[] = [];
      const overdue: any[] = [];
      const pending: any[] = [];
      const missingMandatory: any[] = [];
      const noRequirements: any[] = [];
      const withErrors: any[] = [];

      let totalOverdueVaccines = 0;
      let totalPendingVaccines = 0;

      classified.forEach(item => {
        if (!item.animal) return;

        const animalData = {
          animal_id: item.animal.id,
          animal_name: item.animal.name || item.animal.id_tag || t('reports:vaccination.noName'),
          animal_tag: item.animal.id_tag || t('reports:vaccination.noTag'),
          reason: item.reason,
          issues: item.issues || [],
          vaccines: item.vaccines || []
        };

        switch (item.category) {
          case 'compliant':
            compliant.push(animalData);
            break;
          case 'overdue':
            overdue.push(animalData);
            totalOverdueVaccines += item.issues?.length || 0;
            break;
          case 'pending':
            pending.push(animalData);
            totalPendingVaccines += item.issues?.length || 0;
            break;
          case 'missing_mandatory':
            missingMandatory.push(animalData);
            break;
          case 'no_requirements':
            noRequirements.push(animalData);
            break;
          case 'error':
            withErrors.push(animalData);
            break;
        }
      });

      // ============= PHASE 6: Comprehensive Logging =============
      console.log('📊 Vaccination Analytics Summary:', {
        totalAnimals: animals.length,
        totalRequirements,
        mandatoryRequirements,
        processedSuccessfully: classified.filter(c => c.category !== 'error').length,
        processedWithErrors: withErrors.length,
        categories: {
          compliant: compliant.length,
          overdue: overdue.length,
          pending: pending.length,
          missingMandatory: missingMandatory.length,
          noRequirements: noRequirements.length,
          errors: withErrors.length
        },
        vaccines: {
          totalOverdue: totalOverdueVaccines,
          totalPending: totalPendingVaccines
        }
      });

      // Validate totals
      const categoriesTotal = compliant.length + overdue.length + pending.length + 
                             missingMandatory.length + noRequirements.length + withErrors.length;
      
      if (categoriesTotal !== animals.length) {
        console.warn(`⚠️ Category mismatch! Total categories: ${categoriesTotal}, Total animals: ${animals.length}`);
      } else {
        console.log('✅ Category totals validated correctly');
      }

      setStats({
        totalAnimals: animals.length,
        totalRequirements,
        mandatoryRequirements,
        animalsCompliant: compliant.length,
        animalsWithOverdue: overdue.length,
        animalsWithPending: pending.length,
        animalsWithMissingMandatory: missingMandatory.length,
        animalsNoRequirements: noRequirements.length,
        animalsWithErrors: withErrors.length,
        totalOverdueVaccines,
        totalPendingVaccines
      });
      
      setAnimalsCompliant(compliant);
      setAnimalsOverdue(overdue);
      setAnimalsPending(pending);
      setAnimalsMissingMandatory(missingMandatory);
      setAnimalsNoRequirements(noRequirements);
      setAnimalsWithErrors(withErrors);

      // Cache for offline
      try {
        const cachedStats = { totalAnimals: animals.length, totalRequirements, mandatoryRequirements, animalsCompliant: compliant.length, animalsWithOverdue: overdue.length, animalsWithPending: pending.length, animalsWithMissingMandatory: missingMandatory.length, animalsNoRequirements: noRequirements.length, animalsWithErrors: withErrors.length, totalOverdueVaccines, totalPendingVaccines };
        await db.reports_cache.put({ key: CACHE_KEY, data: { stats: cachedStats, compliant, overdue, pending, missingMandatory, noRequirements, withErrors }, updated_at: new Date().toISOString() });
      } catch (e) { console.warn('Failed to cache vaccination report:', e); }
      
    } catch (error) {
      console.error("❌ Fatal error fetching vaccination stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ============= PHASE 7: Updated UI for All Categories =============
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {isStale && <StaleDataBanner lastUpdated={lastUpdated} />}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>{t('reports:vaccination.analyticsTitle')}:</strong> {stats?.totalAnimals || 0} {t('reports:vaccination.activeAnimals')} • {stats?.totalRequirements || 0} {t('reports:vaccination.configuredRequirements')} ({stats?.mandatoryRequirements || 0} {t('reports:vaccination.mandatory')})
        </AlertDescription>
      </Alert>

      {/* Summary Cards - 6 categories */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="relative overflow-hidden border-0 shadow-sm bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('reports:vaccination.totalAnimals')}</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{stats?.totalAnimals || 0}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('reports:vaccination.upToDate')}</p>
                <p className="text-2xl font-bold tracking-tight text-primary">{stats?.animalsCompliant || 0}</p>
                <p className="text-xs text-muted-foreground">
                  {stats?.totalAnimals > 0 ? Math.round((stats?.animalsCompliant / stats?.totalAnimals) * 100) : 0}% {t('reports:vaccination.ofTotal')}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm bg-destructive/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('reports:vaccination.expiredTitle')}</p>
                <p className="text-2xl font-bold tracking-tight text-destructive">{stats?.animalsWithOverdue || 0}</p>
                <p className="text-xs text-muted-foreground">{stats?.totalOverdueVaccines || 0} {t('reports:vaccination.vaccinesCount')}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm bg-amber-500/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('reports:vaccination.pendingTitle')}</p>
                <p className="text-2xl font-bold tracking-tight text-amber-600">{stats?.animalsWithPending || 0}</p>
                <p className="text-xs text-muted-foreground">{stats?.totalPendingVaccines || 0} {t('reports:vaccination.vaccinesCount')}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm bg-blue-500/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('reports:vaccination.needsApplication')}</p>
                <p className="text-2xl font-bold tracking-tight text-blue-600">{stats?.animalsWithMissingMandatory || 0}</p>
                <p className="text-xs text-muted-foreground">{t('reports:vaccination.mandatoryNotApplied')}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm bg-muted/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{t('reports:vaccination.noRequirements')}</p>
                <p className="text-2xl font-bold tracking-tight text-foreground">{stats?.animalsNoRequirements || 0}</p>
                <p className="text-xs text-muted-foreground">{t('reports:vaccination.notApplicable')}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Info className="h-5 w-5 text-muted-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Animals Compliant - Green */}
      {animalsCompliant.length > 0 && (
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              {t('reports:vaccination.animalsUpToDate')} ({animalsCompliant.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {animalsCompliant.map((animal) => (
                <Collapsible
                  key={animal.animal_id}
                  open={expandedAnimal === animal.animal_id}
                  onOpenChange={() => setExpandedAnimal(
                    expandedAnimal === animal.animal_id ? null : animal.animal_id
                  )}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedAnimal === animal.animal_id ? (
                          <ChevronDown className="h-4 w-4 text-green-700" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-green-700" />
                        )}
                        <div className="text-left">
                          <div className="font-medium text-green-900 dark:text-green-100">
                            {animal.animal_name}
                          </div>
                          <div className="text-sm text-green-700 dark:text-green-300">
                            Caravana: {animal.animal_tag}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-green-200 text-green-900">
                        {animal.vaccines.length} {animal.vaccines.length === 1 ? t('reports:vaccination.vaccine') : t('reports:vaccination.vaccines')}
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 ml-4 p-4 bg-white dark:bg-slate-900 rounded-lg border">
                    <div className="space-y-3">
                      {animal.vaccines.map((vaccine: any, idx: number) => (
                        <div key={idx} className="flex items-start justify-between p-2 bg-slate-50 dark:bg-slate-800 rounded">
                          <div className="flex-1">
                            <div className="font-medium">{vaccine.vaccine_name}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {t('reports:vaccination.lastApplication')}: {vaccine.last_date ? new Date(vaccine.last_date).toLocaleDateString('es-ES') : 'N/A'}
                            </div>
                            {vaccine.next_due && (
                              <div className="text-sm text-muted-foreground">
                                {t('reports:vaccination.next')}: {new Date(vaccine.next_due).toLocaleDateString('es-ES')}
                              </div>
                            )}
                          </div>
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Animals with Overdue Vaccines - Red */}
      {animalsOverdue.length > 0 && (
        <Card className="border-red-200 dark:border-red-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              {t('reports:vaccination.animalsWithExpired')} ({animalsOverdue.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {animalsOverdue.map((animal) => (
                <Collapsible
                  key={animal.animal_id}
                  open={expandedAnimal === `overdue-${animal.animal_id}`}
                  onOpenChange={() => setExpandedAnimal(
                    expandedAnimal === `overdue-${animal.animal_id}` ? null : `overdue-${animal.animal_id}`
                  )}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedAnimal === `overdue-${animal.animal_id}` ? (
                          <ChevronDown className="h-4 w-4 text-red-700" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-red-700" />
                        )}
                        <div className="text-left">
                          <div className="font-medium text-red-900 dark:text-red-100">
                            {animal.animal_name}
                          </div>
                          <div className="text-sm text-red-700 dark:text-red-300">
                            Caravana: {animal.animal_tag}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-red-200 text-red-900">
                        {animal.issues.length} {t('reports:vaccination.expired')}
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 ml-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-red-200">
                    <div className="space-y-3">
                      {animal.issues.map((issue: any, idx: number) => (
                        <div key={idx} className="flex items-start justify-between p-2 bg-red-50 dark:bg-red-950/10 rounded">
                          <div className="flex-1">
                            <div className="font-medium text-red-900 dark:text-red-100">{issue.vaccine_name}</div>
                            <div className="text-sm text-red-600 font-medium mt-1">
                              {t('reports:vaccination.status')}: {t('reports:vaccination.statusExpired')}
                              {issue.days_overdue && issue.days_overdue > 0 && (
                                <span className="ml-2">
                                  ({issue.days_overdue} {issue.days_overdue === 1 ? t('reports:vaccination.day') : t('reports:vaccination.days')} {t('reports:vaccination.daysDelay')})
                                </span>
                              )}
                            </div>
                          </div>
                          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Animals with Pending Vaccines - Amber */}
      {animalsPending.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-600" />
              {t('reports:vaccination.animalsWithPending')} ({animalsPending.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {animalsPending.map((animal) => (
                <Collapsible
                  key={animal.animal_id}
                  open={expandedAnimal === `pending-${animal.animal_id}`}
                  onOpenChange={() => setExpandedAnimal(
                    expandedAnimal === `pending-${animal.animal_id}` ? null : `pending-${animal.animal_id}`
                  )}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-950/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedAnimal === `pending-${animal.animal_id}` ? (
                          <ChevronDown className="h-4 w-4 text-amber-700" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-amber-700" />
                        )}
                        <div className="text-left">
                          <div className="font-medium text-amber-900 dark:text-amber-100">
                            {animal.animal_name}
                          </div>
                          <div className="text-sm text-amber-700 dark:text-amber-300">
                            Caravana: {animal.animal_tag}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-amber-200 text-amber-900">
                        {animal.issues.length} {t('reports:vaccination.pending')}
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 ml-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-amber-200">
                    <div className="space-y-3">
                      {animal.issues.map((issue: any, idx: number) => (
                        <div key={idx} className="flex items-start justify-between p-2 bg-amber-50 dark:bg-amber-950/10 rounded">
                          <div className="flex-1">
                            <div className="font-medium text-amber-900 dark:text-amber-100">{issue.vaccine_name}</div>
                            <div className="text-sm text-amber-600 font-medium mt-1">
                              {t('reports:vaccination.status')}: {t('reports:vaccination.statusPending')}
                              {issue.next_due && (
                                <span className="ml-2">
                                  ({t('reports:vaccination.expires')}: {new Date(issue.next_due).toLocaleDateString('es-ES')})
                                </span>
                              )}
                            </div>
                          </div>
                          <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Animals with Missing Mandatory Vaccines - Blue */}
      {animalsMissingMandatory.length > 0 && (
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              {t('reports:vaccination.animalsMandatoryNotApplied')} ({animalsMissingMandatory.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {animalsMissingMandatory.map((animal) => (
                <Collapsible
                  key={animal.animal_id}
                  open={expandedAnimal === `missing-${animal.animal_id}`}
                  onOpenChange={() => setExpandedAnimal(
                    expandedAnimal === `missing-${animal.animal_id}` ? null : `missing-${animal.animal_id}`
                  )}
                >
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedAnimal === `missing-${animal.animal_id}` ? (
                          <ChevronDown className="h-4 w-4 text-blue-700" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-blue-700" />
                        )}
                        <div className="text-left">
                          <div className="font-medium text-blue-900 dark:text-blue-100">
                            {animal.animal_name}
                          </div>
                          <div className="text-sm text-blue-700 dark:text-blue-300">
                            {t('reports:vaccination.tag')}: {animal.animal_tag}
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-200 text-blue-900">
                        {animal.issues.length} {t('reports:vaccination.notApplied')}
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-2 ml-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-blue-200">
                    <div className="space-y-3">
                      {animal.issues.map((issue: any, idx: number) => (
                        <div key={idx} className="flex items-start justify-between p-2 bg-blue-50 dark:bg-blue-950/10 rounded">
                          <div className="flex-1">
                            <div className="font-medium text-blue-900 dark:text-blue-100">{issue.vaccine_name}</div>
                            <div className="text-sm text-blue-600 font-medium mt-1">
                              {t('reports:vaccination.status')}: {t('reports:vaccination.statusNotAppliedMandatory')}
                            </div>
                          </div>
                          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Animals with No Requirements - Gray */}
      {animalsNoRequirements.length > 0 && (
        <Card className="border-slate-200 dark:border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-slate-500" />
              {t('reports:vaccination.animalsNoRequirements')} ({animalsNoRequirements.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {animalsNoRequirements.map((animal) => (
                <div
                  key={animal.animal_id}
                  className="w-full flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/20 rounded-lg"
                >
                  <div className="text-left">
                    <div className="font-medium text-slate-900 dark:text-slate-100">
                      {animal.animal_name}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {t('reports:vaccination.tag')}: {animal.animal_tag}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      {animal.reason}
                    </div>
                  </div>
                  <Info className="h-5 w-5 text-slate-500 flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Animals with Errors */}
      {animalsWithErrors.length > 0 && (
        <Card className="border-red-300 dark:border-red-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-700" />
              {t('reports:vaccination.animalsWithErrors')} ({animalsWithErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {animalsWithErrors.map((animal) => (
                <div
                  key={animal.animal_id}
                  className="w-full flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/10 rounded-lg"
                >
                  <div className="text-left">
                    <div className="font-medium text-red-900 dark:text-red-100">
                      {animal.animal_name}
                    </div>
                    <div className="text-sm text-red-700 dark:text-red-300">
                      {t('reports:vaccination.tag')}: {animal.animal_tag}
                    </div>
                    <div className="text-xs text-red-600 mt-1">
                      {animal.reason}
                    </div>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-red-700 flex-shrink-0" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* No data state */}
      {stats?.totalAnimals === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('reports:vaccination.noDataAvailable')}</h3>
            <p className="text-muted-foreground">
              {t('reports:vaccination.noAnimalsActive')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};