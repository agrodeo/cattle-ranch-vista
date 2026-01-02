/**
 * Sync Status Widget
 * 
 * Shows current sync status with pending count and last sync time.
 * Allows manual sync trigger.
 */

import React, { useState, useEffect } from 'react';
import { useConnectivity } from '@/services/connectivity';
import { getOutboxStatus, syncOutbox, isSyncInProgress } from '@/services/syncEngine';
import { RefreshCw, Cloud, CloudOff, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface SyncStatusWidgetProps {
  compact?: boolean;
  className?: string;
}

export function SyncStatusWidget({ compact, className }: SyncStatusWidgetProps) {
  const { t } = useTranslation(['common']);
  const { isOnline } = useConnectivity();
  const [status, setStatus] = useState({ pending: 0, failed: 0, synced: 0, failedPermanent: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  
  // Refresh status periodically
  useEffect(() => {
    const refreshStatus = async () => {
      const s = await getOutboxStatus();
      setStatus(s);
      setIsSyncing(isSyncInProgress());
    };
    
    refreshStatus();
    const interval = setInterval(refreshStatus, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const handleSync = async () => {
    if (!isOnline || isSyncing) return;
    
    setIsSyncing(true);
    try {
      await syncOutbox();
      setLastSync(new Date());
      const s = await getOutboxStatus();
      setStatus(s);
    } finally {
      setIsSyncing(false);
    }
  };
  
  const pendingTotal = status.pending + status.failed;
  const hasPending = pendingTotal > 0;
  const hasErrors = status.failedPermanent > 0;
  
  // Compact mode - just icon with badge
  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSync}
        disabled={!isOnline || isSyncing}
        className={cn('relative', className)}
      >
        {!isOnline ? (
          <CloudOff className="h-5 w-5 text-muted-foreground" />
        ) : isSyncing ? (
          <RefreshCw className="h-5 w-5 animate-spin text-primary" />
        ) : hasErrors ? (
          <AlertCircle className="h-5 w-5 text-destructive" />
        ) : hasPending ? (
          <Cloud className="h-5 w-5 text-amber-500" />
        ) : (
          <Check className="h-5 w-5 text-green-500" />
        )}
        {hasPending && (
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]"
          >
            {pendingTotal}
          </Badge>
        )}
      </Button>
    );
  }
  
  // Full mode
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {!isOnline ? (
        <>
          <CloudOff className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {t('common:sync.offline', 'Sin conexión')}
          </span>
        </>
      ) : isSyncing ? (
        <>
          <RefreshCw className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-primary">
            {t('common:sync.syncing', 'Sincronizando...')}
          </span>
        </>
      ) : hasPending ? (
        <>
          <Cloud className="h-4 w-4 text-amber-500" />
          <span className="text-sm text-amber-600 dark:text-amber-400">
            {t('common:sync.pending', { count: pendingTotal, defaultValue: `${pendingTotal} pendiente(s)` })}
          </span>
          <Button variant="ghost" size="sm" onClick={handleSync} className="h-6 px-2">
            <RefreshCw className="h-3 w-3 mr-1" />
            {t('common:sync.syncNow', 'Sincronizar')}
          </Button>
        </>
      ) : (
        <>
          <Check className="h-4 w-4 text-green-500" />
          <span className="text-sm text-green-600 dark:text-green-400">
            {t('common:sync.synced', 'Sincronizado')}
          </span>
        </>
      )}
      
      {hasErrors && (
        <Badge variant="destructive" className="ml-2">
          {status.failedPermanent} {t('common:sync.failed', 'fallido(s)')}
        </Badge>
      )}
    </div>
  );
}
