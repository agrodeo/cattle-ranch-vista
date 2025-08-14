import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ScatterChart, Scatter } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { Scale, TrendingUp, Target, Award } from "lucide-react";
import { getWeightedBenchmarks, evaluatePerformance, getBreedInfo, type BreedBenchmarks } from "@/lib/breedBenchmarks";

interface ProductionStats {
  averageBirthWeight: number;
  averageWeaningWeight: number;
  averageFinalWeight: number;
  averageDailyGain: number;
  weightByAge: { ageMonths: number; avgWeight: number; count: number }[];
  weightByBreed: { breed: string; birthWeight: number; weaningWeight: number; finalWeight: number; breedInfo: { name: string; hasBenchmarks: boolean } }[];
  weightByGender: { gender: string; birthWeight: number; weaningWeight: number; finalWeight: number }[];
  growthTrends: { month: string; avgBirthWeight: number; avgWeaningWeight: number; avgFinalWeight: number }[];
  performanceIndicators: { metric: string; value: number; benchmark: number; status: string; breedSpecific: boolean }[];
  hasMultipleBreeds: boolean;
  benchmarks: BreedBenchmarks;
  breedDistribution: { breed: string; count: number }[];
}

export const ProductionAnalytics = () => {
  const { currentUser } = useSimpleAuth();
  const [stats, setStats] = useState<ProductionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.cabañaId) {
      fetchProductionStats();
    }
  }, [currentUser]);

  const fetchProductionStats = async () => {
    try {
      const { data: animals, error } = await supabase
        .from("animals")
        .select("*")
        .eq("cabaña_id", currentUser?.cabañaId);

      if (error) throw error;

      const prodStats = calculateProductionStats(animals || []);
      setStats(prodStats);
    } catch (error) {
      console.error("Error fetching production stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateProductionStats = (animals: any[]): ProductionStats => {
    const animalsWithWeights = animals.filter(a => a.peso_nacimiento || a.peso_destete || a.peso_final);

    // Calculate breed distribution
    const breeds = [...new Set(animals.map(a => a.breed).filter(Boolean))];
    const breedDistribution = breeds.map(breed => ({
      breed,
      count: animals.filter(a => a.breed === breed).length
    }));

    // Get breed-specific benchmarks
    const benchmarks = getWeightedBenchmarks(breedDistribution);

    // Average weights
    const birthWeights = animals.filter(a => a.peso_nacimiento).map(a => Number(a.peso_nacimiento));
    const weaningWeights = animals.filter(a => a.peso_destete).map(a => Number(a.peso_destete));
    const finalWeights = animals.filter(a => a.peso_final).map(a => Number(a.peso_final));

    const averageBirthWeight = birthWeights.length > 0 ? birthWeights.reduce((a, b) => a + b, 0) / birthWeights.length : 0;
    const averageWeaningWeight = weaningWeights.length > 0 ? weaningWeights.reduce((a, b) => a + b, 0) / weaningWeights.length : 0;
    const averageFinalWeight = finalWeights.length > 0 ? finalWeights.reduce((a, b) => a + b, 0) / finalWeights.length : 0;

    // Average daily gain (assuming weaning at 7 months)
    const averageDailyGain = averageWeaningWeight > 0 && averageBirthWeight > 0 
      ? (averageWeaningWeight - averageBirthWeight) / (7 * 30) 
      : 0;

    // Weight by age groups
    const weightByAge = [];
    const ageGroups = [
      { min: 0, max: 6, label: '0-6' },
      { min: 6, max: 12, label: '6-12' },
      { min: 12, max: 24, label: '12-24' },
      { min: 24, max: 999, label: '24+' }
    ];

    ageGroups.forEach(group => {
      const animalsInGroup = animals.filter(a => {
        if (!a.birth_date) return false;
        const ageInMonths = Math.floor((new Date().getTime() - new Date(a.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        return ageInMonths >= group.min && ageInMonths < group.max;
      });

      if (animalsInGroup.length > 0) {
        const weights = animalsInGroup.filter(a => a.peso_final || a.peso_destete).map(a => Number(a.peso_final || a.peso_destete));
        const avgWeight = weights.length > 0 ? weights.reduce((a, b) => a + b, 0) / weights.length : 0;
        
        weightByAge.push({
          ageMonths: (group.min + group.max) / 2,
          avgWeight,
          count: animalsInGroup.length
        });
      }
    });

    // Weight by breed
    const weightByBreed = breeds.map(breed => {
      const breedAnimals = animals.filter(a => a.breed === breed);
      const breedBirthWeights = breedAnimals.filter(a => a.peso_nacimiento).map(a => Number(a.peso_nacimiento));
      const breedWeaningWeights = breedAnimals.filter(a => a.peso_destete).map(a => Number(a.peso_destete));
      const breedFinalWeights = breedAnimals.filter(a => a.peso_final).map(a => Number(a.peso_final));

      return {
        breed,
        birthWeight: breedBirthWeights.length > 0 ? breedBirthWeights.reduce((a, b) => a + b, 0) / breedBirthWeights.length : 0,
        weaningWeight: breedWeaningWeights.length > 0 ? breedWeaningWeights.reduce((a, b) => a + b, 0) / breedWeaningWeights.length : 0,
        finalWeight: breedFinalWeights.length > 0 ? breedFinalWeights.reduce((a, b) => a + b, 0) / breedFinalWeights.length : 0,
        breedInfo: getBreedInfo(breed)
      };
    });
    const hasMultipleBreeds = breeds.length > 1;

    // Weight by gender
    const weightByGender = ['Macho', 'Hembra'].map(gender => {
      const genderAnimals = animals.filter(a => a.sex === gender);
      const genderBirthWeights = genderAnimals.filter(a => a.peso_nacimiento).map(a => Number(a.peso_nacimiento));
      const genderWeaningWeights = genderAnimals.filter(a => a.peso_destete).map(a => Number(a.peso_destete));
      const genderFinalWeights = genderAnimals.filter(a => a.peso_final).map(a => Number(a.peso_final));

      return {
        gender,
        birthWeight: genderBirthWeights.length > 0 ? genderBirthWeights.reduce((a, b) => a + b, 0) / genderBirthWeights.length : 0,
        weaningWeight: genderWeaningWeights.length > 0 ? genderWeaningWeights.reduce((a, b) => a + b, 0) / genderWeaningWeights.length : 0,
        finalWeight: genderFinalWeights.length > 0 ? genderFinalWeights.reduce((a, b) => a + b, 0) / genderFinalWeights.length : 0
      };
    });

    // Growth trends by month (last 12 months)
    const growthTrends = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthAnimals = animals.filter(a => {
        if (!a.birth_date) return false;
        const birthDate = new Date(a.birth_date);
        return birthDate.getMonth() === date.getMonth() && birthDate.getFullYear() === date.getFullYear();
      });

      if (monthAnimals.length > 0) {
        const monthBirthWeights = monthAnimals.filter(a => a.peso_nacimiento).map(a => Number(a.peso_nacimiento));
        const monthWeaningWeights = monthAnimals.filter(a => a.peso_destete).map(a => Number(a.peso_destete));
        const monthFinalWeights = monthAnimals.filter(a => a.peso_final).map(a => Number(a.peso_final));

        growthTrends.push({
          month: date.toLocaleString('es', { month: 'short', year: '2-digit' }),
          avgBirthWeight: monthBirthWeights.length > 0 ? monthBirthWeights.reduce((a, b) => a + b, 0) / monthBirthWeights.length : 0,
          avgWeaningWeight: monthWeaningWeights.length > 0 ? monthWeaningWeights.reduce((a, b) => a + b, 0) / monthWeaningWeights.length : 0,
          avgFinalWeight: monthFinalWeights.length > 0 ? monthFinalWeights.reduce((a, b) => a + b, 0) / monthFinalWeights.length : 0
        });
      }
    }

    // Performance indicators using breed-specific benchmarks
    const birthWeightEval = evaluatePerformance(averageBirthWeight, benchmarks, 'birthWeight');
    const weaningWeightEval = evaluatePerformance(averageWeaningWeight, benchmarks, 'weaningWeight');
    const dailyGainEval = evaluatePerformance(averageDailyGain, benchmarks, 'dailyGain');

    const performanceIndicators = [
      { 
        metric: 'Peso al nacer', 
        value: averageBirthWeight, 
        benchmark: birthWeightEval.benchmark, 
        status: birthWeightEval.status,
        breedSpecific: breedDistribution.length > 0
      },
      { 
        metric: 'Peso al destete', 
        value: averageWeaningWeight, 
        benchmark: weaningWeightEval.benchmark, 
        status: weaningWeightEval.status,
        breedSpecific: breedDistribution.length > 0
      },
      { 
        metric: 'Ganancia diaria', 
        value: averageDailyGain, 
        benchmark: dailyGainEval.benchmark, 
        status: dailyGainEval.status,
        breedSpecific: breedDistribution.length > 0
      }
    ];

    return {
      averageBirthWeight,
      averageWeaningWeight,
      averageFinalWeight,
      averageDailyGain,
      weightByAge,
      weightByBreed,
      weightByGender,
      growthTrends,
      performanceIndicators,
      hasMultipleBreeds,
      benchmarks,
      breedDistribution
    };
  };

  if (loading) {
    return <div className="text-center p-8">Cargando análisis de producción...</div>;
  }

  if (!stats) {
    return <div className="text-center p-8">No se pudieron cargar las estadísticas de producción.</div>;
  }

  return (
    <div className="grid gap-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peso Promedio al Nacer</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageBirthWeight.toFixed(1)} kg</div>
            <div className="flex items-center justify-between">
              <Badge variant={stats.performanceIndicators[0].status === 'good' ? "default" : stats.performanceIndicators[0].status === 'average' ? "secondary" : "destructive"}>
                {stats.performanceIndicators[0].status === 'good' ? "Excelente" : stats.performanceIndicators[0].status === 'average' ? "Bueno" : "Mejorable"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                vs {stats.performanceIndicators[0].benchmark.toFixed(1)}kg
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peso Promedio al Destete</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageWeaningWeight.toFixed(1)} kg</div>
            <div className="flex items-center justify-between">
              <Badge variant={stats.performanceIndicators[1].status === 'good' ? "default" : stats.performanceIndicators[1].status === 'average' ? "secondary" : "destructive"}>
                {stats.performanceIndicators[1].status === 'good' ? "Excelente" : stats.performanceIndicators[1].status === 'average' ? "Bueno" : "Mejorable"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                vs {stats.performanceIndicators[1].benchmark.toFixed(1)}kg
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Peso Final Promedio</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageFinalWeight.toFixed(1)} kg</div>
            <p className="text-xs text-muted-foreground">
              Peso al final del periodo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganancia Diaria Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageDailyGain.toFixed(2)} kg/día</div>
            <div className="flex items-center justify-between">
              <Badge variant={stats.performanceIndicators[2].status === 'good' ? "default" : stats.performanceIndicators[2].status === 'average' ? "secondary" : "destructive"}>
                {stats.performanceIndicators[2].status === 'good' ? "Excelente" : stats.performanceIndicators[2].status === 'average' ? "Bueno" : "Mejorable"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                vs {stats.performanceIndicators[2].benchmark.toFixed(2)}kg/día
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight by Age */}
        {stats.weightByAge.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Peso Promedio por Edad (meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.weightByAge}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ageMonths" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgWeight" stroke="#10b981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Weight by Gender */}
        <Card>
          <CardHeader>
            <CardTitle>Comparación de Pesos por Sexo</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.weightByGender}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="gender" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="birthWeight" fill="#8884d8" name="Peso al nacer" />
                <Bar dataKey="weaningWeight" fill="#10b981" name="Peso al destete" />
                <Bar dataKey="finalWeight" fill="#3b82f6" name="Peso final" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weight by Breed - Only show if multiple breeds */}
        {stats.hasMultipleBreeds && stats.weightByBreed.length > 1 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Comparación de Rendimiento por Raza</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={stats.weightByBreed}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="breed" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="birthWeight" fill="#8884d8" name="Peso al nacer" />
                  <Bar dataKey="weaningWeight" fill="#10b981" name="Peso al destete" />
                  <Bar dataKey="finalWeight" fill="#3b82f6" name="Peso final" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Growth Trends */}
        {stats.growthTrends.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Tendencias de Crecimiento (Últimos 12 meses)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.growthTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="avgBirthWeight" stroke="#8884d8" name="Peso al nacer" />
                  <Line type="monotone" dataKey="avgWeaningWeight" stroke="#10b981" name="Peso al destete" />
                  <Line type="monotone" dataKey="avgFinalWeight" stroke="#3b82f6" name="Peso final" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Performance Indicators */}
      <Card>
        <CardHeader>
          <CardTitle>
            Indicadores de Rendimiento vs Benchmarks
            {stats.breedDistribution.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                (Específicos por raza)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.performanceIndicators.map((indicator, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{indicator.metric}</h4>
                  <p className="text-sm text-muted-foreground">
                    Actual: {indicator.metric === 'Ganancia diaria' ? indicator.value.toFixed(3) : indicator.value.toFixed(1)} 
                    {indicator.metric === 'Ganancia diaria' ? ' kg/día' : ' kg'} | 
                    Benchmark: {indicator.metric === 'Ganancia diaria' ? indicator.benchmark.toFixed(3) : indicator.benchmark.toFixed(1)}
                    {indicator.metric === 'Ganancia diaria' ? ' kg/día' : ' kg'}
                    {indicator.breedSpecific && (
                      <span className="text-blue-600 ml-1">✓ Específico por raza</span>
                    )}
                  </p>
                </div>
                <Badge variant={indicator.status === 'good' ? "default" : indicator.status === 'average' ? "secondary" : "destructive"}>
                  {indicator.status === 'good' ? "Excelente" : indicator.status === 'average' ? "Promedio" : "Mejorable"}
                </Badge>
              </div>
            ))}
          </div>
          
          {/* Breed Distribution Info */}
          {stats.breedDistribution.length > 1 && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h5 className="font-medium text-sm mb-2">Distribución por Raza:</h5>
              <div className="flex flex-wrap gap-2">
                {stats.breedDistribution.map(({ breed, count }) => (
                  <Badge key={breed} variant="outline" className="text-xs">
                    {breed}: {count} animales
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Los benchmarks mostrados son promedios ponderados según la distribución de razas
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};