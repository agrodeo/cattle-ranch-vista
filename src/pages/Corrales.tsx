import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Plus, AlertTriangle, MapPin, Move } from "lucide-react";
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

  if (loading) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500 mx-auto mb-4"></div>
            <p className="text-ink-600">Cargando corrales...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink-900 truncate">Corrales</h1>
          <p className="text-sm sm:text-base text-ink-600 mt-1">Gestiona los corrales y asignación de animales</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <Button 
            variant="outline" 
            onClick={() => setMoveDialogOpen(true)}
            className="w-full sm:w-auto justify-center h-10 px-4"
          >
            <Move className="h-4 w-4 mr-2" />
            <span className="sm:inline">Mover Animales</span>
          </Button>
          <Button 
            onClick={() => setCreateDialogOpen(true)}
            className="w-full sm:w-auto justify-center h-10 px-4"
          >
            <Plus className="h-4 w-4 mr-2" />
            <span className="sm:inline">Nuevo Corral</span>
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:gap-4">
        {corrales.map((corral) => (
          <Card key={corral.id} className="overflow-hidden">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <MapPin className="h-5 w-5 text-ink-500 flex-shrink-0" />
                    <h3 className="text-lg font-semibold text-ink-900 truncate">{corral.name}</h3>
                  </div>
                  
                  {corral.has_consanguinity_risk && (
                    <div className="flex-shrink-0">
                      {getSeverityBadge(corral.highest_severity, corral.risk_count)}
                    </div>
                  )}
                </div>

                {/* Stats Section */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div className="text-center min-w-[60px]">
                    <p className="text-xl sm:text-2xl font-bold text-ink-900 tabular-nums">{corral.animal_count}</p>
                    <p className="text-xs sm:text-sm text-ink-600">Animales</p>
                  </div>
                  
                  <div className="text-center min-w-[50px]">
                    <p className="text-base sm:text-lg font-semibold text-ink-900 tabular-nums">
                      {corral.male_count} / {corral.female_count}
                    </p>
                    <p className="text-xs sm:text-sm text-ink-600">M / H</p>
                  </div>
                  
                  <div className="text-center min-w-[60px]">
                    <p className="text-base sm:text-lg font-semibold text-ink-900 tabular-nums">
                      {corral.hectareas || "—"}
                    </p>
                    <p className="text-xs sm:text-sm text-ink-600">Hectáreas</p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto lg:ml-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditDialog(corral.id)}
                      className="w-full sm:w-auto h-9 text-sm"
                    >
                      Editar
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => openDetailDialog(corral.id)}
                      className="w-full sm:w-auto h-9 text-sm"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalles
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {corrales.length === 0 && (
          <Card>
            <CardContent className="p-6 sm:p-8 text-center">
              <MapPin className="h-10 w-10 sm:h-12 sm:w-12 text-ink-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-ink-900">No hay corrales</h3>
              <p className="text-sm sm:text-base text-ink-600 mb-4 max-w-sm mx-auto">
                Crea tu primer corral para comenzar a gestionar los animales
              </p>
              <Button 
                onClick={() => setCreateDialogOpen(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                Crear Primer Corral
              </Button>
            </CardContent>
          </Card>
        )}
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