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
  id_tag: string;
  name: string;
  age_months: number;
  category: string;
  corral_id: string;
  corral_name: string;
  is_pregnant: boolean;
  pregnancy_date: string;
  expected_calving_date: string;
  last_service_date: string;
  days_open: number;
  reproductive_years: number;
  total_offspring: number;
  lifetime_services: number;
  lifetime_pregnancies: number;
  lifetime_calvings: number;
  individual_pregnancy_rate: number;
  individual_calving_rate: number;
  performance_level: string;
  active_alerts: number;
  alert_types: string[];
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

      // Use the existing calculate_reproductive_kpis function
      const { data: reproductiveFemalesData, error: femalesError } = await supabase.rpc('calculate_reproductive_kpis', {
        _cabana_id: cabanaId
      });

      if (femalesError) {
        console.error('Error fetching reproductive females:', femalesError);
        setReproductiveFemales([]);
      } else {
        console.log('Reproductive females data:', reproductiveFemalesData);
        setReproductiveFemales(reproductiveFemalesData || []);
      }

      // Calculate summary metrics from the KPI data
      const totalFemales = (reproductiveFemalesData as any[])?.length || 0;
      const currentlyPregnant = (reproductiveFemalesData as any[])?.filter((f: any) => f.is_pregnant).length || 0;
      
      // Calculate overall pregnancy and calving rates
      let totalReproductiveYears = 0;
      let totalPregnancies = 0;
      let totalCalvings = 0;
      
      (reproductiveFemalesData as any[])?.forEach((female: any) => {
        totalReproductiveYears += female.reproductive_years || 1;
        totalPregnancies += female.lifetime_pregnancies || 0;
        totalCalvings += female.lifetime_calvings || 0;
      });

      const pregnancyRate = totalReproductiveYears > 0 
        ? Math.round((totalPregnancies / totalReproductiveYears) * 100) 
        : 0;
      
      const calvingRate = totalPregnancies > 0 
        ? Math.round((totalCalvings / totalPregnancies) * 100) 
        : 0;

      // Update summary metrics
      setSummaryMetrics({
        totalFemales,
        currentlyPregnant,
        totalServices: (reproductiveFemalesData as any[])?.reduce((sum: number, f: any) => sum + (f.lifetime_services || 0), 0) || 0,
        pregnancyRate,
        calvingRate,
        openFemales: totalFemales - currentlyPregnant,
        avgDaysOpen: (reproductiveFemalesData as any[])?.reduce((sum: number, f: any) => sum + (f.days_open || 0), 0) / Math.max(1, totalFemales) || 0,
        successfulPregnancies: totalCalvings,
        failedPregnancies: totalPregnancies - totalCalvings,
        activePregnancies: currentlyPregnant,
        totalReproductiveYears,
        completedPregnancies: totalPregnancies
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
                          <TableCell className="font-medium">{animal.id_tag}</TableCell>
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
                              animal.individual_pregnancy_rate >= 80 ? 'text-emerald-600' :
                              animal.individual_pregnancy_rate >= 60 ? 'text-blue-600' :
                              animal.individual_pregnancy_rate >= 40 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {animal.individual_pregnancy_rate.toFixed(1)}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-medium ${
                              animal.individual_calving_rate >= 90 ? 'text-emerald-600' :
                              animal.individual_calving_rate >= 75 ? 'text-blue-600' :
                              animal.individual_calving_rate >= 60 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {animal.individual_calving_rate.toFixed(1)}%
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