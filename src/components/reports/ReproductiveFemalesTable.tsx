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
import { useTranslation } from "react-i18next";
import { getTranslatedCategory } from "@/lib/translations";

interface ReproductiveFemale {
  animal_id: string;
  tag: string;
  name: string;
  category: string;
  corral_id: string;
  corral_name: string;
  exposures: number;
  pregnancies: number;
  pregnancy_rate: number;
  calvings: number;
  live_calvings: number;
  calving_rate: number;
  live_calving_rate: number;
  open_days: number;
  is_repeater: boolean;
}

interface ReproductiveFemalesTableProps {
  filters: ReportFilters;
}

export function ReproductiveFemalesTable({ filters }: ReproductiveFemalesTableProps) {
  const [animals, setAnimals] = useState<ReproductiveFemale[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { t } = useTranslation(['animals']);

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

      const { data, error } = await supabase.rpc('rpc_report_reproduction_animals', {
        _user_id: userData.user.id,
        filters_json: filtersJson
      });

      if (error) {
        console.error('Error fetching reproduction animals data:', error);
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

  const getStatusBadge = (pregnancyRate: number, calvingRate: number) => {
    if (pregnancyRate >= 80 && calvingRate >= 90) {
      return <Badge className="bg-emerald-100 text-emerald-800">Excelente</Badge>;
    } else if (pregnancyRate >= 60 && calvingRate >= 75) {
      return <Badge className="bg-blue-100 text-blue-800">Buena</Badge>;
    } else if (pregnancyRate >= 40 && calvingRate >= 60) {
      return <Badge className="bg-yellow-100 text-yellow-800">Regular</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Deficiente</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5" />
          Rendimiento Reproductivo Individual
          <Badge variant="secondary" className="ml-2">
            {animals.length} hembras reproductivas
          </Badge>
        </CardTitle>
      </CardHeader>
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
                  <TableHead>Categoría</TableHead>
                  <TableHead>Corral</TableHead>
                  <TableHead>Exposiciones</TableHead>
                  <TableHead>Preñeces</TableHead>
                  <TableHead>Tasa Preñez</TableHead>
                  <TableHead>Partos</TableHead>
                  <TableHead>Tasa Parición</TableHead>
                  <TableHead>Días Abierta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {animals.map((animal) => (
                  <TableRow key={animal.animal_id}>
                    <TableCell className="font-medium">{animal.tag}</TableCell>
                    <TableCell>{animal.name || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTranslatedCategory(animal.category, t)}</Badge>
                    </TableCell>
                    <TableCell>{animal.corral_name || '-'}</TableCell>
                    <TableCell className="text-center">{animal.exposures}</TableCell>
                    <TableCell className="text-center">{animal.pregnancies}</TableCell>
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
                    <TableCell className="text-center">{animal.calvings}</TableCell>
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
                    <TableCell className="text-center">
                      {animal.open_days > 0 ? (
                        <span className={`${
                          animal.open_days > 120 ? 'text-red-600' :
                          animal.open_days > 90 ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {animal.open_days} días
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {animal.is_repeater ? (
                        <Badge variant="destructive">Repetidora</Badge>
                      ) : (
                        getStatusBadge(animal.pregnancy_rate, animal.calving_rate)
                      )}
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
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}