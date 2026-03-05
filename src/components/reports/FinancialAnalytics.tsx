import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { DollarSign, TrendingUp, TrendingDown, Calculator, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { ReportFilters } from "./ReportsFilters";
import { format } from "date-fns";
import { ReportKpiCard } from "./shared/ReportKpiCard";
import { ReportChartCard } from "./shared/ReportChartCard";
import { CHART_GRID_PROPS, CHART_X_AXIS_PROPS, CHART_Y_AXIS_PROPS, CHART_BAR_RADIUS, CHART_TOOLTIP_STYLE, CHART_CURSOR, CHART_COLORS, DONUT_PROPS, BAR_COLORS } from "./shared/chartStyles";
import { formatDateForDB, ensureDateObject } from "@/lib/dateFormatters";
import { isOnline } from "@/services/connectivity";
import { db } from "@/services/db";
import { StaleDataBanner } from "./StaleDataBanner";

interface FinancialStats {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  revenuePerAnimal: number;
  costPerAnimal: number;
  monthlyData: { month: string; revenue: number; expenses: number; profit: number }[];
  categoryBreakdown: { category: string; amount: number; type: string; color: string }[];
  yearlyComparison: { year: number; revenue: number; expenses: number; profit: number }[];
  topExpenseCategories: { category: string; amount: number; percentage: number }[];
  topRevenueCategories: { category: string; amount: number; percentage: number }[];
  breedProfitability: { breed: string; revenue: number; costPerAnimal: number; profitPerAnimal: number }[];
  hasMultipleBreeds: boolean;
}

interface FinancialAnalyticsProps {
  filters?: ReportFilters;
}

export const FinancialAnalytics = ({ filters: globalFilters }: FinancialAnalyticsProps) => {
  const { t } = useTranslation(['reports']);
  const { lang } = useLanguage();
  const { currentUser } = useSupabaseAuth();
  const isMobile = useIsMobile();
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'all' | 'year' | 'quarter'>('year');
  const [isStale, setIsStale] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const CACHE_KEY = `financial:${currentUser?.cabañaId}:${timeRange}:${JSON.stringify(globalFilters)}`;

  useEffect(() => {
    if (currentUser?.cabañaId) {
      fetchFinancialStats();
    }
  }, [currentUser, timeRange, globalFilters]);

  const fetchFinancialStats = async () => {
    if (!isOnline()) {
      try {
        const cached = await db.reports_cache.get(CACHE_KEY);
        if (cached) {
          setStats(cached.data);
          setIsStale(true);
          setLastUpdated(cached.updated_at);
        }
      } catch (e) { console.warn('Failed to load cached financial report:', e); }
      setLoading(false);
      return;
    }
    try {
      setIsStale(false);
      // Calculate date range - use global filters if available
      const endDate = ensureDateObject(globalFilters?.date_to) || new Date();
      let startDate = ensureDateObject(globalFilters?.date_from) || new Date();
      
      if (!globalFilters?.date_from) {
        switch (timeRange) {
          case 'quarter':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case 'year':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
          case 'all':
            startDate = new Date('2020-01-01'); // Default start date
            break;
        }
      }

      // Fetch finances data
      let query = supabase
        .from("finances")
        .select(`
          *,
          finance_categories(name)
        `)
        .eq("cabaña_id", currentUser?.cabañaId)
        .gte('date', formatDateForDB(startDate))
        .lte('date', formatDateForDB(endDate))
        .order('date', { ascending: true });

      const { data: finances } = await query;

      // Fetch animals count for per-animal calculations with global filters
      let animalsQuery = supabase
        .from("animals")
        .select("id, breed")
        .eq("cabaña_id", currentUser?.cabañaId);

      // Apply global filters to animals
      if (globalFilters?.corral_ids?.length) {
        animalsQuery = animalsQuery.in("corral_id", globalFilters.corral_ids);
      }

      if (globalFilters?.breed) {
        animalsQuery = animalsQuery.eq("breed", globalFilters.breed);
      }

      if (!globalFilters?.include_sold_dead) {
        animalsQuery = animalsQuery.or("status.is.null,status.eq.activo");
      }

      const { data: animals } = await animalsQuery;

      const financialStats = calculateFinancialStats(finances || [], animals || []);
      setStats(financialStats);
      try {
        await db.reports_cache.put({ key: CACHE_KEY, data: financialStats, updated_at: new Date().toISOString() });
      } catch (e) { console.warn('Failed to cache financial report:', e); }
    } catch (error) {
      console.error("Error fetching financial stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancialStats = (finances: any[], animals: any[]): FinancialStats => {
    const animalCount = animals.length || 1;
    const revenues = finances.filter(f => f.type === 'ingreso');
    const expenses = finances.filter(f => f.type === 'egreso');

    const totalRevenue = revenues.reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, f) => sum + Number(f.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const revenuePerAnimal = totalRevenue / animalCount;
    const costPerAnimal = totalExpenses / animalCount;

    // Monthly data for the last 12 months
    const monthlyData = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7); // YYYY-MM format
      
      const monthRevenues = revenues.filter(f => f.date.startsWith(monthStr));
      const monthExpenses = expenses.filter(f => f.date.startsWith(monthStr));
      
      const monthRevenue = monthRevenues.reduce((sum, f) => sum + Number(f.amount || 0), 0);
      const monthExpense = monthExpenses.reduce((sum, f) => sum + Number(f.amount || 0), 0);
      
      monthlyData.push({
        month: date.toLocaleString(lang, { month: 'short', year: '2-digit' }),
        revenue: monthRevenue,
        expenses: monthExpense,
        profit: monthRevenue - monthExpense
      });
    }

    // Category breakdown
    const revenueByCategory: { [key: string]: number } = {};
    const expensesByCategory: { [key: string]: number } = {};

    revenues.forEach(f => {
      const category = f.finance_categories?.name || 'Sin categoría';
      revenueByCategory[category] = (revenueByCategory[category] || 0) + Number(f.amount || 0);
    });

    expenses.forEach(f => {
      const category = f.finance_categories?.name || 'Sin categoría';
      expensesByCategory[category] = (expensesByCategory[category] || 0) + Number(f.amount || 0);
    });

    const categoryBreakdown = [
      ...Object.entries(revenueByCategory).map(([category, amount]) => ({
        category,
        amount,
        type: t('reports:financial.revenue'),
        color: '#10b981'
      })),
      ...Object.entries(expensesByCategory).map(([category, amount]) => ({
        category,
        amount,
        type: t('reports:financial.expenses'),
        color: '#ef4444'
      }))
    ];

    // Yearly comparison (last 3 years)
    const yearlyComparison = [];
    for (let i = 2; i >= 0; i--) {
      const year = new Date().getFullYear() - i;
      const yearRevenues = revenues.filter(f => new Date(f.date).getFullYear() === year);
      const yearExpenses = expenses.filter(f => new Date(f.date).getFullYear() === year);
      
      const yearRevenue = yearRevenues.reduce((sum, f) => sum + Number(f.amount || 0), 0);
      const yearExpense = yearExpenses.reduce((sum, f) => sum + Number(f.amount || 0), 0);
      
      yearlyComparison.push({
        year,
        revenue: yearRevenue,
        expenses: yearExpense,
        profit: yearRevenue - yearExpense
      });
    }

    // Top categories
    const topExpenseCategories = Object.entries(expensesByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / totalExpenses) * 100
      }));

    const topRevenueCategories = Object.entries(revenueByCategory)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount,
        percentage: (amount / totalRevenue) * 100
      }));

    // Breed profitability analysis
    const breeds = [...new Set(animals.map(a => a.breed).filter(Boolean))];
    const hasMultipleBreeds = breeds.length > 1;
    const breedProfitability = breeds.map(breed => {
      const breedAnimals = animals.filter(a => a.breed === breed);
      const breedCount = breedAnimals.length || 1;
      
      // Calculate revenue from sales of this breed (simplified - would need animal sale tracking)
      const breedRevenue = totalRevenue / breeds.length; // Simplified distribution
      const breedCosts = totalExpenses / breeds.length; // Simplified distribution
      
      return {
        breed,
        revenue: breedRevenue,
        costPerAnimal: breedCosts / breedCount,
        profitPerAnimal: (breedRevenue - breedCosts) / breedCount
      };
    });

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      revenuePerAnimal,
      costPerAnimal,
      monthlyData,
      categoryBreakdown,
      yearlyComparison,
      topExpenseCategories,
      topRevenueCategories,
      breedProfitability,
      hasMultipleBreeds
    };
  };

  if (loading) {
    return <div className="text-center p-8">{t('reports:financial.loading')}</div>;
  }

  if (!stats) {
    return <div className="text-center p-8">{t('reports:financial.error')}</div>;
  }

  const renderDonutLabel = ({ cx, cy, midAngle, outerRadius, percent, name, category }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 24;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" className="text-xs font-medium">
        {category || name} ({(percent * 100).toFixed(0)}%)
      </text>
    );
  };

  return (
    <div className="grid gap-6">
      {isStale && <StaleDataBanner lastUpdated={lastUpdated} />}
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <ReportKpiCard
          label={t('reports:financial.totalRevenue')}
          value={`$${stats.totalRevenue.toLocaleString()}`}
          subtitle={`$${stats.revenuePerAnimal.toFixed(0)} ${t('reports:financial.perAnimal')}`}
          icon={TrendingUp}
          variant="success"
        />

        <ReportKpiCard
          label={t('reports:financial.totalExpenses')}
          value={`$${stats.totalExpenses.toLocaleString()}`}
          subtitle={`$${stats.costPerAnimal.toFixed(0)} ${t('reports:financial.perAnimal')}`}
          icon={TrendingDown}
          variant="danger"
        />

        <ReportKpiCard
          label={t('reports:financial.netProfit')}
          value={`$${stats.netProfit.toLocaleString()}`}
          icon={DollarSign}
          variant={stats.netProfit >= 0 ? "success" : "danger"}
        >
          <Badge variant={stats.netProfit >= 0 ? "default" : "destructive"} className="mt-1">
            {stats.netProfit >= 0 ? t('reports:financial.profit') : t('reports:financial.loss')}
          </Badge>
        </ReportKpiCard>

        <ReportKpiCard
          label={t('reports:financial.profitMargin')}
          value={`${stats.profitMargin.toFixed(1)}%`}
          icon={Calculator}
          variant={stats.profitMargin >= 10 ? "success" : stats.profitMargin >= 0 ? "warning" : "danger"}
        >
          <Badge variant={stats.profitMargin >= 10 ? "default" : stats.profitMargin >= 0 ? "secondary" : "destructive"} className="mt-1">
            {stats.profitMargin >= 10 ? t('reports:financial.excellent') : stats.profitMargin >= 0 ? t('reports:financial.acceptable') : t('reports:financial.critical')}
          </Badge>
        </ReportKpiCard>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly Performance */}
        <ReportChartCard
          title={t('reports:financial.monthlyPerformance')}
          legend={[
            { label: t('reports:financial.revenue'), color: BAR_COLORS.primary },
            { label: t('reports:financial.expenses'), color: BAR_COLORS.danger },
          ]}
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.monthlyData} barGap={4} barCategoryGap="20%">
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis dataKey="month" {...CHART_X_AXIS_PROPS} />
              <YAxis {...CHART_Y_AXIS_PROPS} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} cursor={CHART_CURSOR} />
              <Bar dataKey="revenue" fill={BAR_COLORS.primary} name={t('reports:financial.revenue')} radius={CHART_BAR_RADIUS} />
              <Bar dataKey="expenses" fill={BAR_COLORS.danger} name={t('reports:financial.expenses')} radius={CHART_BAR_RADIUS} />
            </BarChart>
          </ResponsiveContainer>
        </ReportChartCard>

        {/* Profit Trend */}
        <ReportChartCard title={t('reports:financial.profitTrend')}>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={stats.monthlyData}>
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis dataKey="month" {...CHART_X_AXIS_PROPS} />
              <YAxis {...CHART_Y_AXIS_PROPS} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
              <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
              <Line type="monotone" dataKey="profit" stroke={BAR_COLORS.secondary} strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </ReportChartCard>

        {/* Top Expense Categories */}
        {stats.topExpenseCategories.length > 0 && (
          <ReportChartCard title={t('reports:financial.topExpenseCategories')} icon={ArrowDownRight} iconVariant="danger">
            <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
              <PieChart>
                <Pie
                  data={stats.topExpenseCategories}
                  cx="50%"
                  cy="50%"
                  dataKey="amount"
                  label={isMobile ? false : renderDonutLabel}
                  labelLine={false}
                  {...DONUT_PROPS}
                >
                  {stats.topExpenseCategories.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS.red[index % CHART_COLORS.red.length]} />
                  ))}
                </Pie>
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
              </PieChart>
            </ResponsiveContainer>
            {isMobile && (
              <div className="flex flex-wrap gap-2 mt-2 px-1">
                {stats.topExpenseCategories.map((entry, index) => (
                  <div key={entry.category} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS.red[index % CHART_COLORS.red.length] }} />
                    <span className="truncate max-w-[120px]">{entry.category} ({entry.percentage.toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            )}
          </ReportChartCard>
        )}

        {/* Top Revenue Categories */}
        {stats.topRevenueCategories.length > 0 && (
          <ReportChartCard title={t('reports:financial.topRevenueCategories')} icon={ArrowUpRight} iconVariant="success">
            <ResponsiveContainer width="100%" height={isMobile ? 220 : 280}>
              <PieChart>
                <Pie
                  data={stats.topRevenueCategories}
                  cx="50%"
                  cy="50%"
                  dataKey="amount"
                  label={isMobile ? false : renderDonutLabel}
                  labelLine={false}
                  {...DONUT_PROPS}
                >
                  {stats.topRevenueCategories.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS.green[index % CHART_COLORS.green.length]} />
                  ))}
                </Pie>
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
              </PieChart>
            </ResponsiveContainer>
            {isMobile && (
              <div className="flex flex-wrap gap-2 mt-2 px-1">
                {stats.topRevenueCategories.map((entry, index) => (
                  <div key={entry.category} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS.green[index % CHART_COLORS.green.length] }} />
                    <span className="truncate max-w-[120px]">{entry.category} ({entry.percentage.toFixed(0)}%)</span>
                  </div>
                ))}
              </div>
            )}
          </ReportChartCard>
        )}

        {/* Breed Profitability */}
        {stats.hasMultipleBreeds && stats.breedProfitability.length > 1 && (
          <ReportChartCard
            title={t('reports:financial.breedProfitability')}
            legend={[
              { label: t('reports:financial.costPerAnimal'), color: BAR_COLORS.danger },
              { label: t('reports:financial.profitPerAnimal'), color: BAR_COLORS.primary },
            ]}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.breedProfitability} barGap={4}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="breed" {...CHART_X_AXIS_PROPS} />
                <YAxis {...CHART_Y_AXIS_PROPS} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} cursor={CHART_CURSOR} />
                <Bar dataKey="costPerAnimal" fill={BAR_COLORS.danger} name={t('reports:financial.costPerAnimal')} radius={CHART_BAR_RADIUS} />
                <Bar dataKey="profitPerAnimal" fill={BAR_COLORS.primary} name={t('reports:financial.profitPerAnimal')} radius={CHART_BAR_RADIUS} />
              </BarChart>
            </ResponsiveContainer>
          </ReportChartCard>
        )}

        {/* Yearly Comparison */}
        {stats.yearlyComparison.length > 1 && (
          <ReportChartCard
            title={t('reports:financial.yearlyComparison')}
            className={stats.hasMultipleBreeds && stats.breedProfitability.length > 1 ? "lg:col-span-1" : "lg:col-span-2"}
            legend={[
              { label: t('reports:financial.revenue'), color: BAR_COLORS.primary },
              { label: t('reports:financial.expenses'), color: BAR_COLORS.danger },
              { label: t('reports:financial.netProfit'), color: BAR_COLORS.secondary },
            ]}
          >
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.yearlyComparison} barGap={4}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="year" {...CHART_X_AXIS_PROPS} />
                <YAxis {...CHART_Y_AXIS_PROPS} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                <Tooltip {...CHART_TOOLTIP_STYLE} formatter={(value: number) => [`$${value.toLocaleString()}`, '']} cursor={CHART_CURSOR} />
                <Bar dataKey="revenue" fill={BAR_COLORS.primary} name={t('reports:financial.revenue')} radius={CHART_BAR_RADIUS} />
                <Bar dataKey="expenses" fill={BAR_COLORS.danger} name={t('reports:financial.expenses')} radius={CHART_BAR_RADIUS} />
                <Bar dataKey="profit" fill={BAR_COLORS.secondary} name={t('reports:financial.netProfit')} radius={CHART_BAR_RADIUS} />
              </BarChart>
            </ResponsiveContainer>
          </ReportChartCard>
        )}
      </div>
    </div>
  );
};