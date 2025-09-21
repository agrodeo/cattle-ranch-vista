import { useState } from "react";
import { VaccinationSetupStep } from "./VaccinationSetupStep";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";

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
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
          </div>
          <CardTitle>¡Configuración Completa!</CardTitle>
          <CardDescription>
            Tu cabaña está lista para comenzar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onComplete} className="w-full">
            <ArrowRight className="h-4 w-4 mr-2" />
            Ir al Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  const CurrentStepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">¡Bienvenido a AgroDeo!</h1>
          <p className="text-muted-foreground">
            Configuremos tu cabaña para comenzar a gestionar tu ganado
          </p>
        </div>

        <CurrentStepComponent
          onComplete={handleStepComplete}
          onSkip={handleSkipStep}
        />

        {/* Progress indicator */}
        <div className="flex justify-center mt-8">
          <div className="flex gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-8 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};