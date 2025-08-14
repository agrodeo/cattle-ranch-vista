
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface Row { date: string | null; amount: number | null; type: string | null; category_name?: string | null }

export function FinancesReports() {
  const { currentUser } = useSimpleAuth();

  const { data } = useQuery({
    queryKey: ["finances", "reports", currentUser?.id],
    queryFn: async (): Promise<Row[]> => {
      if (!currentUser?.id) {
        throw new Error("Usuario no autenticado");
      }

      const { data, error } = await supabase.rpc("list_finance_reports", {
        _user_id: currentUser.id,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.id,
  });

  const monthly = useMemo(() => {
    const map: Record<string, { month: string; ingresos: number; egresos: number }> = {};
    (data || []).forEach(r => {
      const key = r.date ? format(new Date(r.date), 'yyyy-MM') : 'N/A';
      if (!map[key]) map[key] = { month: key, ingresos: 0, egresos: 0 };
      if (r.type === 'ingreso') map[key].ingresos += r.amount || 0;
      if (r.type === 'egreso') map[key].egresos += r.amount || 0;
    });
    return Object.values(map).sort((a,b) => a.month.localeCompare(b.month));
  }, [data]);

  // Desglose por categoría del último mes con datos
  const lastMonthBreakdown = useMemo(() => {
    if (!data || data.length === 0) return [];
    const months = Array.from(new Set(data.filter(r => r.date).map(r => format(new Date(r.date!), 'yyyy-MM')))).sort();
    const last = months[months.length - 1];
    const filtered = data.filter(r => r.date && format(new Date(r.date), 'yyyy-MM') === last);
    const map: Record<string, { category: string; total: number }> = {};
    filtered.forEach(r => {
      const key = r.category_name || "Sin categoría";
      if (!map[key]) map[key] = { category: key, total: 0 };
      map[key].total += r.amount || 0;
    });
    return Object.values(map).sort((a,b) => b.total - a.total);
  }, [data]);

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <ChartContainer
          config={{ ingresos: { label: 'Ingresos', color: 'hsl(var(--primary))' }, egresos: { label: 'Egresos', color: 'hsl(var(--destructive))' } }}
          className="h-[320px] w-full"
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthly}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="ingresos" fill="var(--color-ingresos)" radius={4} />
              <Bar dataKey="egresos" fill="var(--color-egresos)" radius={4} />
              <ChartLegend content={<ChartLegendContent />} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Desglose por categoría del último mes */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Desglose por categoría (último mes con movimientos)</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {lastMonthBreakdown.map((item) => (
              <div key={item.category} className="flex items-center justify-between rounded border px-3 py-2">
                <span className="text-sm">{item.category}</span>
                <span className="text-sm font-mono">${item.total.toLocaleString()}</span>
              </div>
            ))}
            {lastMonthBreakdown.length === 0 && (
              <div className="text-sm text-muted-foreground">Sin datos todavía.</div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

