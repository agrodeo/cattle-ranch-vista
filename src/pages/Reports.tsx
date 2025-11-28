import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportsFilters, ReportFilters } from "@/components/reports/ReportsFilters";
import { MobileReportsFilters } from "@/components/reports/MobileReportsFilters";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { IconTabsBar } from "@/components/reports/IconTabsBar";
import { HerdOverview } from "@/components/reports/HerdOverview";
import ReproductiveAnalytics from "@/components/reports/ReproductiveAnalytics";
import { ProductionAnalytics } from "@/components/reports/ProductionAnalytics";
import { MortalityReports } from "@/components/reports/MortalityReportsWrapper";
import { FinancialAnalytics } from "@/components/reports/FinancialAnalytics";
import { VaccinationAnalytics } from "@/components/reports/VaccinationAnalyticsWrapper";
import { TemporalEvolutionAnalytics } from "@/components/reports/TemporalEvolutionAnalytics";
import { QuickFilterChips, QuickFilter } from "@/components/reports/QuickFilterChips";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";
import { formatFiltersForDB } from "@/lib/dateFormatters";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";

const Reports = () => {
  const isMobile = useIsMobile();
  const { currentUser } = useSupabaseAuth();
  const { t } = useTranslation(['reports', 'common']);
  
  // Default filter values - convert to ISO date strings for database compatibility
  const defaultFilters: ReportFilters = {
    date_from: new Date(Date.now() - 10 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 años de historial
    date_to: new Date().toISOString().split('T')[0],
    include_sold_dead: false
  };

  // Active tab state
  const [activeTab, setActiveTab] = useState("reproductive");
  
  // Collapsible filters state
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Separate state for pending (being edited) and applied filters (used by analytics)
  const [pendingFilters, setPendingFilters] = useState<ReportFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(defaultFilters);
  
  // Quick filters state
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);
  const [availableCorrales, setAvailableCorrales] = useState<{id: string; name: string}[]>([]);

  // Fetch available corrales for quick filters
  useEffect(() => {
    const fetchCorrales = async () => {
      if (!currentUser?.cabañaId) return;
      
      const { data } = await supabase
        .from('corrales')
        .select('id, name')
        .eq('cabaña_id', currentUser.cabañaId)
        .order('name');
      
      if (data) setAvailableCorrales(data);
    };
    
    fetchCorrales();
  }, [currentUser?.cabañaId]);

  useEffect(() => {
    document.title = `${t('reports:title')} | AgroDeo`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t('reports:pageSubtitle'));
  }, [t]);

  const getActiveFiltersCount = (filters: ReportFilters) => {
    let count = 0;
    if (filters.corral_ids?.length) count++;
    if (filters.category) count++;
    if (filters.breed) count++;
    if (filters.include_sold_dead) count++;
    if (filters.date_from || filters.date_to) count++;
    return count;
  };

  const applyFilters = () => {
    setAppliedFilters({ ...pendingFilters });
  };

  // Quick filter configuration per tab
  const getQuickFiltersForTab = (tabId: string): QuickFilter[] => {
    const filters: QuickFilter[] = [];
    
    // Corrales available for all tabs
    availableCorrales.forEach(corral => {
      filters.push({
        id: `corral-${corral.id}`,
        label: corral.name,
        type: 'corral',
        value: corral.id
      });
    });

    // Tab-specific status/category filters
    if (tabId === 'reproductive') {
      filters.push(
        { id: 'status-pregnant', label: t('reports:reproductive.pregnant'), type: 'status', value: 'pregnant' },
        { id: 'status-open', label: t('reports:reproductive.open'), type: 'status', value: 'open' },
        { id: 'category-vaca', label: t('reports:filters.vaca'), type: 'category', value: 'Vaca' },
        { id: 'category-vaquillona', label: t('reports:filters.vaquillona'), type: 'category', value: 'Vaquillona' }
      );
    } else if (tabId === 'vaccines') {
      filters.push(
        { id: 'status-compliant', label: t('reports:vaccination.upToDate'), type: 'status', value: 'compliant' },
        { id: 'status-needs-attention', label: t('reports:vaccination.needsAttention'), type: 'status', value: 'needs_attention' }
      );
    } else if (tabId === 'mortality') {
      filters.push(
        { id: 'category-ternero', label: t('reports:filters.ternero'), type: 'category', value: 'Ternero' },
        { id: 'category-ternera', label: t('reports:filters.ternera'), type: 'category', value: 'Ternera' }
      );
    }
    
    return filters;
  };

  const handleToggleQuickFilter = (filterId: string) => {
    setActiveQuickFilters(prev => {
      const isActive = prev.includes(filterId);
      const newActive = isActive 
        ? prev.filter(id => id !== filterId)
        : [...prev, filterId];
      
      // Apply quick filters to appliedFilters
      const quickFilters = getQuickFiltersForTab(activeTab);
      const activeFiltersData = quickFilters.filter(f => newActive.includes(f.id));
      
      const corralIds = activeFiltersData
        .filter(f => f.type === 'corral')
        .map(f => f.value);
      
      setAppliedFilters(prev => ({
        ...prev,
        corral_ids: corralIds.length > 0 ? corralIds : undefined
      }));
      
      return newActive;
    });
  };

  // Tab configuration for mobile chips
  const tabs = [
    { id: "reproductive", label: t('reports:tabs.reproductive'), shortLabel: t('reports:tabs.reproductive').substring(0, 6) + '.' },
    { id: "production", label: t('reports:tabs.production'), shortLabel: t('reports:tabs.production').substring(0, 4) + '.' },
    { id: "evolution", label: t('reports:tabs.evolution'), shortLabel: t('reports:tabs.evolution').substring(0, 4) + '.' },
    { id: "mortality", label: t('reports:tabs.mortality'), shortLabel: t('reports:tabs.mortality').substring(0, 4) + '.' },
    { id: "vaccines", label: t('reports:tabs.vaccines'), shortLabel: t('reports:tabs.vaccines').substring(0, 3) + '.' },
    { id: "financial", label: t('reports:tabs.financial'), shortLabel: t('reports:tabs.financial').substring(0, 3) + '.' }
  ];

  // Memoize the formatted filters to prevent unnecessary re-renders
  const stableAppliedFilters = useMemo(() => {
    return formatFiltersForDB(appliedFilters);
  }, [appliedFilters]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "reproductive":
        return <ReproductiveAnalytics filters={stableAppliedFilters} />;
      case "production":
        return <ProductionAnalytics filters={stableAppliedFilters} />;
      case "evolution":
        return <TemporalEvolutionAnalytics cabanaId={currentUser?.cabañaId || null} filters={stableAppliedFilters} />;
      case "mortality":
        return <MortalityReports filters={stableAppliedFilters} />;
      case "vaccines":
        return <VaccinationAnalytics filters={stableAppliedFilters} />;
      case "financial":
        return <FinancialAnalytics filters={stableAppliedFilters} />;
      default:
        return <ReproductiveAnalytics filters={stableAppliedFilters} />;
    }
  };

  if (isMobile) {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-3 pb-24 overflow-x-hidden">
        <div className="space-y-4">
          {/* Mobile Header with Filter */}
          <MobilePageHeader
            title={t('reports:title')}
            subtitle={t('reports:subtitle')}
            action={
              <MobileReportsFilters
                filters={pendingFilters}
                onFiltersChange={setPendingFilters}
                onApplyFilters={applyFilters}
              />
            }
          />

          {/* Mobile Tab Navigation */}
          <div className="sticky top-0 z-10 bg-background pb-3">
        <IconTabsBar 
          tabs={tabs} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
          </div>

          {/* Quick Filter Chips - Mobile */}
          <QuickFilterChips
            availableFilters={getQuickFiltersForTab(activeTab)}
            activeFilters={activeQuickFilters}
            onToggleFilter={handleToggleQuickFilter}
            className="px-1"
          />

          {/* Content */}
          <div className="space-y-4">
            {renderTabContent()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl px-6 pb-24 lg:pb-0 overflow-x-hidden">
      <div className="space-y-3">
        <PageHeader 
          title={t('reports:title')}
          subtitle={t('reports:subtitle')}
        />
        
        {/* Desktop Global Filters */}
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              {t('reports:globalFilters')}
              {getActiveFiltersCount(pendingFilters) > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {getActiveFiltersCount(pendingFilters)} {t('common:filter')}{getActiveFiltersCount(pendingFilters) > 1 ? 's' : ''}
                </Badge>
              )}
              <div className="ml-auto">
                {filtersExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
          {filtersExpanded && (
            <CardContent>
              <ReportsFilters 
                filters={pendingFilters} 
                onFiltersChange={setPendingFilters}
                onApplyFilters={applyFilters}
              />
            </CardContent>
          )}
        </Card>

        <SectionCard
          title={t('reports:analysisPanel')}
          subtitle={t('reports:detailedReports')}
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-6 h-10">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="text-sm px-2 py-2">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {/* Quick Filter Chips */}
            <QuickFilterChips
              availableFilters={getQuickFiltersForTab(activeTab)}
              activeFilters={activeQuickFilters}
              onToggleFilter={handleToggleQuickFilter}
              className="px-1"
            />
            
            <div className="space-y-4">
              {renderTabContent()}
            </div>
          </Tabs>
        </SectionCard>
      </div>
    </div>
  );
};

export default Reports;