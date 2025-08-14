import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HerdOverview } from "@/components/reports/HerdOverview";
import { ReproductiveAnalytics } from "@/components/reports/ReproductiveAnalytics";
import { ProductionAnalytics } from "@/components/reports/ProductionAnalytics";
import { MortalityReports } from "@/components/mortality/MortalityReports";
import { FinancialAnalytics } from "@/components/reports/FinancialAnalytics";

const Reports = () => {
  useEffect(() => {
    document.title = "Reportes y Análisis | AgroDeo";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Reportes y análisis: ganadería, reproducción, producción, mortalidad y finanzas");
  }, []);

  return (
    <section aria-labelledby="reportes-title" className="space-y-6">
      <header>
        <h1 id="reportes-title" className="text-3xl font-bold tracking-tight">Reportes y Análisis</h1>
        <p className="text-muted-foreground mt-2">
          Análisis completo del desempeño de su operación ganadera
        </p>
      </header>
      
      <Card>
        <CardHeader>
          <CardTitle>Panel de Análisis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="herd" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="herd">Rebaño</TabsTrigger>
              <TabsTrigger value="reproductive">Reproducción</TabsTrigger>
              <TabsTrigger value="production">Producción</TabsTrigger>
              <TabsTrigger value="mortality">Mortalidad</TabsTrigger>
              <TabsTrigger value="financial">Finanzas</TabsTrigger>
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