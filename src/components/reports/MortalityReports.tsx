import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/hooks/useLanguage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { AlertTriangle, Skull, Calendar, TrendingDown } from "lucide-react";
import { ReportFilters } from "./ReportsFilters";
import { categorizeAnimal } from "@/lib/animalCategories";

interface MortalityStats {
  totalDeaths: number;
  mortalityRate: number;
  averageDeathAge: number;
  deathsByAge: { ageGroup: string; count: number; percentage: number }[];
  deathsByCause: { causa: string; count: number; percentage: number }[];
  monthlyDeaths: { month: string; count: number }[];
  breedMortality: { breed: string; deaths: number; total: number; rate: number }[];
  hasMultipleBreeds: boolean;
}

interface MortalityReportsProps {
  filters?: ReportFilters;
}

export const MortalityReports = ({ filters: globalFilters }: MortalityReportsProps) => {
  const { t } = useTranslation(['reports']);
  const { lang } = useLanguage();
  const { currentUser } = useSupabaseAuth();
  const [stats, setStats] = useState<MortalityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.cabañaId) {
      fetchMortalityStats();
    }
  }, [currentUser, globalFilters]);

  const fetchMortalityStats = async () => {
    try {
      // Fetch death records with animal and cause info
      let query = supabase
        .from('defunciones')
        .select(`
          *,
          animal:animals!defunciones_animal_id_fkey(id, name, id_tag, sex, breed, birth_date, corral_id, is_castrated),
          causa:catalogo_causas!defunciones_causa_id_fkey(nombre)
        `)
        .eq('cabaña_id', currentUser.cabañaId);
      
      // Apply date filters
      if (globalFilters?.date_from) {
        query = query.gte('fecha_defuncion', globalFilters.date_from);
      }
      if (globalFilters?.date_to) {
        query = query.lte('fecha_defuncion', globalFilters.date_to);
      }
      
      // Apply breed filter
      if (globalFilters?.breed) {
        // This will be applied client-side since we're joining to animals
      }
      
      const { data: deaths, error } = await query;

      if (error) throw error;
      
      let filteredDeaths = deaths || [];
      
      // Apply corral filter (client-side)
      if (globalFilters?.corral_ids?.length) {
        filteredDeaths = filteredDeaths.filter(d => {
          const animal = Array.isArray(d.animal) ? d.animal[0] : d.animal;
          return animal?.corral_id && globalFilters.corral_ids?.includes(animal.corral_id);
        });
      }
      
      // Apply category filter (client-side)
      if (globalFilters?.category) {
        filteredDeaths = filteredDeaths.filter(d => {
          const animal = Array.isArray(d.animal) ? d.animal[0] : d.animal;
          if (!animal) return false;
          const category = categorizeAnimal(
            { birth_date: animal.birth_date, sex: animal.sex, id: animal.id },
            animal.is_castrated || false
          );
          return category === globalFilters.category;
        });
      }
      
      // Apply breed filter (client-side)
      if (globalFilters?.breed) {
        filteredDeaths = filteredDeaths.filter(d => {
          const animal = Array.isArray(d.animal) ? d.animal[0] : d.animal;
          return animal?.breed === globalFilters.breed;
        });
      }

      // Fetch all animals for rate calculations
      const { data: animals } = await supabase
        .from("animals")
        .select("id, breed, birth_date")
        .eq("cabaña_id", currentUser.cabañaId);

      // Calculate statistics
      const mortalityData = calculateMortalityStats(filteredDeaths, animals || []);
      setStats(mortalityData);
    } catch (error) {
      console.error("Error fetching mortality stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateMortalityStats = (deaths: any[], animals: any[]): MortalityStats => {
    const totalDeaths = deaths.length;
    const totalAnimals = animals.length;
    const mortalityRate = totalAnimals > 0 ? (totalDeaths / totalAnimals) * 100 : 0;

    // Average death age
    const deathsWithAge = deaths.filter(d => d.edad_dias !== null);
    const averageDeathAge = deathsWithAge.length > 0 
      ? deathsWithAge.reduce((sum, d) => sum + d.edad_dias, 0) / deathsWithAge.length
      : 0;

    // Deaths by age groups (keys for translation)
    const ageGroups: Record<string, number> = {
      'calves0_12': 0,
      'young1_2': 0,
      'adults2plus': 0,
      'unknownAge': 0
    };

    deaths.forEach(death => {
      if (!death.edad_dias) {
        ageGroups['unknownAge']++;
        return;
      }
      
      const ageInMonths = death.edad_dias / 30.44;
      
      if (ageInMonths < 12) {
        ageGroups['calves0_12']++;
      } else if (ageInMonths < 24) {
        ageGroups['young1_2']++;
      } else {
        ageGroups['adults2plus']++;
      }
    });

    const deathsByAge = Object.entries(ageGroups)
      .filter(([, count]) => count > 0)
      .map(([ageGroup, count]) => ({
        ageGroup,
        count,
        percentage: totalDeaths > 0 ? (count / totalDeaths) * 100 : 0
      }));

    // Deaths by cause
    const causeCounts: { [key: string]: number } = {};
    deaths.forEach(death => {
      const cause = death.catalogo_causas?.nombre || death.causa_texto || t('common:unknown');
      causeCounts[cause] = (causeCounts[cause] || 0) + 1;
    });

    const deathsByCause = Object.entries(causeCounts)
      .map(([causa, count]) => ({
        causa,
        count,
        percentage: totalDeaths > 0 ? (count / totalDeaths) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count);

    // Monthly deaths (last 12 months)
    const monthlyDeaths = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStr = date.toISOString().slice(0, 7); // YYYY-MM format
      
      const monthDeaths = deaths.filter(d => d.fecha_defuncion.startsWith(monthStr)).length;
      
      monthlyDeaths.push({
        month: date.toLocaleString(lang, { month: 'short', year: '2-digit' }),
        count: monthDeaths
      });
    }

    // Breed mortality analysis
    const breeds = [...new Set(animals.map(a => a.breed).filter(Boolean))];
    const hasMultipleBreeds = breeds.length > 1;
    
    const breedMortality = breeds.map(breed => {
      const breedAnimals = animals.filter(a => a.breed === breed);
      const breedDeaths = deaths.filter(d => {
        const animal = animals.find(a => a.id === d.animal_id);
        return animal?.breed === breed;
      });

      return {
        breed,
        deaths: breedDeaths.length,
        total: breedAnimals.length,
        rate: breedAnimals.length > 0 ? (breedDeaths.length / breedAnimals.length) * 100 : 0
      };
    }).filter(b => b.total > 0);

    return {
      totalDeaths,
      mortalityRate,
      averageDeathAge,
      deathsByAge,
      deathsByCause,
      monthlyDeaths,
      breedMortality,
      hasMultipleBreeds
    };
  };

  if (loading) {
    return <div className="text-center p-8">{t('reports:mortality.loading')}</div>;
  }

  if (!stats) {
    return <div className="text-center p-8">{t('reports:mortality.errorLoading')}</div>;
  }

  return (
    <div className="grid gap-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports:mortality.totalDeaths')}</CardTitle>
            <Skull className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.totalDeaths}</div>
            <p className="text-xs text-muted-foreground">
              {t('reports:mortality.totalRecords')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports:mortality.mortalityRate')}</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.mortalityRate.toFixed(1)}%</div>
            <Badge variant={stats.mortalityRate > 10 ? "destructive" : stats.mortalityRate > 5 ? "secondary" : "default"}>
              {stats.mortalityRate > 10 ? t('reports:mortality.high') : stats.mortalityRate > 5 ? t('reports:mortality.moderate') : t('reports:mortality.low')}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports:mortality.avgDeathAge')}</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.averageDeathAge / 30.44)} {t('reports:mortality.months')}</div>
            <p className="text-xs text-muted-foreground">
              {stats.averageDeathAge.toFixed(0)} {t('reports:mortality.daysAvg')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('reports:mortality.trend')}</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.monthlyDeaths.slice(-3).reduce((sum, m) => sum + m.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('reports:mortality.last3Months')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deaths by Age */}
        {stats.deathsByAge.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('reports:mortality.mortalityByAge')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.deathsByAge}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ ageGroup, percentage }) => `${t(`reports:mortality.${ageGroup}`)}: ${percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.deathsByAge.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#ef4444', '#f97316', '#eab308', '#84cc16'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Deaths by Cause */}
        {stats.deathsByCause.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('reports:mortality.mainCauses')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.deathsByCause.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="causa" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Monthly Trend */}
        <Card className={stats.hasMultipleBreeds ? "" : "lg:col-span-2"}>
          <CardHeader>
            <CardTitle>{t('reports:mortality.monthlyTrend')}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthlyDeaths}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Breed Mortality Comparison - Only show if multiple breeds */}
        {stats.hasMultipleBreeds && stats.breedMortality.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('reports:mortality.mortalityByBreed')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.breedMortality}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="breed" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="deaths" fill="#ef4444" name={t('reports:mortality.deaths')} />
                  <Bar dataKey="rate" fill="#f97316" name={t('reports:mortality.ratePercent')} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Detailed Causes Table */}
      {stats.deathsByCause.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('reports:mortality.causeDetails')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.deathsByCause.map((cause, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-medium">{cause.causa}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{cause.count} {t('reports:mortality.cases')}</span>
                    <Badge variant="outline">{cause.percentage.toFixed(1)}%</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};