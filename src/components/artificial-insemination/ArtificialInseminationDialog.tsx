import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

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
  const { t } = useTranslation(['activities', 'common']);
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
  const { currentUser } = useSupabaseAuth();

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
    // Since animals are pre-filtered in the manager, we only need basic validation here
    const errors: string[] = [];
    setValidationErrors(errors);
  };

  const getGeneticPrediction = () => {
    if (!bullBreed) return null;
    
    if (bullBreed === "Braford" && bullHornStatus === "mocho_homocigota") {
      return `📌 ${t('activities:artificialInsemination.geneticPrediction', { 
        prediction: t('activities:artificialInsemination.prediction100Polled'), 
        reason: t('activities:artificialInsemination.reasonPolledHomozygous') 
      })}`;
    }
    
    if (bullBreed === "Brangus" || bullBreed === "Angus") {
      if (bullCoatColor === "negro_homocigota") {
        return `📌 ${t('activities:artificialInsemination.geneticPrediction', { 
          prediction: t('activities:artificialInsemination.prediction100Black'), 
          reason: t('activities:artificialInsemination.reasonBlackHomozygous') 
        })}`;
      }
      if (bullCoatColor === "colorado_homocigota") {
        return `📌 ${t('activities:artificialInsemination.geneticPrediction', { 
          prediction: t('activities:artificialInsemination.prediction100Red'), 
          reason: t('activities:artificialInsemination.reasonRedHomozygous') 
        })}`;
      }
    }
    
    return null;
  };

  const shouldShowBrafordFields = () => {
    return bullBreed === "Braford";
  };

  const shouldShowAngusFields = () => {
    return bullBreed === "Brangus" || bullBreed === "Angus";
  };

  const handleSubmit = async () => {
    console.log("🚀 Iniciando handleSubmit");
    console.log("📋 Datos del formulario:", {
      date,
      bullName,
      selectedAnimals: selectedAnimals.length,
      isPregnant,
      notes
    });

    if (!date || !bullName || selectedAnimals.length === 0) {
      console.log("❌ Validación fallida:", { date: !!date, bullName: !!bullName, animalsCount: selectedAnimals.length });
      toast({
        title: t('activities:artificialInsemination.errorTitle'),
        description: t('activities:artificialInsemination.completeRequiredFields'),
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      console.log("🔍 Obteniendo cabaña_id del usuario...");
      if (!currentUser?.cabañaId) {
        throw new Error("No se encontró el ID de la cabaña");
      }

      console.log("✅ Cabaña ID obtenido:", currentUser.cabañaId);
      
      let finalBullId = null; // Initialize as null

      // Only use bull_id if the selected bull exists in the animals table (not bulls table)
      if (bullId && bulls.find(b => b.id === bullId && !b.breed)) {
        // This means it's an animal (male) from the animals table, not from bulls table
        finalBullId = bullId;
        console.log("✅ Usando toro existente de animals:", bullId);
      } else {
        console.log("🔄 Entrada manual o toro de tabla bulls - bull_id será null");
      }

      // Save bull details in the bulls table (separate from the foreign key reference)
      if (showBullDetails && (bullBreed || bullRegistrationLevel || bullOfficialNumber || 
          bullInseminationCenter || bullNationality || bullOwner || bullGeneticObservations || 
          bullColor || bullIsGenotyped || bullInternalCode || bullHornStatus || bullCoatColor ||
          bullScrotalCircumference || bullBirthWeight || bullWeaningWeight || bullFinalWeight)) {
        
        console.log("🐂 Guardando detalles del toro en tabla bulls...");
        
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
        cabaña_id: currentUser.cabañaId,
          created_by: currentUser?.id,
        };

        console.log("📝 Datos del toro a guardar en bulls:", bullData);

        // Always create new entry in bulls table for detailed information
        const { data: newBull, error: bullError } = await supabase
          .from("bulls")
          .insert(bullData)
          .select()
          .single();
        
        if (bullError) {
          console.error("❌ Error creando registro en bulls:", bullError);
          throw bullError;
        }
        
        console.log("✅ Toro guardado en tabla bulls:", newBull);
        // Note: We don't use this ID for the foreign key in artificial_inseminations
      }

      console.log("💉 Preparando datos de inseminación...");
      const inseminations = selectedAnimals.map((animal) => ({
        female_id: animal.id,
        insemination_date: date.toISOString().split('T')[0],
        bull_name: bullName,
        bull_id: finalBullId, // Will be null for manual entry or bulls from bulls table
        is_pregnant: isPregnant === "yes" ? true : isPregnant === "no" ? false : null,
        notes: notes || null,
        cabaña_id: currentUser.cabañaId,
        created_by: currentUser?.id,
      }));

      console.log("📊 Datos de inseminación a insertar:", inseminations);
      console.log("🔑 bull_id final:", finalBullId);

      const { error: insertError } = await supabase
        .from("artificial_inseminations")
        .insert(inseminations);

      if (insertError) {
        console.error("❌ Error insertando inseminaciones:", insertError);
        throw insertError;
      }

      console.log("✅ Inseminaciones registradas exitosamente");

      toast({
        title: t('activities:artificialInsemination.successTitle'),
        description: t('activities:artificialInsemination.successDescription', { count: selectedAnimals.length }),
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error("💥 Error completo en handleSubmit:", error);
      console.error("💥 Error message:", error.message);
      console.error("💥 Error details:", JSON.stringify(error, null, 2));
      toast({
        title: t('activities:artificialInsemination.errorTitle'),
        description: `${t('activities:artificialInsemination.errorDescription')}: ${error.message || 'Error desconocido'}`,
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
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {t('activities:artificialInsemination.registerTitle')}
            {selectedAnimals.length > 1 && ` (${selectedAnimals.length} ${t('common:common.animals')})`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Validation Messages */}
          {validationErrors.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
              <h4 className="text-sm font-semibold text-red-800 mb-3">⚠️ {t('activities:artificialInsemination.validationProblems')}</h4>
              <ul className="text-sm text-red-700 space-y-2">
                {validationErrors.map((error, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-500 mt-0.5 text-xs">•</span>
                    <span>{error}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Show message if no valid animals */}
          {selectedAnimals.length > 0 && validationErrors.length === selectedAnimals.length && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium">
                ❌ {t('activities:artificialInsemination.noAnimalsAvailable')}
              </p>
              <p className="text-xs text-yellow-700 mt-1">
                {t('activities:artificialInsemination.allHaveRestrictions')}
              </p>
            </div>
          )}

          {/* Valid Animals List */}
          {selectedAnimals.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-medium">{t('activities:artificialInsemination.animalsToInseminate')}</Label>
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg max-h-24 overflow-y-auto">
                <div className="space-y-1">
                  {selectedAnimals.map((animal) => (
                    <div key={animal.id} className="text-sm text-green-800">
                      ✓ {animal.name || animal.id_tag}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Date Field */}
          <div className="space-y-3">
            <Label htmlFor="date" className="text-base font-medium">
              {t('activities:artificialInsemination.dateLabel')}
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal text-base h-11",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-3 h-4 w-4" />
                  {date ? format(date, "dd/MM/yyyy") : t('activities:artificialInsemination.selectDate')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Bull Selection */}
          <div className="space-y-3">
            <Label htmlFor="bull" className="text-base font-medium">
              {t('activities:artificialInsemination.bullLabel')}
            </Label>
            <Select onValueChange={handleBullSelect}>
              <SelectTrigger className="w-full text-base h-11">
                <SelectValue placeholder={t('activities:artificialInsemination.selectBull')} />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="manual">✏️ {t('activities:artificialInsemination.manualEntry')}</SelectItem>
                {bulls.map((bull) => (
                  <SelectItem key={bull.id} value={bull.id}>
                    {bull.name || bull.id_tag} {bull.breed && `(${bull.breed})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Manual Bull Name Entry */}
          {(bullId === "" || bulls.find(b => b.id === bullId) === undefined) && (
            <div className="space-y-3">
              <Label htmlFor="bull-name" className="text-base font-medium">
                {t('activities:artificialInsemination.bullName')} *
              </Label>
              <Input
                id="bull-name"
                value={bullName}
                onChange={(e) => setBullName(e.target.value)}
                className="w-full text-base h-11"
                placeholder={t('activities:artificialInsemination.bullNamePlaceholder')}
              />
            </div>
          )}

          {/* Bull Details Expandable Section */}
          <div className="space-y-3">
            <Collapsible open={showBullDetails} onOpenChange={setShowBullDetails}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-center gap-2 text-base h-11"
                >
                  {showBullDetails ? (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      {t('common:common.hide')} {t('activities:artificialInsemination.bullDetails').toLowerCase()}
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      {t('activities:artificialInsemination.addBullDetails')}
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-6 mt-4 p-6 border border-border rounded-lg bg-muted/30 animate-accordion-down">
                <h3 className="text-lg font-semibold border-b pb-2">{t('activities:artificialInsemination.bullDetails')}</h3>
                
                {/* Basic Information */}
                  <div className="space-y-4">
                  <h4 className="text-base font-medium">Información Básica</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bull-breed" className="text-sm font-medium">Raza *</Label>
                      <Select value={bullBreed} onValueChange={setBullBreed}>
                        <SelectTrigger className="text-base h-10">
                          <SelectValue placeholder="Seleccionar raza del toro" />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          <SelectItem value="Braford">Braford</SelectItem>
                          <SelectItem value="Brangus">Brangus</SelectItem>
                          <SelectItem value="Angus">Angus</SelectItem>
                          <SelectItem value="Brahman">Brahman</SelectItem>
                          <SelectItem value="Hereford">Hereford</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bull-registration" className="text-sm font-medium">Registro Racial</Label>
                      <Select value={bullRegistrationLevel} onValueChange={setBullRegistrationLevel}>
                        <SelectTrigger className="text-base h-10">
                          <SelectValue placeholder="Seleccionar nivel de registro" />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
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
                      <Label htmlFor="bull-official-number" className="text-sm font-medium">Número de Registro Oficial</Label>
                      <Input
                        id="bull-official-number"
                        value={bullOfficialNumber}
                        onChange={(e) => setBullOfficialNumber(e.target.value)}
                        placeholder="Ej: BR-12345"
                        className="text-base h-10"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Breed-specific genetic fields */}
                {shouldShowBrafordFields() && (
                  <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h4 className="text-base font-medium text-blue-800">🐂 Características Genéticas - Braford</h4>
                    <div className="space-y-2">
                      <Label htmlFor="bull-horn-status" className="text-sm font-medium">Estado de Cuernos</Label>
                      <Select value={bullHornStatus} onValueChange={setBullHornStatus}>
                        <SelectTrigger className="text-base h-10">
                          <SelectValue placeholder="Seleccionar estado de cuernos" />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          <SelectItem value="astado">Astado</SelectItem>
                          <SelectItem value="mocho">Mocho</SelectItem>
                          <SelectItem value="mocho_homocigota">Mocho Homocigota ✅</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                {shouldShowAngusFields() && (
                  <div className="space-y-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="text-base font-medium text-purple-800">🐮 Características Genéticas - {bullBreed.includes("Brangus") ? "Brangus" : "Angus"}</h4>
                    <div className="space-y-2">
                      <Label htmlFor="bull-coat-color" className="text-sm font-medium">Color del Pelaje</Label>
                      <Select value={bullCoatColor} onValueChange={setBullCoatColor}>
                        <SelectTrigger className="text-base h-10">
                          <SelectValue placeholder="Seleccionar color del pelaje" />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          <SelectItem value="negro">Negro</SelectItem>
                          <SelectItem value="colorado">Colorado</SelectItem>
                          <SelectItem value="negro_homocigota">Negro Homocigota ✅</SelectItem>
                          <SelectItem value="colorado_homocigota">Colorado Homocigota ✅</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}
                
                {/* Genetic prediction alert */}
                {getGeneticPrediction() && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg animate-fade-in">
                    <p className="text-sm text-green-800 font-medium">{getGeneticPrediction()}</p>
                  </div>
                )}
                
                {/* Physical Data */}
                <div className="space-y-4">
                  <h4 className="text-base font-medium">Datos Físicos y Productivos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bull-ce" className="text-sm font-medium">CE (Circunferencia Escrotal) cm</Label>
                      <Input
                        id="bull-ce"
                        type="number"
                        value={bullScrotalCircumference}
                        onChange={(e) => setBullScrotalCircumference(e.target.value)}
                        placeholder="Ej: 38"
                        className="text-base h-10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bull-birth-weight" className="text-sm font-medium">Peso al Nacer (kg)</Label>
                      <Input
                        id="bull-birth-weight"
                        type="number"
                        value={bullBirthWeight}
                        onChange={(e) => setBullBirthWeight(e.target.value)}
                        placeholder="Ej: 35"
                        className="text-base h-10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bull-weaning-weight" className="text-sm font-medium">Peso al Destete (kg)</Label>
                      <Input
                        id="bull-weaning-weight"
                        type="number"
                        value={bullWeaningWeight}
                        onChange={(e) => setBullWeaningWeight(e.target.value)}
                        placeholder="Ej: 205"
                        className="text-base h-10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bull-final-weight" className="text-sm font-medium">Peso Final (kg)</Label>
                      <Input
                        id="bull-final-weight"
                        type="number"
                        value={bullFinalWeight}
                        onChange={(e) => setBullFinalWeight(e.target.value)}
                        placeholder="Ej: 450"
                        className="text-base h-10"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Additional Information */}
                <div className="space-y-4">
                  <h4 className="text-base font-medium">Información Adicional</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="bull-center" className="text-sm font-medium">Centro de Inseminación</Label>
                      <Input
                        id="bull-center"
                        value={bullInseminationCenter}
                        onChange={(e) => setBullInseminationCenter(e.target.value)}
                        placeholder="Ej: ABS Global, Semex"
                        className="text-base h-10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bull-nationality" className="text-sm font-medium">Nacionalidad del Toro</Label>
                      <Input
                        id="bull-nationality"
                        value={bullNationality}
                        onChange={(e) => setBullNationality(e.target.value)}
                        placeholder="Ej: Argentina, Brasil, USA"
                        className="text-base h-10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bull-owner" className="text-sm font-medium">Propietario del Toro</Label>
                      <Input
                        id="bull-owner"
                        value={bullOwner}
                        onChange={(e) => setBullOwner(e.target.value)}
                        placeholder="Nombre del propietario"
                        className="text-base h-10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bull-genotyped" className="text-sm font-medium">¿Está genotipado?</Label>
                      <Select value={bullIsGenotyped} onValueChange={setBullIsGenotyped}>
                        <SelectTrigger className="text-base h-10">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent className="bg-background">
                          <SelectItem value="yes">Sí</SelectItem>
                          <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bull-internal-code" className="text-sm font-medium">Código interno de la cabaña</Label>
                      <Input
                        id="bull-internal-code"
                        value={bullInternalCode}
                        onChange={(e) => setBullInternalCode(e.target.value)}
                        placeholder="Código interno"
                        className="text-base h-10"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bull-observations" className="text-sm font-medium">Observaciones genéticas o sanitarias</Label>
                      <Textarea
                        id="bull-observations"
                        value={bullGeneticObservations}
                        onChange={(e) => setBullGeneticObservations(e.target.value)}
                        placeholder="Información adicional sobre genética, sanidad, etc."
                        rows={3}
                        className="text-base"
                      />
                    </div>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Pregnancy Status */}
          <div className="space-y-3">
            <Label htmlFor="pregnant" className="text-base font-medium">
              ¿Quedó preñada? (Opcional)
            </Label>
            <Select value={isPregnant} onValueChange={setIsPregnant}>
              <SelectTrigger className="w-full text-base h-11">
                <SelectValue placeholder="Se puede completar después" />
              </SelectTrigger>
              <SelectContent className="bg-background">
                <SelectItem value="pending">⏳ Pendiente (completar después)</SelectItem>
                <SelectItem value="yes">✅ Sí</SelectItem>
                <SelectItem value="no">❌ No</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Este campo es opcional y se puede completar posteriormente desde otra actividad.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label htmlFor="notes" className="text-base font-medium">
              Observaciones
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Comentarios adicionales sobre la inseminación..."
              rows={3}
              className="w-full text-base"
            />
          </div>
        </div>

        <DialogFooter className="pt-6 space-x-4">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="text-base h-11 px-6"
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading || validationErrors.length > 0 || selectedAnimals.length === 0}
            className="text-base h-11 px-6"
          >
            {isLoading ? "Guardando..." : "Registrar Inseminación"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}