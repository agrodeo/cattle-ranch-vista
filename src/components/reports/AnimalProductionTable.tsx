import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { getTranslatedCategory } from "@/lib/translations";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { scoreFromRawData, type AnimalScoreRawData } from "@/hooks/useAnimalScore";
import type { AnimalScore } from "@/lib/animalScore";
import { AnimalScoreBadge } from "@/components/animals/profile/AnimalScoreBadge";

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

type SortColumn = keyof ProductionAnimal | 'score';

export function AnimalProductionTable({ filters }: AnimalProductionTableProps) {
  const { t } = useTranslation(['reports', 'common', 'animals']);
  const { currentUser } = useSupabaseAuth();
  const [animals, setAnimals] = useState<ProductionAnimal[]>([]);
  const [animalScores, setAnimalScores] = useState<Map<string, AnimalScore>>(new Map());
  const [loading, setLoading] = useState(true);
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    fetchProductionData();
  }, [filters, currentUser?.cabañaId]);

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

      const productionAnimals = data || [];
      setAnimals(productionAnimals);

      if (currentUser?.cabañaId && productionAnimals.length > 0) {
        const { data: scoreRows, error: scoreError } = await supabase.rpc('calculate_herd_scores' as never, {
          _cabana_id: currentUser.cabañaId,
          _animal_ids: productionAnimals.map((animal: ProductionAnimal) => animal.animal_id),
        } as never);

        if (!scoreError && Array.isArray(scoreRows)) {
          const entries = await Promise.all(
            scoreRows.map(async (row: { animal_id: string; score_data: AnimalScoreRawData }) => [
              row.animal_id,
              await scoreFromRawData(row.score_data, currentUser.cabañaId),
            ] as const),
          );
          setAnimalScores(new Map(entries));
        } else {
          setAnimalScores(new Map());
        }
      } else {
        setAnimalScores(new Map());
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAdgBadgeColor = (adg: number) => {
    if (adg >= 0.8) return "default";
    if (adg >= 0.6) return "secondary";
    return "destructive";
  };

  const getPercentileBadgeColor = (percentile: number) => {
    if (percentile >= 80) return "default";
    if (percentile >= 50) return "secondary";
    return "destructive";
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

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const sortedAnimals = [...animals].sort((a, b) => {
    if (!sortColumn) return 0;
    
    const aValue = sortColumn === 'score' ? animalScores.get(a.animal_id)?.overall : a[sortColumn];
    const bValue = sortColumn === 'score' ? animalScores.get(b.animal_id)?.overall : b[sortColumn];
    
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

  const SortableHeader = ({ column, children }: { column: SortColumn; children: React.ReactNode }) => (
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
            {t('reports:production.productionByAnimal')}
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
      <div>
          {animals.length === 0 ? (
            <div className="text-center py-12">
              <TrendingUp className="h-16 w-16 mx-auto mb-4 opacity-20 text-muted-foreground" />
              <div className="text-lg font-medium mb-2">{t('reports:production.noWeighingsYet')}</div>
              <div className="text-sm text-muted-foreground mb-6">
                {t('reports:production.noWeighingsDesc')}
              </div>
              <Button variant="outline" onClick={() => window.location.href = '/actividades'}>
                {t('reports:production.goToActivities')}
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
                    <SelectValue placeholder={t('reports:production.sortBy')} />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="tag">{t('reports:production.animalTag')}</SelectItem>
                    <SelectItem value="name">{t('reports:production.animalName')}</SelectItem>
                    <SelectItem value="category">{t('reports:filters.category')}</SelectItem>
                    <SelectItem value="corral_name">{t('reports:filters.corrals')}</SelectItem>
                    <SelectItem value="last_weight_kg">{t('reports:production.lastWeight')}</SelectItem>
                    <SelectItem value="last_weight_date">{t('reports:production.weighDate')}</SelectItem>
                    <SelectItem value="adg_recent_90d">{t('reports:production.adgND')}</SelectItem>
                    <SelectItem value="adg_season">{t('reports:production.adgSeason')}</SelectItem>
                    <SelectItem value="weighs_count">{t('reports:production.weighsCount')}</SelectItem>
                    <SelectItem value="weight_birth">{t('reports:production.weightBirth')}</SelectItem>
                    <SelectItem value="weight_weaning">{t('reports:production.weightWeaning')}</SelectItem>
                    <SelectItem value="weight_yearling">{t('reports:production.weight18m')}</SelectItem>
                    <SelectItem value="weight_final">{t('reports:production.weightFinal')}</SelectItem>
                    <SelectItem value="adg_percentile">{t('common:percentile')}</SelectItem>
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
                          {animal.tag} • {getTranslatedCategory(animal.category, t)}
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2 flex-shrink-0">
                        {animal.corral_name || t('reports:production.noCorral')}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                     <div>
                        <div className="text-xs text-muted-foreground mb-1">{t('reports:production.lastWeight')}</div>
                        <div className="font-medium">{formatWeight(animal.last_weight_kg)}</div>
                        {animal.last_weight_date && (
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(animal.last_weight_date), "dd/MM/yy", { locale: es })}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">{t('reports:production.weighCount')}</div>
                        <div className="font-medium">{animal.weighs_count}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">{t('reports:production.adgSeason')}</div>
                        <Badge variant={getAdgBadgeColor(animal.adg_season)}>
                          {formatAdg(animal.adg_season)}
                        </Badge>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">{t('common:percentile')}</div>
                        <Badge variant={getPercentileBadgeColor(animal.adg_percentile)}>
                          P{animal.adg_percentile}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                     <SortableHeader column="tag">{t('reports:production.animalTag')}</SortableHeader>
                    <SortableHeader column="name">{t('reports:production.animalName')}</SortableHeader>
                    <SortableHeader column="category">{t('reports:filters.category')}</SortableHeader>
                    <SortableHeader column="corral_name">{t('reports:filters.corrals')}</SortableHeader>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 mx-auto cursor-help">
                          <div onClick={() => handleSort('last_weight_kg')} className="cursor-pointer">
                            {t('reports:production.lastWeight')}
                            {sortColumn === 'last_weight_kg' && (
                              <span className="text-xs ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('reports:production.recentWeight')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <SortableHeader column="last_weight_date">{t('reports:production.weighDate')}</SortableHeader>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 mx-auto cursor-help">
                          <div onClick={() => handleSort('adg_recent_90d')} className="cursor-pointer">
                            {t('reports:production.adgND')}
                            {sortColumn === 'adg_recent_90d' && (
                              <span className="text-xs ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('reports:production.adgNDTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 mx-auto cursor-help">
                          <div onClick={() => handleSort('adg_season')} className="cursor-pointer">
                            {t('reports:production.adgSeason')}
                            {sortColumn === 'adg_season' && (
                              <span className="text-xs ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('reports:production.adgSeasonTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <SortableHeader column="weighs_count">{t('reports:production.weighCount')}</SortableHeader>
                    <SortableHeader column="weight_birth">{t('reports:production.weightBirth')}</SortableHeader>
                    <SortableHeader column="weight_weaning">{t('reports:production.weightWeaning')}</SortableHeader>
                    <SortableHeader column="weight_yearling">{t('reports:production.weight18m')}</SortableHeader>
                    <SortableHeader column="weight_final">{t('reports:production.weightFinal')}</SortableHeader>
                    <TableHead className="text-center">
                      <Tooltip>
                        <TooltipTrigger className="flex items-center gap-1 mx-auto cursor-help">
                          <div onClick={() => handleSort('adg_percentile')} className="cursor-pointer">
                            {t('common:percentile')}
                            {sortColumn === 'adg_percentile' && (
                              <span className="text-xs ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                          <Info className="h-3 w-3" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{t('reports:production.percentileTooltip')}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableHead>
                    <TableHead>{t('reports:production.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAnimals.map((animal) => (
                    <TableRow key={animal.animal_id}>
                      <TableCell className="font-medium">{animal.tag}</TableCell>
                      <TableCell>{animal.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{getTranslatedCategory(animal.category, t)}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{animal.corral_name || t('reports:production.noCorral')}</Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        {formatWeight(animal.last_weight_kg)}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {animal.last_weight_date ? format(new Date(animal.last_weight_date), "dd/MM/yy", { locale: es }) : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getAdgBadgeColor(animal.adg_recent_90d)}>
                          {formatAdg(animal.adg_recent_90d)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getAdgBadgeColor(animal.adg_season)}>
                          {formatAdg(animal.adg_season)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{animal.weighs_count}</TableCell>
                      <TableCell className="text-center">{formatWeight(animal.weight_birth)}</TableCell>
                      <TableCell className="text-center">{formatWeight(animal.weight_weaning)}</TableCell>
                      <TableCell className="text-center">{formatWeight(animal.weight_yearling)}</TableCell>
                      <TableCell className="text-center">{formatWeight(animal.weight_final)}</TableCell>
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
      </div>
    </TooltipProvider>
  );
}
