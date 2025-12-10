import { useState, useEffect } from 'react';
import { useConnectivity } from "@/services/connectivity";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, RefreshCw, Loader2 } from "lucide-react";
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { db } from '@/services/db';
import { trySync } from '@/services/sync';
import { toast } from 'sonner';

export function ConnectivityBanner() {
  const { isOnline } = useConnectivity();
  const { t } = useTranslation('common');
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const count = await db.outbox.where('status').equals('pending').count();
        setPendingCount(count);
      } catch (error) {
        console.error('Error loading pending count:', error);
      }
    };

    loadPendingCount();
    const interval = setInterval(loadPendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) return;
    
    setIsSyncing(true);
    try {
      await trySync();
      toast.success(t('sync.syncCompleted'));
    } catch (error) {
      toast.error(t('sync.syncError'));
    } finally {
      setIsSyncing(false);
    }
  };

  // Show banner if offline OR if there are pending items to sync
  if (isOnline && pendingCount === 0) return null;

  return (
    <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800 mx-4 mt-4">
      <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="flex items-center justify-between text-amber-800 dark:text-amber-200">
        <span>
          {!isOnline 
            ? t('connectivity.offlineBanner')
            : `${pendingCount} ${t('sync.pending').toLowerCase()}`
          }
        </span>
        {isOnline && pendingCount > 0 && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleManualSync}
            disabled={isSyncing}
            className="ml-2 h-7"
          >
            {isSyncing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}