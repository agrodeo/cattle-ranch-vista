import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Heart, ExternalLink, Calendar, Baby } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReportFilters } from "./ReportsFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateForDB } from "@/lib/dateFormatters";

interface ReproductiveFemale {
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
}

interface ReproductiveFemalesTableProps {
  filters: ReportFilters;
}

export function ReproductiveFemalesTable({ filters }: ReproductiveFemalesTableProps) {
  const [animals, setAnimals] = useState<ReproductiveFemale[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReproductiveFemales();
  }, [filters]);

  const fetchReproductiveFemales = async () => {
    try {
      setLoading(true);

      const filtersJson = {
        date_from: formatDateForDB(filters.date_from),
        date_to: formatDateForDB(filters.date_to),
        corral_ids: filters.corral_ids,
        category: filters.category,
        breed: filters.breed,
        include_sold_dead: filters.include_sold_dead
      };

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data, error } = await supabase.rpc('rpc_report_reproductive_females', {
        _user_id: userData.user.id,
        filters_json: filtersJson
      });

      if (error) {
        console.error('Error fetching reproductive females data:', error);
        return;
      }

      setAnimals(data || []);
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5" />
            Hembras Reproductivas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Separate pregnant and non-pregnant animals
  const pregnantAnimals = animals.filter(a => a.is_pregnant);
  const nonPregnantAnimals = animals.filter(a => !a.is_pregnant);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Hembras Reproductivas
          <Badge variant="secondary" className="ml-2">
            {animals.length} total, {pregnantAnimals.length} preñadas
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {animals.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No se encontraron hembras reproductivas con los filtros aplicados.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pregnant Animals Section */}
            {pregnantAnimals.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Baby className="h-5 w-5 text-emerald-600" />
                  Hembras Preñadas ({pregnantAnimals.length})
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Corral</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Edad (meses)</TableHead>
                        <TableHead>Fecha Preñez</TableHead>
                        <TableHead>Parto Esperado</TableHead>
                        <TableHead>Servicios</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pregnantAnimals.map((animal) => (
                        <TableRow key={animal.animal_id}>
                          <TableCell className="font-medium">{animal.tag}</TableCell>
                          <TableCell>{animal.name || '-'}</TableCell>
                          <TableCell>{animal.corral_name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{animal.category}</Badge>
                          </TableCell>
                          <TableCell>{animal.age_months || '-'}</TableCell>
                          <TableCell>{formatDate(animal.pregnancy_date)}</TableCell>
                          <TableCell className="font-medium text-emerald-600">
                            {formatDate(animal.expected_calving_date)}
                          </TableCell>
                          <TableCell>{animal.services_count}</TableCell>
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Non-Pregnant Animals Section */}
            {nonPregnantAnimals.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Heart className="h-5 w-5 text-slate-600" />
                  Hembras No Preñadas ({nonPregnantAnimals.length})
                </h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tag</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Corral</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Edad (meses)</TableHead>
                        <TableHead>Último Servicio</TableHead>
                        <TableHead>Total Servicios</TableHead>
                        <TableHead>Tactos</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {nonPregnantAnimals.map((animal) => (
                        <TableRow key={animal.animal_id}>
                          <TableCell className="font-medium">{animal.tag}</TableCell>
                          <TableCell>{animal.name || '-'}</TableCell>
                          <TableCell>{animal.corral_name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{animal.category}</Badge>
                          </TableCell>
                          <TableCell>{animal.age_months || '-'}</TableCell>
                          <TableCell>
                            {animal.last_service_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(animal.last_service_date)}
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>{animal.services_count}</TableCell>
                          <TableCell>{animal.pregnancy_checks_count}</TableCell>
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
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}