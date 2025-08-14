
import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancesSummary } from "@/components/finances/FinancesSummary";
import { FinancesMovements } from "@/components/finances/FinancesMovements";
import FinancesRecurring from "@/components/finances/FinancesRecurring";
import { HerdOverview } from "@/components/reports/HerdOverview";
import { ReproductiveAnalytics } from "@/components/reports/ReproductiveAnalytics";
import { ProductionAnalytics } from "@/components/reports/ProductionAnalytics";
import { MortalityReports } from "@/components/mortality/MortalityReports";
import { FinancialAnalytics } from "@/components/reports/FinancialAnalytics";

const Finances = () => {
  useEffect(() => {
    document.title = "Finanzas | AgroDeo";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Finanzas: resumen, movimientos, reportes y recurrentes");
  }, []);

  return (
    <section aria-labelledby="finanzas-title" className="space-y-6">
      <header>
        <h1 id="finanzas-title" className="text-3xl font-bold tracking-tight">Finanzas</h1>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Gestión financiera</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="resumen">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
              <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
              <TabsTrigger value="recurrentes">Recurrentes</TabsTrigger>
              <TabsTrigger value="reportes">Reportes</TabsTrigger>
            </TabsList>
            <TabsContent value="resumen">
              <FinancesSummary />
            </TabsContent>
            <TabsContent value="movimientos">
              <FinancesMovements />
            </TabsContent>
            <TabsContent value="recurrentes">
              <FinancesRecurring />
            </TabsContent>
            <TabsContent value="reportes">
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold tracking-tight">Reportes y Análisis</h2>
                  <p className="text-muted-foreground">
                    Análisis completo del desempeño de su operación ganadera
                  </p>
                </div>
                
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
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
};

export default Finances;

