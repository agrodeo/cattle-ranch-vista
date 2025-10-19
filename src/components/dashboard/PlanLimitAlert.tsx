import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, AlertCircle } from "lucide-react";
import { PrimaryButton } from "@/components/ui/primary-button";

interface PlanLimitAlertProps {
  type: 'warning' | 'error';
  currentCount: number;
  maxCount: number;
  planName: string;
  onUpgrade: () => void;
}

export function PlanLimitAlert({ 
  type, 
  currentCount, 
  maxCount, 
  planName, 
  onUpgrade 
}: PlanLimitAlertProps) {
  const isError = type === 'error';
  
  return (
    <Alert className={`mb-6 ${isError ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
      {isError ? (
        <AlertCircle className="h-4 w-4 text-red-600" />
      ) : (
        <AlertTriangle className="h-4 w-4 text-amber-600" />
      )}
      <AlertTitle className={isError ? 'text-red-900' : 'text-amber-900'}>
        {isError ? 'Límite de animales superado' : 'Acercándose al límite'}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-3">
          <p className={isError ? 'text-red-700' : 'text-amber-700'}>
            {isError 
              ? `Has alcanzado el límite de ${maxCount} animales del plan ${planName}. Actualmente tienes ${currentCount} animales registrados.`
              : `Estás cerca del límite de ${maxCount} animales del plan ${planName}. Tienes ${currentCount} de ${maxCount} animales registrados.`
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <PrimaryButton 
              onClick={onUpgrade}
              className="flex-shrink-0"
            >
              Ver planes disponibles
            </PrimaryButton>
            <span className="text-xs text-ink-600 self-center">
              Actualiza tu plan para registrar más animales
            </span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}