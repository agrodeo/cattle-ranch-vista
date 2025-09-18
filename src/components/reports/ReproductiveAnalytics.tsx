import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Heart, TrendingUp, Calendar, Users, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PregnantAnimalsReport } from "./PregnantAnimalsReport";
import { calculatePregnancyRate } from "@/lib/reproductiveCalculations";
import type { AnimalReproductiveData, PregnancyRecord, ServiceRecord, OffspringRecord } from "@/types/reproductive";

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
  current_state: string;
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

      // Get all reproductive females (15+ months old)
      const { data: animals, error: animalsError } = await supabase
        .from('animals')
        .select('*')
        .eq('cabaña_id', cabanaId)
        .eq('sex', 'Hembra')
        .not('status', 'in', filters.include_sold_dead ? [] : ['vendido', 'muerto']);

      if (animalsError) throw animalsError;

      // Filter females 15+ months old
      const reproductiveFemales = (animals || []).filter(animal => {
        if (!animal.birth_date) return true; // Include animals without birth date
        const ageMonths = (new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44);
        return ageMonths >= 15;
      });

      // Get all pregnancy records for these animals
      const animalIds = reproductiveFemales.map(a => a.id);
      const { data: pregnancies, error: pregnanciesError } = await supabase
        .from('preñeces')
        .select('*')
        .in('animal_id', animalIds);

      if (pregnanciesError) throw pregnanciesError;

      // Get all service records (IA)
      const { data: services, error: servicesError } = await supabase
        .from('ia')
        .select('id, evento_id, animales_ids');

      if (servicesError) throw servicesError;

      // Get all offspring for these animals
      const { data: offspring, error: offspringError } = await supabase
        .from('animals')
        .select('id, mother_id, father_id, status, birth_date')
        .in('mother_id', animalIds);

      if (offspringError) throw offspringError;

      // Get corral information
      const { data: corrales, error: corralesError } = await supabase
        .from('corrales')
        .select('id, name')
        .eq('cabaña_id', cabanaId);

      if (corralesError) throw corralesError;

      const corralesMap = new Map(corrales?.map(c => [c.id, c.name]) || []);

      // Calculate metrics for each animal
      const reproductiveData: ReproductiveFemale[] = reproductiveFemales.map(animal => {
        // Get data for this animal
        const animalPregnancies = (pregnancies || []).filter(p => p.animal_id === animal.id);
        const animalServices = (services || []).filter(s => s.animales_ids?.includes(animal.id));
        const animalOffspring = (offspring || []).filter(o => o.mother_id === animal.id);

        // Convert to proper types
        const animalData: AnimalReproductiveData = {
          id: animal.id,
          id_tag: animal.id_tag,
          name: animal.name,
          birth_date: animal.birth_date,
          esta_preñada: animal.esta_preñada,
          fecha_ultima_preñez: animal.fecha_ultima_preñez,
          fecha_probable_parto: animal.fecha_probable_parto,
          sex: animal.sex,
          status: animal.status,
          corral_id: animal.corral_id
        };

        const pregnancyRecords: PregnancyRecord[] = animalPregnancies.map(p => ({
          id: p.id,
          animal_id: p.animal_id,
          estado: p.estado,
          estado_final: (p.estado_final as 'activa' | 'exitosa' | 'fallida') || 'activa',
          fecha_inicio: p.fecha_inicio,
          fecha_estimada_parto: p.fecha_estimada_parto,
          fecha_finalizacion: p.fecha_finalizacion,
          motivo_finalizacion: p.motivo_finalizacion,
          cria_id: p.cria_id
        }));

        const serviceRecords: ServiceRecord[] = animalServices.map(s => ({
          id: s.id,
          animales_ids: s.animales_ids,
          evento_id: s.evento_id
        }));

        const offspringRecords: OffspringRecord[] = animalOffspring.map(o => ({
          id: o.id,
          mother_id: o.mother_id,
          father_id: o.father_id,
          status: o.status
        }));

        // Calculate reproductive metrics
        const metrics = calculatePregnancyRate(animalData, pregnancyRecords, serviceRecords, offspringRecords);

        // Calculate age and category
        const ageMonths = animal.birth_date 
          ? Math.floor((new Date().getTime() - new Date(animal.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
          : 24;
        
        const category = ageMonths < 12 ? 'Ternera' : ageMonths < 24 ? 'Vaquillona' : 'Vaca';

        // Determine current reproductive state
        let currentState = 'Vacía';
        if (animal.esta_preñada) {
          currentState = 'Preñada';
        } else if (animalOffspring.length > 0) {
          const lastCalving = animalOffspring
            .filter(o => o.birth_date)
            .sort((a, b) => new Date(b.birth_date!).getTime() - new Date(a.birth_date!).getTime())[0];
          
          if (lastCalving && lastCalving.birth_date) {
            const daysSinceCalving = Math.floor((new Date().getTime() - new Date(lastCalving.birth_date).getTime()) / (1000 * 60 * 60 * 24));
            if (daysSinceCalving <= 60) {
              currentState = 'Post-parto';
            }
          }
        }

        return {
          animal_id: animal.id,
          id_tag: animal.id_tag || '',
          name: animal.name || '',
          age_months: ageMonths,
          category,
          corral_id: animal.corral_id || '',
          corral_name: corralesMap.get(animal.corral_id) || '',
          is_pregnant: animal.esta_preñada || false,
          pregnancy_date: animal.fecha_ultima_preñez || '',
          expected_calving_date: animal.fecha_probable_parto || '',
          last_service_date: '', // TODO: Calculate from service records
          days_open: 0, // TODO: Calculate from calving to next service
          reproductive_years: metrics.reproductive_years,
          total_offspring: animalOffspring.length,
          lifetime_services: animalServices.length,
          lifetime_pregnancies: pregnancyRecords.length,
          lifetime_calvings: metrics.total_calvings,
          individual_pregnancy_rate: metrics.pregnancy_rate,
          individual_calving_rate: metrics.calving_rate,
          performance_level: metrics.performance_level,
          active_alerts: 0, // TODO: Get from alerts table
          alert_types: [], // TODO: Get from alerts table
          current_state: currentState
        };
      });

      setReproductiveFemales(reproductiveData);

      // Calculate herd summary metrics
      const totalFemales = reproductiveData.length;
      const currentlyPregnant = reproductiveData.filter(f => f.is_pregnant).length;
      
      // Calculate overall pregnancy and calving rates from all animals
      let totalServices = 0;
      let totalPregnancies = 0;
      let totalCalvings = 0;
      let totalReproductiveYears = 0;
      
      reproductiveData.forEach(female => {
        totalServices += female.lifetime_services;
        totalPregnancies += female.lifetime_pregnancies;
        totalCalvings += female.lifetime_calvings;
        totalReproductiveYears += female.reproductive_years;
      });

      // Herd pregnancy rate = total pregnancies / total reproductive years * 100
      const herdPregnancyRate = totalReproductiveYears > 0 
        ? Math.round((totalPregnancies / totalReproductiveYears) * 100) 
        : 0;
      
      // Herd calving rate = total calvings / total pregnancies * 100
      const herdCalvingRate = totalPregnancies > 0 
        ? Math.round((totalCalvings / totalPregnancies) * 100) 
        : 0;

      setSummaryMetrics({
        totalFemales,
        currentlyPregnant,
        totalServices,
        pregnancyRate: herdPregnancyRate,
        calvingRate: herdCalvingRate,
        openFemales: totalFemales - currentlyPregnant,
        avgDaysOpen: 0, // TODO: Calculate average days open
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

  const { toast } = useToast();

  const handleRefresh = () => {
    fetchReproductiveData();
    toast({
      title: "Datos actualizados",
      description: "Los datos reproductivos han sido actualizados correctamente."
    });
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
                        <TableHead>Estado Actual</TableHead>
                        <TableHead>% Preñez</TableHead>
                        <TableHead>% Parición</TableHead>
                        <TableHead>Crías</TableHead>
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
                            <Badge 
                              variant={
                                animal.current_state === 'Preñada' ? 'default' :
                                animal.current_state === 'Post-parto' ? 'secondary' :
                                'outline'
                              }
                              className={
                                animal.current_state === 'Preñada' ? 'bg-emerald-100 text-emerald-800' :
                                animal.current_state === 'Post-parto' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }
                            >
                              {animal.current_state}
                            </Badge>
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
                          <TableCell className="text-center">
                            <Badge variant="secondary">
                              {animal.total_offspring}
                            </Badge>
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