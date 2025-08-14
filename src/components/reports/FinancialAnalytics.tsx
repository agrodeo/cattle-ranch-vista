import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { DollarSign, TrendingUp, TrendingDown, Calculator } from "lucide-react";

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
}

export const FinancialAnalytics = () => {
  const { currentUser } = useSimpleAuth();
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'all' | 'year' | 'quarter'>('year');

  useEffect(() => {
    if (currentUser?.cabañaId) {
      fetchFinancialStats();
    }
  }, [currentUser, timeRange]);

  const fetchFinancialStats = async () => {
    try {
      // Calculate date range
      const endDate = new Date();
      let startDate = new Date();
      
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

      // Fetch finances data
      const { data: finances } = await supabase
        .from("finances")
        .select(`
          *,
          finance_categories(name)
        `)
        .eq("cabaña_id", currentUser?.cabañaId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: true });

      // Fetch animals count for per-animal calculations
      const { data: animals } = await supabase
        .from("animals")
        .select("id")
        .eq("cabaña_id", currentUser?.cabañaId);

      const financialStats = calculateFinancialStats(finances || [], animals?.length || 1);
      setStats(financialStats);
    } catch (error) {
      console.error("Error fetching financial stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancialStats = (finances: any[], animalCount: number): FinancialStats => {
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
        month: date.toLocaleString('es', { month: 'short', year: '2-digit' }),
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
        type: 'Ingreso',
        color: '#10b981'
      })),
      ...Object.entries(expensesByCategory).map(([category, amount]) => ({
        category,
        amount,
        type: 'Egreso',
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
      topRevenueCategories
    };
  };

  if (loading) {
    return <div className="text-center p-8">Cargando análisis financiero...</div>;
  }

  if (!stats) {
    return <div className="text-center p-8">No se pudieron cargar las estadísticas financieras.</div>;
  }

  return (
    <div className="grid gap-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        <Badge 
          variant={timeRange === 'quarter' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setTimeRange('quarter')}
        >
          Último Trimestre
        </Badge>
        <Badge 
          variant={timeRange === 'year' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setTimeRange('year')}
        >
          Último Año
        </Badge>
        <Badge 
          variant={timeRange === 'all' ? 'default' : 'outline'}
          className="cursor-pointer"
          onClick={() => setTimeRange('all')}
        >
          Todos los Datos
        </Badge>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats.totalRevenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              ${stats.revenuePerAnimal.toFixed(0)} por animal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Egresos Totales</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${stats.totalExpenses.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              ${stats.costPerAnimal.toFixed(0)} por animal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Neta</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${stats.netProfit.toLocaleString()}
            </div>
            <Badge variant={stats.netProfit >= 0 ? "default" : "destructive"}>
              {stats.netProfit >= 0 ? "Ganancia" : "Pérdida"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen de Ganancia</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stats.profitMargin.toFixed(1)}%
            </div>
            <Badge variant={stats.profitMargin >= 10 ? "default" : stats.profitMargin >= 0 ? "secondary" : "destructive"}>
              {stats.profitMargin >= 10 ? "Excelente" : stats.profitMargin >= 0 ? "Aceptable" : "Crítico"}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                <Legend />
                <Bar dataKey="revenue" fill="#10b981" name="Ingresos" />
                <Bar dataKey="expenses" fill="#ef4444" name="Egresos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Profit Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Ganancia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                <Line type="monotone" dataKey="profit" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Expense Categories */}
        {stats.topExpenseCategories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Principales Categorías de Egresos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.topExpenseCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {stats.topExpenseCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Top Revenue Categories */}
        {stats.topRevenueCategories.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Principales Categorías de Ingresos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.topRevenueCategories}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {stats.topRevenueCategories.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#10b981', '#059669', '#047857', '#065f46', '#064e3b'][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Yearly Comparison */}
        {stats.yearlyComparison.length > 1 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Comparación Anual</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.yearlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Number(value).toLocaleString()}`} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10b981" name="Ingresos" />
                  <Bar dataKey="expenses" fill="#ef4444" name="Egresos" />
                  <Bar dataKey="profit" fill="#3b82f6" name="Ganancia" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};