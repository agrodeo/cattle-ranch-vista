import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RefreshCw, AlertTriangle, CheckCircle, Clock, Loader2, Cloud, CloudOff } from "lucide-react";
import { getOutboxStatus, retryFailedEvents } from "@/services/outbox";
import { trySync } from "@/services/sync";
import { useConnectivity } from "@/services/connectivity";
import { db, OutboxEvent } from "@/services/db";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';

export function SyncCenter() {
  const [status, setStatus] = useState({ pending: 0, failed: 0, synced: 0 });
  const [events, setEvents] = useState<OutboxEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const { isOnline } = useConnectivity();
  const { t } = useTranslation('common');

  const loadStatus = async () => {
    const statusData = await getOutboxStatus();
    setStatus(statusData);
    
    const pendingEvents = await db.outbox.where('status').anyOf(['pending', 'failed']).toArray();
    setEvents(pendingEvents);
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    if (!isOnline) {
      toast.error(t('sync.noInternet'));
      return;
    }

    setLoading(true);
    try {
      await trySync();
      toast.success(t('sync.syncCompleted'));
      await loadStatus();
    } catch (error) {
      toast.error(t('sync.syncError'));
      console.error('Sync error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    if (!isOnline) {
      toast.error(t('sync.noInternet'));
      return;
    }
    
    setLoading(true);
    try {
      const retried = await retryFailedEvents();
      if (retried > 0) {
        toast.info(t('sync.eventsRetried'));
        await loadStatus();
      }
    } finally {
      setLoading(false);
    }
  };

  const getEventTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      'ANIMAL_INSERT': 'Animal creado',
      'ANIMAL_UPDATE': 'Animal actualizado',
      'ANIMAL_DELETE': 'Animal eliminado',
      'CORRAL_INSERT': 'Corral creado',
      'CORRAL_UPDATE': 'Corral actualizado',
      'CORRAL_DELETE': 'Corral eliminado',
      'VACCINE_INSERT': 'Vacuna registrada',
      'VACCINE_UPDATE': 'Vacuna actualizada',
      'VACCINE_DELETE': 'Vacuna eliminada',
      'WEIGHT_INSERT': 'Peso registrado',
      'INSEMINATION_INSERT': 'Inseminación registrada',
      'INSEMINATION_UPDATE': 'Inseminación actualizada',
      'FINANCE_INSERT': 'Movimiento financiero',
      'FINANCE_UPDATE': 'Finanza actualizada',
      'EVENTO_INSERT': 'Evento registrado',
      'DEATH_RECORD_INSERT': 'Defunción registrada',
      'TACTO_INSERT': 'Tacto registrado',
      'PREGNANCY_INSERT': 'Preñez registrada',
      'PREGNANCY_UPDATE': 'Preñez actualizada'
    };
    return typeMap[type] || type;
  };

  const getStatusIcon = (eventStatus: string) => {
    switch (eventStatus) {
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'syncing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <Cloud className="h-4 w-4 text-green-500" />
          ) : (
            <CloudOff className="h-4 w-4 text-amber-500" />
          )}
          <span className="text-sm font-medium">
            {isOnline ? 'Conectado' : t('sync.noInternet')}
          </span>
        </div>
        <Badge variant={isOnline ? "default" : "secondary"}>
          {isOnline ? 'Online' : 'Offline'}
        </Badge>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-amber-50 dark:bg-amber-950">
          <div className="text-xl font-bold text-amber-600">{status.pending}</div>
          <div className="text-xs text-muted-foreground">{t('sync.pending')}</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950">
          <div className="text-xl font-bold text-red-600">{status.failed}</div>
          <div className="text-xs text-muted-foreground">{t('sync.failed')}</div>
        </div>
        <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950">
          <div className="text-xl font-bold text-green-600">{status.synced}</div>
          <div className="text-xs text-muted-foreground">{t('sync.synced')}</div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button 
          onClick={handleSync} 
          disabled={loading || !isOnline}
          className="flex-1"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          {loading ? t('sync.syncing') : t('sync.syncNow')}
        </Button>
        {status.failed > 0 && (
          <Button 
            variant="outline"
            onClick={handleRetryFailed}
            disabled={loading || !isOnline}
          >
            {t('sync.retryFailed')}
          </Button>
        )}
      </div>

      {/* Offline warning */}
      {!isOnline && (
        <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
            {t('sync.noConnectionWarning')}
          </AlertDescription>
        </Alert>
      )}

      {/* Events list */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">
          {t('sync.pendingEvents')}
        </h4>
        <ScrollArea className="h-[200px]">
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mb-2 text-green-500" />
              <span className="text-sm">{t('sync.synced')}</span>
            </div>
          ) : (
            <div className="space-y-2 pr-4">
              {events.map((event) => (
                <div 
                  key={event.id}
                  className="flex items-center justify-between p-2 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {getStatusIcon(event.status)}
                    <div className="min-w-0">
                      <span className="text-sm font-medium truncate block">
                        {getEventTypeName(event.type)}
                      </span>
                      {event.reason && (
                        <p className="text-xs text-destructive truncate">{event.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {event.retries > 0 && (
                      <span className="text-xs text-muted-foreground">
                        x{event.retries}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}