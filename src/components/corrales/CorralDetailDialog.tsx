import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Users, MapPin, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnimalAssignmentDialog } from "./AnimalAssignmentDialog";

interface Animal {
  id: string;
  name: string;
  id_tag: string;
  sex: string;
  breed: string;
  birth_date: string;
  father_id: string;
  mother_id: string;
}

interface ConsanguinityRisk {
  male_name: string;
  female_name: string;
  risk_percentage: number;
}

interface CorralDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  corralId: string | null;
  onUpdate: () => void;
}

export function CorralDetailDialog({ open, onOpenChange, corralId, onUpdate }: CorralDetailDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [corral, setCorral] = useState<any>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [consanguinityRisks, setConsanguinityRisks] = useState<ConsanguinityRisk[]>([]);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);

  useEffect(() => {
    if (open && corralId) {
      fetchCorralData();
    }
  }, [open, corralId]);

  const fetchCorralData = async () => {
    if (!corralId) return;

    try {
      setLoading(true);

      // Fetch corral details
      const { data: corralData, error: corralError } = await supabase
        .from("corrales")
        .select("*")
        .eq("id", corralId)
        .single();

      if (corralError) throw corralError;

      // Fetch animals in this corral
      const { data: animalsData, error: animalsError } = await supabase
        .from("animals")
        .select("id, name, id_tag, sex, breed, birth_date, father_id, mother_id")
        .eq("corral_id", corralId);

      if (animalsError) throw animalsError;

      setCorral(corralData);
      setAnimals(animalsData || []);

      // Calculate consanguinity risks
      const risks = calculateConsanguinityRisks(animalsData || []);
      setConsanguinityRisks(risks);

    } catch (error) {
      console.error("Error fetching corral data:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información del corral",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateConsanguinityRisks = (animals: Animal[]): ConsanguinityRisk[] => {
    const risks: ConsanguinityRisk[] = [];
    
    // Filter animals over 18 months
    const eligibleAnimals = animals.filter(animal => {
      if (!animal.birth_date) return false;
      const ageMonths = Math.floor(
        (new Date().getTime() - new Date(animal.birth_date).getTime()) / 
        (1000 * 60 * 60 * 24 * 30.44)
      );
      return ageMonths >= 18;
    });

    const males = eligibleAnimals.filter(a => a.sex === "Macho");
    const females = eligibleAnimals.filter(a => a.sex === "Hembra");

    // Check each male-female pair
    for (const male of males) {
      for (const female of females) {
        let riskPercentage = 0;

        // Check if they share the same father (half-siblings)
        if (male.father_id && female.father_id && male.father_id === female.father_id) {
          riskPercentage += 12.5; // Half-siblings sharing a father
        }

        // Check if they share the same mother (half-siblings)
        if (male.mother_id && female.mother_id && male.mother_id === female.mother_id) {
          riskPercentage += 12.5; // Half-siblings sharing a mother
        }

        // If they share both parents (full siblings)
        if (male.father_id && female.father_id && male.father_id === female.father_id &&
            male.mother_id && female.mother_id && male.mother_id === female.mother_id) {
          riskPercentage = 25; // Full siblings
        }

        // Only report risks above 6.25%
        if (riskPercentage > 6.25) {
          risks.push({
            male_name: male.name || male.id_tag || male.id,
            female_name: female.name || female.id_tag || female.id,
            risk_percentage: riskPercentage,
          });
        }
      }
    }

    return risks;
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return "—";
    const ageMonths = Math.floor(
      (new Date().getTime() - new Date(birthDate).getTime()) / 
      (1000 * 60 * 60 * 24 * 30.44)
    );
    const years = Math.floor(ageMonths / 12);
    const months = ageMonths % 12;
    return years > 0 ? `${years}a ${months}m` : `${months}m`;
  };

  const handleAssignmentSuccess = () => {
    fetchCorralData();
    onUpdate();
    setAssignmentDialogOpen(false);
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!corral) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MapPin className="h-5 w-5" />
            <span>{corral.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Corral Info */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{animals.length}</p>
                <p className="text-sm text-muted-foreground">Total Animales</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-lg font-semibold mb-2">
                  {animals.filter(a => a.sex === "Macho").length} / {animals.filter(a => a.sex === "Hembra").length}
                </div>
                <p className="text-sm text-muted-foreground">Machos / Hembras</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{corral.hectareas || "—"}</p>
                <p className="text-sm text-muted-foreground">Hectáreas</p>
              </CardContent>
            </Card>
          </div>

          {/* Consanguinity Alerts */}
          {consanguinityRisks.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <span>Alertas de Consanguinidad</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {consanguinityRisks.map((risk, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">
                          {risk.male_name} × {risk.female_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Riesgo de consanguinidad: {risk.risk_percentage}%
                        </p>
                      </div>
                      <Badge variant={risk.risk_percentage > 12.5 ? "destructive" : "secondary"}>
                        {risk.risk_percentage > 12.5 ? "Alto Riesgo" : "Riesgo Moderado"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Animals List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Animales en el Corral</CardTitle>
              <Button onClick={() => setAssignmentDialogOpen(true)}>
                Asignar Animales
              </Button>
            </CardHeader>
            <CardContent>
              {animals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay animales asignados a este corral
                </p>
              ) : (
                <div className="space-y-2">
                  {animals.map((animal) => (
                    <div key={animal.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div>
                          <p className="font-medium">{animal.name || animal.id_tag || animal.id}</p>
                          <p className="text-sm text-muted-foreground">
                            {animal.breed} • {animal.sex}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{calculateAge(animal.birth_date)}</p>
                        <p className="text-xs text-muted-foreground">
                          {animal.id_tag && `#${animal.id_tag}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <AnimalAssignmentDialog
          open={assignmentDialogOpen}
          onOpenChange={setAssignmentDialogOpen}
          corralId={corralId}
          onSuccess={handleAssignmentSuccess}
        />
      </DialogContent>
    </Dialog>
  );
}