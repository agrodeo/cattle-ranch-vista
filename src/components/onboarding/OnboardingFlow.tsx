import { useState } from "react";
import { VaccinationSetupStep } from "./VaccinationSetupStep";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowRight, Sparkles, Check } from "lucide-react";

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      id: 'vaccines',
      title: 'Configurar Vacunas',
      component: VaccinationSetupStep
    }
  ];

  const handleStepComplete = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkipStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  if (currentStep >= steps.length) {
    return (
      <div className="bg-background min-h-screen flex items-center justify-center p-3 sm:p-4 animate-fade-in">
        <Card className="w-[calc(100%-1.5rem)] sm:w-full max-w-md mx-auto card-modern overflow-hidden">
          <CardHeader className="text-center space-y-4 sm:space-y-6 p-4 sm:p-6">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-brand-gradient rounded-full blur-xl opacity-30 animate-pulse" />
                <div className="relative bg-brand-gradient p-5 sm:p-6 rounded-full shadow-lg">
                  <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-white" />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-2xl sm:text-3xl text-primary">
                ¡Configuración Completa!
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Tu cabaña está lista para comenzar
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <Button onClick={onComplete} className="w-full btn-primary hover-scale h-12 sm:h-12 text-base">
              <ArrowRight className="h-5 w-5 mr-2" />
              Ir al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="w-full max-w-4xl space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 sm:space-y-4 px-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary mb-2 px-4">
            ¡Bienvenido a agrodeo!
          </h1>
          <p className="text-base sm:text-lg text-muted-foreground px-4">
            Configuremos tu cabaña para comenzar a gestionar tu ganado
          </p>
        </div>

        <CurrentStepComponent
          onComplete={handleStepComplete}
          onSkip={handleSkipStep}
        />

        {/* Modern progress indicator */}
        <div className="flex justify-center px-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {steps.map((step, index) => (
              <div key={index} className="flex items-center gap-2 sm:gap-3">
                <div className="flex flex-col items-center gap-1.5 sm:gap-2">
                  <div
                    className={`relative flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full transition-all duration-300 ${
                      index < currentStep
                        ? 'bg-brand-gradient shadow-lg'
                        : index === currentStep
                        ? 'bg-brand-gradient shadow-lg ring-2 ring-primary ring-offset-2'
                        : 'bg-muted'
                    }`}
                  >
                    {index < currentStep ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                    ) : (
                      <span className={`text-xs sm:text-sm font-semibold ${index === currentStep ? 'text-white' : 'text-muted-foreground'}`}>
                        {index + 1}
                      </span>
                    )}
                  </div>
                  <span className={`text-xs font-medium transition-colors hidden sm:block ${
                    index <= currentStep ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-8 sm:w-12 h-0.5 transition-colors ${
                    index < currentStep ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};