import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { supabase } from "@/integrations/supabase/client";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Home, 
  Plus, 
  Users, 
  ArrowRight, 
  MapPin, 
  ChevronDown, 
  ChevronRight, 
  Activity, 
  TrendingUp, 
  Syringe, 
  Scale,
  AlertTriangle,
  MoreVertical,
  Eye
} from "lucide-react";
import { analyzeCorralConsanguinity, Animal as ConsanguinityAnimal } from "@/lib/consanguinityAnalysis";
import { useCorralKPIs } from "@/hooks/useCorralKPIs";
import { cn } from "@/lib/utils";
import { ConsanguinityDetailsModal } from "@/components/corrales/ConsanguinityDetailsModal";

interface Corral {
  id: string;
  name: string;
  hectareas: number | null;
  animal_count: number;
  male_count: number;
  female_count: number;
  has_consanguinity_risk: boolean;
  risk_count: number;
  highest_severity: 'severe' | 'medium' | 'low' | null;
  vaccination_percentage?: number;
  vaccination_alerts?: number;
  avg_daily_gain?: number;
  recent_weighings_count?: number;
  last_weighing_date?: string;
  vaccination_status?: 'excellent' | 'good' | 'warning' | 'critical' | 'unknown';
  pregnancy_rate?: number;
  avg_weight?: number;
}

export function MobileCorrales() {
  const { t } = useTranslation(['corrals', 'common']);
  const { currentUser } = useSupabaseAuth();
  const { kpis: corralKPIs, loading: kpisLoading } = useCorralKPIs();
  const [corrales, setCorrales] = useState<Corral[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCorrales();
  }, [currentUser]);

  const fetchCorrales = async () => {
    if (!currentUser?.cabañaId) return;

    try {
      setLoading(true);

      // Fetch corrales with all animals, then filter active ones
      const { data: corralesData, error } = await supabase
        .from("corrales")
        .select(`
          id,
          name,
          hectareas,
          animals (
            id,
            sex,
            birth_date,
            father_id,
            mother_id,
            status
          )
        `)
        .eq("cabaña_id", currentUser.cabañaId);

      if (error) throw error;

      // Process data to include counts and consanguinity risk
      const processedCorrales = await Promise.all(corralesData?.map(async (corral: any) => {
        const allAnimals = corral.animals || [];
        // Filter only active animals for counting and analysis
        const activeAnimals = allAnimals.filter((a: any) => a.status === "activo");
        const maleCount = activeAnimals.filter((a: any) => a.sex === "Macho").length;
        const femaleCount = activeAnimals.filter((a: any) => a.sex === "Hembra").length;
        
        // Perform comprehensive consanguinity analysis (only on active animals)
        let riskCount = 0;
        let highestSeverity: 'severe' | 'medium' | 'low' | null = null;
        
        if (activeAnimals.length > 0) {
          try {
            const risks = await analyzeCorralConsanguinity(
              activeAnimals as ConsanguinityAnimal[], 
              currentUser.cabañaId
            );
            riskCount = risks.length;
            
            if (risks.length > 0) {
              // Determine highest severity
              const severityOrder = { severe: 3, medium: 2, low: 1 };
              const maxSeverity = risks.reduce((prev, curr) => 
                severityOrder[curr.severity] > severityOrder[prev.severity] ? curr : prev
              );
              highestSeverity = maxSeverity.severity;
            }
          } catch (error) {
            console.error("Error analyzing consanguinity for corral:", corral.id, error);
          }
        }

        // Merge with KPI data if available
        const kpiData = corralKPIs.find(kpi => kpi.corral_id === corral.id);

        return {
          id: corral.id,
          name: corral.name,
          hectareas: corral.hectareas,
          animal_count: activeAnimals.length, // Only count active animals
          male_count: maleCount,
          female_count: femaleCount,
          has_consanguinity_risk: riskCount > 0,
          risk_count: riskCount,
          highest_severity: highestSeverity,
          vaccination_percentage: kpiData?.vaccination_percentage,
          vaccination_alerts: kpiData?.vaccination_alerts,
          avg_daily_gain: kpiData?.avg_daily_gain,
          recent_weighings_count: kpiData?.recent_weighings_count,
          last_weighing_date: kpiData?.last_weighing_date,
          vaccination_status: kpiData?.vaccination_status,
          pregnancy_rate: kpiData?.pregnancy_rate,
          avg_weight: kpiData?.avg_weight,
        };
      }) || []);

      setCorrales(processedCorrales);
    } catch (error) {
      console.error("Error fetching corrales:", error);
    } finally {
      setLoading(false);
    }
  };

  const getOccupancyColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-amber-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-emerald-500';
  };

  const getOccupancyStatus = (percentage: number) => {
    if (percentage >= 90) return { label: 'Sobrecargado', color: 'text-red-600' };
    if (percentage >= 75) return { label: 'Casi lleno', color: 'text-amber-600' };
    if (percentage >= 50) return { label: 'Medio', color: 'text-blue-600' };
    return { label: 'Disponible', color: 'text-emerald-600' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <MobilePageHeader title={t('corrals:title', 'Corrales')} />
        <div className="p-4">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobilePageHeader 
        title={t('corrals:title', 'Corrales')}
        subtitle={`${corrales.length} corrales disponibles`}
      />

      {/* Primary Actions - Centered */}
      <div className="p-4 space-y-4">
        <div className="space-y-3">
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 border-primary/20">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-primary text-primary-foreground">
                  <ArrowRight className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Movimiento de Animales</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Mover animales entre corrales
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 border-secondary/20">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-secondary text-secondary-foreground">
                  <Plus className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg">Nuevo Corral</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Crear un nuevo corral
                  </p>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>

      {/* Corrales List */}
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Corrales Existentes</h2>
        
        {corrales.length === 0 ? (
          <EmptyState
            icon={<Home className="h-12 w-12" />}
            title="No hay corrales"
            description="Crea tu primer corral para organizar tus animales"
          />
        ) : (
          <div className="space-y-3">
            {corrales.map((corral) => {
              const corralKPI = corralKPIs.find(kpi => kpi.corral_id === corral.id);
              
              // Calculate capacity metrics (assuming 2 animals per hectare if hectareas exists)
              const estimatedCapacity = corral.hectareas ? Math.round(corral.hectareas * 2) : null;
              const occupancyPercentage = estimatedCapacity ? Math.round((corral.animal_count / estimatedCapacity) * 100) : 0;
              const occupancyStatus = getOccupancyStatus(occupancyPercentage);
              
              return (
                <Card key={corral.id} className="overflow-hidden transition-all duration-200">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-medium truncate">
                              {corral.name}
                            </CardTitle>
                            {corral.has_consanguinity_risk && (
                              <Badge variant="destructive" className="text-xs px-1 py-0">
                                <AlertTriangle className="h-3 w-3" />
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {corral.animal_count}
                            </span>
                            <span className="text-xs">{corral.male_count}M/{corral.female_count}H</span>
                            {corral.hectareas && (
                              <span className="text-xs bg-muted px-1.5 py-0.5 rounded">
                                {corral.hectareas}ha
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Quick status indicators */}
                        <div className="flex flex-col items-end gap-1">
                          {corralKPI?.vaccination_percentage !== undefined && (
                            <Badge 
                              variant={
                                corralKPI.vaccination_status === 'excellent' ? 'default' : 
                                corralKPI.vaccination_status === 'good' ? 'secondary' :
                                corralKPI.vaccination_status === 'warning' ? 'outline' : 'destructive'
                              }
                              className="text-xs px-1.5 py-0"
                            >
                              <Syringe className="h-2.5 w-2.5 mr-0.5" />
                              {corralKPI.vaccination_percentage.toFixed(0)}%
                            </Badge>
                          )}
                          
                          {estimatedCapacity && (
                            <Badge 
                              variant="outline" 
                              className={cn("text-xs px-1.5 py-0", occupancyStatus.color)}
                            >
                              {occupancyPercentage}%
                            </Badge>
                          )}
                        </div>

                        <MoreVertical className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0 pb-4">
                    {/* Capacity Bar */}
                    {estimatedCapacity && (
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Ocupación</span>
                          <span className="font-medium">
                            {corral.animal_count} / {estimatedCapacity} ({occupancyPercentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={cn("h-2 rounded-full transition-all", getOccupancyColor(occupancyPercentage))}
                            style={{ width: `${Math.min(occupancyPercentage, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {Math.max(0, estimatedCapacity - corral.animal_count)} espacios libres
                        </div>
                      </div>
                    )}

                    {/* Metrics Grid - Always visible */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {/* Health Metrics */}
                      {corralKPI && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Salud</h4>
                          <div className="space-y-1">
                            {corralKPI.vaccination_percentage !== undefined && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Vacunación</span>
                                <span className="font-medium">{corralKPI.vaccination_percentage.toFixed(0)}%</span>
                              </div>
                            )}
                            {corralKPI.vaccination_alerts > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Alertas</span>
                                <span className="font-medium text-amber-600">{corralKPI.vaccination_alerts}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Production Metrics */}
                      {corralKPI && (corralKPI.avg_daily_gain > 0 || corralKPI.avg_weight > 0) && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Producción</h4>
                          <div className="space-y-1">
                            {corralKPI.avg_daily_gain > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">GDP</span>
                                <span className="font-medium">{corralKPI.avg_daily_gain.toFixed(2)}kg/d</span>
                              </div>
                            )}
                            {corralKPI.avg_weight > 0 && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Peso prom</span>
                                <span className="font-medium">{corralKPI.avg_weight.toFixed(0)}kg</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Details Sections */}
                    <div className="space-y-2">
                      {/* Vaccination Details */}
                      {corralKPI && (
                        <div className="bg-muted/30 rounded-lg">
                          <div className="p-2 border-b border-muted/50">
                            <div className="flex items-center gap-2">
                              <Syringe className="h-3 w-3 text-primary" />
                              <span className="text-sm font-medium">Detalles de Vacunación</span>
                            </div>
                          </div>
                          <div className="p-2 space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span>Aftosa</span>
                              <div className="flex items-center gap-1">
                                <div className="w-12 bg-muted rounded-full h-1">
                                  <div className="w-3/5 bg-emerald-500 h-1 rounded-full"></div>
                                </div>
                                <span className="text-xs">12/20</span>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground block">12 de 20 animales vacunados</span>
                            
                            <div className="flex items-center justify-between">
                              <span>Brucelosis</span>
                              <div className="flex items-center gap-1">
                                <div className="w-12 bg-muted rounded-full h-1">
                                  <div className="w-1/4 bg-amber-500 h-1 rounded-full"></div>
                                </div>
                                <span className="text-xs">3/12</span>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground block">3 de 12 animales vacunados</span>
                          </div>
                        </div>
                      )}

                      {/* Pregnancy Rate Details */}
                      {corralKPI?.pregnancy_rate && corralKPI.pregnancy_rate > 0 && (
                        <div className="bg-muted/30 rounded-lg">
                          <div className="p-2 border-b border-muted/50">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-3 w-3 text-primary" />
                              <span className="text-sm font-medium">Detalles de Preñez</span>
                            </div>
                          </div>
                          <div className="p-2 space-y-1 text-xs">
                            <div className="flex items-center justify-between">
                              <span>Hembras Preñadas</span>
                              <div className="flex items-center gap-1">
                                <div className="w-12 bg-muted rounded-full h-1">
                                  <div 
                                    className="bg-pink-500 h-1 rounded-full" 
                                    style={{ width: `${corralKPI.pregnancy_rate}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs">
                                  {Math.round((corral.female_count * corralKPI.pregnancy_rate) / 100)}/{corral.female_count}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground block">
                              {corralKPI.pregnancy_rate.toFixed(1)}% de las hembras están preñadas
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Risk Indicators */}
                    {corral.has_consanguinity_risk && (
                      <Collapsible className="mt-3">
                        <CollapsibleTrigger asChild>
                          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2 cursor-pointer hover:bg-destructive/15 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-3 w-3 text-destructive" />
                                <span className="text-xs font-medium text-destructive">
                                  Riesgo de Consanguinidad
                                </span>
                              </div>
                              <ChevronDown className="h-3 w-3 text-destructive" />
                            </div>
                            <p className="text-xs text-destructive/80 mt-1">
                              {corral.risk_count} animales con riesgo ({corral.highest_severity})
                            </p>
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <ConsanguinityDetailsModal corralId={corral.id} />
                        </CollapsibleContent>
                      </Collapsible>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <Button variant="outline" size="sm" className="flex-1 text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        Ver
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-xs">
                        <Activity className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileCorrales;