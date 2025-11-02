import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Syringe, Plus, ChevronRight, SkipForward } from "lucide-react";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";
import { toast } from "sonner";

interface VaccineTemplate {
  vaccine_code: string;
  vaccine_name: string;
  vaccine_type: string;
  description: string;
  is_mandatory: boolean;
  sex_restriction?: string;
  min_age_months?: number;
  max_age_months?: number;
  frequency_months?: number;
  doses_required?: number;
  interval_between_doses_days?: number;
  country: string;
}

const defaultVaccineTemplates: VaccineTemplate[] = [
  {
    vaccine_code: "AFTOSA",
    vaccine_name: "Aftosa",
    vaccine_type: "Viral",
    description: "Vacuna obligatoria contra fiebre aftosa",
    is_mandatory: true,
    min_age_months: 3,
    frequency_months: 6,
    doses_required: 1,
    country: "Argentina"
  },
  {
    vaccine_code: "BRUCELOSIS",
    vaccine_name: "Brucelosis",
    vaccine_type: "Bacteriana",
    description: "Vacuna obligatoria contra brucelosis en hembras",
    is_mandatory: true,
    sex_restriction: "Hembra",
    min_age_months: 3,
    max_age_months: 8,
    doses_required: 1,
    country: "Argentina"
  },
  {
    vaccine_code: "CARBUNCO",
    vaccine_name: "Carbunco",
    vaccine_type: "Bacteriana",
    description: "Vacuna contra carbunco sintomático",
    is_mandatory: false,
    min_age_months: 6,
    frequency_months: 12,
    doses_required: 1,
    country: "Argentina"
  },
  {
    vaccine_code: "MANCHA_GANGRENA",
    vaccine_name: "Mancha/Gangrena",
    vaccine_type: "Bacteriana",
    description: "Vacuna contra enfermedades clostridiales",
    is_mandatory: false,
    min_age_months: 2,
    frequency_months: 12,
    doses_required: 1,
    country: "Argentina"
  },
  {
    vaccine_code: "IBR_DVB",
    vaccine_name: "IBR/DVB",
    vaccine_type: "Viral",
    description: "Vacuna contra rinotraqueitis y diarrea viral bovina",
    is_mandatory: false,
    min_age_months: 6,
    frequency_months: 12,
    doses_required: 2,
    interval_between_doses_days: 21,
    country: "Argentina"
  }
];

interface VaccinationSetupStepProps {
  onComplete: () => void;
  onSkip: () => void;
}

export const VaccinationSetupStep = ({ onComplete, onSkip }: VaccinationSetupStepProps) => {
  const [selectedVaccines, setSelectedVaccines] = useState<Set<number>>(new Set([0, 1])); // Aftosa and Brucelosis selected by default
  const [isLoading, setIsLoading] = useState(false);
  const { createRequirement } = useVaccinationRequirements();

  const handleVaccineToggle = (index: number) => {
    const newSelected = new Set(selectedVaccines);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedVaccines(newSelected);
  };

  const handleSetupVaccines = async () => {
    if (selectedVaccines.size === 0) {
      toast.error("Selecciona al menos una vacuna o omite este paso");
      return;
    }

    setIsLoading(true);
    try {
      const promises = Array.from(selectedVaccines).map(index => {
        const vaccine = defaultVaccineTemplates[index];
        return createRequirement(vaccine);
      });

      await Promise.all(promises);
      toast.success("Requisitos de vacunación configurados exitosamente");
      onComplete();
    } catch (error) {
      toast.error("Error al configurar las vacunas");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center px-4 sm:px-6">
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-primary/10">
            <Syringe className="h-8 w-8 text-primary" />
          </div>
        </div>
        <CardTitle className="text-xl sm:text-2xl">Configurar Vacunas Requeridas</CardTitle>
        <CardDescription className="text-sm">
          Selecciona las vacunas que serán obligatorias en tu cabaña. Puedes modificar esto más tarde en configuración.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 px-4 sm:px-6">
        <div className="space-y-4">
          {defaultVaccineTemplates.map((vaccine, index) => (
            <div
              key={index}
              className={`border rounded-lg p-3 sm:p-4 transition-colors cursor-pointer ${
                selectedVaccines.has(index) 
                  ? 'border-primary bg-primary/5' 
                  : 'border-border hover:border-primary/50'
              }`}
              onClick={() => handleVaccineToggle(index)}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                  <Checkbox
                    checked={selectedVaccines.has(index)}
                    onChange={() => {}} // Handled by parent div click
                    className="mt-1 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-2 flex-wrap">
                      <h3 className="font-medium text-sm break-words">{vaccine.vaccine_name}</h3>
                      {vaccine.is_mandatory && (
                        <Badge variant="destructive" className="text-xs whitespace-nowrap flex-shrink-0">Obligatoria</Badge>
                      )}
                      <Badge variant="outline" className="text-xs whitespace-nowrap flex-shrink-0">{vaccine.vaccine_type}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {vaccine.description}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {vaccine.sex_restriction && (
                        <span className="bg-muted px-2 py-1 rounded">
                          Solo {vaccine.sex_restriction}s
                        </span>
                      )}
                      {vaccine.min_age_months && (
                        <span className="bg-muted px-2 py-1 rounded">
                          Desde {vaccine.min_age_months} meses
                        </span>
                      )}
                      {vaccine.max_age_months && (
                        <span className="bg-muted px-2 py-1 rounded">
                          Hasta {vaccine.max_age_months} meses
                        </span>
                      )}
                      {vaccine.frequency_months && (
                        <span className="bg-muted px-2 py-1 rounded">
                          Cada {vaccine.frequency_months} meses
                        </span>
                      )}
                      {vaccine.doses_required && vaccine.doses_required > 1 && (
                        <span className="bg-muted px-2 py-1 rounded">
                          {vaccine.doses_required} dosis
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Plus className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">¿Necesitas otras vacunas?</p>
              <p>Puedes agregar vacunas personalizadas después en la sección de Configuración.</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <Button
            variant="outline"
            onClick={onSkip}
            className="w-full sm:flex-1"
          >
            <SkipForward className="h-4 w-4 mr-2" />
            Omitir
          </Button>
          <Button
            onClick={handleSetupVaccines}
            disabled={isLoading}
            className="w-full sm:flex-1"
          >
            {isLoading ? (
              "Configurando..."
            ) : (
              <>
                <span className="truncate">Configurar Vacunas</span>
                <ChevronRight className="h-4 w-4 ml-2 flex-shrink-0" />
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Estas configuraciones se aplicarán para evaluar el estado de vacunación de tus animales
        </p>
      </CardContent>
    </Card>
  );
};