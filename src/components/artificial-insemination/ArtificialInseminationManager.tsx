import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Heart, Plus, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { AnimalSelector } from "../activities/AnimalSelector";
import { useHybridAuth } from "@/hooks/useHybridAuth";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";

export function ArtificialInseminationManager() {
  const { currentUser } = useHybridAuth();
  const { toast } = useToast();
  
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [bulls, setBulls] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  
  // Form data
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [bullSource, setBullSource] = useState<"catalog" | "manual">("catalog");
  const [selectedBullId, setSelectedBullId] = useState<string>("");
  const [manualBullName, setManualBullName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  useEffect(() => {
    loadBulls();
  }, [currentUser?.cabañaId]);

  const loadBulls = async () => {
    if (!currentUser?.cabañaId) return;
    
    try {
      const { data, error } = await supabase
        .from('bulls')
        .select('*')
        .eq('cabaña_id', currentUser.cabañaId)
        .order('name');
      
      if (error) throw error;
      setBulls(data || []);
    } catch (error) {
      console.error("Error loading bulls:", error);
    }
  };

  // Eligibility filter for AI - only active females ≥ 15 months, not pregnant
  const aiEligibilityFilter = (animal: any): boolean => {
    if (animal.status && animal.status !== 'activo') return false;
    if (animal.sex !== 'Hembra') return false;
    const ageInMonths = animal.ageInMonths || 0;
    if (ageInMonths < 15) return false;
    if (animal.esta_preñada) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!date || selectedAnimals.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Complete todos los campos requeridos"
      });
      return;
    }

    const bullName = bullSource === "catalog" 
      ? bulls.find(b => b.id === selectedBullId)?.name 
      : manualBullName;

    if (!bullName) {
      toast({
        variant: "destructive",
        title: "Error", 
        description: "Debe especificar un toro"
      });
      return;
    }

    try {
      setSubmitting(true);
      
      // Create event and IA records (simplified for demo)
      const { error } = await supabase
        .from('eventos')
        .insert({
          cabaña_id: currentUser?.cabañaId,
          tipo: 'ia',
          fecha: date,
          creado_por: currentUser?.id,
          notas: notes || `IA: ${bullName} - ${selectedAnimals.length} hembras`,
          payload: {
            bull_name: bullName,
            bull_id: selectedBullId || null,
            animal_count: selectedAnimals.length
          }
        });
      
      if (error) throw error;
      
      toast({
        title: "IA registrada",
        description: `Se registró la IA para ${selectedAnimals.length} hembras`
      });
      
      // Reset form
      setSelectedAnimals([]);
      setSelectedBullId("");
      setManualBullName("");
      setNotes("");
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar la IA"
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
            <Heart className="h-5 w-5 text-red-500" />
            Inseminación Artificial
          </h3>
          <p className="text-muted-foreground">
            Registro de servicios reproductivos con selección masiva
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva Inseminación Artificial</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="date">Fecha *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label>Toro *</Label>
            <div className="flex gap-4">
              <Button
                type="button"
                variant={bullSource === "catalog" ? "default" : "outline"}
                onClick={() => setBullSource("catalog")}
              >
                Catálogo
              </Button>
              <Button
                type="button"
                variant={bullSource === "manual" ? "default" : "outline"}
                onClick={() => setBullSource("manual")}
              >
                Manual
              </Button>
            </div>

            {bullSource === "catalog" ? (
              <Select value={selectedBullId} onValueChange={setSelectedBullId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione un toro" />
                </SelectTrigger>
                <SelectContent>
                  {bulls.map(bull => (
                    <SelectItem key={bull.id} value={bull.id}>
                      {bull.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                value={manualBullName}
                onChange={(e) => setManualBullName(e.target.value)}
                placeholder="Nombre del toro"
              />
            )}
          </div>

          <div>
            <Label htmlFor="notes">Observaciones</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones..."
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selección de Hembras</CardTitle>
        </CardHeader>
        <CardContent>
          <AnimalSelector
            eligibilityFilter={aiEligibilityFilter}
            selectedAnimals={selectedAnimals}
            onSelectionChange={setSelectedAnimals}
            title="Seleccionar Hembras para IA"
            description="Solo hembras activas ≥ 15 meses y no preñadas"
            trigger={
              <Button variant="outline" className="w-full">
                <Heart className="h-4 w-4 mr-2" />
                {selectedAnimals.length > 0 
                  ? `${selectedAnimals.length} hembras seleccionadas`
                  : "Seleccionar hembras para inseminar"
                }
              </Button>
            }
          />
        </CardContent>
      </Card>

      {selectedAnimals.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Button 
              onClick={handleSubmit} 
              className="w-full" 
              disabled={submitting}
            >
              {submitting ? "Registrando..." : "Registrar Inseminación Artificial"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}