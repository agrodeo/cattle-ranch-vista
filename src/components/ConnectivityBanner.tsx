import { useConnectivity } from "@/services/connectivity";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff } from "lucide-react";
import { useTranslation } from 'react-i18next';

export function ConnectivityBanner() {
  const { isOnline } = useConnectivity();
  const { t } = useTranslation('common');

  if (isOnline) return null;

  return (
    <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800 mx-4 mt-4">
      <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="text-amber-800 dark:text-amber-200">
        {t('connectivity.offlineBanner')}
      </AlertDescription>
    </Alert>
  );
}