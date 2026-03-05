import { useState, useMemo, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, Wallet, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { db } from "@/services/db";
import { useConnectivity } from "@/services/connectivity";

export function FinancesSummary() {
  const { t } = useTranslation('finance');
  const { currentUser } = useSupabaseAuth();
  const { isOnline } = useConnectivity();
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

  // Calculate summary from cache when offline
  const getCachedSummary = useCallback(async () => {
    if (!currentUser?.cabañaId) return { ingresos: 0, egresos: 0, balance: 0 };
    
    const cached = await db.finances_cache
      .where('cabaña_id')
      .equals(currentUser.cabañaId)
      .toArray();
    
    let filtered = cached;
    if (fromDate) {
      const fromStr = format(fromDate, "yyyy-MM-dd");
      filtered = filtered.filter(f => f.date && f.date >= fromStr);
    }
    if (toDate) {
      const toStr = format(toDate, "yyyy-MM-dd");
      filtered = filtered.filter(f => f.date && f.date <= toStr);
    }
    
    const ingresos = filtered
      .filter(f => f.type === 'ingreso')
      .reduce((sum, f) => sum + (f.amount || 0), 0);
    
    const egresos = filtered
      .filter(f => f.type === 'egreso')
      .reduce((sum, f) => sum + (f.amount || 0), 0);
    
    return { ingresos, egresos, balance: ingresos - egresos };
  }, [currentUser?.cabañaId, fromDate, toDate]);

  // Query for summary data
  const { data } = useQuery({
    queryKey: ["finances", "summary", currentUser?.id, fromDate?.toISOString(), toDate?.toISOString(), isOnline],
    queryFn: async () => {
      if (!isOnline) {
        return getCachedSummary();
      }
      
      if (!currentUser?.id) {
        throw new Error("Usuario no autenticado");
      }

      try {
        const { data, error } = await supabase.rpc("get_finance_summary", {
          _user_id: currentUser.id,
          _from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : null,
          _to_date: toDate ? format(toDate, "yyyy-MM-dd") : null,
        });

        if (error) throw error;
        return data?.[0] || { ingresos: 0, egresos: 0, balance: 0 };
      } catch (err) {
        console.error('Error fetching finance summary:', err);
        return getCachedSummary();
      }
    },
    enabled: !!currentUser?.id && !!fromDate && !!toDate,
  });

  // Query for reports data
  const { data: reportsData } = useQuery({
    queryKey: ["finances", "reports", currentUser?.id, fromDate?.toISOString(), toDate?.toISOString(), isOnline],
    queryFn: async () => {
      if (!isOnline && currentUser?.cabañaId) {
        const cached = await db.finances_cache
          .where('cabaña_id')
          .equals(currentUser.cabañaId)
          .toArray();
        
        let filtered = cached;
        if (fromDate) {
          const fromStr = format(fromDate, "yyyy-MM-dd");
          filtered = filtered.filter(f => f.date && f.date >= fromStr);
        }
        if (toDate) {
          const toStr = format(toDate, "yyyy-MM-dd");
          filtered = filtered.filter(f => f.date && f.date <= toStr);
        }
        
        return filtered.map(f => ({
          date: f.date,
          type: f.type,
          amount: f.amount,
          category_name: null
        }));
      }
      
      if (!currentUser?.id) {
        throw new Error("Usuario no autenticado");
      }

      try {
        const { data, error } = await supabase.rpc("list_finance_reports", {
          _user_id: currentUser.id,
          _from_date: fromDate ? format(fromDate, "yyyy-MM-dd") : null,
          _to_date: toDate ? format(toDate, "yyyy-MM-dd") : null,
        });

        if (error) throw error;
        return data || [];
      } catch (err) {
        console.error('Error fetching finance reports:', err);
        return [];
      }
    },
    enabled: !!currentUser?.id && !!fromDate && !!toDate,
  });

  // Process data for charts
  const monthly = useMemo(() => {
    if (!reportsData) return [];
    const monthlyMap = new Map();

    reportsData.forEach((item: any) => {
      try {
        const itemDate = parseISO(item.date);
        if (isNaN(itemDate.getTime())) return;

        const month = format(itemDate, "yyyy-MM");
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { month, ingresos: 0, egresos: 0 });
        }
        const entry = monthlyMap.get(month);
        const amount = Number(item.amount) || 0;
        if (item.type === "ingreso") entry.ingresos += amount;
        else if (item.type === "egreso") entry.egresos += amount;
      } catch (error) {
        console.error("Error processing item:", item, error);
      }
    });

    return Array.from(monthlyMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [reportsData]);

  const incomeByCategory = useMemo(() => {
    if (!reportsData) return [];
    const categoryMap = new Map();
    reportsData
      .filter((item: any) => item.type === "ingreso")
      .forEach((item: any) => {
        const category = item.category_name || "Sin categoría";
        const amount = Number(item.amount) || 0;
        categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
      });
    return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
  }, [reportsData]);

  const expensesByCategory = useMemo(() => {
    if (!reportsData) return [];
    const categoryMap = new Map();
    reportsData
      .filter((item: any) => item.type === "egreso")
      .forEach((item: any) => {
        const category = item.category_name || "Sin categoría";
        const amount = Number(item.amount) || 0;
        categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
      });
    return Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));
  }, [reportsData]);

  const ingresos = data?.ingresos || 0;
  const egresos = data?.egresos || 0;
  const balance = data?.balance || 0;

  const INCOME_COLORS = [
    "hsl(142, 71%, 45%)",
    "hsl(142, 60%, 55%)",
    "hsl(160, 60%, 45%)",
    "hsl(170, 55%, 50%)",
    "hsl(152, 50%, 60%)",
    "hsl(130, 45%, 55%)",
  ];

  const EXPENSE_COLORS = [
    "hsl(0, 72%, 51%)",
    "hsl(15, 70%, 55%)",
    "hsl(30, 65%, 50%)",
    "hsl(350, 60%, 55%)",
    "hsl(10, 55%, 60%)",
    "hsl(340, 50%, 55%)",
  ];

  const chartConfig = {
    ingresos: {
      label: t('kpis.income'),
      color: "hsl(142, 71%, 45%)",
    },
    egresos: {
      label: t('kpis.expense'),
      color: "hsl(0, 72%, 51%)",
    },
  };

  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-3 shadow-lg">
        <p className="text-sm font-medium text-foreground mb-1.5">
          {format(new Date(label + "-01"), "MMM yyyy")}
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-semibold text-foreground">
              ${Number(entry.value).toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 24;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="hsl(var(--foreground))"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {name} ({(percent * 100).toFixed(0)}%)
      </text>
    );
  };

  return (
    <div className="space-y-6">
      {/* Period Filters — compact row */}
      <div className="flex flex-wrap items-end gap-3">
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[180px] h-9 text-sm rounded-lg">
            <SelectValue placeholder={t('summary.period')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="currentMonth">{t('filters.thisYear')}</SelectItem>
            <SelectItem value="lastMonth">{t('summary.lastMonth')}</SelectItem>
            <SelectItem value="last3months">{t('summary.last3Months')}</SelectItem>
            <SelectItem value="last6months">{t('summary.last6Months')}</SelectItem>
            <SelectItem value="currentYear">{t('filters.thisYear')}</SelectItem>
            <SelectItem value="lastYear">{t('summary.lastYear')}</SelectItem>
            <SelectItem value="custom">{t('summary.customPeriod')}</SelectItem>
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-3 rounded-lg text-sm font-normal">
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              {customFromDate ? format(customFromDate, "dd/MM/yy") : t('filters.from')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={customFromDate}
              onSelect={(date) => {
                setCustomFromDate(date);
                if (date) setSelectedPeriod("custom");
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 px-3 rounded-lg text-sm font-normal">
              <CalendarIcon className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
              {customToDate ? format(customToDate, "dd/MM/yy") : t('filters.to')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={customToDate}
              onSelect={(date) => {
                setCustomToDate(date);
                if (date) setSelectedPeriod("custom");
              }}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="relative overflow-hidden border-0 shadow-sm bg-primary/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('kpis.income')}
                </p>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  ${ingresos.toLocaleString()}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-sm bg-destructive/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('kpis.expense')}
                </p>
                <p className="text-2xl font-bold tracking-tight text-foreground">
                  ${egresos.toLocaleString()}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "relative overflow-hidden border-0 shadow-sm",
          balance >= 0 ? "bg-primary/5" : "bg-destructive/5"
        )}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t('kpis.balance')}
                </p>
                <p className={cn(
                  "text-2xl font-bold tracking-tight",
                  balance >= 0 ? "text-primary" : "text-destructive"
                )}>
                  ${balance.toLocaleString()}
                </p>
              </div>
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                balance >= 0 ? "bg-primary/10" : "bg-destructive/10"
              )}>
                <Wallet className={cn("h-5 w-5", balance >= 0 ? "text-primary" : "text-destructive")} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Evolution Chart */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{t('chart.monthlyEvolution')}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t('kpis.income')} vs {t('kpis.expense')}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">{t('kpis.income')}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                <span className="text-xs text-muted-foreground">{t('kpis.expense')}</span>
              </div>
            </div>
          </div>
          <ChartContainer config={chartConfig} className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} barGap={4} barCategoryGap="20%">
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
                <XAxis
                  dataKey="month"
                  tickFormatter={(value) => format(new Date(value + "-01"), "MMM")}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  dy={8}
                />
                <YAxis
                  tickFormatter={(value) => `$${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={50}
                />
                <Tooltip content={<CustomTooltipContent />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }} />
                <Bar dataKey="ingresos" name={t('kpis.income')} fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="egresos" name={t('kpis.expense')} fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Category Donut Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Income by Category */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <ArrowUpRight className="h-4 w-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{t('summary.incomeByCategory')}</h3>
            </div>
            {incomeByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={incomeByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                    label={renderCustomLabel}
                    labelLine={false}
                  >
                    {incomeByCategory.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={INCOME_COLORS[index % INCOME_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--background))',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                {t('summary.noData')}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="mb-4 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-destructive/10">
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">{t('summary.expensesByCategory')}</h3>
            </div>
            {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                    label={renderCustomLabel}
                    labelLine={false}
                  >
                    {expensesByCategory.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`$${Number(value).toLocaleString()}`, '']}
                    contentStyle={{
                      borderRadius: '8px',
                      border: '1px solid hsl(var(--border))',
                      backgroundColor: 'hsl(var(--background))',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
                {t('summary.noData')}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}