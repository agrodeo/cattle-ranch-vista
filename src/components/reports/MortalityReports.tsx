import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useHybridAuth } from "@/hooks/useHybridAuth";
import { AlertTriangle, Skull, Calendar, TrendingDown } from "lucide-react";

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

export const MortalityReports = () => {
  const { currentUser } = useHybridAuth();
  const [stats, setStats] = useState<MortalityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.cabañaId) {
      fetchMortalityStats();
    }
  }, [currentUser]);

  const fetchMortalityStats = async () => {
    try {
      // Fetch deaths data
      const { data: deaths } = await supabase
        .from("defunciones")
        .select(`
          *,
          catalogo_causas(nombre)
        `)
        .eq("cabaña_id", currentUser?.cabañaId);

      // Fetch all animals for rate calculations
      const { data: animals } = await supabase
        .from("animals")
        .select("id, breed, birth_date")
        .eq("cabaña_id", currentUser?.cabañaId);

      const mortalityStats = calculateMortalityStats(deaths || [], animals || []);
      setStats(mortalityStats);
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

    // Deaths by age groups
    const ageGroups = {
      'Terneros (0-12m)': 0,
      'Jóvenes (1-2 años)': 0,
      'Adultos (2+ años)': 0,
      'Edad desconocida': 0
    };

    deaths.forEach(death => {
      if (!death.edad_dias) {
        ageGroups['Edad desconocida']++;
        return;
      }
      
      const ageInMonths = death.edad_dias / 30.44;
      
      if (ageInMonths < 12) {
        ageGroups['Terneros (0-12m)']++;
      } else if (ageInMonths < 24) {
        ageGroups['Jóvenes (1-2 años)']++;
      } else {
        ageGroups['Adultos (2+ años)']++;
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
      const cause = death.catalogo_causas?.nombre || death.causa_texto || 'Causa desconocida';
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
        month: date.toLocaleString('es', { month: 'short', year: '2-digit' }),
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
    return <div className="text-center p-8">Cargando reportes de mortalidad...</div>;
  }

  if (!stats) {
    return <div className="text-center p-8">No se pudieron cargar las estadísticas de mortalidad.</div>;
  }

  return (
    <div className="grid gap-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Muertes</CardTitle>
            <Skull className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.totalDeaths}</div>
            <p className="text-xs text-muted-foreground">
              Registros totales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Mortalidad</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.mortalityRate.toFixed(1)}%</div>
            <Badge variant={stats.mortalityRate > 10 ? "destructive" : stats.mortalityRate > 5 ? "secondary" : "default"}>
              {stats.mortalityRate > 10 ? "Alta" : stats.mortalityRate > 5 ? "Moderada" : "Baja"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Edad Promedio de Muerte</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.averageDeathAge / 30.44)} meses</div>
            <p className="text-xs text-muted-foreground">
              {stats.averageDeathAge.toFixed(0)} días promedio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tendencia</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.monthlyDeaths.slice(-3).reduce((sum, m) => sum + m.count, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Últimos 3 meses
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
              <CardTitle>Mortalidad por Grupo de Edad</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.deathsByAge}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ ageGroup, percentage }) => `${ageGroup}: ${percentage.toFixed(1)}%`}
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
              <CardTitle>Principales Causas de Muerte</CardTitle>
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
            <CardTitle>Tendencia Mensual de Mortalidad</CardTitle>
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
              <CardTitle>Mortalidad por Raza</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.breedMortality}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="breed" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="deaths" fill="#ef4444" name="Muertes" />
                  <Bar dataKey="rate" fill="#f97316" name="Tasa %" />
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
            <CardTitle>Detalle de Causas de Muerte</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.deathsByCause.map((cause, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-medium">{cause.causa}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{cause.count} casos</span>
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