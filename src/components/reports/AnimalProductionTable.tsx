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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendingUp, ExternalLink, Info, ArrowUpDown } from "lucide-react";
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
  const [sortColumn, setSortColumn] = useState<keyof ProductionAnimal | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
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

  const handleSort = (column: keyof ProductionAnimal) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedAnimals = [...animals].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = a[sortColumn];
    const bValue = b[sortColumn];
    
    if (aValue === null || aValue === undefined) return 1;
    if (bValue === null || bValue === undefined) return -1;
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortDirection === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    }
    
    return 0;
  });

  const SortableHeader = ({ column, children }: { column: keyof ProductionAnimal; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-accent/50 select-none"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortColumn === column && (
          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </TableHead>
  );

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
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Select
                  value={sortColumn || ""}
                  onValueChange={(value) => {
                    if (value) {
                      handleSort(value as keyof ProductionAnimal);
                    }
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Ordenar por..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="tag">Animal (Caravana)</SelectItem>
                    <SelectItem value="name">Animal (Nombre)</SelectItem>
                    <SelectItem value="category">Categoría</SelectItem>
                    <SelectItem value="corral_name">Corral</SelectItem>
                    <SelectItem value="last_weight_kg">Último Peso</SelectItem>
                    <SelectItem value="last_weight_date">Fecha Pesaje</SelectItem>
                    <SelectItem value="adg_recent_90d">ADG N-D</SelectItem>
                    <SelectItem value="adg_season">ADG Temporada</SelectItem>
                    <SelectItem value="weighs_count">Cantidad Pesadas</SelectItem>
                    <SelectItem value="weight_birth">Peso Nacer</SelectItem>
                    <SelectItem value="weight_weaning">Peso Destete</SelectItem>
                    <SelectItem value="weight_yearling">Peso 18m</SelectItem>
                    <SelectItem value="weight_final">Peso Final</SelectItem>
                    <SelectItem value="adg_percentile">Percentil</SelectItem>
                  </SelectContent>
                </Select>
                {sortColumn && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                    className="h-9 px-3"
                  >
                    {sortDirection === 'asc' ? '↑' : '↓'}
                  </Button>
                )}
              </div>
              {sortedAnimals.map((animal) => (
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
                        <div className="text-xs text-muted-foreground mb-1">ADG N-D</div>
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
                    <SortableHeader column="tag">Animal</SortableHeader>
                    <SortableHeader column="corral_name">Corral</SortableHeader>
                    <SortableHeader column="last_weight_kg">
                      <Tooltip>
                        <TooltipTrigger>Último Peso</TooltipTrigger>
                        <TooltipContent>
                          <p>Peso actual y fecha del último pesaje</p>
                        </TooltipContent>
                      </Tooltip>
                    </SortableHeader>
                    <TableHead 
                      className="text-center cursor-pointer hover:bg-accent/50 select-none"
                      onClick={() => handleSort('adg_recent_90d')}
                    >
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center gap-1 justify-center">
                            ADG N-D
                            {sortColumn === 'adg_recent_90d' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ganancia diaria promedio desde nacimiento hasta destete</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead 
                      className="text-center cursor-pointer hover:bg-accent/50 select-none"
                      onClick={() => handleSort('adg_season')}
                    >
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center gap-1 justify-center">
                            ADG Temp.
                            {sortColumn === 'adg_season' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Ganancia diaria promedio temporada</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead 
                      className="text-center cursor-pointer hover:bg-accent/50 select-none"
                      onClick={() => handleSort('weighs_count')}
                    >
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center gap-1 justify-center">
                            Pesadas
                            {sortColumn === 'weighs_count' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Cantidad de pesadas registradas</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead 
                      className="text-center hidden lg:table-cell cursor-pointer hover:bg-accent/50 select-none"
                      onClick={() => handleSort('weight_birth')}
                    >
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center gap-1 justify-center">
                            Nacer
                            {sortColumn === 'weight_birth' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Peso al nacimiento</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead 
                      className="text-center hidden lg:table-cell cursor-pointer hover:bg-accent/50 select-none"
                      onClick={() => handleSort('weight_weaning')}
                    >
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center gap-1 justify-center">
                            Destete
                            {sortColumn === 'weight_weaning' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Peso al destete</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead 
                      className="text-center hidden xl:table-cell cursor-pointer hover:bg-accent/50 select-none"
                      onClick={() => handleSort('weight_yearling')}
                    >
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center gap-1 justify-center">
                            18m
                            {sortColumn === 'weight_yearling' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Peso a los 18 meses</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead 
                      className="text-center hidden xl:table-cell cursor-pointer hover:bg-accent/50 select-none"
                      onClick={() => handleSort('weight_final')}
                    >
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center gap-1 justify-center">
                            Final
                            {sortColumn === 'weight_final' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Peso final</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead 
                      className="text-center cursor-pointer hover:bg-accent/50 select-none"
                      onClick={() => handleSort('adg_percentile')}
                    >
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center gap-1 justify-center">
                            %tile
                            {sortColumn === 'adg_percentile' && (
                              <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Percentil ADG vs. animales de la misma categoría</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAnimals.map((animal) => (
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