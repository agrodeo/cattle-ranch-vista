import { useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HerdOverview } from "@/components/reports/HerdOverview";
import { ReproductiveAnalytics } from "@/components/reports/ReproductiveAnalytics";
import { ProductionAnalytics } from "@/components/reports/ProductionAnalytics";
import { MortalityReports } from "@/components/mortality/MortalityReports";
import { FinancialAnalytics } from "@/components/reports/FinancialAnalytics";
import { VaccinationAnalytics } from "@/components/reports/VaccinationAnalytics";

const Reports = () => {
  useEffect(() => {
    document.title = "Reportes y Análisis | AgroDeo";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Reportes y análisis: ganadería, reproducción, producción, mortalidad y finanzas");
  }, []);

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
      <div className="space-y-3">
        <PageHeader 
          title="Reportes y Análisis"
          subtitle="Análisis completo del desempeño de su operación ganadera"
        />
        
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
              <HerdOverview />
            </TabsContent>
            
            <TabsContent value="reproductive" className="space-y-4">
              <ReproductiveAnalytics />
            </TabsContent>
            
            <TabsContent value="production" className="space-y-4">
              <ProductionAnalytics />
            </TabsContent>
            
            <TabsContent value="mortality" className="space-y-4">
              <MortalityReports />
            </TabsContent>
            
            <TabsContent value="vaccines" className="space-y-4">
              <VaccinationAnalytics />
            </TabsContent>
            
            <TabsContent value="financial" className="space-y-4">
              <FinancialAnalytics />
            </TabsContent>
          </Tabs>
        </SectionCard>
      </div>
    </div>
  );
};

export default Reports;