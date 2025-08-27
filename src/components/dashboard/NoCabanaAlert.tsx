import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2 } from "lucide-react";
import { PrimaryButton } from "@/components/ui/primary-button";

interface NoCabanaAlertProps {
  onCreateCabana: () => void;
}

export function NoCabanaAlert({ onCreateCabana }: NoCabanaAlertProps) {
  return (
    <Alert className="mb-6 border-blue-200 bg-blue-50">
      <Building2 className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900">
        Configura tu cabaña
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-3">
          <p className="text-blue-700">
            Para comenzar a usar AgroDeo, primero necesitas crear y configurar tu cabaña. 
            Esto te permitirá registrar animales, actividades y gestionar tu operación ganadera.
          </p>
          <PrimaryButton onClick={onCreateCabana}>
            Crear mi cabaña
          </PrimaryButton>
        </div>
      </AlertDescription>
    </Alert>
  );
}