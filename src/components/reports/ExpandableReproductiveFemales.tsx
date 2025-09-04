import React, { useState, useMemo } from "react";
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
          <Button variant="ghost" className="w-full justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-pink-500" />
                <span className="text-lg font-semibold">Hembras Reproductivas Detalladas</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Baby className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">
                    {totalFemales} Total • {pregnantCount} Preñadas ({totalFemales > 0 ? Math.round((pregnantCount / totalFemales) * 100) : 0}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-success" />
                  <span className="text-sm text-muted-foreground">
                    {avgPregnancyRate.toFixed(1)}% Promedio
                  </span>
                </div>
                {totalAlerts > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-destructive" />
                    <Badge variant="destructive" className="h-5 text-xs">
                      {totalAlerts} Alertas
                    </Badge>
                  </div>
                )}
              </div>
            </div>
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="px-6 pb-6">
          {animals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron hembras reproductivas con los filtros aplicados.
            </div>
          ) : (
            <>
              {/* Advanced Filters */}
              <div className="mb-6 flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Rendimiento:</label>
                    <Select value={performanceFilter || "all"} onValueChange={(value) => setPerformanceFilter(value === "all" ? "" : value)}>
                      <SelectTrigger className="w-32">
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
                    <label className="text-sm font-medium">Alertas:</label>
                    <Select value={alertFilter || "all"} onValueChange={(value) => setAlertFilter(value === "all" ? "" : value)}>
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="with_alerts">Con Alertas</SelectItem>
                        <SelectItem value="no_alerts">Sin Alertas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={checkAndCreateAlerts}
                    className="ml-auto"
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Verificar Alertas
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tag</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Edad</TableHead>
                    <TableHead>Corral</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>% Preñez</TableHead>
                    <TableHead>% Parición</TableHead>
                    <TableHead>Años Reprod.</TableHead>
                    <TableHead>Crías</TableHead>
                    <TableHead>Días Abierta</TableHead>
                    <TableHead>Alertas</TableHead>
                    <TableHead>Acciones</TableHead>
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
                      <TableCell>{animal.corral_name || "Sin corral"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {animal.is_pregnant ? (
                            <Badge className="bg-success/10 text-success border-success/20">
                              <Heart className="h-3 w-3 mr-1" />
                              Preñada
                            </Badge>
                          ) : (
                            <Badge variant="outline">Vacía</Badge>
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
                            {animal.days_open} días
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
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-6 space-y-4 text-sm text-muted-foreground">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-foreground mb-2">📊 Métricas Individuales (desde 18 meses):</h4>
                    <ul className="space-y-1">
                      <li>• <strong>% Preñez Individual:</strong> (Preñeces confirmadas / Total servicios) × 100</li>
                      <li>• <strong>% Parición:</strong> (Partos exitosos / Preñeces confirmadas) × 100</li>
                      <li>• <strong>Años Reproductivos:</strong> Años activos desde los 18 meses</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">🚨 Tipos de Alertas:</h4>
                    <ul className="space-y-1">
                      <li>• <AlertTriangle className="h-3 w-3 inline mr-1" /> <strong>FPP Vencida:</strong> +30 días sin registrar parto</li>
                      <li>• <TrendingDown className="h-3 w-3 inline mr-1" /> <strong>Bajo Rendimiento:</strong> &lt;40% preñez</li>
                      <li>• <Calendar className="h-3 w-3 inline mr-1" /> <strong>Sin Servicio:</strong> &gt;90 días post-parto</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground mb-2">🎯 Niveles de Rendimiento:</h4>
                    <ul className="space-y-1">
                      <li>• 🟢 <strong>Excelente:</strong> ≥80% preñez</li>
                      <li>• 🔵 <strong>Bueno:</strong> 60-79% preñez</li>
                      <li>• 🟡 <strong>Regular:</strong> 40-59% preñez</li>
                      <li>• 🔴 <strong>Bajo:</strong> &lt;40% preñez</li>
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