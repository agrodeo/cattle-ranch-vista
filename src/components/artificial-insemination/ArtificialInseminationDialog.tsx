import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon, ChevronDown, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Animal {
  id: string;
  name: string;
  id_tag: string;
  corral_id?: string;
}

interface Bull {
  id: string;
  name: string;
  id_tag?: string;
  breed?: string;
  registration_level?: string;
  official_registration_number?: string;
  insemination_center?: string;
  nationality?: string;
  owner?: string;
  genetic_health_observations?: string;
  color?: string;
  is_genotyped?: boolean;
  internal_code?: string;
}

interface ArtificialInseminationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAnimals: Animal[];
  onSuccess: () => void;
}

export function ArtificialInseminationDialog({
  open,
  onOpenChange,
  selectedAnimals,
  onSuccess,
}: ArtificialInseminationDialogProps) {
  const [date, setDate] = useState<Date>();
  const [bullName, setBullName] = useState("");
  const [bullId, setBullId] = useState("");
  const [isPregnant, setIsPregnant] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bulls, setBulls] = useState<Bull[]>([]);
  const [showBullDetails, setShowBullDetails] = useState(false);
  
  // Bull detail fields
  const [bullBreed, setBullBreed] = useState("");
  const [bullRegistrationLevel, setBullRegistrationLevel] = useState("");
  const [bullOfficialNumber, setBullOfficialNumber] = useState("");
  const [bullInseminationCenter, setBullInseminationCenter] = useState("");
  const [bullNationality, setBullNationality] = useState("");
  const [bullOwner, setBullOwner] = useState("");
  const [bullGeneticObservations, setBullGeneticObservations] = useState("");
  const [bullColor, setBullColor] = useState("");
  const [bullIsGenotyped, setBullIsGenotyped] = useState<string>("");
  const [bullInternalCode, setBullInternalCode] = useState("");
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      fetchBulls();
    }
  }, [open]);

  const fetchBulls = async () => {
    try {
      // First try to get from bulls table
      const { data: bullsData, error: bullsError } = await supabase
        .from("bulls")
        .select("*");

      if (bullsError) throw bullsError;

      // Also get male animals as potential bulls
      const { data: animalsData, error: animalsError } = await supabase
        .from("animals")
        .select("id, name, id_tag")
        .eq("sex", "Macho")
        .not("name", "is", null);

      if (animalsError) throw animalsError;

      // Combine both sources, giving preference to detailed bulls
      const combinedBulls = [
        ...(bullsData || []),
        ...(animalsData || []).filter(animal => 
          !bullsData?.some(bull => bull.name === animal.name)
        )
      ];

      setBulls(combinedBulls);
    } catch (error) {
      console.error("Error fetching bulls:", error);
    }
  };

  const handleSubmit = async () => {
    if (!date || !bullName || selectedAnimals.length === 0) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (!userData?.cabaña_id) {
        throw new Error("Usuario sin cabaña asignada");
      }

      let finalBullId = bullId;

      // Save or update bull details if provided
      if (showBullDetails && (bullBreed || bullRegistrationLevel || bullOfficialNumber || 
          bullInseminationCenter || bullNationality || bullOwner || bullGeneticObservations || 
          bullColor || bullIsGenotyped || bullInternalCode)) {
        
        const bullData = {
          name: bullName,
          breed: bullBreed || null,
          registration_level: bullRegistrationLevel || null,
          official_registration_number: bullOfficialNumber || null,
          insemination_center: bullInseminationCenter || null,
          nationality: bullNationality || null,
          owner: bullOwner || null,
          genetic_health_observations: bullGeneticObservations || null,
          color: bullColor || null,
          is_genotyped: bullIsGenotyped === "yes" ? true : bullIsGenotyped === "no" ? false : null,
          internal_code: bullInternalCode || null,
          cabaña_id: userData.cabaña_id,
          created_by: user?.id,
        };

        if (bullId && bulls.find(b => b.id === bullId)) {
          // Update existing bull
          const { error: bullError } = await supabase
            .from("bulls")
            .update(bullData)
            .eq("id", bullId);
          if (bullError) throw bullError;
        } else {
          // Create new bull
          const { data: newBull, error: bullError } = await supabase
            .from("bulls")
            .insert(bullData)
            .select()
            .single();
          if (bullError) throw bullError;
          finalBullId = newBull.id;
        }
      }

      const inseminations = selectedAnimals.map((animal) => ({
        female_id: animal.id,
        insemination_date: date.toISOString().split('T')[0],
        bull_name: bullName,
        bull_id: finalBullId || null,
        is_pregnant: isPregnant === "yes" ? true : isPregnant === "no" ? false : null,
        notes: notes || null,
        cabaña_id: userData.cabaña_id,
        created_by: user?.id,
      }));

      const { error } = await supabase
        .from("artificial_inseminations")
        .insert(inseminations);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Inseminación artificial registrada para ${selectedAnimals.length} animal(es)`,
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("Error saving insemination:", error);
      toast({
        title: "Error",
        description: "Error al registrar la inseminación artificial",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setDate(undefined);
    setBullName("");
    setBullId("");
    setIsPregnant("");
    setNotes("");
    setShowBullDetails(false);
    
    // Reset bull detail fields
    setBullBreed("");
    setBullRegistrationLevel("");
    setBullOfficialNumber("");
    setBullInseminationCenter("");
    setBullNationality("");
    setBullOwner("");
    setBullGeneticObservations("");
    setBullColor("");
    setBullIsGenotyped("");
    setBullInternalCode("");
  };

  const handleBullSelect = (value: string) => {
    if (value === "manual") {
      setBullId("");
      setBullName("");
      // Reset bull details
      setBullBreed("");
      setBullRegistrationLevel("");
      setBullOfficialNumber("");
      setBullInseminationCenter("");
      setBullNationality("");
      setBullOwner("");
      setBullGeneticObservations("");
      setBullColor("");
      setBullIsGenotyped("");
      setBullInternalCode("");
    } else {
      const selectedBull = bulls.find(bull => bull.id === value);
      if (selectedBull) {
        setBullId(selectedBull.id);
        setBullName(selectedBull.name || selectedBull.id_tag || "");
        
        // Auto-fill existing bull details if available
        setBullBreed(selectedBull.breed || "");
        setBullRegistrationLevel(selectedBull.registration_level || "");
        setBullOfficialNumber(selectedBull.official_registration_number || "");
        setBullInseminationCenter(selectedBull.insemination_center || "");
        setBullNationality(selectedBull.nationality || "");
        setBullOwner(selectedBull.owner || "");
        setBullGeneticObservations(selectedBull.genetic_health_observations || "");
        setBullColor(selectedBull.color || "");
        setBullIsGenotyped(selectedBull.is_genotyped === true ? "yes" : selectedBull.is_genotyped === false ? "no" : "");
        setBullInternalCode(selectedBull.internal_code || "");
        
        // Show details section if bull has additional info
        if (selectedBull.breed || selectedBull.registration_level || selectedBull.official_registration_number) {
          setShowBullDetails(true);
        }
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            Registrar Inseminación Artificial
            {selectedAnimals.length > 1 && ` (${selectedAnimals.length} animales)`}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Fecha *
            </Label>
            <div className="col-span-3">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "dd/MM/yyyy") : "Seleccionar fecha"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="bull" className="text-right">
              Toro *
            </Label>
            <div className="col-span-3">
              <Select onValueChange={handleBullSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar toro" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Entrada manual</SelectItem>
                  {bulls.map((bull) => (
                    <SelectItem key={bull.id} value={bull.id}>
                      {bull.name || bull.id_tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(bullId === "" || bulls.find(b => b.id === bullId) === undefined) && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="bull-name" className="text-right">
                Nombre del Toro *
              </Label>
              <Input
                id="bull-name"
                value={bullName}
                onChange={(e) => setBullName(e.target.value)}
                className="col-span-3"
                placeholder="Ej: Toro 925 - Brahman"
              />
            </div>
          )}

          {/* Bull Details Expandable Section */}
          <div className="col-span-4">
            <Collapsible open={showBullDetails} onOpenChange={setShowBullDetails}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto text-sm">
                  {showBullDetails ? (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Ocultar información del toro
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Agregar más información del toro
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4 mt-4 p-4 border rounded-lg bg-muted/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="bull-breed">Raza</Label>
                    <Input
                      id="bull-breed"
                      value={bullBreed}
                      onChange={(e) => setBullBreed(e.target.value)}
                      placeholder="Ej: Brahman, Angus"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bull-registration">Registro</Label>
                    <Select value={bullRegistrationLevel} onValueChange={setBullRegistrationLevel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar nivel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="advanced">Avanzado</SelectItem>
                        <SelectItem value="definitive">Definitivo</SelectItem>
                        <SelectItem value="controlled">Controlado</SelectItem>
                        <SelectItem value="none">Sin Registro</SelectItem>
                        <SelectItem value="appendix">Apéndice</SelectItem>
                        <SelectItem value="preparatory">Preparatorio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bull-official-number">Número de Registro Oficial</Label>
                    <Input
                      id="bull-official-number"
                      value={bullOfficialNumber}
                      onChange={(e) => setBullOfficialNumber(e.target.value)}
                      placeholder="Ej: BR-12345"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bull-center">Centro de Inseminación</Label>
                    <Input
                      id="bull-center"
                      value={bullInseminationCenter}
                      onChange={(e) => setBullInseminationCenter(e.target.value)}
                      placeholder="Ej: ABS Global, Semex"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bull-nationality">Nacionalidad del Toro</Label>
                    <Input
                      id="bull-nationality"
                      value={bullNationality}
                      onChange={(e) => setBullNationality(e.target.value)}
                      placeholder="Ej: Argentina, Brasil, USA"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bull-owner">Propietario del Toro</Label>
                    <Input
                      id="bull-owner"
                      value={bullOwner}
                      onChange={(e) => setBullOwner(e.target.value)}
                      placeholder="Nombre del propietario"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bull-color">Color</Label>
                    <Input
                      id="bull-color"
                      value={bullColor}
                      onChange={(e) => setBullColor(e.target.value)}
                      placeholder="Ej: Colorado, Negro, Bayo"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bull-genotyped">¿Está genotipado?</Label>
                    <Select value={bullIsGenotyped} onValueChange={setBullIsGenotyped}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Sí</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bull-internal-code">Código interno de la cabaña</Label>
                    <Input
                      id="bull-internal-code"
                      value={bullInternalCode}
                      onChange={(e) => setBullInternalCode(e.target.value)}
                      placeholder="Código interno"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="bull-observations">Observaciones genéticas o sanitarias</Label>
                  <Textarea
                    id="bull-observations"
                    value={bullGeneticObservations}
                    onChange={(e) => setBullGeneticObservations(e.target.value)}
                    placeholder="Información adicional sobre genética, sanidad, etc."
                    rows={3}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pregnant" className="text-right">
              ¿Quedó preñada?
            </Label>
            <div className="col-span-3">
              <Select value={isPregnant} onValueChange={setIsPregnant}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="yes">Sí</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right">
              Observaciones
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="col-span-3"
              placeholder="Comentarios adicionales..."
            />
          </div>

          {selectedAnimals.length > 0 && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right">Animales:</Label>
              <div className="col-span-3 max-h-32 overflow-y-auto">
                {selectedAnimals.map((animal) => (
                  <div key={animal.id} className="text-sm text-muted-foreground">
                    {animal.name || animal.id_tag}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}