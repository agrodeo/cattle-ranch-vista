import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Calendar, Users, TrendingUp, Activity } from "lucide-react";
import { ReportFilters } from "./ReportsFilters";
import { formatDateForDB } from "@/lib/dateFormatters";
import { ReportKpiCard } from "./shared/ReportKpiCard";
import { ReportChartCard } from "./shared/ReportChartCard";
import { CHART_GRID_PROPS, CHART_X_AXIS_PROPS, CHART_Y_AXIS_PROPS, CHART_BAR_RADIUS, CHART_TOOLTIP_STYLE, CHART_CURSOR, CHART_COLORS, DONUT_PROPS, BAR_COLORS } from "./shared/chartStyles";

interface HerdStats {
  totalAnimals: number;
  activeAnimals: number;
  soldAnimals: number;
  deadAnimals: number;
  maleCount: number;
  femaleCount: number;
  breedDistribution: { breed: string; count: number }[];
  ageDistribution: { group: string; count: number }[];
  statusDistribution: { status: string; count: number; color: string }[];
}

interface HerdOverviewProps {
  filters?: ReportFilters;
}

export const HerdOverview = ({ filters }: HerdOverviewProps) => {
  const { t } = useTranslation(['reports', 'common']);
  const { currentUser } = useSupabaseAuth();
  const [stats, setStats] = useState<HerdStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.cabañaId) {
      fetchHerdStats();
    }
  }, [currentUser, filters]);

  const fetchHerdStats = async () => {
    try {
      let query = supabase
        .from("animals")
        .select("*")
        .eq("cabaña_id", currentUser?.cabañaId);

      if (filters?.corral_ids?.length) {
        query = query.in("corral_id", filters.corral_ids);
      }

      if (filters?.category) {
        const now = new Date();
        if (filters.category === "ternero") {
          const cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
          query = query.gte("birth_date", cutoff.toISOString());
        } else if (filters.category === "adulto") {
          const cutoff = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
          query = query.lt("birth_date", cutoff.toISOString());
        }
      }

      if (filters?.breed) {
        query = query.eq("breed", filters.breed);
      }

      if (!filters?.include_sold_dead) {
        query = query.or("status.is.null,status.ilike.activo,status.ilike.active");
      }

      if (filters?.date_from) {
        query = query.gte("birth_date", formatDateForDB(filters.date_from));
      }

      if (filters?.date_to) {
        query = query.lte("birth_date", formatDateForDB(filters.date_to));
      }

      const { data: animals, error } = await query;

      if (error) throw error;

      const herdStats = calculateHerdStats(animals || []);
      setStats(herdStats);
    } catch (error) {
      console.error("Error fetching herd stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateHerdStats = (animals: any[]): HerdStats => {
    const totalAnimals = animals.length;
    const st = (a: any) => (a.status ? String(a.status).trim().toLowerCase() : '');
    const activeAnimals = animals.filter(a => !a.status || st(a) === 'activo' || st(a) === 'active').length;
    const soldAnimals = animals.filter(a => st(a) === 'vendido' || st(a) === 'sold').length;
    const deadAnimals = animals.filter(a => st(a) === 'muerto' || st(a) === 'dead').length;
    const maleCount = animals.filter(a => a.sex === 'Macho').length;
    const femaleCount = animals.filter(a => a.sex === 'Hembra').length;

    const breedCounts: { [key: string]: number } = {};
    animals.forEach(animal => {
      const breed = animal.breed || 'Sin especificar';
      breedCounts[breed] = (breedCounts[breed] || 0) + 1;
    });
    const breedDistribution = Object.entries(breedCounts).map(([breed, count]) => ({ breed, count }));

    const ageGroups = {
      'Terneros (0-12m)': 0,
      'Jóvenes (1-2 años)': 0,
      'Adultos (2+ años)': 0,
      'Sin fecha': 0
    };

    animals.forEach(animal => {
      if (!animal.birth_date) {
        ageGroups['Sin fecha']++;
        return;
      }
      const ageInMonths = Math.floor((new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      if (ageInMonths < 12) ageGroups['Terneros (0-12m)']++;
      else if (ageInMonths < 24) ageGroups['Jóvenes (1-2 años)']++;
      else ageGroups['Adultos (2+ años)']++;
    });

    const ageDistribution = Object.entries(ageGroups).map(([group, count]) => ({ group, count }));

    const statusDistribution = [
      { status: t('herd.status.active'), count: activeAnimals, color: CHART_COLORS.status.active },
      { status: t('herd.status.sold'), count: soldAnimals, color: CHART_COLORS.status.sold },
      { status: t('herd.status.dead'), count: deadAnimals, color: CHART_COLORS.status.dead }
    ].filter(item => item.count > 0);

    return { totalAnimals, activeAnimals, soldAnimals, deadAnimals, maleCount, femaleCount, breedDistribution, ageDistribution, statusDistribution };
  };

  if (loading) {
    return <div className="text-center p-8">{t('herd.loading')}</div>;
  }

  if (!stats) {
    return <div className="text-center p-8">{t('herd.error')}</div>;
  }

  const renderDonutLabel = ({ cx, cy, midAngle, outerRadius, percent, status }: any) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 24;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text x={x} y={y} fill="hsl(var(--foreground))" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" className="text-xs font-medium">
        {status} ({(percent * 100).toFixed(0)}%)
      </text>
    );
  };

  return (
    <div className="grid gap-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportKpiCard
          label={t('herd.cards.totalAnimals')}
          value={stats.totalAnimals}
          icon={Users}
          variant="default"
        >
          <div className="flex gap-2 mt-1.5">
            <Badge variant="secondary" className="text-xs">{stats.maleCount} {t('common:sex.male')}</Badge>
            <Badge variant="outline" className="text-xs">{stats.femaleCount} {t('common:sex.female')}</Badge>
          </div>
        </ReportKpiCard>

        <ReportKpiCard
          label={t('herd.cards.activeAnimals')}
          value={stats.activeAnimals}
          subtitle={`${((stats.activeAnimals / stats.totalAnimals) * 100).toFixed(1)}% ${t('common:ofTotal')}`}
          icon={Activity}
          variant="success"
        />

        <ReportKpiCard
          label={t('herd.cards.sales')}
          value={stats.soldAnimals}
          subtitle={`${((stats.soldAnimals / stats.totalAnimals) * 100).toFixed(1)}% ${t('common:ofTotal')}`}
          icon={TrendingUp}
          variant="info"
        />

        <ReportKpiCard
          label={t('herd.cards.mortality')}
          value={stats.deadAnimals}
          subtitle={`${((stats.deadAnimals / stats.totalAnimals) * 100).toFixed(1)}% ${t('common:ofTotal')}`}
          icon={Calendar}
          variant="danger"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ReportChartCard title={t('herd.charts.statusDistribution')}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={stats.statusDistribution}
                cx="50%"
                cy="50%"
                dataKey="count"
                label={renderDonutLabel}
                labelLine={false}
                {...DONUT_PROPS}
              >
                {stats.statusDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...CHART_TOOLTIP_STYLE} />
            </PieChart>
          </ResponsiveContainer>
        </ReportChartCard>

        <ReportChartCard title={t('herd.charts.ageDistribution')}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stats.ageDistribution}>
              <CartesianGrid {...CHART_GRID_PROPS} />
              <XAxis dataKey="group" {...CHART_X_AXIS_PROPS} />
              <YAxis {...CHART_Y_AXIS_PROPS} />
              <Tooltip {...CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR} />
              <Bar dataKey="count" fill={BAR_COLORS.primary} radius={CHART_BAR_RADIUS} />
            </BarChart>
          </ResponsiveContainer>
        </ReportChartCard>

        {stats.breedDistribution.length > 1 && stats.breedDistribution.filter(b => b.breed !== 'Sin especificar').length > 1 && (
          <ReportChartCard title={t('herd.charts.breedDistribution')} className="lg:col-span-2">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.breedDistribution.filter(b => b.breed !== 'Sin especificar')}>
                <CartesianGrid {...CHART_GRID_PROPS} />
                <XAxis dataKey="breed" {...CHART_X_AXIS_PROPS} />
                <YAxis {...CHART_Y_AXIS_PROPS} />
                <Tooltip {...CHART_TOOLTIP_STYLE} cursor={CHART_CURSOR} />
                <Bar dataKey="count" fill={BAR_COLORS.secondary} radius={CHART_BAR_RADIUS} />
              </BarChart>
            </ResponsiveContainer>
          </ReportChartCard>
        )}
      </div>
    </div>
  );
};
