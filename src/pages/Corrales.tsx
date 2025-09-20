import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { BadgePill } from "@/components/ui/badge-pill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Plus, AlertTriangle, MapPin, Move, Users, TrendingUp, MoreVertical, Edit, Trash2, Shuffle, Truck, Syringe, Scale } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateCorralDialog } from "@/components/corrales/CreateCorralDialog";
import { CorralDetailDialog } from "@/components/corrales/CorralDetailDialog";
import { EditCorralDialog } from "@/components/corrales/EditCorralDialog";
import { MoveAnimalDialog } from "@/components/corrales/MoveAnimalDialog";
import { DeleteCorralDialog } from "@/components/corrales/DeleteCorralDialog";
import { CorralOptimizationWizard } from "@/components/corrales/CorralOptimizationWizard";
import { BulkMoveDialog } from "@/components/breeding/BulkMoveDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { analyzeCorralConsanguinity, Animal as ConsanguinityAnimal } from "@/lib/consanguinityAnalysis";
import { ReadOnlyProtectedAction } from "@/components/subscription/ReadOnlyProtectedAction";
import { useCorralKPIs } from "@/hooks/useCorralKPIs";

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

export default function Corrales() {
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();
  const { kpis: corralKPIs, loading: kpisLoading } = useCorralKPIs();
  const [corrales, setCorrales] = useState<Corral[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [showCorralOptimization, setShowCorralOptimization] = useState(false);
  const [showBulkMove, setShowBulkMove] = useState(false);
  const [selectedCorral, setSelectedCorral] = useState<string | null>(null);
  const [selectedCorralName, setSelectedCorralName] = useState<string>("");
  const [selectedCorralAnimalCount, setSelectedCorralAnimalCount] = useState<number>(0);

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
      toast({
        title: "Error",
        description: "No se pudieron cargar los corrales",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: 'severe' | 'medium' | 'low' | null, riskCount: number) => {
    if (!severity || riskCount === 0) return null;
    
    const severityConfig = {
      severe: { emoji: '🔴', label: 'Alto Riesgo', variant: 'destructive' as const },
      medium: { emoji: '🟠', label: 'Riesgo Medio', variant: 'secondary' as const },
      low: { emoji: '🟡', label: 'Riesgo Bajo', variant: 'outline' as const }
    };
    
    const config = severityConfig[severity];
    return (
      <Badge variant={config.variant} className="flex items-center space-x-1">
        <span>{config.emoji}</span>
        <span>{config.label} ({riskCount})</span>
      </Badge>
    );
  };

  useEffect(() => {
    fetchCorrales();
  }, [currentUser]);

  const handleCreateSuccess = () => {
    fetchCorrales();
    setCreateDialogOpen(false);
  };

  const handleEditSuccess = () => {
    fetchCorrales();
    setEditDialogOpen(false);
  };

  const openDetailDialog = (corralId: string) => {
    setSelectedCorral(corralId);
    setDetailDialogOpen(true);
  };

  const openEditDialog = (corralId: string) => {
    setSelectedCorral(corralId);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (corralId: string, corralName: string, animalCount: number) => {
    setSelectedCorral(corralId);
    setSelectedCorralName(corralName);
    setSelectedCorralAnimalCount(animalCount);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSuccess = () => {
    fetchCorrales();
    setDeleteDialogOpen(false);
  };

  useEffect(() => {
    document.title = "Corrales | AgroDeo";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Gestiona corrales y asignación de animales");
  }, []);

  // Calculate metrics
  const totalAnimals = corrales.reduce((sum, corral) => sum + corral.animal_count, 0);
  const totalCorrales = corrales.length;
  const totalRisks = corrales.reduce((sum, corral) => sum + corral.risk_count, 0);
  const totalHectareas = corrales.reduce((sum, corral) => sum + (corral.hectareas || 0), 0);
  
  // Calculate aggregate KPIs
  const avgVaccinationPercentage = corrales.length > 0 
    ? corrales.reduce((sum, corral) => sum + (corral.vaccination_percentage || 0), 0) / corrales.length 
    : 0;
  const avgGDP = corrales.length > 0 
    ? corrales.reduce((sum, corral) => sum + (corral.avg_daily_gain || 0), 0) / corrales.length 
    : 0;

  const stats = [
    {
      title: "Total Corrales",
      value: totalCorrales,
      icon: MapPin,
    },
    {
      title: "Total Animales",
      value: totalAnimals,
      icon: Users,
    },
    {
      title: "% Vacunación Promedio",
      value: `${avgVaccinationPercentage.toFixed(1)}%`,
      icon: Syringe,
    },
    {
      title: "GDP Promedio",
      value: `${avgGDP.toFixed(3)} kg/día`,
      icon: Scale,
    },
  ];

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-slate-600">Cargando corrales...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
      <div className="space-y-3">
        <PageHeader 
          title="Corrales"
          subtitle="Gestiona los corrales y asignación de animales"
          action={
            <div className="flex gap-2">
              <Button
                onClick={() => setShowBulkMove(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Truck className="h-4 w-4" />
                Mover en Masa
              </Button>
              <Button
                onClick={() => setShowCorralOptimization(true)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Shuffle className="h-4 w-4" />
                Optimizar Corrales
              </Button>
              <Button 
                variant="outline"
                onClick={() => setMoveDialogOpen(true)}
              >
                <Move className="h-4 w-4 mr-2" />
                Mover Animales
              </Button>
              <ReadOnlyProtectedAction>
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Corral
                </Button>
              </ReadOnlyProtectedAction>
            </div>
          }
        />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-6">
          {/* Main Content */}
          <section className="lg:col-span-2 space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((stat, index) => (
                <MetricCard
                  key={index}
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                />
              ))}
            </div>

            {/* Sticky Action Bar for Mobile */}
            <StickyActionBar>
              <div className="flex gap-2 w-full">
                <Button 
                  variant="outline"
                  onClick={() => setMoveDialogOpen(true)}
                  className="flex-1 h-11"
                >
                  <Move className="h-4 w-4 mr-1" />
                  Mover
                </Button>
                <ReadOnlyProtectedAction>
                  <Button 
                    onClick={() => setCreateDialogOpen(true)}
                    className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Nuevo
                  </Button>
                </ReadOnlyProtectedAction>
              </div>
            </StickyActionBar>

            {/* Corrales List */}
            <SectionCard
              title="Lista de Corrales"
              subtitle="Gestiona la distribución de animales"
              count={corrales.length}
            >
              {corrales.length === 0 ? (
                <EmptyState
                  icon={<MapPin className="h-12 w-12" />}
                  title="No hay corrales"
                  description="Crea tu primer corral para comenzar a gestionar los animales"
                  action={{
                    label: "Crear Primer Corral",
                    onClick: () => setCreateDialogOpen(true)
                  }}
                />
              ) : (
                <div className="space-y-3">
                  {corrales.map((corral) => {
                    // Get specific KPIs for this corral
                    const corralKPI = corralKPIs.find(kpi => kpi.corral_id === corral.id);
                    
                    return (
                      <div key={corral.id} className="rounded-lg border border-slate-200 p-4 bg-white">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="h-4 w-4 text-slate-600" />
                              <h3 className="text-sm font-medium text-slate-900 truncate">{corral.name}</h3>
                              {corral.has_consanguinity_risk && (
                                <BadgePill variant="danger" className="ml-2">
                                  {corral.risk_count} riesgos
                                </BadgePill>
                              )}
                              {/* Vaccination Status Badge for this specific corral */}
                              {corralKPI?.vaccination_percentage !== undefined && (
                                <BadgePill 
                                  variant={
                                    corralKPI.vaccination_status === 'excellent' ? 'success' : 
                                    corralKPI.vaccination_status === 'good' ? 'info' :
                                    corralKPI.vaccination_status === 'warning' ? 'warning' : 'danger'
                                  }
                                  className="ml-1"
                                >
                                  <Syringe className="h-3 w-3 mr-1" />
                                  {corralKPI.vaccination_percentage.toFixed(0)}%
                                </BadgePill>
                              )}
                              {/* GDP Badge for this specific corral */}
                              {corralKPI?.avg_daily_gain !== undefined && corralKPI.avg_daily_gain > 0 && (
                                <BadgePill variant="info" className="ml-1">
                                  <Scale className="h-3 w-3 mr-1" />
                                  {corralKPI.avg_daily_gain.toFixed(2)} kg/día
                                </BadgePill>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-slate-600">
                              <span>{corral.animal_count} animales</span>
                              <span>{corral.male_count}M / {corral.female_count}H</span>
                              {corral.hectareas && <span>{corral.hectareas} ha</span>}
                              {/* Show specific metrics for this corral */}
                              {corralKPI?.avg_weight && corralKPI.avg_weight > 0 && (
                                <span className="text-blue-600 font-medium">
                                  ⚖️ {corralKPI.avg_weight.toFixed(0)} kg prom
                                </span>
                              )}
                              {corralKPI?.pregnancy_rate && corralKPI.pregnancy_rate > 0 && (
                                <span className={`font-medium ${corralKPI.pregnancy_rate >= 70 ? 'text-green-600' : corralKPI.pregnancy_rate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                  {corralKPI.pregnancy_rate.toFixed(0)}% preñez
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="bg-background border shadow-md">
                                <DropdownMenuItem 
                                  onClick={() => openDetailDialog(corral.id)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ver Detalles
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => openEditDialog(corral.id)}
                                  className="cursor-pointer"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => openDeleteDialog(corral.id, corral.name, corral.animal_count)}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                  disabled={corral.animal_count > 0}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Eliminar
                                  {corral.animal_count > 0 && " (tiene animales)"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SectionCard>
          </section>

          {/* Right Sidebar */}
          <aside className="space-y-4">
            <SectionCard
              title="Alertas de Riesgo"
              subtitle="Monitoreo de consanguinidad"
              count={totalRisks}
            >
              {totalRisks > 0 ? (
                <div className="space-y-3">
                  {corrales
                    .filter(corral => corral.has_consanguinity_risk)
                    .map((corral) => (
                      <div key={corral.id} className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {corral.name}
                          </p>
                          <p className="text-xs text-slate-500">{corral.risk_count} riesgos detectados</p>
                        </div>
                        <BadgePill variant="danger" className="ml-2">
                          {corral.highest_severity === 'severe' ? 'Alto' : 
                           corral.highest_severity === 'medium' ? 'Medio' : 'Bajo'}
                        </BadgePill>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <AlertTriangle className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No hay riesgos detectados</p>
                </div>
              )}
            </SectionCard>
          </aside>
        </div>
      </div>

      <CreateCorralDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleCreateSuccess}
      />

      <EditCorralDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        corralId={selectedCorral}
        onSuccess={handleEditSuccess}
      />

      <CorralDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        corralId={selectedCorral}
        onUpdate={fetchCorrales}
      />

      <MoveAnimalDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        onSuccess={fetchCorrales}
      />

      <DeleteCorralDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        corralId={selectedCorral}
        corralName={selectedCorralName}
        animalCount={selectedCorralAnimalCount}
        onSuccess={handleDeleteSuccess}
      />

      <CorralOptimizationWizard
        isOpen={showCorralOptimization}
        onClose={() => setShowCorralOptimization(false)}
        cabanaId={currentUser?.cabañaId || ''}
      />

      <BulkMoveDialog
        isOpen={showBulkMove}
        onClose={() => setShowBulkMove(false)}
        cabanaId={currentUser?.cabañaId || ''}
      />
    </div>
  );
}