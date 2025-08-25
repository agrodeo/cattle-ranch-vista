import { useEffect } from "react";
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
    <section aria-labelledby="finanzas-title" className="space-y-4 sm:space-y-6">
      <header className="space-y-2">
        <h1 id="finanzas-title" className="text-2xl sm:text-3xl font-bold tracking-tight">Finanzas</h1>
      </header>
      <Card>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-lg sm:text-xl">Gestión financiera</CardTitle>
        </CardHeader>
        <CardContent className="px-3 sm:px-6">
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
        </CardContent>
      </Card>
    </section>
  );
};

export default Finances;