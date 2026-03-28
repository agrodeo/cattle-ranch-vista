import { useEffect, useState, useMemo } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ReportErrorBoundary } from "@/components/reports/ReportErrorBoundary";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { formatFiltersForDB } from "@/lib/dateFormatters";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { isOnline } from "@/services/connectivity";
import { db } from "@/services/db";

export interface ReportFilters {
  season?: string;
  date_from?: Date | string;
  date_to?: Date | string;
  corral_ids?: string[];
  category?: string;
  breed?: string;
  include_sold_dead?: boolean;
  status?: string;
  vaccination_status?: string;
}

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

  // Handle tab change - clear quick filters when switching tabs
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setActiveQuickFilters([]);
    // Reset category filter when changing tabs
    setAppliedFilters(prev => ({
      ...prev,
      category: undefined
    }));
  };

  // Applied filters (used by analytics)
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(defaultFilters);
  
  // Quick filters state
  const [activeQuickFilters, setActiveQuickFilters] = useState<string[]>([]);
  const [availableCorrales, setAvailableCorrales] = useState<{id: string; name: string}[]>([]);

  // Fetch available corrales for quick filters
  useEffect(() => {
    const fetchCorrales = async () => {
      if (!currentUser?.cabañaId) return;
      
      if (!isOnline()) {
        // Load corrales from IndexedDB cache
        try {
          const cached = await db.corrales_cache.where('cabaña_id').equals(currentUser.cabañaId).toArray();
          if (cached.length) setAvailableCorrales(cached.map(c => ({ id: c.id, name: c.name })));
        } catch (e) { console.warn('Failed to load cached corrales:', e); }
        return;
      }

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
    document.title = `${t('reports:title')} | agrodeo`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", t('reports:pageSubtitle'));
  }, [t]);

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
      
      const categories = activeFiltersData
        .filter(f => f.type === 'category')
        .map(f => f.value);
      
      const statuses = activeFiltersData
        .filter(f => f.type === 'status')
        .map(f => f.value);
      
      setAppliedFilters(prev => ({
        ...prev,
        corral_ids: corralIds.length > 0 ? corralIds : undefined,
        category: categories.length > 0 ? categories[0] : undefined,
        status: statuses.length > 0 ? statuses[0] : undefined,
        vaccination_status: statuses.length > 0 ? statuses[0] : undefined
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
    const content = (() => {
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
    })();

    return (
      <ReportErrorBoundary key={activeTab}>
        {content}
      </ReportErrorBoundary>
    );
  };

  if (isMobile) {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-3 pb-24 overflow-x-hidden">
        <div className="space-y-4">
          {/* Mobile Header */}
          <MobilePageHeader
            title={t('reports:title')}
            subtitle={t('reports:subtitle')}
          />

          {/* Mobile Tab Navigation */}
          <div className="sticky top-0 z-10 bg-background pb-3">
        <IconTabsBar 
          tabs={tabs} 
          activeTab={activeTab} 
          onTabChange={handleTabChange} 
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
      <div className="space-y-4">
        <PageHeader 
          title={t('reports:title')}
          subtitle={t('reports:subtitle')}
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className="bg-transparent border-b border-border rounded-none w-auto justify-start gap-0 h-auto p-0 inline-flex">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.id} value={tab.id} className="flex-shrink-0 text-xs lg:text-sm px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground font-medium truncate">
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {/* Quick Filter Chips */}
          <QuickFilterChips
            availableFilters={getQuickFiltersForTab(activeTab)}
            activeFilters={activeQuickFilters}
            onToggleFilter={handleToggleQuickFilter}
          />
          
          <div className="space-y-4">
            {renderTabContent()}
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;