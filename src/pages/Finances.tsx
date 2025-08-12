import { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FinancesSummary } from "@/components/finances/FinancesSummary";
import { FinancesMovements } from "@/components/finances/FinancesMovements";
import { FinancesReports } from "@/components/finances/FinancesReports";

const Finances = () => {
  useEffect(() => {
    document.title = "Finanzas | AgroDeo";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Finanzas: resumen, movimientos y reportes");
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
            <TabsList>
              <TabsTrigger value="resumen">Resumen</TabsTrigger>
              <TabsTrigger value="movimientos">Movimientos</TabsTrigger>
              <TabsTrigger value="reportes">Reportes</TabsTrigger>
            </TabsList>
            <TabsContent value="resumen">
              <FinancesSummary />
            </TabsContent>
            <TabsContent value="movimientos">
              <FinancesMovements />
            </TabsContent>
            <TabsContent value="reportes">
              <FinancesReports />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
};

export default Finances;
