import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, FileSpreadsheet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ManualAnimalForm } from "./ManualAnimalForm";
import { ExcelAnimalUpload } from "./ExcelAnimalUpload";

interface AnimalCreationFlowProps {
  onClose: () => void;
}

type FlowStep = "selection" | "manual" | "excel";

export function AnimalCreationFlow({ onClose }: AnimalCreationFlowProps) {
  const { t } = useTranslation('animals');
  const [currentStep, setCurrentStep] = useState<FlowStep>("selection");

  const handleStepChange = (step: FlowStep) => {
    setCurrentStep(step);
  };

  const handleBack = () => {
    if (currentStep === "selection") {
      onClose();
    } else {
      setCurrentStep("selection");
    }
  };

  if (currentStep === "manual") {
    return <ManualAnimalForm onBack={handleBack} onSuccess={onClose} />;
  }

  if (currentStep === "excel") {
    return <ExcelAnimalUpload onBack={handleBack} onSuccess={onClose} />;
  }

  return (
    <div className="fixed inset-0 z-50 bg-background lg:hidden">
      {/* Header */}
      <div className="flex items-center p-4 border-b border-border">
        <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">{t('animalCreation.title')}</h1>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4">
        <Card
          className="cursor-pointer border-2 hover:border-primary/50 transition-colors"
          onClick={() => handleStepChange("manual")}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-blue-500 text-white">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>{t('animalCreation.manualLoad')}</CardTitle>
                <CardDescription>
                  {t('animalCreation.manualLoadDesc')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer border-2 hover:border-primary/50 transition-colors"
          onClick={() => handleStepChange("excel")}
        >
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-lg bg-primary text-primary-foreground">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>{t('animalCreation.excelLoad')}</CardTitle>
                <CardDescription>
                  {t('animalCreation.excelLoadDesc')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}