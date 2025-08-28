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
import { Eye, Plus, AlertTriangle, MapPin, Move, Users, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateCorralDialog } from "@/components/corrales/CreateCorralDialog";
import { CorralDetailDialog } from "@/components/corrales/CorralDetailDialog";
import { EditCorralDialog } from "@/components/corrales/EditCorralDialog";
import { MoveAnimalDialog } from "@/components/corrales/MoveAnimalDialog";
import { analyzeCorralConsanguinity, Animal as ConsanguinityAnimal } from "@/lib/consanguinityAnalysis";

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
}

export default function Corrales() {
  const { currentUser } = useSupabaseAuth();
  const { toast } = useToast();
  const [corrales, setCorrales] = useState<Corral[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedCorral, setSelectedCorral] = useState<string | null>(null);

  const fetchCorrales = async () => {
    if (!currentUser?.cabañaId) return;

    try {
      setLoading(true);

      // Fetch corrales with animal counts and consanguinity data
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
            mother_id
          )
        `)
        .eq("cabaña_id", currentUser.cabañaId);

      if (error) throw error;

      // Process data to include counts and consanguinity risk
      const processedCorrales = await Promise.all(corralesData?.map(async (corral: any) => {
        const animals = corral.animals || [];
        const maleCount = animals.filter((a: any) => a.sex === "Macho").length;
        const femaleCount = animals.filter((a: any) => a.sex === "Hembra").length;
        
        // Perform comprehensive consanguinity analysis
        let riskCount = 0;
        let highestSeverity: 'severe' | 'medium' | 'low' | null = null;
        
        if (animals.length > 0) {
          try {
            const risks = await analyzeCorralConsanguinity(
              animals as ConsanguinityAnimal[], 
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

        return {
          id: corral.id,
          name: corral.name,
          hectareas: corral.hectareas,
          animal_count: animals.length,
          male_count: maleCount,
          female_count: femaleCount,
          has_consanguinity_risk: riskCount > 0,
          risk_count: riskCount,
          highest_severity: highestSeverity,
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
      title: "Riesgos Activos",
      value: totalRisks,
      icon: AlertTriangle,
    },
    {
      title: "Hectáreas",
      value: totalHectareas || "—",
      icon: TrendingUp,
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
            <Button 
              onClick={() => setCreateDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Corral
            </Button>
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
                <Button 
                  onClick={() => setCreateDialogOpen(true)}
                  className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo
                </Button>
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
                  {corrales.map((corral) => (
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
                          </div>
                          <div className="flex items-center gap-4 text-sm text-slate-600">
                            <span>{corral.animal_count} animales</span>
                            <span>{corral.male_count}M / {corral.female_count}H</span>
                            {corral.hectareas && <span>{corral.hectareas} ha</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openDetailDialog(corral.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
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
    </div>
  );
}