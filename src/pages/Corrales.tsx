import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye, Plus, AlertTriangle, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateCorralDialog } from "@/components/corrales/CreateCorralDialog";
import { CorralDetailDialog } from "@/components/corrales/CorralDetailDialog";
import { EditCorralDialog } from "@/components/corrales/EditCorralDialog";

interface Corral {
  id: string;
  name: string;
  hectareas: number | null;
  animal_count: number;
  male_count: number;
  female_count: number;
  has_consanguinity_risk: boolean;
}

export default function Corrales() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [corrales, setCorrales] = useState<Corral[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCorral, setSelectedCorral] = useState<string | null>(null);

  const fetchCorrales = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Get user's cabaña_id
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!userData?.cabaña_id) return;

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
        .eq("cabana_id", userData.cabaña_id);

      if (error) throw error;

      // Process data to include counts and consanguinity risk
      const processedCorrales = corralesData?.map((corral: any) => {
        const animals = corral.animals || [];
        const maleCount = animals.filter((a: any) => a.sex === "Macho").length;
        const femaleCount = animals.filter((a: any) => a.sex === "Hembra").length;
        
        // Check for consanguinity risk (animals > 18 months)
        const eligibleAnimals = animals.filter((animal: any) => {
          if (!animal.birth_date) return false;
          const ageMonths = Math.floor(
            (new Date().getTime() - new Date(animal.birth_date).getTime()) / 
            (1000 * 60 * 60 * 24 * 30.44)
          );
          return ageMonths >= 18;
        });

        const hasRisk = checkConsanguinityRisk(eligibleAnimals);

        return {
          id: corral.id,
          name: corral.name,
          hectareas: corral.hectareas,
          animal_count: animals.length,
          male_count: maleCount,
          female_count: femaleCount,
          has_consanguinity_risk: hasRisk,
        };
      }) || [];

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

  // Simplified consanguinity check (to be enhanced with actual genealogy logic)
  const checkConsanguinityRisk = (animals: any[]) => {
    const males = animals.filter(a => a.sex === "Macho");
    const females = animals.filter(a => a.sex === "Hembra");
    
    // Check if any male-female pair shares parents (simplified check)
    for (const male of males) {
      for (const female of females) {
        if (male.father_id && female.father_id && male.father_id === female.father_id) {
          return true; // Siblings
        }
        if (male.mother_id && female.mother_id && male.mother_id === female.mother_id) {
          return true; // Siblings
        }
      }
    }
    return false;
  };

  useEffect(() => {
    fetchCorrales();
  }, [user]);

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
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando corrales...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Corrales</h1>
          <p className="text-muted-foreground">Gestiona los corrales y asignación de animales</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Corral
        </Button>
      </div>

      <div className="grid gap-4">
        {corrales.map((corral) => (
          <Card key={corral.id}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <h3 className="text-lg font-semibold">{corral.name}</h3>
                  </div>
                  
                  {corral.has_consanguinity_risk && (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Riesgo Consanguinidad
                    </Badge>
                  )}
                </div>

                <div className="flex items-center space-x-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{corral.animal_count}</p>
                    <p className="text-sm text-muted-foreground">Animales</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-lg font-semibold">
                      {corral.male_count} / {corral.female_count}
                    </p>
                    <p className="text-sm text-muted-foreground">M / H</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-lg font-semibold">
                      {corral.hectareas || "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">Hectáreas</p>
                  </div>

                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => openEditDialog(corral.id)}
                    >
                      Editar
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => openDetailDialog(corral.id)}
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
            <CardContent className="p-8 text-center">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay corrales</h3>
              <p className="text-muted-foreground mb-4">
                Crea tu primer corral para comenzar a gestionar los animales
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
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
    </div>
  );
}