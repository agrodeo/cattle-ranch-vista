import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Heart, TrendingUp, Calendar, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ReproductiveFemalesTable } from "./ReproductiveFemalesTable";
import { PregnantAnimalsReport } from "./PregnantAnimalsReport";

interface ReportFilters {
  date_from?: string;
  date_to?: string;
  corral_ids?: string[];
  include_sold_dead?: boolean;
}
import { toast } from "sonner";
import { calculateReproductiveRates } from "@/lib/pregnancyManagement";

interface SummaryMetrics {
  totalFemales: number;
  currentlyPregnant: number;
  totalServices: number;
  pregnancyRate: number;
  calvingRate: number;
  openFemales: number;
  avgDaysOpen: number;
  successfulPregnancies?: number;
  failedPregnancies?: number;
  activePregnancies?: number;
  totalReproductiveYears?: number;
  completedPregnancies?: number;
}

interface ReproductiveAnalyticsProps {
  filters?: ReportFilters;
}

const ReproductiveAnalytics = ({ filters = {} }: ReproductiveAnalyticsProps) => {
  const [summaryMetrics, setSummaryMetrics] = useState<SummaryMetrics>({
    totalFemales: 0,
    currentlyPregnant: 0,
    totalServices: 0,
    pregnancyRate: 0,
    calvingRate: 0,
    openFemales: 0,
    avgDaysOpen: 0,
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReproductiveData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get current user and their cabaña_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('Usuario no autenticado');
        return;
      }

      const { data: userInfo, error: userError } = await supabase.rpc('get_user_cabana_info', { user_uuid: user.id });

      if (userError || !userInfo?.[0]?.cabana_id) {
        setError('No se pudo obtener información del usuario');
        return;
      }

      const cabanaId = userInfo[0].cabana_id;

      // Build date filter
      let dateFilter = '';
      if (filters.date_from && filters.date_to) {
        dateFilter = `fecha_inicio.gte.${filters.date_from},fecha_inicio.lte.${filters.date_to}`;
      }

      // Fetch animals with corral filter
      let animalsQuery = supabase
        .from('animals')
        .select('*, corrales(name)')
        .eq('cabaña_id', cabanaId);

      if (filters.corral_ids && filters.corral_ids.length > 0) {
        animalsQuery = animalsQuery.in('corral_id', filters.corral_ids);
      }

      if (!filters.include_sold_dead) {
        animalsQuery = animalsQuery.not('status', 'in', '(vendido,muerto)');
      }

      const { data: animals, error: animalsError } = await animalsQuery;

      if (animalsError) {
        console.error('Error fetching animals:', animalsError);
        setError('Error al obtener datos de animales');
        return;
      }

      console.log('DEBUG: Fetched', animals?.length || 0, 'animals for cabaña:', cabanaId);

      // Get IA services
      const { data: iaServices, error: iaError } = await supabase
        .from('ia')
        .select(`
          *,
          eventos!inner(fecha, cabaña_id)
        `)
        .eq('eventos.cabaña_id', cabanaId);

      if (iaError) {
        console.error('Error fetching IA services:', iaError);
      }

      // Get pregnancies
      const { data: pregnancies, error: pregnanciesError } = await supabase
        .from('preñeces')
        .select('*')
        .eq('cabaña_id', cabanaId);

      if (pregnanciesError) {
        console.error('Error fetching pregnancies:', pregnanciesError);
      }

      // Filter females and reproductive females
      const females = (animals || []).filter(a => a.sex === 'Hembra');
      
      const reproductiveFemales = females.filter(f => {
        if (!f.birth_date) return false;
        const ageInMonths = Math.floor((new Date().getTime() - new Date(f.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        return ageInMonths >= 15;
      });

      // Get all pregnancies with their final states
      const { data: pregnanciesWithState, error: pregnanciesStateError } = await supabase
        .from('preñeces')
        .select('animal_id, estado_final, fecha_inicio, fecha_finalizacion, cria_id')
        .eq('cabaña_id', cabanaId);

      if (pregnanciesStateError) {
        console.error('Error fetching pregnancies with state:', pregnanciesStateError);
        setError('Error al obtener estados de preñeces');
        return;
      }

      const pregnancyHistory = pregnanciesWithState || [];
      
      // Auto-generate pregnancies for mothers with offspring but no pregnancy records
      const allOffspring = (animals || []).filter(a => a.mother_id && a.status !== 'muerto');
      const autoGeneratedPregnancies: any[] = [];
      
      console.log('DEBUG: Starting auto-generation for offspring without pregnancies');
      
      // For each offspring, check if mother has a corresponding successful pregnancy
      allOffspring.forEach(calf => {
        if (!calf.mother_id || !calf.birth_date) return;
        
        const hasSuccessfulPregnancy = pregnancyHistory.some(p => 
          p.animal_id === calf.mother_id && 
          p.estado_final === 'exitosa' && 
          p.cria_id === calf.id
        );
        
        if (!hasSuccessfulPregnancy) {
          console.log(`DEBUG: Auto-generating successful pregnancy for offspring ${calf.id_tag} of mother ${calf.mother_id}`);
          
          const estimatedConceptionDate = new Date(calf.birth_date);
          estimatedConceptionDate.setDate(estimatedConceptionDate.getDate() - 283);
          
          autoGeneratedPregnancies.push({
            animal_id: calf.mother_id,
            estado_final: 'exitosa',
            fecha_inicio: estimatedConceptionDate.toISOString().split('T')[0],
            fecha_finalizacion: calf.birth_date,
            cria_id: calf.id,
            motivo_finalizacion: 'parto_exitoso_auto'
          });
        }
      });

      // Calculate reproductive metrics based on pregnancy history
      const allPregnancyData = [...pregnancyHistory, ...autoGeneratedPregnancies];
      
      const successfulPregnancies = allPregnancyData.filter(p => p.estado_final === 'exitosa').length;
      const failedPregnancies = allPregnancyData.filter(p => p.estado_final === 'fallida').length;
      const activePregnancies = allPregnancyData.filter(p => p.estado_final === 'activa').length;
      const completedPregnancies = successfulPregnancies + failedPregnancies;
      
      // Calculate total reproductive years for all females
      const totalReproductiveYears = reproductiveFemales.reduce((sum, female) => {
        const ageMonths = female.birth_date 
          ? Math.floor((new Date().getTime() - new Date(female.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
          : 24; // Default if no birth date
        const reproductiveYears = Math.max(0, Math.floor((ageMonths - 15) / 12)); // Start at 15 months
        return sum + Math.max(1, reproductiveYears); // At least 1 year for active females
      }, 0);
      
      // NEW FORMULAS:
      // Pregnancy rate = (successful + failed pregnancies) / total reproductive years * 100
      const pregnancyRate = totalReproductiveYears > 0 
        ? Math.round((completedPregnancies / totalReproductiveYears) * 100) 
        : 0;
      
      // Calving rate = successful pregnancies / (successful + failed pregnancies) * 100  
      const calvingRate = completedPregnancies > 0 
        ? Math.round((successfulPregnancies / completedPregnancies) * 100) 
        : 0;
      
      console.log('DEBUG NEW CALCULATION METHOD:', {
        successfulPregnancies,
        failedPregnancies,
        activePregnancies,
        completedPregnancies,
        totalReproductiveYears,
        pregnancyRate: `${completedPregnancies} / ${totalReproductiveYears} * 100 = ${pregnancyRate}%`,
        calvingRate: `${successfulPregnancies} / ${completedPregnancies} * 100 = ${calvingRate}%`
      });

      // Calculate additional metrics
      const currentPregnant = females.filter(f => f.esta_preñada).length;
      const openFemales = reproductiveFemales.length - currentPregnant;
      
      // Services data for additional context  
      const totalServices = (iaServices || []).reduce((sum, service: any) => {
        try {
          const animalIds = service.animales_ids;
          if (animalIds && Array.isArray(animalIds)) {
            return sum + animalIds.length;
          }
        } catch (e) {
          console.warn('Error parsing animales_ids:', e);
        }
        return sum;
      }, 0);

      // Calculate average days open (simplified)
      const femalesWithDaysOpen = reproductiveFemales.filter(f => f.fecha_ultimo_pesaje);
      const avgDaysOpen = femalesWithDaysOpen.length > 0 
        ? Math.round(femalesWithDaysOpen.reduce((sum, f) => {
            if (f.fecha_ultimo_pesaje) {
              const daysSinceLastWeighing = Math.floor((new Date().getTime() - new Date(f.fecha_ultimo_pesaje).getTime()) / (1000 * 60 * 60 * 24));
              return sum + daysSinceLastWeighing;
            }
            return sum;
          }, 0) / femalesWithDaysOpen.length)
        : 0;

      // Update summary metrics with new calculation method
      setSummaryMetrics({
        totalFemales: reproductiveFemales.length,
        currentlyPregnant: currentPregnant,
        totalServices: totalServices,
        pregnancyRate: pregnancyRate,
        calvingRate: calvingRate,
        openFemales: openFemales,
        avgDaysOpen: avgDaysOpen,
        // Additional metrics for transparency
        successfulPregnancies,
        failedPregnancies,
        activePregnancies,
        totalReproductiveYears,
        completedPregnancies
      });

    } catch (error) {
      console.error('Error in fetchReproductiveData:', error);
      setError('Error al cargar datos reproductivos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReproductiveData();
  }, [filters]);

  const handleRefresh = () => {
    fetchReproductiveData();
    toast.success("Datos actualizados");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 rounded animate-pulse mb-2"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Error al cargar datos</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hembras Reproductivas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.totalFemales}</div>
            <p className="text-xs text-muted-foreground">
              ≥15 meses de edad
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Preñez</CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.pregnancyRate}%</div>
            <p className="text-sm text-muted-foreground">
              (Exitosas + Fallidas) / Años reproductivos × 100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Parición</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.calvingRate}%</div>
            <p className="text-sm text-muted-foreground">
              Exitosas / (Exitosas + Fallidas) × 100
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Preñadas Actuales</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryMetrics.currentlyPregnant}</div>
            <p className="text-xs text-muted-foreground">
              Hembras con preñez activa
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Details */}
      {summaryMetrics.successfulPregnancies !== undefined && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Detalle del Cálculo
              <Button onClick={handleRefresh} size="sm" variant="outline">
                Actualizar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summaryMetrics.successfulPregnancies}</div>
                <p className="text-sm text-muted-foreground">Preñeces Exitosas</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summaryMetrics.failedPregnancies}</div>
                <p className="text-sm text-muted-foreground">Preñeces Fallidas</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summaryMetrics.activePregnancies}</div>
                <p className="text-sm text-muted-foreground">Preñeces Activas</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{summaryMetrics.totalReproductiveYears}</div>
                <p className="text-sm text-muted-foreground">Años Reproductivos</p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p><strong>Cálculo de Tasa de Preñez:</strong> ({summaryMetrics.successfulPregnancies} + {summaryMetrics.failedPregnancies}) / {summaryMetrics.totalReproductiveYears} × 100 = {summaryMetrics.pregnancyRate}%</p>
              <p><strong>Cálculo de Tasa de Parición:</strong> {summaryMetrics.successfulPregnancies} / ({summaryMetrics.successfulPregnancies} + {summaryMetrics.failedPregnancies}) × 100 = {summaryMetrics.calvingRate}%</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reproductive Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ReproductiveFemalesTable filters={filters} />
        <PregnantAnimalsReport filters={filters} />
      </div>
    </div>
  );
};

export default ReproductiveAnalytics;