
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Calendar, Users, TrendingUp, Activity } from "lucide-react";
import { ReportFilters } from "./ReportsFilters";

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

      // Apply filters
      if (filters?.corral_ids?.length) {
        query = query.in("corral_id", filters.corral_ids);
      }

      if (filters?.category) {
        // Filter by category based on age
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
        query = query.or("status.is.null,status.eq.activo");
      }

      if (filters?.date_from) {
        query = query.gte("birth_date", filters.date_from.toISOString());
      }

      if (filters?.date_to) {
        query = query.lte("birth_date", filters.date_to.toISOString());
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
    const activeAnimals = animals.filter(a => !a.status || a.status === 'activo').length;
    const soldAnimals = animals.filter(a => a.status === 'vendido').length;
    const deadAnimals = animals.filter(a => a.status === 'muerto').length;
    const maleCount = animals.filter(a => a.sex === 'Macho').length;
    const femaleCount = animals.filter(a => a.sex === 'Hembra').length;

    // Breed distribution
    const breedCounts: { [key: string]: number } = {};
    animals.forEach(animal => {
      const breed = animal.breed || 'Sin especificar';
      breedCounts[breed] = (breedCounts[breed] || 0) + 1;
    });
    const breedDistribution = Object.entries(breedCounts).map(([breed, count]) => ({ breed, count }));
    const uniqueBreeds = Object.keys(breedCounts).filter(breed => breed !== 'Sin especificar');

    // Age distribution
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
      
      if (ageInMonths < 12) {
        ageGroups['Terneros (0-12m)']++;
      } else if (ageInMonths < 24) {
        ageGroups['Jóvenes (1-2 años)']++;
      } else {
        ageGroups['Adultos (2+ años)']++;
      }
    });

    const ageDistribution = Object.entries(ageGroups).map(([group, count]) => ({ group, count }));

    // Status distribution with colors
    const statusDistribution = [
      { status: 'Activos', count: activeAnimals, color: '#10b981' },
      { status: 'Vendidos', count: soldAnimals, color: '#3b82f6' },
      { status: 'Fallecidos', count: deadAnimals, color: '#ef4444' }
    ].filter(item => item.count > 0);

    return {
      totalAnimals,
      activeAnimals,
      soldAnimals,
      deadAnimals,
      maleCount,
      femaleCount,
      breedDistribution,
      ageDistribution,
      statusDistribution
    };
  };

  if (loading) {
    return <div className="text-center p-8">Cargando estadísticas del rebaño...</div>;
  }

  if (!stats) {
    return <div className="text-center p-8">No se pudieron cargar las estadísticas.</div>;
  }

  return (
    <div className="grid gap-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Animales</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAnimals}</div>
            <div className="flex gap-2 mt-2">
              <Badge variant="secondary">{stats.maleCount} Machos</Badge>
              <Badge variant="outline">{stats.femaleCount} Hembras</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Animales Activos</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeAnimals}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.activeAnimals / stats.totalAnimals) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.soldAnimals}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.soldAnimals / stats.totalAnimals) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mortalidad</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.deadAnimals}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.deadAnimals / stats.totalAnimals) * 100).toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count, percent }) => `${status}: ${count} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {stats.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Age Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Edad</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.ageDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="group" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Breed Distribution - Only show if multiple breeds */}
        {stats.breedDistribution.length > 1 && stats.breedDistribution.filter(b => b.breed !== 'Sin especificar').length > 1 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Comparación por Raza</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.breedDistribution.filter(b => b.breed !== 'Sin especificar')}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="breed" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
