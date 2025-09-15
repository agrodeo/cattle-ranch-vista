import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Heart, TrendingUp, Calendar, Users, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PregnantAnimalsReport } from "./PregnantAnimalsReport";
import { calculateReproductiveRates } from "@/lib/pregnancyManagement";

interface ReportFilters {
  date_from?: string;
  date_to?: string;
  corral_ids?: string[];
  include_sold_dead?: boolean;
}

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

interface ReproductiveFemale {
  animal_id: string;
  tag: string;
  name: string;
  category: string;
  corral_name: string;
  total_services: number;
  total_pregnancies: number;
  pregnancy_rate: number;
  successful_pregnancies: number;
  calving_rate: number;
  is_pregnant: boolean;
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
  
  const [reproductiveFemales, setReproductiveFemales] = useState<ReproductiveFemale[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
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

      // Fetch reproductive females data
      const filtersJson = {
        date_from: filters.date_from,
        date_to: filters.date_to,
        corral_ids: filters.corral_ids,
        include_sold_dead: filters.include_sold_dead
      };

      // Use the new KPI function to get reproductive data
      const { data: reproductiveFemalesData, error: femalesError } = await supabase.rpc('calculate_reproductive_kpis', {
        _cabana_id: cabanaId,
        _date_from: filtersJson.date_from || null,
        _date_to: filtersJson.date_to || null,
        _corral_ids: filters.corral_ids && filters.corral_ids.length > 0 ? filters.corral_ids : null
      });

      if (femalesError) {
        console.error('Error fetching reproductive females:', femalesError);
        setReproductiveFemales([]);
      } else {
        console.log('Reproductive females data:', reproductiveFemalesData);
        setReproductiveFemales(reproductiveFemalesData || []);
      }

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

      // Filter females and reproductive females
      const females = (animals || []).filter(a => a.sex === 'Hembra');
      
      const reproductiveFemalesCount = females.filter(f => {
        if (!f.birth_date) return false;
        const ageInMonths = Math.floor((new Date().getTime() - new Date(f.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
        return ageInMonths >= 15;
      });

      // Get pregnancies data for calculations
      const { data: pregnanciesWithState, error: pregnanciesStateError } = await supabase
        .from('preñeces')
        .select('animal_id, estado_final, fecha_inicio, fecha_finalizacion, cria_id')
        .eq('cabaña_id', cabanaId);

      if (pregnanciesStateError) {
        console.error('Error fetching pregnancies with state:', pregnanciesStateError);
      }

      const pregnancyHistory = pregnanciesWithState || [];
      
      // Auto-generate pregnancies for mothers with offspring but no pregnancy records
      const allOffspring = (animals || []).filter(a => a.mother_id && a.status !== 'muerto');
      const autoGeneratedPregnancies: any[] = [];
      
      // For each offspring, check if mother has a corresponding successful pregnancy
      allOffspring.forEach(calf => {
        if (!calf.mother_id || !calf.birth_date) return;
        
        const hasSuccessfulPregnancy = pregnancyHistory.some(p => 
          p.animal_id === calf.mother_id && 
          p.estado_final === 'exitosa' && 
          p.cria_id === calf.id
        );
        
        if (!hasSuccessfulPregnancy) {
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
      const totalReproductiveYears = reproductiveFemalesCount.reduce((sum, female) => {
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

      // Calculate additional metrics
      const currentPregnant = females.filter(f => f.esta_preñada).length;
      const openFemales = reproductiveFemalesCount.length - currentPregnant;

      // Update summary metrics
      setSummaryMetrics({
        totalFemales: reproductiveFemalesCount.length,
        currentlyPregnant: currentPregnant,
        totalServices: 0, // Will be calculated separately if needed
        pregnancyRate: pregnancyRate,
        calvingRate: calvingRate,
        openFemales: openFemales,
        avgDaysOpen: 0, // Simplified for now
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
            <p className="text-xs text-muted-foreground">
              Preñeces confirmadas
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
            <p className="text-xs text-muted-foreground">
              Partos exitosos
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

      {/* Expandable Reproductive Females Detail */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <Card>
          <CardHeader>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between p-0 h-auto">
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Detalle Hembras Reproductivas
                  <Badge variant="secondary" className="ml-2">
                    {reproductiveFemales.length} animales
                  </Badge>
                </CardTitle>
                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent>
              {reproductiveFemales.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-lg font-medium">No se encontraron hembras reproductivas.</p>
                  <p className="text-sm mt-2">
                    Las hembras deben tener al menos 15 meses de edad para aparecer en este reporte.
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Actualmente todas las hembras son menores a 15 meses.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Corral</TableHead>
                        <TableHead>Preñez Activa</TableHead>
                        <TableHead>% Preñez</TableHead>
                        <TableHead>% Parición</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reproductiveFemales.map((animal) => (
                        <TableRow key={animal.animal_id}>
                          <TableCell className="font-medium">{animal.tag}</TableCell>
                          <TableCell>{animal.name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{animal.category}</Badge>
                          </TableCell>
                          <TableCell>{animal.corral_name || '-'}</TableCell>
                          <TableCell>
                            {animal.is_pregnant ? (
                              <Badge className="bg-emerald-100 text-emerald-800">Sí</Badge>
                            ) : (
                              <Badge variant="outline">No</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-medium ${
                              animal.pregnancy_rate >= 80 ? 'text-emerald-600' :
                              animal.pregnancy_rate >= 60 ? 'text-blue-600' :
                              animal.pregnancy_rate >= 40 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {animal.pregnancy_rate.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-medium ${
                              animal.calving_rate >= 90 ? 'text-emerald-600' :
                              animal.calving_rate >= 75 ? 'text-blue-600' :
                              animal.calving_rate >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {animal.calving_rate.toFixed(1)}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Pregnant Animals Report */}
      <div className="grid grid-cols-1 gap-6">
        <PregnantAnimalsReport filters={filters} />
      </div>
    </div>
  );
};

export default ReproductiveAnalytics;