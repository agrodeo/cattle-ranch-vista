import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Building2 } from "lucide-react";
import { PrimaryButton } from "@/components/ui/primary-button";
import { useTranslation } from "react-i18next";

interface NoCabanaAlertProps {
  onCreateCabana: () => void;
}

export function NoCabanaAlert({ onCreateCabana }: NoCabanaAlertProps) {
  const { t } = useTranslation(['dashboard']);
  
  return (
    <Alert className="mb-6 border-blue-200 bg-blue-50">
      <Building2 className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900">
        {t('dashboard:noCabana.title')}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-3">
          <p className="text-blue-700">
            {t('dashboard:noCabana.description')}
          </p>
          <PrimaryButton onClick={onCreateCabana}>
            {t('dashboard:actions.setupCabana')}
          </PrimaryButton>
        </div>
      </AlertDescription>
    </Alert>
  );
}