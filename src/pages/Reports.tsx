import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportsFilters, ReportFilters } from "@/components/reports/ReportsFilters";
import { HerdOverview } from "@/components/reports/HerdOverview";
import { ReproductiveAnalytics } from "@/components/reports/ReproductiveAnalytics";
import { ProductionAnalytics } from "@/components/reports/ProductionAnalytics";
import { MortalityReports } from "@/components/reports/MortalityReportsWrapper";
import { FinancialAnalytics } from "@/components/reports/FinancialAnalytics";
import { VaccinationAnalytics } from "@/components/reports/VaccinationAnalyticsWrapper";
import { Filter } from "lucide-react";

const Reports = () => {
  const [filters, setFilters] = useState<ReportFilters>({
    date_from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    date_to: new Date(),
    include_sold_dead: false
  });

  useEffect(() => {
    document.title = "Reportes y Análisis | AgroDeo";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Reportes y análisis: ganadería, reproducción, producción, mortalidad y finanzas");
  }, []);

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.corral_ids?.length) count++;
    if (filters.category) count++;
    if (filters.breed) count++;
    if (filters.include_sold_dead) count++;
    if (filters.date_from || filters.date_to) count++;
    return count;
  };

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
      <div className="space-y-3">
        <PageHeader 
          title="Reportes y Análisis"
          subtitle="Análisis completo del desempeño de su operación ganadera"
        />
        
        {/* Global Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Globales
              {getActiveFiltersCount() > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {getActiveFiltersCount()} filtro{getActiveFiltersCount() > 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ReportsFilters onFiltersChange={setFilters} />
          </CardContent>
        </Card>

        <SectionCard
          title="Panel de Análisis"
          subtitle="Reportes detallados por categoría"
        >
          <Tabs defaultValue="herd" className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto sm:h-10">
              <TabsTrigger value="herd" className="text-xs sm:text-sm px-1 sm:px-3 py-2">
                <span className="hidden sm:inline">Rebaño</span>
                <span className="sm:hidden">Ganado</span>
              </TabsTrigger>
              <TabsTrigger value="reproductive" className="text-xs sm:text-sm px-1 sm:px-3 py-2">
                <span className="hidden sm:inline">Reproducción</span>
                <span className="sm:hidden">Reprod.</span>
              </TabsTrigger>
              <TabsTrigger value="production" className="text-xs sm:text-sm px-1 sm:px-3 py-2">
                <span className="hidden sm:inline">Producción</span>
                <span className="sm:hidden">Prod.</span>
              </TabsTrigger>
              <TabsTrigger value="mortality" className="text-xs sm:text-sm px-1 sm:px-3 py-2">
                <span className="hidden sm:inline">Mortalidad</span>
                <span className="sm:hidden">Mort.</span>
              </TabsTrigger>
              <TabsTrigger value="vaccines" className="text-xs sm:text-sm px-1 sm:px-3 py-2">
                <span className="hidden sm:inline">Vacunas</span>
                <span className="sm:hidden">Vac.</span>
              </TabsTrigger>
              <TabsTrigger value="financial" className="text-xs sm:text-sm px-1 sm:px-3 py-2">
                <span className="hidden sm:inline">Finanzas</span>
                <span className="sm:hidden">Fin.</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="herd" className="space-y-4">
              <HerdOverview filters={filters} />
            </TabsContent>
            
            <TabsContent value="reproductive" className="space-y-4">
              <ReproductiveAnalytics filters={filters} />
            </TabsContent>
            
            <TabsContent value="production" className="space-y-4">
              <ProductionAnalytics filters={filters} />
            </TabsContent>
            
            <TabsContent value="mortality" className="space-y-4">
              <MortalityReports filters={filters} />
            </TabsContent>
            
            <TabsContent value="vaccines" className="space-y-4">
              <VaccinationAnalytics filters={filters} />
            </TabsContent>
            
            <TabsContent value="financial" className="space-y-4">
              <FinancialAnalytics filters={filters} />
            </TabsContent>
          </Tabs>
        </SectionCard>
      </div>
    </div>
  );
};

export default Reports;