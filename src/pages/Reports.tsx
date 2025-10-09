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
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";
import { formatFiltersForDB } from "@/lib/dateFormatters";
import { useIsMobile } from "@/hooks/use-mobile";

const Reports = () => {
  const isMobile = useIsMobile();
  const { currentUser } = useSupabaseAuth();
  
  // Default filter values - convert to ISO date strings for database compatibility
  const defaultFilters: ReportFilters = {
    date_from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    date_to: new Date().toISOString().split('T')[0],
    include_sold_dead: false
  };

  // Active tab state
  const [activeTab, setActiveTab] = useState("herd");
  
  // Collapsible filters state
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Separate state for pending (being edited) and applied filters (used by analytics)
  const [pendingFilters, setPendingFilters] = useState<ReportFilters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(defaultFilters);

  useEffect(() => {
    document.title = "Reportes y Análisis | AgroDeo";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Reportes y análisis: ganadería, reproducción, producción, mortalidad y finanzas");
  }, []);

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

  // Tab configuration for mobile chips
  const tabs = [
    { id: "herd", label: "Rebaño", shortLabel: "Ganado" },
    { id: "reproductive", label: "Reproducción", shortLabel: "Reprod." },
    { id: "production", label: "Producción", shortLabel: "Prod." },
    { id: "evolution", label: "Evolución", shortLabel: "Evol." },
    { id: "mortality", label: "Mortalidad", shortLabel: "Mort." },
    { id: "vaccines", label: "Vacunas", shortLabel: "Vac." },
    { id: "financial", label: "Finanzas", shortLabel: "Fin." }
  ];

  // Memoize the formatted filters to prevent unnecessary re-renders
  const stableAppliedFilters = useMemo(() => {
    return formatFiltersForDB(appliedFilters);
  }, [appliedFilters]);

  const renderTabContent = () => {
    switch (activeTab) {
      case "herd":
        return <HerdOverview filters={stableAppliedFilters} />;
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
        return <HerdOverview filters={stableAppliedFilters} />;
    }
  };

  if (isMobile) {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-3 pb-24 overflow-x-hidden">
        <div className="space-y-4">
          {/* Mobile Header with Filter */}
          <MobilePageHeader
            title="Reportes"
            subtitle="Análisis de operación ganadera"
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
          title="Reportes y Análisis"
          subtitle="Análisis completo del desempeño de su operación ganadera"
        />
        
        {/* Desktop Global Filters */}
        <Card>
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setFiltersExpanded(!filtersExpanded)}
          >
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Globales
              {getActiveFiltersCount(pendingFilters) > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {getActiveFiltersCount(pendingFilters)} filtro{getActiveFiltersCount(pendingFilters) > 1 ? 's' : ''}
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
          title="Panel de Análisis"
          subtitle="Reportes detallados por categoría"
        >
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-7 h-10">
              {tabs.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="text-sm px-2 py-2">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            
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