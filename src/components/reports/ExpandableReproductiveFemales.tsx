import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Heart, ChevronDown, ChevronRight, ExternalLink, Calendar, Baby, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReportFilters } from "./ReportsFilters";
import { Skeleton } from "@/components/ui/skeleton";

interface ReproductiveFemaleDetailed {
  animal_id: string;
  tag: string;
  name: string;
  category: string;
  corral_id: string;
  corral_name: string;
  is_pregnant: boolean;
  pregnancy_date: string | null;
  expected_calving_date: string | null;
  age_months: number;
  last_service_date: string | null;
  services_count: number;
  pregnancy_checks_count: number;
  historical_pregnancy_rate: number;
  calving_rate: number;
  total_calvings: number;
  days_open: number;
}

interface ExpandableReproductiveFemalesProps {
  filters: ReportFilters;
}

export function ExpandableReproductiveFemales({ filters }: ExpandableReproductiveFemalesProps) {
  const [animals, setAnimals] = useState<ReproductiveFemaleDetailed[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReproductiveFemales();
  }, [filters]);

  const fetchReproductiveFemales = async () => {
    try {
      setLoading(true);

      const filtersJson = {
        date_from: filters.date_from?.toISOString().split('T')[0],
        date_to: filters.date_to?.toISOString().split('T')[0],
        corral_ids: filters.corral_ids,
        category: filters.category,
        breed: filters.breed,
        include_sold_dead: filters.include_sold_dead
      };

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Get basic reproductive females data
      const { data: basicData, error: basicError } = await supabase.rpc('rpc_report_reproductive_females', {
        _user_id: userData.user.id,
        filters_json: filtersJson
      });

      if (basicError) {
        console.error('Error fetching reproductive females data:', basicError);
        return;
      }

      // Calculate historical data for each female
      const enrichedData = await Promise.all((basicData || []).map(async (animal) => {
        // Get historical services for this animal
        const { data: iaHistory } = await supabase
          .from("ia")
          .select(`
            *,
            eventos!inner(fecha)
          `)
          .contains('animales_ids', [animal.animal_id]);

        // Get historical pregnancy checks
        const { data: tactoHistory } = await supabase
          .from("tactos")
          .select(`
            resultados,
            eventos!inner(fecha)
          `);

        // Calculate historical metrics
        const totalServices = iaHistory?.length || 0;
        
        // Count pregnancies from tactos
        let pregnancyResults = 0;
        tactoHistory?.forEach(tacto => {
          if (tacto.resultados && Array.isArray(tacto.resultados)) {
            tacto.resultados.forEach((result: any) => {
              if (result.animal_id === animal.animal_id && result.resultado === 'preñada') {
                pregnancyResults++;
              }
            });
          }
        });

        // Get calvings (animals where this animal is the mother)
        const { data: calvings } = await supabase
          .from("animals")
          .select("id, birth_date")
          .eq("mother_id", animal.animal_id);

        const totalCalvings = calvings?.length || 0;
        const historicalPregnancyRate = totalServices > 0 ? (pregnancyResults / totalServices) * 100 : 0;
        const calvingRate = pregnancyResults > 0 ? (totalCalvings / pregnancyResults) * 100 : 0;

        // Calculate days open (simplified calculation)
        const lastCalving = calvings?.reduce((latest, calf) => {
          const birthDate = new Date(calf.birth_date);
          return birthDate > latest ? birthDate : latest;
        }, new Date(0));

        const daysOpen = lastCalving && lastCalving.getTime() > 0 
          ? Math.floor((new Date().getTime() - lastCalving.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        return {
          ...animal,
          historical_pregnancy_rate: historicalPregnancyRate,
          calving_rate: calvingRate,
          total_calvings: totalCalvings,
          days_open: daysOpen
        };
      }));

      setAnimals(enrichedData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  const handleViewAnimal = (animalId: string) => {
    navigate(`/animales/${animalId}`);
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 80) return { variant: "default" as const, label: "Excelente", color: "bg-emerald-100 text-emerald-800" };
    if (rate >= 60) return { variant: "secondary" as const, label: "Bueno", color: "bg-blue-100 text-blue-800" };
    if (rate >= 40) return { variant: "outline" as const, label: "Regular", color: "bg-amber-100 text-amber-800" };
    return { variant: "destructive" as const, label: "Bajo", color: "bg-red-100 text-red-800" };
  };

  const pregnantCount = animals.filter(a => a.is_pregnant).length;
  const averagePregnancyRate = animals.length > 0 
    ? animals.reduce((sum, a) => sum + a.historical_pregnancy_rate, 0) / animals.length 
    : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Hembras Reproductivas Detalladas
                <Badge variant="secondary" className="ml-2">
                  {animals.length} total
                </Badge>
                <Badge variant="default" className="bg-emerald-100 text-emerald-800">
                  {pregnantCount} preñadas
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  % Preñez promedio: {averagePregnancyRate.toFixed(1)}%
                </div>
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent>
            {animals.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                No se encontraron hembras reproductivas con los filtros aplicados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tag</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Corral</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Edad</TableHead>
                      <TableHead className="text-center">% Preñez Histórico</TableHead>
                      <TableHead className="text-center">% Parición</TableHead>
                      <TableHead className="text-center">Total Partos</TableHead>
                      <TableHead className="text-center">Días Abiertos</TableHead>
                      <TableHead className="text-center">Servicios</TableHead>
                      <TableHead>Último Servicio</TableHead>
                      <TableHead>Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {animals.map((animal) => {
                      const pregnancyBadge = getPerformanceBadge(animal.historical_pregnancy_rate);
                      const calvingBadge = getPerformanceBadge(animal.calving_rate);
                      
                      return (
                        <TableRow key={animal.animal_id}>
                          <TableCell className="font-medium">{animal.tag}</TableCell>
                          <TableCell>{animal.name || '-'}</TableCell>
                          <TableCell>{animal.corral_name || '-'}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {animal.is_pregnant ? (
                                <Badge className="bg-emerald-100 text-emerald-800">
                                  <Baby className="h-3 w-3 mr-1" />
                                  Preñada
                                </Badge>
                              ) : (
                                <Badge variant="outline">Vacía</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{animal.age_months} meses</Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-medium">{animal.historical_pregnancy_rate.toFixed(1)}%</span>
                              <Badge className={`text-xs ${pregnancyBadge.color}`}>
                                {pregnancyBadge.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-medium">{animal.calving_rate.toFixed(1)}%</span>
                              <Badge className={`text-xs ${calvingBadge.color}`}>
                                {calvingBadge.label}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">
                            {animal.total_calvings}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {animal.days_open}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{animal.services_count}</TableCell>
                          <TableCell>
                            {animal.last_service_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(animal.last_service_date)}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewAnimal(animal.animal_id)}
                            >
                              <ExternalLink className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="mt-4 text-sm text-muted-foreground">
              <p>* % Preñez Histórico: Éxito de servicios que resultaron en preñez confirmada por tacto.</p>
              <p>* % Parición: Partos exitosos de preñeces confirmadas.</p>
              <p>* Días Abiertos: Días desde el último parto hasta la fecha actual.</p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}