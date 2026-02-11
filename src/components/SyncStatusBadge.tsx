import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { getOutboxStatus } from '@/services/syncEngine';
import { manualSync } from '@/services/autoSync';
import { useConnectivity } from '@/services/connectivity';
import { cn } from '@/lib/utils';

interface SyncStatusBadgeProps {
  cabañaId?: string;
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

export function SyncStatusBadge({ cabañaId, className, showLabel = true, compact = false }: SyncStatusBadgeProps) {
  const { t } = useTranslation('common');
  const { isOnline } = useConnectivity();
  const [pending, setPending] = useState(0);
  const [failed, setFailed] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    const loadStatus = async () => {
      const status = await getOutboxStatus();
      setPending(status.pending);
      setFailed(status.failed);
    };

    loadStatus();
    const interval = setInterval(loadStatus, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (!isOnline || isSyncing) return;

    setIsSyncing(true);
    setLastSyncResult(null);

    try {
      const result = await manualSync(cabañaId);
      setLastSyncResult(result.success ? 'success' : 'error');
      
      // Refresh status
      const status = await getOutboxStatus();
      setPending(status.pending);
      setFailed(status.failed);
    } catch (error) {
      setLastSyncResult('error');
    } finally {
      setIsSyncing(false);
      // Clear result after 3 seconds
      setTimeout(() => setLastSyncResult(null), 3000);
    }
  };

  const totalPending = pending + failed;
  const hasIssues = failed > 0;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSync}
              disabled={!isOnline || isSyncing}
              className={cn('relative h-8 w-8', className)}
            >
              {!isOnline ? (
                <CloudOff className="h-4 w-4 text-muted-foreground" />
              ) : isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin text-primary" />
              ) : lastSyncResult === 'success' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : hasIssues ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : (
                <Cloud className="h-4 w-4 text-primary" />
              )}
              {totalPending > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-primary-foreground">
                  {totalPending > 9 ? '9+' : totalPending}
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {!isOnline ? (
              <p>{t('offline')}</p>
            ) : totalPending > 0 ? (
              <p>{totalPending} {t('pendingChanges')}</p>
            ) : (
              <p>{t('synced')}</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Status indicator */}
      <div className="flex items-center gap-1.5">
        {!isOnline ? (
          <>
            <CloudOff className="h-4 w-4 text-muted-foreground" />
            {showLabel && <span className="text-sm text-muted-foreground">{t('offline')}</span>}
          </>
        ) : totalPending > 0 ? (
          <>
            {hasIssues ? (
              <AlertCircle className="h-4 w-4 text-destructive" />
            ) : (
              <Cloud className="h-4 w-4 text-primary" />
            )}
            {showLabel && (
              <span className="text-sm">
                {totalPending} {t('pendingChanges')}
              </span>
            )}
            <Badge variant={hasIssues ? 'destructive' : 'secondary'} className="text-xs">
              {pending} {t('pending')}
              {failed > 0 && `, ${failed} ${t('failed')}`}
            </Badge>
          </>
        ) : (
          <>
            <Check className="h-4 w-4 text-green-500" />
            {showLabel && <span className="text-sm text-muted-foreground">{t('synced')}</span>}
          </>
        )}
      </div>

      {/* Sync button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSync}
        disabled={!isOnline || isSyncing}
        className="h-8 px-2"
      >
        <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
        {showLabel && <span className="ml-1">{t('sync')}</span>}
      </Button>
    </div>
  );
}
