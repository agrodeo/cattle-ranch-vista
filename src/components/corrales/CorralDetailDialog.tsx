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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Users, MapPin, Calendar, Filter, Move } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AnimalAssignmentDialog } from "./AnimalAssignmentDialog";
import { 
  analyzeCorralConsanguinity, 
  RelationshipRisk, 
  getSeverityDisplay,
  Animal as ConsanguinityAnimal 
} from "@/lib/consanguinityAnalysis";
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
  const [relationshipRisks, setRelationshipRisks] = useState<RelationshipRisk[]>([]);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'severe' | 'medium' | 'low'>('all');
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [userCabañaId, setUserCabañaId] = useState<string>('');

  useEffect(() => {
    if (open && corralId) {
      fetchCorralData();
    }
  }, [open, corralId]);

  const fetchCorralData = async () => {
    if (!corralId) return;

    try {
      setLoading(true);

      // Get user's cabaña_id first
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!userData?.cabaña_id) return;
      setUserCabañaId(userData.cabaña_id);

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

      // Perform comprehensive consanguinity analysis
      if (animalsData && animalsData.length > 0) {
        const risks = await analyzeCorralConsanguinity(
          animalsData as ConsanguinityAnimal[], 
          userData.cabaña_id
        );
        setRelationshipRisks(risks);
      } else {
        setRelationshipRisks([]);
      }

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

  const filteredRisks = relationshipRisks.filter(risk => 
    severityFilter === 'all' || risk.severity === severityFilter
  );

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

  const handleMoveAnimal = async (animal1Id: string, animal2Id: string) => {
    // Move one of the animals to remove the risk
    // For now, we'll just show a toast - this could be enhanced with actual move functionality
    toast({
      title: "Sugerencia",
      description: "Considere mover uno de los animales a otro corral para reducir el riesgo de consanguinidad",
    });
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
          {filteredRisks.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <span>Alertas de Consanguinidad Detectadas</span>
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4" />
                    <Select value={severityFilter} onValueChange={(value: any) => setSeverityFilter(value)}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="severe">🔴 Alto</SelectItem>
                        <SelectItem value="medium">🟠 Medio</SelectItem>
                        <SelectItem value="low">🟡 Bajo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredRisks.map((risk, index) => {
                    const display = getSeverityDisplay(risk.severity);
                    const animal1Name = risk.animal1.name || risk.animal1.id_tag || risk.animal1.id;
                    const animal2Name = risk.animal2.name || risk.animal2.id_tag || risk.animal2.id;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{display.emoji}</span>
                          <div>
                            <p className="font-medium">
                              ⚠️ Riesgo de consanguinidad entre {animal1Name} y {animal2Name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {risk.description}
                            </p>
                            {risk.inbreedingCoefficient && (
                              <p className="text-xs text-muted-foreground">
                                Coeficiente de endogamia: {(risk.inbreedingCoefficient * 100).toFixed(1)}%
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={risk.severity === 'severe' ? 'destructive' : risk.severity === 'medium' ? 'secondary' : 'outline'} className={display.color}>
                            {display.label}
                          </Badge>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleMoveAnimal(risk.animal1.id, risk.animal2.id)}
                          >
                            <Move className="h-3 w-3 mr-1" />
                            Mover
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {relationshipRisks.length > filteredRisks.length && (
                  <p className="text-sm text-muted-foreground mt-3">
                    Mostrando {filteredRisks.length} de {relationshipRisks.length} riesgos detectados
                  </p>
                )}
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
                  {animals.map((animal) => {
                    // Check if this animal is involved in any risk
                    const involvedRisks = relationshipRisks.filter(risk => 
                      risk.animal1.id === animal.id || risk.animal2.id === animal.id
                    );
                    const highestSeverity = involvedRisks.length > 0 ? 
                      involvedRisks.reduce((prev, curr) => {
                        const severityOrder = { severe: 3, medium: 2, low: 1 };
                        return severityOrder[curr.severity] > severityOrder[prev.severity] ? curr : prev;
                      }) : null;

                    return (
                      <div key={animal.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            {highestSeverity && (
                              <span className="text-lg">
                                {getSeverityDisplay(highestSeverity.severity).emoji}
                              </span>
                            )}
                            <div>
                              <p className="font-medium">{animal.name || animal.id_tag || animal.id}</p>
                              <p className="text-sm text-muted-foreground">
                                {animal.breed} • {animal.sex}
                                {involvedRisks.length > 0 && (
                                  <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                                    {involvedRisks.length} riesgo(s)
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{calculateAge(animal.birth_date)}</p>
                          <p className="text-xs text-muted-foreground">
                            {animal.id_tag && `#${animal.id_tag}`}
                          </p>
                        </div>
                      </div>
                    );
                  })}
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