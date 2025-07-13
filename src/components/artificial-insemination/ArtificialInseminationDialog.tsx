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
  horn_status?: string; // For Braford genetics
  coat_color?: string; // For Brangus/Angus genetics
  scrotal_circumference?: number;
  birth_weight?: number;
  weaning_weight?: number;
  final_weight?: number;
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
  
  // Genetic fields specific to breed
  const [bullHornStatus, setBullHornStatus] = useState(""); // For Braford
  const [bullCoatColor, setBullCoatColor] = useState(""); // For Brangus/Angus
  const [bullScrotalCircumference, setBullScrotalCircumference] = useState("");
  const [bullBirthWeight, setBullBirthWeight] = useState("");
  const [bullWeaningWeight, setBullWeaningWeight] = useState("");
  const [bullFinalWeight, setBullFinalWeight] = useState("");
  
  // Validation states
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (open) {
      fetchBulls();
      validateSelectedAnimals();
    }
  }, [open, selectedAnimals]);

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

  const validateSelectedAnimals = async () => {
    if (selectedAnimals.length === 0) return;

    try {
      const animalIds = selectedAnimals.map(animal => animal.id);
      const { data: animalsData, error } = await supabase
        .from("animals")
        .select("id, name, id_tag, birth_date, status")
        .in("id", animalIds);

      if (error) throw error;

      const errors: string[] = [];
      
      animalsData.forEach(animal => {
        const name = animal.name || animal.id_tag || animal.id;
        
        // Check if animal is dead or sold
        if (animal.status === "muerto" || animal.status === "vendido") {
          errors.push(`${name}: Animal ${animal.status}`);
        }
        
        // Check if animal is already pregnant (removing this validation for now due to column name issues)
        // if (animal.resultado_preñez === "preñada") {
        //   errors.push(`${name}: Animal ya preñada`);
        // }
        
        // Check age (must be at least 15 months)
        if (animal.birth_date) {
          const birthDate = new Date(animal.birth_date);
          const ageMonths = Math.floor(
            (Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
          );
          if (ageMonths < 15) {
            errors.push(`${name}: Menor de 15 meses (${ageMonths} meses)`);
          }
        }
      });

      setValidationErrors(errors);
    } catch (error) {
      console.error("Error validating animals:", error);
    }
  };

  const getGeneticPrediction = () => {
    if (!bullBreed) return null;

    const breed = bullBreed.toLowerCase();
    
    if (breed.includes("braford") && bullHornStatus === "mocho_homocigota") {
      return "📌 Genética esperada: Cría 100% mocha (por mocho homocigota).";
    }
    
    if ((breed.includes("brangus") || breed.includes("angus"))) {
      if (bullCoatColor === "negro_homocigota") {
        return "📌 Genética esperada: Cría 100% negra (por negro homocigota).";
      }
      if (bullCoatColor === "colorado_homocigota") {
        return "📌 Genética esperada: Cría 100% colorada (por colorado homocigota).";
      }
    }
    
    return null;
  };

  const shouldShowBrafordFields = () => {
    return bullBreed.toLowerCase().includes("braford");
  };

  const shouldShowAngusFields = () => {
    const breed = bullBreed.toLowerCase();
    return breed.includes("brangus") || breed.includes("angus");
  }

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
          bullColor || bullIsGenotyped || bullInternalCode || bullHornStatus || bullCoatColor ||
          bullScrotalCircumference || bullBirthWeight || bullWeaningWeight || bullFinalWeight)) {
        
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
          horn_status: bullHornStatus || null,
          coat_color: bullCoatColor || null,
          scrotal_circumference: bullScrotalCircumference ? parseFloat(bullScrotalCircumference) : null,
          birth_weight: bullBirthWeight ? parseFloat(bullBirthWeight) : null,
          weaning_weight: bullWeaningWeight ? parseFloat(bullWeaningWeight) : null,
          final_weight: bullFinalWeight ? parseFloat(bullFinalWeight) : null,
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
    
    // Reset genetic fields
    setBullHornStatus("");
    setBullCoatColor("");
    setBullScrotalCircumference("");
    setBullBirthWeight("");
    setBullWeaningWeight("");
    setBullFinalWeight("");
    
    // Reset validation errors
    setValidationErrors([]);
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
      setBullHornStatus("");
      setBullCoatColor("");
      setBullScrotalCircumference("");
      setBullBirthWeight("");
      setBullWeaningWeight("");
      setBullFinalWeight("");
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
        
        // Auto-fill genetic fields
        setBullHornStatus(selectedBull.horn_status || "");
        setBullCoatColor(selectedBull.coat_color || "");
        setBullScrotalCircumference(selectedBull.scrotal_circumference?.toString() || "");
        setBullBirthWeight(selectedBull.birth_weight?.toString() || "");
        setBullWeaningWeight(selectedBull.weaning_weight?.toString() || "");
        setBullFinalWeight(selectedBull.final_weight?.toString() || "");
        
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
                
                {/* Breed-specific genetic fields */}
                {shouldShowBrafordFields() && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Características Genéticas - Braford</h4>
                    <div className="space-y-2">
                      <Label htmlFor="bull-horn-status">Estado de Cuernos</Label>
                      <Select value={bullHornStatus} onValueChange={setBullHornStatus}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="astado">Astado</SelectItem>
                          <SelectItem value="mocho">Mocho</SelectItem>
                          <SelectItem value="mocho_homocigota">Mocho Homocigota ✅</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                {shouldShowAngusFields() && (
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Características Genéticas - {bullBreed.includes("Brangus") ? "Brangus" : "Angus"}</h4>
                    <div className="space-y-2">
                      <Label htmlFor="bull-coat-color">Color</Label>
                      <Select value={bullCoatColor} onValueChange={setBullCoatColor}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar color" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="negro">Negro</SelectItem>
                          <SelectItem value="colorado">Colorado</SelectItem>
                          <SelectItem value="negro_homocigota">Negro Homocigota ✅</SelectItem>
                          <SelectItem value="colorado_homocigota">Colorado Homocigota ✅</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                {/* Common fields for all breeds */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Datos Físicos y Productivos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bull-ce">CE (Circunferencia Escrotal) cm</Label>
                      <Input
                        id="bull-ce"
                        type="number"
                        value={bullScrotalCircumference}
                        onChange={(e) => setBullScrotalCircumference(e.target.value)}
                        placeholder="Ej: 38"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bull-birth-weight">Peso al Nacer (kg)</Label>
                      <Input
                        id="bull-birth-weight"
                        type="number"
                        value={bullBirthWeight}
                        onChange={(e) => setBullBirthWeight(e.target.value)}
                        placeholder="Ej: 35"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bull-weaning-weight">Peso al Destete (kg)</Label>
                      <Input
                        id="bull-weaning-weight"
                        type="number"
                        value={bullWeaningWeight}
                        onChange={(e) => setBullWeaningWeight(e.target.value)}
                        placeholder="Ej: 205"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bull-final-weight">Peso Final (kg)</Label>
                      <Input
                        id="bull-final-weight"
                        type="number"
                        value={bullFinalWeight}
                        onChange={(e) => setBullFinalWeight(e.target.value)}
                        placeholder="Ej: 450"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Genetic prediction alert */}
                {getGeneticPrediction() && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-800">{getGeneticPrediction()}</p>
                  </div>
                )}
                
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

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="col-span-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 className="text-sm font-medium text-red-800 mb-2">Animales con problemas:</h4>
                <ul className="text-sm text-red-700 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

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
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || validationErrors.length > 0}
          >
            {isLoading ? "Guardando..." : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}