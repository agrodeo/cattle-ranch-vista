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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, Users, MapPin, Calendar, Filter, Move, Info, Syringe } from "lucide-react";
import { CorralHealthCard } from "./CorralHealthCard";
import { CorralProductionCard } from "./CorralProductionCard";
import { useCorralKPIs } from "@/hooks/useCorralKPIs";
import { useToast } from "@/hooks/use-toast";
import { AnimalAssignmentDialog } from "./AnimalAssignmentDialog";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";
import { 
  analyzeCorralConsanguinity, 
  RelationshipRisk, 
  getSeverityDisplay,
  Animal as ConsanguinityAnimal 
} from "@/lib/consanguinityAnalysis";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { cleanupInactiveAnimalsFromCorrals } from "@/lib/animalCleanup";
interface Animal {
  id: string;
  name: string;
  id_tag: string;
  sex: string;
  breed: string;
  birth_date: string;
  father_id: string;
  mother_id: string;
  status: string;
  corral_id: string;
}

interface CorralDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  corralId: string | null;
  onUpdate: () => void;
}

export function CorralDetailDialog({ open, onOpenChange, corralId, onUpdate }: CorralDetailDialogProps) {
  const { toast } = useToast();
  const { currentUser } = useSupabaseAuth();
  const { kpis } = useCorralKPIs();
  const { requirements } = useVaccinationRequirements();
  const [loading, setLoading] = useState(true);
  const [corral, setCorral] = useState<any>(null);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [relationshipRisks, setRelationshipRisks] = useState<RelationshipRisk[]>([]);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'severe' | 'medium' | 'low'>('all');
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [userCabañaId, setUserCabañaId] = useState<string>('');
  const [vaccinationDetails, setVaccinationDetails] = useState<Record<string, { vaccinated: number; total: number }>>({});
  
  // Get current corral KPIs
  const currentCorralKPI = kpis.find(kpi => kpi.corral_id === corralId);

  useEffect(() => {
    if (open && corralId && currentUser) {
      console.log('📋 [CorralDetail] Opening with corralId:', corralId);
      console.log('📋 [CorralDetail] Available requirements:', requirements);
      fetchCorralData();
    }
  }, [open, corralId, currentUser, requirements]);

  const fetchCorralData = async () => {
    if (!corralId) return;

    try {
      setLoading(true);

      // Get user's cabaña_id from hybrid auth
      if (!currentUser?.cabañaId) return;
      setUserCabañaId(currentUser.cabañaId);

      // Fetch corral details
      const { data: corralData, error: corralError } = await supabase
        .from("corrales")
        .select("*")
        .eq("id", corralId)
        .single();

      if (corralError) throw corralError;

      // Cleanup inactive animals from corrals first
      await cleanupInactiveAnimalsFromCorrals(currentUser.cabañaId);

      // Fetch active animals in this corral
      const { data: animalsData, error: animalsError } = await supabase
        .from("animals")
        .select("id, name, id_tag, sex, breed, birth_date, father_id, mother_id, status, corral_id")
        .eq("corral_id", corralId)
        .neq("status", "vendido")
        .neq("status", "muerto")
        .neq("status", "Vendido")
        .neq("status", "Muerto");

      if (animalsError) throw animalsError;

      setCorral(corralData);
      setAnimals(animalsData || []);

      // Calculate vaccination details for all configured vaccines
      if (animalsData && animalsData.length > 0) {
        const vacDetails: Record<string, { vaccinated: number; total: number }> = {};
        
        for (const animal of animalsData) {
          // Get vaccination status for this animal
          const { data: statusData } = await supabase
            .rpc('calculate_vaccination_status' as any, {
              _animal_id: animal.id,
              _cabana_id: currentUser.cabañaId
            });

          if (statusData) {
            for (const status of statusData) {
              if (!vacDetails[status.vaccine_code]) {
                vacDetails[status.vaccine_code] = { vaccinated: 0, total: animalsData.length };
              }
              if (status.status === 'completa' || status.compliance_percentage > 0) {
                vacDetails[status.vaccine_code].vaccinated += 1;
              }
            }
          }
        }
        
        setVaccinationDetails(vacDetails);

        // Perform comprehensive consanguinity analysis
        const risks = await analyzeCorralConsanguinity(
          animalsData as ConsanguinityAnimal[], 
          currentUser.cabañaId
        );
        setRelationshipRisks(risks);
      } else {
        setRelationshipRisks([]);
        setVaccinationDetails({});
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

  const getRelationshipExplanation = (risk: RelationshipRisk) => {
    const animal1Name = risk.animal1.name || risk.animal1.id_tag || risk.animal1.id;
    const animal2Name = risk.animal2.name || risk.animal2.id_tag || risk.animal2.id;
    
    return {
      what: "La consanguinidad se refiere a la reproducción entre animales que comparten ancestros comunes.",
      why: `Este apareamiento es riesgoso porque ${animal1Name} y ${animal2Name} ${risk.description.toLowerCase()}`,
      coefficient: risk.inbreedingCoefficient 
        ? `Un coeficiente del ${(risk.inbreedingCoefficient * 100).toFixed(1)}% indica ${risk.inbreedingCoefficient > 0.25 ? 'un riesgo muy alto' : risk.inbreedingCoefficient > 0.125 ? 'un riesgo alto' : 'un riesgo moderado'} de problemas genéticos en la descendencia.`
        : "Sin coeficiente calculado disponible.",
      action: "Se recomienda mover uno de los animales a otro corral o evitar que se apareen para mantener la diversidad genética del rebaño."
    };
  };

  const handleAnimalClick = (animalId: string) => {
    // This could open an animal detail dialog or navigate to animal profile
    toast({
      title: "Perfil del Animal",
      description: "Funcionalidad de perfil del animal próximamente disponible",
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

          {/* Health and Production KPIs */}
          {currentCorralKPI && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <CorralHealthCard corral={currentCorralKPI} />
              <CorralProductionCard corral={currentCorralKPI} />
            </div>
          )}

          {/* Vaccination Details - All configured vaccines */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Syringe className="h-5 w-5" />
                Detalle de Vacunación
              </CardTitle>
            </CardHeader>
            <CardContent>
              {requirements.length > 0 ? (
                <div className="space-y-3">
                  {requirements.map((req) => {
                    const detail = vaccinationDetails[req.vaccine_code] || { vaccinated: 0, total: animals.length };
                    const percentage = detail.total > 0 ? Math.round((detail.vaccinated / detail.total) * 100) : 0;
                    
                    return (
                      <div key={req.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{req.vaccine_name}</span>
                            {req.is_mandatory && (
                              <Badge variant="secondary" className="text-xs">Obligatoria</Badge>
                            )}
                          </div>
                          {req.description && (
                            <p className="text-xs text-muted-foreground mt-1">{req.description}</p>
                          )}
                          {req.sex_restriction && req.sex_restriction !== 'Ambos' && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Aplica a: {req.sex_restriction}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="text-sm font-semibold">
                              {detail.vaccinated} / {detail.total}
                            </p>
                            <p className="text-xs text-muted-foreground">animales</p>
                          </div>
                          <Badge 
                            variant={percentage >= 80 ? "default" : percentage >= 50 ? "secondary" : "destructive"}
                            className="min-w-[60px] justify-center"
                          >
                            {percentage}%
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">
                  No hay vacunas configuradas. Configura las vacunas en Configuración.
                </p>
              )}
            </CardContent>
          </Card>

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
                <div className="space-y-4">
                  {filteredRisks.map((risk, index) => {
                    const display = getSeverityDisplay(risk.severity);
                    const animal1Name = risk.animal1.name || risk.animal1.id_tag || risk.animal1.id;
                    const animal2Name = risk.animal2.name || risk.animal2.id_tag || risk.animal2.id;
                    const explanation = getRelationshipExplanation(risk);
                    
                    return (
                      <div key={index} className="p-6 border rounded-lg bg-muted/30 shadow-sm space-y-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4 flex-1">
                            <span className="text-3xl">{display.emoji}</span>
                            <div className="space-y-3 flex-1">
                              <div className="flex items-center space-x-3">
                                <p className="font-semibold text-lg">
                                  ⚠️ Riesgo de consanguinidad detectado
                                </p>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                      <Info className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-80 p-4">
                                    <div className="space-y-3">
                                      <div>
                                        <h4 className="font-semibold text-sm mb-1">¿Qué es la consanguinidad?</h4>
                                        <p className="text-xs text-muted-foreground">{explanation.what}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-sm mb-1">¿Por qué es riesgoso?</h4>
                                        <p className="text-xs text-muted-foreground">{explanation.why}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-sm mb-1">Coeficiente de endogamia</h4>
                                        <p className="text-xs text-muted-foreground">{explanation.coefficient}</p>
                                      </div>
                                      <div>
                                        <h4 className="font-semibold text-sm mb-1">Acción recomendada</h4>
                                        <p className="text-xs text-muted-foreground">{explanation.action}</p>
                                      </div>
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>
                              
                              <div className="space-y-2">
                                <p className="text-sm">
                                  Animales involucrados: 
                                  <button 
                                    onClick={() => handleAnimalClick(risk.animal1.id)}
                                    className="ml-2 text-primary hover:text-primary/80 underline font-medium"
                                  >
                                    {animal1Name}
                                  </button>
                                  <span className="mx-2">y</span>
                                  <button 
                                    onClick={() => handleAnimalClick(risk.animal2.id)}
                                    className="text-primary hover:text-primary/80 underline font-medium"
                                  >
                                    {animal2Name}
                                  </button>
                                </p>
                                
                                <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground mt-3">
                                  <div>
                                    <p className="font-medium">{animal1Name}</p>
                                    <p>Edad: {calculateAge(risk.animal1.birth_date)}</p>
                                    <p>Estado: {(risk.animal1 as any).status || 'Sin especificar'}</p>
                                  </div>
                                  <div>
                                    <p className="font-medium">{animal2Name}</p>
                                    <p>Edad: {calculateAge(risk.animal2.birth_date)}</p>
                                    <p>Estado: {(risk.animal2 as any).status || 'Sin especificar'}</p>
                                  </div>
                                </div>
                                
                                <p className="text-sm text-muted-foreground mt-2">
                                  {risk.description}
                                </p>
                                
                                {risk.inbreedingCoefficient && (
                                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                                    <strong>Coeficiente de endogamia:</strong> {(risk.inbreedingCoefficient * 100).toFixed(1)}%
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-4">
                            <Badge 
                              variant={risk.severity === 'severe' ? 'destructive' : risk.severity === 'medium' ? 'secondary' : 'outline'} 
                              className={`${risk.severity === 'severe' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : display.color} font-medium`}
                            >
                              {display.label}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleMoveAnimal(risk.animal1.id, risk.animal2.id)}
                              className="hover:bg-muted"
                            >
                              <Move className="h-3 w-3 mr-1" />
                              Mover
                            </Button>
                          </div>
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