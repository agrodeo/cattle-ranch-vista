
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths, subYears } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Row { date: string | null; amount: number | null; type: string | null; category_name?: string | null }

type PeriodOption = 'this_month' | 'last_month' | 'last_3_months' | 'last_6_months' | 'this_year' | 'last_year' | 'custom';

export function FinancesReports() {
  const { currentUser } = useSimpleAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>('last_6_months');
  const [customFromDate, setCustomFromDate] = useState<Date>();
  const [customToDate, setCustomToDate] = useState<Date>();

  // Calculate date range based on selected period
  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    
    switch (selectedPeriod) {
      case 'this_month':
        return { fromDate: startOfMonth(now), toDate: endOfMonth(now) };
      case 'last_month':
        const lastMonth = subMonths(now, 1);
        return { fromDate: startOfMonth(lastMonth), toDate: endOfMonth(lastMonth) };
      case 'last_3_months':
        return { fromDate: subMonths(now, 3), toDate: now };
      case 'last_6_months':
        return { fromDate: subMonths(now, 6), toDate: now };
      case 'this_year':
        return { fromDate: startOfYear(now), toDate: endOfYear(now) };
      case 'last_year':
        const lastYear = subYears(now, 1);
        return { fromDate: startOfYear(lastYear), toDate: endOfYear(lastYear) };
      case 'custom':
        return { 
          fromDate: customFromDate || subMonths(now, 6), 
          toDate: customToDate || now 
        };
      default:
        return { fromDate: subMonths(now, 6), toDate: now };
    }
  }, [selectedPeriod, customFromDate, customToDate]);

  const { data } = useQuery({
    queryKey: ["finances", "reports", currentUser?.id, fromDate, toDate],
    queryFn: async (): Promise<Row[]> => {
      if (!currentUser?.id) {
        throw new Error("Usuario no autenticado");
      }

      const { data, error } = await supabase.rpc("list_finance_reports", {
        _user_id: currentUser.id,
        _from_date: format(fromDate, 'yyyy-MM-dd'),
        _to_date: format(toDate, 'yyyy-MM-dd'),
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

  // Pie chart data for income by category
  const incomeByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    (data || []).forEach(r => {
      if (r.type === 'ingreso') {
        const key = r.category_name || "Sin categoría";
        map[key] = (map[key] || 0) + (r.amount || 0);
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Pie chart data for expenses by category
  const expensesByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    (data || []).forEach(r => {
      if (r.type === 'egreso') {
        const key = r.category_name || "Sin categoría";
        map[key] = (map[key] || 0) + (r.amount || 0);
      }
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [data]);

  // Colors for pie charts
  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))', 'hsl(var(--warning))', 'hsl(var(--success))'];

  // Totals for the selected period
  const totals = useMemo(() => {
    let totalIncome = 0;
    let totalExpenses = 0;
    (data || []).forEach(r => {
      if (r.type === 'ingreso') totalIncome += r.amount || 0;
      if (r.type === 'egreso') totalExpenses += r.amount || 0;
    });
    return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Filter Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Período</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Período</label>
              <Select value={selectedPeriod} onValueChange={(value: PeriodOption) => setSelectedPeriod(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_month">Este mes</SelectItem>
                  <SelectItem value="last_month">Mes pasado</SelectItem>
                  <SelectItem value="last_3_months">Últimos 3 meses</SelectItem>
                  <SelectItem value="last_6_months">Últimos 6 meses</SelectItem>
                  <SelectItem value="this_year">Este año</SelectItem>
                  <SelectItem value="last_year">Año pasado</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === 'custom' && (
              <>
                <div className="flex-1">
                  <label className="text-sm font-medium">Fecha desde</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customFromDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customFromDate ? format(customFromDate, "dd/MM/yyyy") : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customFromDate}
                        onSelect={setCustomFromDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium">Fecha hasta</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customToDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customToDate ? format(customToDate, "dd/MM/yyyy") : "Seleccionar fecha"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customToDate}
                        onSelect={setCustomToDate}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}
          </div>

          {/* Period Totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">${totals.totalIncome.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Ingresos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-destructive">${totals.totalExpenses.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Egresos</div>
            </div>
            <div className="text-center">
              <div className={cn("text-2xl font-bold", totals.balance >= 0 ? "text-primary" : "text-destructive")}>
                ${totals.balance.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">Balance</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Bar Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución Mensual</CardTitle>
        </CardHeader>
        <CardContent>
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

      {/* Pie Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeByCategory.length > 0 ? (
              <ChartContainer
                config={{}}
                className="h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={incomeByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {incomeByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          return (
                            <div className="bg-background border rounded-lg p-2 shadow">
                              <p className="text-sm">{data.name}</p>
                              <p className="text-sm font-bold">${Number(data.value).toLocaleString()}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No hay datos de ingresos para el período seleccionado
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Egresos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length > 0 ? (
              <ChartContainer
                config={{}}
                className="h-[300px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={expensesByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expensesByCategory.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0];
                          return (
                            <div className="bg-background border rounded-lg p-2 shadow">
                              <p className="text-sm">{data.name}</p>
                              <p className="text-sm font-bold">${Number(data.value).toLocaleString()}</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No hay datos de egresos para el período seleccionado
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

