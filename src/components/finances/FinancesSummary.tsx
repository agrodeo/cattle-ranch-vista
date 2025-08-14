import { useState, useMemo } from "react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export function FinancesSummary() {
  const { currentUser } = useSimpleAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<string>("last6months");
  const [customFromDate, setCustomFromDate] = useState<Date | undefined>();
  const [customToDate, setCustomToDate] = useState<Date | undefined>();

  // Calculate date range based on period selection
  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (selectedPeriod) {
      case "currentMonth":
        return {
          fromDate: new Date(currentYear, currentMonth, 1),
          toDate: new Date(currentYear, currentMonth + 1, 0),
        };
      case "lastMonth":
        return {
          fromDate: new Date(currentYear, currentMonth - 1, 1),
          toDate: new Date(currentYear, currentMonth, 0),
        };
      case "currentYear":
        return {
          fromDate: new Date(currentYear, 0, 1),
          toDate: new Date(currentYear, 11, 31),
        };
      case "lastYear":
        return {
          fromDate: new Date(currentYear - 1, 0, 1),
          toDate: new Date(currentYear - 1, 11, 31),
        };
      case "last3months":
        return {
          fromDate: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
          toDate: now,
        };
      case "last6months":
        return {
          fromDate: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
          toDate: now,
        };
      case "custom":
        return {
          fromDate: customFromDate,
          toDate: customToDate,
        };
      default:
        return {
          fromDate: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
          toDate: now,
        };
    }
  }, [selectedPeriod, customFromDate, customToDate]);

  // Query for summary data using unified date filters
  const { data } = useQuery({
    queryKey: ["finances", "summary", currentUser?.id, fromDate?.toISOString(), toDate?.toISOString()],
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error("Usuario no autenticado");
      }

      const { data, error } = await supabase.rpc("get_finance_summary", {
        _user_id: currentUser.id,
        _from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : null,
        _to_date: toDate ? format(toDate, "yyyy-MM-dd") : null,
      });

      if (error) throw error;
      return data?.[0] || { ingresos: 0, egresos: 0, balance: 0 };
    },
    enabled: !!currentUser?.id && !!fromDate && !!toDate,
  });

  // Query for reports data using period filters
  const { data: reportsData } = useQuery({
    queryKey: ["finances", "reports", currentUser?.id, fromDate?.toISOString(), toDate?.toISOString()],
    queryFn: async () => {
      if (!currentUser?.id) {
        throw new Error("Usuario no autenticado");
      }

      const { data, error } = await supabase.rpc("list_finance_reports", {
        _user_id: currentUser.id,
        _from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : null,
        _to_date: toDate ? format(toDate, "yyyy-MM-dd") : null,
      });

      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser?.id && !!fromDate && !!toDate,
  });

  // Process data for charts
  const monthly = useMemo(() => {
    if (!reportsData) {
      console.log("No reportsData available");
      return [];
    }

    console.log("Processing monthly data:", reportsData);
    const monthlyMap = new Map();

    reportsData.forEach((item: any) => {
      try {
        // Use parseISO for proper date handling without timezone issues
        const itemDate = parseISO(item.date);
        if (isNaN(itemDate.getTime())) {
          console.warn("Invalid date found:", item.date, item);
          return;
        }

        const month = format(itemDate, "yyyy-MM");
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { month, ingresos: 0, egresos: 0 });
        }
        const entry = monthlyMap.get(month);
        
        const amount = Number(item.amount) || 0;
        if (item.type === "ingreso") {
          entry.ingresos += amount;
        } else if (item.type === "egreso") {
          entry.egresos += amount;
        }
      } catch (error) {
        console.error("Error processing item:", item, error);
      }
    });

    const result = Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    console.log("Monthly chart data:", result);
    return result;
  }, [reportsData]);

  const incomeByCategory = useMemo(() => {
    if (!reportsData) {
      console.log("No reportsData for income categories");
      return [];
    }

    const categoryMap = new Map();

    reportsData
      .filter((item: any) => item.type === "ingreso")
      .forEach((item: any) => {
        try {
          const category = item.category_name || "Sin categoría";
          const amount = Number(item.amount) || 0;
          
          if (!categoryMap.has(category)) {
            categoryMap.set(category, 0);
          }
          categoryMap.set(category, categoryMap.get(category) + amount);
        } catch (error) {
          console.error("Error processing income category:", item, error);
        }
      });

    const result = Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
    
    console.log("Income by category data:", result);
    return result;
  }, [reportsData]);

  const expensesByCategory = useMemo(() => {
    if (!reportsData) {
      console.log("No reportsData for expense categories");
      return [];
    }

    const categoryMap = new Map();

    reportsData
      .filter((item: any) => item.type === "egreso")
      .forEach((item: any) => {
        try {
          const category = item.category_name || "Sin categoría";
          const amount = Number(item.amount) || 0;
          
          if (!categoryMap.has(category)) {
            categoryMap.set(category, 0);
          }
          categoryMap.set(category, categoryMap.get(category) + amount);
        } catch (error) {
          console.error("Error processing expense category:", item, error);
        }
      });

    const result = Array.from(categoryMap.entries()).map(([name, value]) => ({
      name,
      value,
    }));
    
    console.log("Expenses by category data:", result);
    return result;
  }, [reportsData]);

  // Calculate period totals
  const totals = useMemo(() => {
    if (!reportsData) {
      console.log("No reportsData for totals");
      return { ingresos: 0, egresos: 0, balance: 0 };
    }

    const totalIngresos = reportsData
      .filter((item: any) => item.type === "ingreso")
      .reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

    const totalEgresos = reportsData
      .filter((item: any) => item.type === "egreso")
      .reduce((sum: number, item: any) => sum + (Number(item.amount) || 0), 0);

    const result = {
      ingresos: totalIngresos,
      egresos: totalEgresos,
      balance: totalIngresos - totalEgresos,
    };

    console.log("Period totals:", result);
    return result;
  }, [reportsData]);

  const ingresos = data?.ingresos || 0;
  const egresos = data?.egresos || 0;
  const balance = data?.balance || 0;

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

  const chartConfig = {
    ingresos: {
      label: "Ingresos",
      color: "hsl(var(--primary))",
    },
    egresos: {
      label: "Egresos",
      color: "hsl(var(--destructive))",
    },
  };

  return (
    <div className="space-y-6">
      {/* Period Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="currentMonth">Mes actual</SelectItem>
            <SelectItem value="lastMonth">Mes pasado</SelectItem>
            <SelectItem value="last3months">Últimos 3 meses</SelectItem>
            <SelectItem value="last6months">Últimos 6 meses</SelectItem>
            <SelectItem value="currentYear">Año actual</SelectItem>
            <SelectItem value="lastYear">Año pasado</SelectItem>
            <SelectItem value="custom">Personalizado</SelectItem>
          </SelectContent>
        </Select>

        {selectedPeriod === "custom" && (
          <>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[220px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customFromDate ? format(customFromDate, "PPP") : "Desde"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customFromDate}
                  onSelect={setCustomFromDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[220px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customToDate ? format(customToDate, "PPP") : "Hasta"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={customToDate}
                  onSelect={setCustomToDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Ingresos</p>
            <p className="text-2xl font-semibold">${ingresos.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Egresos</p>
            <p className="text-2xl font-semibold">${egresos.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className="text-2xl font-semibold">${balance.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Period Totals */}
      <Card>
        <CardHeader>
          <CardTitle>Totales del período seleccionado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <p className="text-sm text-muted-foreground">Ingresos</p>
              <p className="text-2xl font-semibold text-primary">${totals.ingresos.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-destructive/5 rounded-lg">
              <p className="text-sm text-muted-foreground">Egresos</p>
              <p className="text-2xl font-semibold text-destructive">${totals.egresos.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-secondary/5 rounded-lg">
              <p className="text-sm text-muted-foreground">Balance</p>
              <p className={`text-2xl font-semibold ${totals.balance >= 0 ? 'text-primary' : 'text-destructive'}`}>
                ${totals.balance.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Evolution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución mensual</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tickFormatter={(value) => format(new Date(value + "-01"), "MMM yyyy")}
                />
                <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="ingresos" fill="var(--color-ingresos)" />
                <Bar dataKey="egresos" fill="var(--color-egresos)" />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Category Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Ingresos por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {incomeByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
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
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No hay datos de ingresos para mostrar
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Egresos por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
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
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No hay datos de egresos para mostrar
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
