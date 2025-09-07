import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Heart, TrendingUp, Calendar, Users, Brain, Truck } from "lucide-react";
import { ReportsFilters, ReportFilters } from "./ReportsFilters";

import { ExpandableReproductiveFemales } from "./ExpandableReproductiveFemales";
import { CorralReproductiveKPIs } from "./CorralReproductiveKPIs";

import { BreedingPlanWizard } from "../breeding/BreedingPlanWizard";
import { BulkMoveDialog } from "../breeding/BulkMoveDialog";

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
  const [showBreedingPlan, setShowBreedingPlan] = useState(false);
  const [showBulkMove, setShowBulkMove] = useState(false);

  useEffect(() => {
    console.log("DEBUG: Current user cabaña_id:", currentUser?.cabañaId);
    if (currentUser?.cabañaId) {
      fetchReproductiveStats();
    }
  }, [currentUser, globalFilters]);

  const fetchReproductiveStats = async () => {
    try {
      console.log("DEBUG: Fetching reproductive stats for user:", currentUser?.cabañaId);
      
      let animalsQuery = supabase
        .from("animals")
        .select("*")
        .eq("cabaña_id", currentUser?.cabañaId);

      // Apply filters
      if (globalFilters) {
        if (!globalFilters.include_sold_dead) {
          animalsQuery = animalsQuery.not("status", "in", '("vendido","muerto")');
        }
        if (globalFilters.corral_ids && globalFilters.corral_ids.length > 0) {
          animalsQuery = animalsQuery.in("corral_id", globalFilters.corral_ids);
        }
        if (globalFilters.breed) {
          animalsQuery = animalsQuery.eq("breed", globalFilters.breed);
        }
      }

      const { data: animals } = await animalsQuery;
      
      console.log("DEBUG: Fetched", animals?.length || 0, "animals for cabaña:", currentUser?.cabañaId);

      let iaQuery = supabase
        .from("ia")
        .select(`
          *,
          eventos!inner(fecha, cabaña_id)
        `)
        .eq("eventos.cabaña_id", currentUser?.cabañaId);

      // Apply date filters to IA services
      if (globalFilters?.date_from) {
        iaQuery = iaQuery.gte("eventos.fecha", globalFilters.date_from);
      }
      if (globalFilters?.date_to) {
        iaQuery = iaQuery.lte("eventos.fecha", globalFilters.date_to);
      }

      const { data: iaServices } = await iaQuery;

      let tactosQuery = supabase
        .from("tactos")
        .select(`
          *,
          eventos!inner(fecha, cabaña_id)
        `)
        .eq("eventos.cabaña_id", currentUser?.cabañaId);

      // Apply date filters to tactos
      if (globalFilters?.date_from) {
        tactosQuery = tactosQuery.gte("eventos.fecha", globalFilters.date_from);
      }
      if (globalFilters?.date_to) {
        tactosQuery = tactosQuery.lte("eventos.fecha", globalFilters.date_to);
      }

      const { data: tactos } = await tactosQuery;

      let pregnanciesQuery = supabase
        .from("preñeces")
        .select("*")
        .eq("cabaña_id", currentUser?.cabañaId);

      // Apply date filters to pregnancies
      if (globalFilters?.date_from) {
        pregnanciesQuery = pregnanciesQuery.gte("fecha_inicio", globalFilters.date_from);
      }
      if (globalFilters?.date_to) {
        pregnanciesQuery = pregnanciesQuery.lte("fecha_inicio", globalFilters.date_to);
      }

      const { data: pregnancies } = await pregnanciesQuery;

      console.log("DEBUG: About to calculate stats with animals:", animals?.length, "ia:", iaServices?.length);
      const reproStats = calculateReproductiveStats(animals || [], iaServices || [], tactos || [], pregnancies || []);
      setStats(reproStats);
    } catch (error) {
      console.error("Error fetching reproductive stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateReproductiveStats = (animals: any[], iaServices: any[], tactos: any[], pregnancies: any[]): ReproductiveStats => {
    console.log("Calculating reproductive stats with data:", {
      animalsCount: animals.length,
      iaServicesCount: iaServices.length,
      tactosCount: tactos.length,
      pregnanciesCount: pregnancies.length
    });

    const females = animals.filter(a => a.sex === 'Hembra' && (!a.status || a.status === 'activo'));
    const totalFemales = females.length;
    
    console.log("Total females found:", totalFemales);
    
    const reproductiveFemales = females.filter(f => {
      if (!f.birth_date) return false;
      const ageInMonths = Math.floor((new Date().getTime() - new Date(f.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
      return ageInMonths >= 15;
    });

    // NEW CALVING PERCENTAGE LOGIC: successful calvings / total pregnancies
    const allOffspring = animals.filter(a => a.mother_id && a.status !== 'muerto');
    
    // Create auto-pregnancies for mothers with offspring but no pregnancy records
    const autoGeneratedPregnancies: any[] = [];
    
    reproductiveFemales.forEach(mother => {
      const motherOffspring = allOffspring.filter(a => a.mother_id === mother.id);
      const motherPregnancies = pregnancies.filter(p => p.animal_id === mother.id);
      
      console.log(`DEBUG ${mother.id_tag}:`, {
        offspring: motherOffspring.length,
        pregnancies: motherPregnancies.length
      });
      
      // For each offspring, check if there's a corresponding pregnancy record
      motherOffspring.forEach(offspring => {
        if (!offspring.birth_date) return;
        
        const hasMatchingPregnancy = motherPregnancies.some(p => {
          const birthDate = new Date(offspring.birth_date);
          const pregnancyStart = new Date(p.fecha_inicio);
          const expectedCalving = new Date(pregnancyStart);
          expectedCalving.setMonth(expectedCalving.getMonth() + 9);
          
          // Check if pregnancy timing matches offspring birth (within 60 days)
          const timeDiff = Math.abs(birthDate.getTime() - expectedCalving.getTime());
          const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
          return daysDiff <= 60;
        });
        
        if (!hasMatchingPregnancy) {
          // Create auto-pregnancy 9 months before birth
          const birthDate = new Date(offspring.birth_date);
          const pregnancyDate = new Date(birthDate);
          pregnancyDate.setMonth(pregnancyDate.getMonth() - 9);
          
          autoGeneratedPregnancies.push({
            id: `auto_${offspring.id}`,
            animal_id: mother.id,
            fecha_inicio: pregnancyDate.toISOString().split('T')[0],
            estado: 'confirmada',
            origen: 'auto_generated',
            offspring_id: offspring.id
          });
          
          console.log(`DEBUG: Auto-generated pregnancy for ${mother.id_tag} for offspring ${offspring.id_tag}`);
        }
      });
    });

    // Count total successful calvings = live offspring count
    const totalSuccessfulCalvings = allOffspring.length;

    // Total pregnancies = registered + auto-generated
    const totalPregnancies = pregnancies.length + autoGeneratedPregnancies.length;
    
    console.log('DEBUG FINAL calving calculation:', {
      allOffspring: allOffspring.length,
      totalSuccessfulCalvings,
      registeredPregnancies: pregnancies.length,
      autoGeneratedPregnancies: autoGeneratedPregnancies.length,
      totalPregnancies,
      reproductiveFemalesCount: reproductiveFemales.length
    });
    
    // Calving rate = successful calvings / total pregnancies * 100
    const calvingRate = totalPregnancies > 0 ? Math.round((totalSuccessfulCalvings / totalPregnancies) * 100) : 0;
    
    console.log('DEBUG calving result:', {
      calvingRate,
      calculation: `${totalSuccessfulCalvings} / ${totalPregnancies} * 100 = ${calvingRate}%`
    });

    // For pregnancy rate, use traditional calculation based on services
    let totalPregnancyRateSum = 0;
    let validPregnancyCalculations = 0;

    reproductiveFemales.forEach(animal => {
      const animalServices = iaServices.filter(ia => ia.animales_ids?.includes(animal.id));
      const animalPregnancies = pregnancies.filter(p => p.animal_id === animal.id);
      
      if (animalServices.length > 0) {
        const currentPregnancy = animal.esta_preñada ? 1 : 0;
        const totalSuccessfulPregnancies = animalPregnancies.filter(p => p.estado === 'confirmada').length + currentPregnancy;
        const pregnancyRate = Math.round((totalSuccessfulPregnancies / animalServices.length) * 100);
        
        totalPregnancyRateSum += pregnancyRate;
        validPregnancyCalculations++;
      }
    });

    const pregnancyRate = validPregnancyCalculations > 0 ? Math.round(totalPregnancyRateSum / validPregnancyCalculations) : 0;
    const confirmedPregnancies = totalPregnancies;
    
    // Get unique animals that had services (for AI success rate)
    const servedAnimalIds = new Set<string>();
    iaServices.forEach(ia => {
      if (ia.animales_ids) {
        ia.animales_ids.forEach((animalId: string) => servedAnimalIds.add(animalId));
      }
    });
    const servedFemalesCount = servedAnimalIds.size;
    
    const totalInseminations = iaServices.length;

    console.log('New calving calculation (pregnancies/calvings):', {
      reproductiveFemales: reproductiveFemales.length,
      totalSuccessfulCalvings,
      totalPregnancies,
      calvingRate,
      pregnancyRate
    });
    
    const aiSuccessRate = totalInseminations > 0 ? (totalSuccessfulCalvings / totalInseminations) * 100 : 0;

    // Yearly data
    const currentYear = new Date().getFullYear();
    const yearlyData = [];
    for (let year = currentYear - 4; year <= currentYear; year++) {
      const yearInseminations = iaServices.filter(ia => 
        ia.eventos && new Date(ia.eventos.fecha).getFullYear() === year
      ).length;
      
      const yearPregnancies = pregnancies.filter(p => 
        new Date(p.fecha_inicio).getFullYear() === year && p.estado === 'confirmada'
      ).length;
      
      const yearBirths = animals.filter(a => 
        a.birth_date && new Date(a.birth_date).getFullYear() === year
      ).length;
      
      yearlyData.push({
        year,
        pregnancies: yearPregnancies,
        births: yearBirths,
        inseminations: yearInseminations
      });
    }

    // Service type data (artificial vs natural)
    const artificialServices = iaServices.length;
    const naturalServices = animals.filter(a => a.tipo_servicio === 'natural').length;
    const serviceTypeData = [
      { type: 'Inseminación Artificial', count: artificialServices, successRate: aiSuccessRate },
      { type: 'Servicio Natural', count: naturalServices, successRate: 0 } // We don't track natural service success rates directly
    ].filter(item => item.count > 0);

    // Monthly breeding patterns
    const monthlyBreeding = Array.from({ length: 12 }, (_, i) => {
      const month = new Date(0, i).toLocaleString('es', { month: 'long' });
      const count = iaServices.filter(ia => 
        ia.eventos && new Date(ia.eventos.fecha).getMonth() === i
      ).length;
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
      
      // Get unique animals served for this breed
      const breedServedAnimals = new Set<string>();
      iaServices.forEach(ia => {
        ia.animales_ids.forEach((animalId: string) => {
          const animal = animals.find(a => a.id === animalId);
          if (animal?.breed === breed) breedServedAnimals.add(animalId);
        });
      });
      
      // Count unique pregnancies for this breed (avoid double counting)
      const breedPregnantAnimals = new Set<string>();
      tactos.forEach(tacto => {
        if (tacto.resultados) {
          tacto.resultados.forEach((result: any) => {
            const animal = animals.find(a => a.id === result.animal_id);
            if (animal?.breed === breed && result.resultado === 'preñada') {
              breedPregnantAnimals.add(result.animal_id);
            }
          });
        }
      });
      
      // Also check preñeces table for confirmed pregnancies
      pregnancies.forEach(p => {
        if (p.estado === 'confirmada') {
          const animal = animals.find(a => a.id === p.animal_id);
          if (animal?.breed === breed) {
            breedPregnantAnimals.add(p.animal_id);
          }
        }
      });
      
      const breedBirths = animals.filter(a => 
        a.mother_id && animals.some(mother => mother.id === a.mother_id && mother.breed === breed)
      ).length;

      const breedPregnancies = breedPregnantAnimals.size;
      const breedServices = breedServedAnimals.size;

      return {
        breed,
        pregnancyRate: breedServices > 0 ? (breedPregnancies / breedServices) * 100 : 0,
        calvingRate: breedPregnancies > 0 ? Math.min((breedBirths / breedPregnancies) * 100, 100) : 0,
        aiSuccessRate: breedServices > 0 ? (breedPregnancies / breedServices) * 100 : 0
      };
    });

    return {
      totalFemales,
      reproductiveFemales: reproductiveFemales.length,
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
      <CorralReproductiveKPIs filters={globalFilters} />
      <ExpandableReproductiveFemales filters={globalFilters || {}} />
      
      
      {/* Original Analytics */}
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Preñez</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchReproductiveStats}>
                Recalcular
              </Button>
              <Heart className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.pregnancyRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.confirmedPregnancies} crías de {stats.reproductiveFemales} hembras reproductivas
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

      {/* Dialogs */}
      <BreedingPlanWizard
        isOpen={showBreedingPlan}
        onClose={() => setShowBreedingPlan(false)}
        cabanaId={currentUser?.cabañaId || ''}
      />
      
      <BulkMoveDialog
        isOpen={showBulkMove}
        onClose={() => setShowBulkMove(false)}
        cabanaId={currentUser?.cabañaId || ''}
      />
    </div>
  );
};
