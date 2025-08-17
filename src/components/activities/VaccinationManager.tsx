import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Syringe, Plus, Calendar, AlertTriangle, CheckCircle, Shield, Info } from "lucide-react";
import { useLocationAwareVaccination } from "@/hooks/useLocationAwareVaccination";
import { AnimalSelector } from "./AnimalSelector";
import { useHybridAuth } from "@/hooks/useHybridAuth";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

interface VaccineOption {
  code: string;
  name: string;
  mandatory?: boolean;
  category?: string;
  description?: string;
}

export function VaccinationManager() {
  const { currentUser } = useHybridAuth();
  const { 
    rules, 
    herdSettings, 
    getAvailableVaccines, 
    recordVaccination 
  } = useLocationAwareVaccination();
  const { toast } = useToast();
  
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [availableVaccines, setAvailableVaccines] = useState<VaccineOption[]>([]);
  const [selectedVaccine, setSelectedVaccine] = useState<string>("");
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [lot, setLot] = useState<string>("");
  const [dose, setDose] = useState<string>("");
  const [route, setRoute] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadVaccines();
  }, [rules]);

  const loadVaccines = async () => {
    try {
      const vaccines = await getAvailableVaccines();
      const processedVaccines = vaccines.map((v: any) => ({
        code: v.code,
        name: v.name,
        mandatory: rules.some(r => r.vaccine_code === v.code && r.mandatory)
      }));
      setAvailableVaccines(processedVaccines);
    } catch (error) {
      console.error("Error loading vaccines:", error);
    }
  };

  const vaccinationEligibilityFilter = (animal: any): boolean => {
    return !animal.status || animal.status === 'activo';
  };

  const handleSubmit = async () => {
    if (!selectedVaccine || selectedAnimals.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Seleccione una vacuna y al menos un animal"
      });
      return;
    }

    try {
      setSubmitting(true);
      const promises = selectedAnimals.map(animalId => 
        recordVaccination(animalId, selectedVaccine, new Date(date), lot, dose, route)
      );
      await Promise.all(promises);
      
      toast({
        title: "Vacunación registrada",
        description: `Se registró la vacunación para ${selectedAnimals.length} animales`
      });
      
      setSelectedAnimals([]);
      setSelectedVaccine("");
      setLot("");
      setDose("");
      setRoute("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la vacunación"
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Syringe className="h-5 w-5" />
            Gestión de Vacunación
          </h3>
          <p className="text-muted-foreground">
            Control sanitario con reglas de cumplimiento por ubicación
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva Vacunación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Fecha</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="vaccine">Vacuna</Label>
              <Select value={selectedVaccine} onValueChange={setSelectedVaccine}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una vacuna" />
                </SelectTrigger>
                <SelectContent>
                  {availableVaccines.map(vaccine => (
                    <SelectItem key={vaccine.code} value={vaccine.code}>
                      <div className="flex items-center gap-2">
                        <span>{vaccine.name}</span>
                        {vaccine.mandatory && (
                          <Badge variant="destructive" className="text-xs">
                            Obligatoria
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="lot">Lote</Label>
              <Input
                id="lot"
                value={lot}
                onChange={(e) => setLot(e.target.value)}
                placeholder="Número de lote"
              />
            </div>
            <div>
              <Label htmlFor="dose">Dosis</Label>
              <Input
                id="dose"
                value={dose}
                onChange={(e) => setDose(e.target.value)}
                placeholder="ej. 2ml"
              />
            </div>
            <div>
              <Label htmlFor="route">Vía</Label>
              <Select value={route} onValueChange={setRoute}>
                <SelectTrigger>
                  <SelectValue placeholder="Vía de administración" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subcutanea">Subcutánea</SelectItem>
                  <SelectItem value="intramuscular">Intramuscular</SelectItem>
                  <SelectItem value="intranasal">Intranasal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <AnimalSelector
            eligibilityFilter={vaccinationEligibilityFilter}
            selectedAnimals={selectedAnimals}
            onSelectionChange={setSelectedAnimals}
            title="Seleccionar Animales para Vacunación"
            trigger={
              <Button variant="outline" className="w-full">
                <Syringe className="h-4 w-4 mr-2" />
                {selectedAnimals.length > 0 
                  ? `${selectedAnimals.length} animales seleccionados`
                  : "Seleccionar animales para vacunar"
                }
              </Button>
            }
          />

          <Button 
            onClick={handleSubmit} 
            className="w-full" 
            disabled={submitting || !selectedVaccine || selectedAnimals.length === 0}
          >
            {submitting ? "Registrando..." : "Registrar Vacunación"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}