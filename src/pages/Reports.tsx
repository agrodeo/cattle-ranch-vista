import { useEffect } from "react";
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
    <section aria-labelledby="reportes-title" className="space-y-4 sm:space-y-6">
      <header className="space-y-2">
        <h1 id="reportes-title" className="text-2xl sm:text-3xl font-bold tracking-tight">Reportes y Análisis</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Análisis completo del desempeño de su operación ganadera
        </p>
      </header>
      
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Panel de Análisis</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
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
        </CardContent>
      </Card>
    </section>
  );
};

export default Reports;