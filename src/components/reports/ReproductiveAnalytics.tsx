import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Heart, TrendingUp, Calendar, Users } from "lucide-react";
import { ReportsFilters, ReportFilters } from "./ReportsFilters";
import { AnimalReproductionTable } from "./AnimalReproductionTable";
import { CorralKPIsCard } from "./CorralKPIsCard";

interface ReproductiveStats {
  totalFemales: number;
  reproductiveFemales: number;
  totalInseminations: number;
  confirmedPregnancies: number;
  pregnancyRate: number;
  calvingRate: number;
  averageCalvingInterval: number;
  aiSuccessRate: number;
  yearlyData: { year: number; pregnancies: number; births: number; inseminations: number }[];
  serviceTypeData: { type: string; count: number; successRate: number }[];
  monthlyBreeding: { month: string; count: number }[];
  breedComparison: { breed: string; pregnancyRate: number; calvingRate: number; aiSuccessRate: number }[];
  hasMultipleBreeds: boolean;
}

interface ReproductiveAnalyticsProps {
  filters?: ReportFilters;
}

export const ReproductiveAnalytics = ({ filters: globalFilters }: ReproductiveAnalyticsProps) => {
  const { currentUser } = useSupabaseAuth();
  const [stats, setStats] = useState<ReproductiveStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.cabañaId) {
      fetchReproductiveStats();
    }
  }, [currentUser, globalFilters]);

  const fetchReproductiveStats = async () => {
    try {
      // Fetch animals data
      const { data: animals } = await supabase
        .from("animals")
        .select("*")
        .eq("cabaña_id", currentUser?.cabañaId);

      // Fetch artificial inseminations
      const { data: inseminations } = await supabase
        .from("artificial_inseminations")
        .select("*")
        .eq("cabaña_id", currentUser?.cabañaId);

      // Fetch reproductive events
      const { data: reproductiveEvents } = await supabase
        .from("reproductive_events")
        .select("*")
        .eq("cabaña_id", currentUser?.cabañaId);

      const reproStats = calculateReproductiveStats(animals || [], inseminations || [], reproductiveEvents || []);
      setStats(reproStats);
    } catch (error) {
      console.error("Error fetching reproductive stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateReproductiveStats = (animals: any[], inseminations: any[], reproductiveEvents: any[]): ReproductiveStats => {
    const females = animals.filter(a => a.sex === 'Hembra' && (!a.status || a.status === 'activo'));
    const totalFemales = females.length;
    
    // Reproductive females (15+ months old)
    const reproductiveFemales = females.filter(f => {
      if (!f.birth_date) return false;
      const ageInMonths = Math.floor((new Date().getTime() - new Date(f.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      return ageInMonths >= 15;
    }).length;

    const totalInseminations = inseminations.length;
    const confirmedPregnancies = inseminations.filter(i => i.is_pregnant === true).length + 
                                 reproductiveEvents.filter(r => r.pregnancy_status === 'pregnant').length;
    
    const pregnancyRate = reproductiveFemales > 0 ? (confirmedPregnancies / reproductiveFemales) * 100 : 0;
    
    const liveBirths = reproductiveEvents.filter(r => r.pregnancy_outcome === 'live_calf').length;
    const calvingRate = confirmedPregnancies > 0 ? (liveBirths / confirmedPregnancies) * 100 : 0;
    
    const aiSuccessRate = totalInseminations > 0 ? (confirmedPregnancies / totalInseminations) * 100 : 0;

    // Yearly data
    const currentYear = new Date().getFullYear();
    const yearlyData = [];
    for (let year = currentYear - 4; year <= currentYear; year++) {
      const yearInseminations = inseminations.filter(i => new Date(i.insemination_date).getFullYear() === year).length;
      const yearPregnancies = inseminations.filter(i => i.is_pregnant === true && new Date(i.insemination_date).getFullYear() === year).length +
                             reproductiveEvents.filter(r => r.pregnancy_status === 'pregnant' && r.year === year).length;
      const yearBirths = reproductiveEvents.filter(r => r.pregnancy_outcome === 'live_calf' && r.year === year).length;
      
      yearlyData.push({
        year,
        pregnancies: yearPregnancies,
        births: yearBirths,
        inseminations: yearInseminations
      });
    }

    // Service type data (artificial vs natural)
    const artificialServices = inseminations.length;
    const naturalServices = animals.filter(a => a.tipo_servicio === 'natural').length;
    const serviceTypeData = [
      { type: 'Inseminación Artificial', count: artificialServices, successRate: aiSuccessRate },
      { type: 'Servicio Natural', count: naturalServices, successRate: 0 } // We don't track natural service success rates directly
    ].filter(item => item.count > 0);

    // Monthly breeding patterns
    const monthlyBreeding = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(0, i).toLocaleString('es', { month: 'long' });
      const count = inseminations.filter(ins => new Date(ins.insemination_date).getMonth() === i).length;
      return { month: month.charAt(0).toUpperCase() + month.slice(1), count };
    });

    // Breed comparison
    const breeds = [...new Set(animals.map(a => a.breed).filter(Boolean))];
    const hasMultipleBreeds = breeds.length > 1;
    const breedComparison = breeds.map(breed => {
      const breedFemales = females.filter(f => f.breed === breed);
      const breedReproductiveFemales = breedFemales.filter(f => {
        if (!f.birth_date) return false;
        const ageInMonths = Math.floor((new Date().getTime() - new Date(f.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        return ageInMonths >= 15;
      });
      
      const breedInseminations = inseminations.filter(i => {
        const female = animals.find(a => a.id === i.female_id);
        return female?.breed === breed;
      });
      
      const breedPregnancies = breedInseminations.filter(i => i.is_pregnant === true).length +
                              reproductiveEvents.filter(r => {
                                const animal = animals.find(a => a.id === r.animal_id);
                                return animal?.breed === breed && r.pregnancy_status === 'pregnant';
                              }).length;
      
      const breedBirths = reproductiveEvents.filter(r => {
        const animal = animals.find(a => a.id === r.animal_id);
        return animal?.breed === breed && r.pregnancy_outcome === 'live_calf';
      }).length;

      return {
        breed,
        pregnancyRate: breedReproductiveFemales.length > 0 ? (breedPregnancies / breedReproductiveFemales.length) * 100 : 0,
        calvingRate: breedPregnancies > 0 ? (breedBirths / breedPregnancies) * 100 : 0,
        aiSuccessRate: breedInseminations.length > 0 ? (breedInseminations.filter(i => i.is_pregnant === true).length / breedInseminations.length) * 100 : 0
      };
    });

    return {
      totalFemales,
      reproductiveFemales,
      totalInseminations,
      confirmedPregnancies,
      pregnancyRate,
      calvingRate,
      averageCalvingInterval: 365, // Default - would need more complex calculation
      aiSuccessRate,
      yearlyData,
      serviceTypeData,
      monthlyBreeding,
      breedComparison,
      hasMultipleBreeds
    };
  };

  if (loading) {
    return <div className="text-center p-8">Cargando análisis reproductivo...</div>;
  }

  if (!stats) {
    return <div className="text-center p-8">No se pudieron cargar las estadísticas reproductivas.</div>;
  }

  const handleViewCorralAnimals = (corralId: string, corralName: string) => {
    // This would be handled by the global filters now
    console.log('View corral animals:', corralId, corralName);
  };

  return (
    <div className="space-y-6">
      <CorralKPIsCard onViewCorralAnimals={handleViewCorralAnimals} />
      <AnimalReproductionTable filters={globalFilters || {}} />
      
      {/* Original Analytics */}
      <div className="grid gap-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Preñez</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.pregnancyRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.confirmedPregnancies} de {stats.reproductiveFemales} hembras reproductivas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Parición</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.calvingRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Partos exitosos de preñeces confirmadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Éxito IA</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.aiSuccessRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalInseminations} inseminaciones realizadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hembras Reproductivas</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reproductiveFemales}</div>
            <p className="text-xs text-muted-foreground">
              De {stats.totalFemales} hembras totales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Yearly Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento Reproductivo por Año</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.yearlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="inseminations" fill="#8884d8" name="Inseminaciones" />
                <Bar dataKey="pregnancies" fill="#10b981" name="Preñeces" />
                <Bar dataKey="births" fill="#3b82f6" name="Partos" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Service Type Distribution */}
        {stats.serviceTypeData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Servicio</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stats.serviceTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ type, count }) => `${type}: ${count}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {stats.serviceTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#3b82f6'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Monthly Breeding Pattern */}
        <Card className={stats.hasMultipleBreeds ? "" : "lg:col-span-2"}>
          <CardHeader>
            <CardTitle>Patrón Estacional de Servicios</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.monthlyBreeding}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Breed Comparison - Only show if multiple breeds */}
        {stats.hasMultipleBreeds && stats.breedComparison.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Comparación Reproductiva por Raza</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.breedComparison}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="breed" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pregnancyRate" fill="#10b981" name="% Preñez" />
                  <Bar dataKey="calvingRate" fill="#3b82f6" name="% Parición" />
                  <Bar dataKey="aiSuccessRate" fill="#8b5cf6" name="% Éxito IA" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Badges */}
      <Card>
        <CardHeader>
          <CardTitle>Indicadores de Rendimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Badge variant={stats.pregnancyRate >= 80 ? "default" : stats.pregnancyRate >= 60 ? "secondary" : "destructive"}>
              Preñez: {stats.pregnancyRate.toFixed(1)}%
            </Badge>
            <Badge variant={stats.calvingRate >= 90 ? "default" : stats.calvingRate >= 80 ? "secondary" : "destructive"}>
              Parición: {stats.calvingRate.toFixed(1)}%
            </Badge>
            <Badge variant={stats.aiSuccessRate >= 60 ? "default" : stats.aiSuccessRate >= 40 ? "secondary" : "destructive"}>
              IA: {stats.aiSuccessRate.toFixed(1)}%
            </Badge>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};