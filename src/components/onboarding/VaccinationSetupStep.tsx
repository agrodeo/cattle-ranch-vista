import { useState } from "react";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation(['onboarding', 'common']);
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
      toast.error(t('onboarding:selectVaccineOrSkip'));
      return;
    }

    setIsLoading(true);
    try {
      const promises = Array.from(selectedVaccines).map(index => {
        const vaccine = defaultVaccineTemplates[index];
        return createRequirement(vaccine);
      });

      await Promise.all(promises);
      toast.success(t('onboarding:vaccinationConfiguredSuccess'));
      onComplete();
    } catch (error) {
      toast.error(t('onboarding:errorConfiguringVaccines'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-[calc(100%-1.5rem)] sm:w-full max-w-4xl mx-auto card-modern animate-scale-in overflow-hidden">
      <CardHeader className="space-y-3 sm:space-y-4 p-4 sm:p-6">
        <div className="flex items-start sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 bg-brand-gradient rounded-xl blur-md opacity-30" />
            <div className="relative bg-brand-gradient p-2.5 sm:p-3 rounded-xl shadow-lg">
              <Syringe className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
            </div>
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <CardTitle className="text-xl sm:text-2xl">Configuración de Vacunas</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Selecciona las vacunas que son obligatorias u opcionales para tu cabaña
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {defaultVaccineTemplates.map((vaccine, index) => {
            const isSelected = selectedVaccines.has(index);
            
            return (
              <div
                key={index}
                className={`relative p-4 sm:p-5 rounded-2xl space-y-3 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-lg active:scale-95 ${
                  isSelected 
                    ? 'ring-2 ring-primary bg-primary/5 shadow-md' 
                    : 'border border-border bg-card hover:border-primary/50'
                }`}
                onClick={() => handleVaccineToggle(index)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => {}}
                        className="transition-transform data-[state=checked]:scale-110 h-5 w-5"
                      />
                    </div>
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex items-start gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm sm:text-base break-words">{vaccine.vaccine_name}</h4>
                        {vaccine.is_mandatory && (
                          <Badge variant="default" className="text-xs bg-brand-gradient text-white border-0 flex-shrink-0">
                            Obligatoria
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                        {vaccine.description}
                      </p>
                    </div>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                  )}
                </div>
                
                <div className="flex flex-wrap gap-1.5 sm:gap-2 text-xs">
                  <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-secondary/50 rounded-full font-medium whitespace-nowrap">
                    {vaccine.vaccine_type}
                  </span>
                  {vaccine.sex_restriction && (
                    <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-secondary/50 rounded-full whitespace-nowrap">
                      Solo {vaccine.sex_restriction}s
                    </span>
                  )}
                  {vaccine.min_age_months && (
                    <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-secondary/50 rounded-full whitespace-nowrap">
                      Desde {vaccine.min_age_months} meses
                    </span>
                  )}
                  {vaccine.max_age_months && (
                    <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-secondary/50 rounded-full whitespace-nowrap">
                      Hasta {vaccine.max_age_months} meses
                    </span>
                  )}
                  {vaccine.frequency_months && (
                    <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-secondary/50 rounded-full whitespace-nowrap">
                      Cada {vaccine.frequency_months} meses
                    </span>
                  )}
                  {vaccine.doses_required && vaccine.doses_required > 1 && (
                    <span className="px-2.5 sm:px-3 py-1 sm:py-1.5 bg-secondary/50 rounded-full whitespace-nowrap">
                      {vaccine.doses_required} dosis
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative p-4 sm:p-5 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5">
          <div className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-lg flex-shrink-0">
              <Info className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground mb-1">
                ¿Necesitas otras vacunas específicas?
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Podrás agregarlas más tarde desde la configuración
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2 sm:pt-4">
          <Button
            variant="outline"
            onClick={onSkip}
            disabled={isLoading}
            className="btn-secondary h-11 px-6 w-full sm:w-auto order-2 sm:order-1"
          >
            Omitir
          </Button>
          <Button
            onClick={handleSetupVaccines}
            disabled={selectedVaccines.size === 0 || isLoading}
            className="btn-primary h-11 px-6 hover-scale w-full sm:w-auto order-1 sm:order-2"
          >
            <Syringe className="h-4 w-4 mr-2" />
            {isLoading ? "Configurando..." : "Configurar Vacunas"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};