import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface Row { date: string | null; amount: number | null; type: string | null }

export function FinancesReports() {
  const { data } = useQuery({
    queryKey: ["finances","reports"],
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.from("finances").select("date, amount, type");
      if (error) throw error;
      return (data as Row[]) || [];
    }
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

  return (
    <Card>
      <CardContent className="pt-6">
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
      </CardContent>
    </Card>
  );
}
