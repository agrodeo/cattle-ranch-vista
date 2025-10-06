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
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, ExternalLink, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ReportFilters } from "./ReportsFilters";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { formatDateForDB } from "@/lib/dateFormatters";
import { useIsMobile } from "@/hooks/use-mobile";

interface ProductionAnimal {
  animal_id: string;
  tag: string;
  name: string;
  category: string;
  corral_id: string;
  corral_name: string;
  last_weight_kg: number;
  last_weight_date: string;
  adg_recent_90d: number;
  adg_season: number;
  weighs_count: number;
  weight_birth: number;
  weight_weaning: number;
  weight_yearling: number;
  weight_final: number;
  adg_percentile: number;
}

interface AnimalProductionTableProps {
  filters: ReportFilters;
}

export function AnimalProductionTable({ filters }: AnimalProductionTableProps) {
  const [animals, setAnimals] = useState<ProductionAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchProductionData();
  }, [filters]);

  const fetchProductionData = async () => {
    setLoading(true);
    try {
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

      const { data, error } = await supabase.rpc('rpc_report_production_animals', {
        _user_id: userData.user.id,
        filters_json: filtersJson
      });

      if (error) {
        console.error('Error fetching production data:', error);
        return;
      }

      setAnimals(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAdgBadgeColor = (adg: number) => {
    if (adg >= 0.8) return "default"; // Green
    if (adg >= 0.6) return "secondary"; // Yellow
    return "destructive"; // Red
  };

  const getPercentileBadgeColor = (percentile: number) => {
    if (percentile >= 80) return "default"; // Green
    if (percentile >= 50) return "secondary"; // Yellow
    return "destructive"; // Red
  };

  const formatWeight = (weight: number | null) => {
    if (!weight) return "-";
    return `${weight.toFixed(0)}kg`;
  };

  const formatAdg = (adg: number | null) => {
    if (!adg) return "-";
    return `${adg.toFixed(3)}kg/d`;
  };

  const handleViewAnimal = (animalId: string) => {
    navigate(`/animales/${animalId}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Producción por Animal
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

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Producción por Animal
            </CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              {animals.length} animales con datos de peso
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {animals.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-20 text-muted-foreground" />
              <div className="text-lg font-medium mb-2">Aún no hay pesajes registrados</div>
              <div className="text-sm text-muted-foreground mb-6">
                Registra pesajes en la sección de Actividades para ver los datos de producción y ganancia diaria
              </div>
              <Button variant="outline" onClick={() => window.location.href = '/actividades'}>
                Ir a Actividades
              </Button>
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {animals.map((animal) => (
                <Card 
                  key={animal.animal_id}
                  className="cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => handleViewAnimal(animal.animal_id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-base truncate">
                          {animal.name || animal.tag}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {animal.tag} • {animal.category}
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2 flex-shrink-0">
                        {animal.corral_name || 'Sin corral'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Último Peso</div>
                        <div className="font-medium">{formatWeight(animal.last_weight_kg)}</div>
                        {animal.last_weight_date && (
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(animal.last_weight_date), "dd/MM/yy", { locale: es })}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Pesadas</div>
                        <div className="font-medium">{animal.weighs_count}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">ADG 90d</div>
                        <Badge variant={getAdgBadgeColor(animal.adg_recent_90d)} className="text-xs">
                          {formatAdg(animal.adg_recent_90d)}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">ADG Temp.</div>
                        <Badge variant={getAdgBadgeColor(animal.adg_season)} className="text-xs">
                          {formatAdg(animal.adg_season)}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 pt-3 border-t">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Nacer</div>
                        <div className="text-sm font-medium">{formatWeight(animal.weight_birth)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Destete</div>
                        <div className="text-sm font-medium">{formatWeight(animal.weight_weaning)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">18m</div>
                        <div className="text-sm font-medium">{formatWeight(animal.weight_yearling)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Final</div>
                        <div className="text-sm font-medium">{formatWeight(animal.weight_final)}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Percentil:</span>
                        <Badge variant={getPercentileBadgeColor(animal.adg_percentile)} className="text-xs">
                          P{animal.adg_percentile}
                        </Badge>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Animal</TableHead>
                    <TableHead>Corral</TableHead>
                    <TableHead>
                      <Tooltip>
                        <TooltipTrigger>Último Peso</TooltipTrigger>
                        <TooltipContent>
                          <p>Peso actual y fecha del último pesaje</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger>ADG 90d</TooltipTrigger>
                        <TooltipContent>
                          <p>Ganancia diaria promedio últimos 90 días</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger>ADG Temp.</TooltipTrigger>
                        <TooltipContent>
                          <p>Ganancia diaria promedio temporada</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger>Pesadas</TooltipTrigger>
                        <TooltipContent>
                          <p>Cantidad de pesadas registradas</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center hidden lg:table-cell">
                      <Tooltip>
                        <TooltipTrigger>Nacer</TooltipTrigger>
                        <TooltipContent>
                          <p>Peso al nacimiento</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center hidden lg:table-cell">
                      <Tooltip>
                        <TooltipTrigger>Destete</TooltipTrigger>
                        <TooltipContent>
                          <p>Peso al destete</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center hidden xl:table-cell">
                      <Tooltip>
                        <TooltipTrigger>18m</TooltipTrigger>
                        <TooltipContent>
                          <p>Peso a los 18 meses</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center hidden xl:table-cell">
                      <Tooltip>
                        <TooltipTrigger>Final</TooltipTrigger>
                        <TooltipContent>
                          <p>Peso final</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger>%tile</TooltipTrigger>
                        <TooltipContent>
                          <p>Percentil ADG vs. animales de la misma categoría</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {animals.map((animal) => (
                    <TableRow key={animal.animal_id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {animal.name || animal.tag}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {animal.tag} • {animal.category}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {animal.corral_name || 'Sin corral'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {formatWeight(animal.last_weight_kg)}
                          </div>
                          {animal.last_weight_date && (
                            <div className="text-xs text-muted-foreground">
                              {format(new Date(animal.last_weight_date), "dd/MM/yy", { locale: es })}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={getAdgBadgeColor(animal.adg_recent_90d)}
                          className="text-xs"
                        >
                          {formatAdg(animal.adg_recent_90d)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={getAdgBadgeColor(animal.adg_season)}
                          className="text-xs"
                        >
                          {formatAdg(animal.adg_season)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {animal.weighs_count}
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        <span className="text-sm">
                          {formatWeight(animal.weight_birth)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center hidden lg:table-cell">
                        <span className="text-sm">
                          {formatWeight(animal.weight_weaning)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center hidden xl:table-cell">
                        <span className="text-sm">
                          {formatWeight(animal.weight_yearling)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center hidden xl:table-cell">
                        <span className="text-sm">
                          {formatWeight(animal.weight_final)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant={getPercentileBadgeColor(animal.adg_percentile)}
                          className="text-xs"
                        >
                          P{animal.adg_percentile}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewAnimal(animal.animal_id)}
                        >
                          <ExternalLink className="h-3 w-3" />
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
    </TooltipProvider>
  );
}