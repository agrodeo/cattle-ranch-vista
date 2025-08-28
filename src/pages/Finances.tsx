import { useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancesSummary } from "@/components/finances/FinancesSummary";
import { FinancesMovements } from "@/components/finances/FinancesMovements";
import FinancesRecurring from "@/components/finances/FinancesRecurring";

const Finances = () => {
  useEffect(() => {
    document.title = "Finanzas | AgroDeo";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Finanzas: resumen, movimientos y recurrentes");
  }, []);

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
      <div className="space-y-3">
        <PageHeader 
          title="Finanzas"
          subtitle="Gestión completa de ingresos y gastos"
        />
        
        <SectionCard
          title="Gestión Financiera"
          subtitle="Seguimiento de movimientos y análisis económico"
        >
          <Tabs defaultValue="resumen">
            <TabsList className="grid w-full grid-cols-3 h-auto sm:h-10">
              <TabsTrigger value="resumen" className="text-xs sm:text-sm py-2">Resumen</TabsTrigger>
              <TabsTrigger value="movimientos" className="text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">Movimientos</span>
                <span className="sm:hidden">Movim.</span>
              </TabsTrigger>
              <TabsTrigger value="recurrentes" className="text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">Recurrentes</span>
                <span className="sm:hidden">Recur.</span>
              </TabsTrigger>
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
          </Tabs>
        </SectionCard>
      </div>
    </div>
  );
};

export default Finances;