import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Syringe, Info, CheckCircle2 } from "lucide-react";
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
    <Card className="w-full max-w-4xl mx-auto glass card-modern animate-scale-in">
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-brand-gradient rounded-xl blur-md opacity-40" />
            <div className="relative bg-brand-gradient p-3 rounded-xl glow-primary">
              <Syringe className="h-7 w-7 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl">Configuración de Vacunas</CardTitle>
            <CardDescription className="text-base">
              Selecciona las vacunas que son obligatorias u opcionales para tu cabaña
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          {defaultVaccineTemplates.map((vaccine, index) => {
            const isSelected = selectedVaccines.has(index);
            
            return (
              <div
                key={index}
                className={`relative p-5 rounded-2xl space-y-3 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-lg ${
                  isSelected 
                    ? 'ring-2 ring-primary bg-primary/5 shadow-md' 
                    : 'border border-border bg-card hover:border-primary/50'
                }`}
                onClick={() => handleVaccineToggle(index)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {}}
                        className="transition-transform data-[state=checked]:scale-110"
                      />
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-start gap-2 flex-wrap">
                        <h4 className="font-semibold text-base">{vaccine.vaccine_name}</h4>
                        {vaccine.is_mandatory && (
                          <Badge variant="default" className="text-xs bg-brand-gradient text-white border-0">
                            Obligatoria
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {vaccine.description}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
                
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-3 py-1.5 bg-secondary/50 rounded-full font-medium">
                    {vaccine.vaccine_type}
                  </span>
                  {vaccine.sex_restriction && (
                    <span className="px-3 py-1.5 bg-secondary/50 rounded-full">
                      Solo {vaccine.sex_restriction}s
                    </span>
                  )}
                  {vaccine.min_age_months && (
                    <span className="px-3 py-1.5 bg-secondary/50 rounded-full">
                      Desde {vaccine.min_age_months} meses
                    </span>
                  )}
                  {vaccine.max_age_months && (
                    <span className="px-3 py-1.5 bg-secondary/50 rounded-full">
                      Hasta {vaccine.max_age_months} meses
                    </span>
                  )}
                  {vaccine.frequency_months && (
                    <span className="px-3 py-1.5 bg-secondary/50 rounded-full">
                      Cada {vaccine.frequency_months} meses
                    </span>
                  )}
                  {vaccine.doses_required && vaccine.doses_required > 1 && (
                    <span className="px-3 py-1.5 bg-secondary/50 rounded-full">
                      {vaccine.doses_required} dosis
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative p-5 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-1">
                ¿Necesitas otras vacunas específicas?
              </p>
              <p className="text-sm text-muted-foreground">
                Podrás agregarlas más tarde desde la configuración
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isLoading}
            className="btn-secondary h-11 px-6"
          >
            Omitir
          </Button>
          <Button
            onClick={handleSetupVaccines}
            disabled={selectedVaccines.size === 0 || isLoading}
            className="btn-primary h-11 px-6 hover-scale"
          >
            <Syringe className="h-4 w-4 mr-2" />
            {isLoading ? "Configurando..." : "Configurar Vacunas"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};