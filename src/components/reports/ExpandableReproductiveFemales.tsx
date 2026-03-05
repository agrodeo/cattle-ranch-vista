import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Heart, Baby, Calendar, AlertTriangle, TrendingUp, Eye, Filter, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { useReproductiveMetrics } from "@/hooks/useReproductiveMetrics";
import { useToast } from "@/hooks/use-toast";

interface ExpandableReproductiveFemalesProps {
  filters: any;
}

export function ExpandableReproductiveFemales({ filters }: ExpandableReproductiveFemalesProps) {
  const { t } = useTranslation(['reproductive', 'common']);
  const [isOpen, setIsOpen] = useState(false);
  const [performanceFilter, setPerformanceFilter] = useState<string>("");
  const [alertFilter, setAlertFilter] = useState<string>("");
  const navigate = useNavigate();
  const { toast } = useToast();

  // Enhanced filters for the hook - memoized to prevent constant re-renders
  const enhancedFilters = useMemo(() => {
    const baseFilters = { ...filters };
    if (performanceFilter && performanceFilter !== "all") {
      baseFilters.performance = performanceFilter;
    }
    if (alertFilter && alertFilter !== "all") {
      baseFilters.alert_status = alertFilter;
    }
    return baseFilters;
  }, [filters, performanceFilter, alertFilter]);

  const { metrics: animals, alerts, loading, markAlertAsResolved, checkAndCreateAlerts } = useReproductiveMetrics(enhancedFilters);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const handleViewAnimal = (animalId: string) => {
    navigate(`/animales/${animalId}`);
  };

  const getPerformanceBadge = (level: string) => {
    switch (level) {
      case 'Excelente':
        return <Badge className="bg-success/10 text-success border-success/20">🟢 Excelente</Badge>;
      case 'Bueno':
        return <Badge className="bg-primary/10 text-primary border-primary/20">🔵 Bueno</Badge>;
      case 'Regular':
        return <Badge className="bg-warning/10 text-warning border-warning/20">🟡 Regular</Badge>;
      case 'Bajo':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">🔴 Bajo</Badge>;
      default:
        return <Badge variant="outline">Sin datos</Badge>;
    }
  };

  const getAlertIcons = (alertTypes: string[], alertCount: number) => {
    if (alertCount === 0) return null;
    
    return (
      <div className="flex items-center gap-1" title={`Alertas: ${alertTypes.join(', ')}`}>
        {alertTypes.includes('overdue_calving') && (
          <AlertTriangle className="h-4 w-4 text-destructive" />
        )}
        {alertTypes.includes('low_performance') && (
          <TrendingDown className="h-4 w-4 text-warning" />
        )}
        {alertTypes.includes('no_service') && (
          <Calendar className="h-4 w-4 text-warning" />
        )}
        {alertTypes.includes('repeater') && (
          <Heart className="h-4 w-4 text-primary" />
        )}
        <Badge variant="destructive" className="ml-1 h-5 text-xs">
          {alertCount}
        </Badge>
      </div>
    );
  };

  const getTotalStats = () => {
    const totalFemales = animals.length;
    const pregnantCount = animals.filter(a => a.is_pregnant).length;
    const avgPregnancyRate = totalFemales > 0 
      ? animals.reduce((sum, a) => sum + a.individual_pregnancy_rate, 0) / totalFemales 
      : 0;
    const totalAlerts = alerts.length;

    return { totalFemales, pregnantCount, avgPregnancyRate, totalAlerts };
  };

  const { totalFemales, pregnantCount, avgPregnancyRate, totalAlerts } = getTotalStats();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-1.5 sm:p-4 md:p-6 h-auto overflow-hidden whitespace-normal">
            <div className="flex flex-col items-start gap-0.5 sm:gap-2 w-full overflow-hidden">
              <div className="flex items-center gap-1 w-full overflow-hidden">
                <Heart className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-pink-500 shrink-0" />
                <span className="text-[9px] sm:text-sm md:text-base font-semibold truncate min-w-0 flex-1">
                  <span className="md:hidden">Hembras</span>
                  <span className="hidden md:inline">Detalle Hembras Reproductivas</span>
                </span>
                {isOpen ? <ChevronDown className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 ml-0.5" /> : <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 ml-0.5" />}
              </div>
              <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-0.5 sm:gap-2 text-[8px] sm:text-xs w-full overflow-hidden">
                <div className="flex items-center gap-0.5 shrink-0">
                  <Baby className="h-2 w-2 sm:h-3.5 sm:w-3.5 text-blue-500 shrink-0" />
                  <span className="text-muted-foreground break-all">
                    {totalFemales}•{pregnantCount}•{totalFemales > 0 ? Math.round((pregnantCount / totalFemales) * 100) : 0}%
                  </span>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <TrendingUp className="h-2 w-2 sm:h-3.5 sm:w-3.5 text-success shrink-0" />
                  <span className="text-muted-foreground break-all">
                    {avgPregnancyRate.toFixed(1)}%
                  </span>
                </div>
                {totalAlerts > 0 && (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <AlertTriangle className="h-2 w-2 sm:h-3.5 sm:w-3.5 text-destructive shrink-0" />
                    <Badge variant="destructive" className="h-2.5 sm:h-4 text-[7px] sm:text-[10px] px-0.5 sm:px-1 py-0">
                      {totalAlerts}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-3 sm:px-6 pb-6">
          {animals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron hembras reproductivas con los filtros aplicados.
            </div>
          ) : (
            <>
              {/* Advanced Filters */}
              <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium whitespace-nowrap">Rendimiento:</label>
                    <Select value={performanceFilter || "all"} onValueChange={(value) => setPerformanceFilter(value === "all" ? "" : value)}>
                      <SelectTrigger className="w-28 sm:w-32">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="Excelente">Excelente</SelectItem>
                        <SelectItem value="Bueno">Bueno</SelectItem>
                        <SelectItem value="Regular">Regular</SelectItem>
                        <SelectItem value="Bajo">Bajo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                   <div className="flex items-center gap-2">
                    <label className="text-sm font-medium whitespace-nowrap">{t('reproductive:femalesTable.alerts')}:</label>
                    <Select value={alertFilter || "all"} onValueChange={(value) => setAlertFilter(value === "all" ? "" : value)}>
                      <SelectTrigger className="w-28 sm:w-32">
                        <SelectValue placeholder={t('reproductive:femalesTable.allAlerts')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">{t('reproductive:femalesTable.allAlerts')}</SelectItem>
                        <SelectItem value="with_alerts">{t('reproductive:femalesTable.withAlerts')}</SelectItem>
                        <SelectItem value="no_alerts">{t('reproductive:femalesTable.noAlerts')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={checkAndCreateAlerts}
                    className="sm:ml-auto w-full sm:w-auto"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">{t('reproductive:femalesTable.verifyAlerts')}</span>
                    <span className="sm:hidden">{t('reproductive:femalesTable.verify')}</span>
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">{t('reproductive:femalesTable.tag')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('reproductive:femalesTable.name')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('reproductive:femalesTable.age')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('reproductive:femalesTable.corral')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('reproductive:femalesTable.status')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('reproductive:femalesTable.pregnancyRate')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('reproductive:femalesTable.calvingRate')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('reproductive:femalesTable.reproYears')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('reproductive:femalesTable.offspring')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('reproductive:femalesTable.daysOpen')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('reproductive:femalesTable.alerts')}</TableHead>
                      <TableHead className="whitespace-nowrap">{t('reproductive:femalesTable.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                <TableBody>
                  {animals.map((animal) => (
                    <TableRow key={animal.animal_id}>
                      <TableCell className="font-medium">{animal.tag}</TableCell>
                      <TableCell>{animal.name || "-"}</TableCell>
                      <TableCell>
                        {animal.age_months ? `${Math.floor(animal.age_months / 12)}a ${animal.age_months % 12}m` : "-"}
                      </TableCell>
                      <TableCell>{animal.corral_name || t('reproductive:femalesTable.noCorral')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {animal.is_pregnant ? (
                             <Badge className="bg-success/10 text-success border-success/20">
                              <Heart className="h-3 w-3 mr-1" />
                              {t('reproductive:pregnancy.pregnant')}
                            </Badge>
                          ) : (
                            <Badge variant="outline">{t('reproductive:pregnancy.empty')}</Badge>
                          )}
                          {animal.expected_calving_date && (
                            <span className="text-xs text-muted-foreground">
                              FPP: {formatDate(animal.expected_calving_date)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{animal.individual_pregnancy_rate.toFixed(1)}%</span>
                          {getPerformanceBadge(animal.performance_level)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{animal.individual_calving_rate.toFixed(1)}%</span>
                      </TableCell>
                      <TableCell>{animal.reproductive_years}</TableCell>
                      <TableCell>{animal.total_offspring}</TableCell>
                      <TableCell>
                        {animal.days_open ? (
                           <span className={animal.days_open > 120 ? "text-warning font-medium" : ""}>
                            {animal.days_open} {t('reproductive:femalesTable.days')}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        {getAlertIcons(animal.alert_types, animal.active_alerts)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAnimal(animal.animal_id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          {t('reproductive:femalesTable.view')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                </Table>
              </div>

              <div className="mt-6 space-y-4 text-sm text-muted-foreground">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">📊 {t('reproductive:femalesTable.individualMetrics')}</h4>
                    <ul className="space-y-1">
                      <li>• <strong>{t('reproductive:femalesTable.indPregnancyRate')}</strong> {t('reproductive:femalesTable.indPregnancyFormula')}</li>
                      <li>• <strong>{t('reproductive:femalesTable.indCalvingRate')}</strong> {t('reproductive:femalesTable.indCalvingFormula')}</li>
                      <li>• <strong>{t('reproductive:femalesTable.reproductiveYears')}</strong> {t('reproductive:femalesTable.reproYearsDesc')}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">🚨 {t('reproductive:femalesTable.alertTypes')}</h4>
                    <ul className="space-y-1">
                      <li>• <AlertTriangle className="h-3 w-3 inline mr-1" /> <strong>{t('reproductive:femalesTable.fppOverdue')}:</strong> {t('reproductive:femalesTable.fppOverdueDesc')}</li>
                      <li>• <TrendingDown className="h-3 w-3 inline mr-1" /> <strong>{t('reproductive:femalesTable.lowPerformance')}:</strong> {t('reproductive:femalesTable.lowPerformanceDesc')}</li>
                      <li>• <Calendar className="h-3 w-3 inline mr-1" /> <strong>{t('reproductive:femalesTable.noService')}:</strong> {t('reproductive:femalesTable.noServiceDesc')}</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">🎯 {t('reproductive:femalesTable.performanceLevels')}</h4>
                    <ul className="space-y-1">
                      <li>• 🟢 <strong>{t('reproductive:femalesTable.excellent')}:</strong> {t('reproductive:femalesTable.excellentDesc')}</li>
                      <li>• 🔵 <strong>{t('reproductive:femalesTable.good')}:</strong> {t('reproductive:femalesTable.goodDesc')}</li>
                      <li>• 🟡 <strong>{t('reproductive:femalesTable.regular')}:</strong> {t('reproductive:femalesTable.regularDesc')}</li>
                      <li>• 🔴 <strong>{t('reproductive:femalesTable.low')}:</strong> {t('reproductive:femalesTable.lowDesc')}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}