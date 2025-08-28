import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { getOutboxStatus, retryFailedEvents } from "@/services/outbox";
import { trySync } from "@/services/sync";
import { useConnectivity } from "@/services/connectivity";
import { db, OutboxEvent } from "@/services/db";
import { toast } from "sonner";

export function SyncCenter() {
  const [status, setStatus] = useState({ pending: 0, failed: 0, synced: 0 });
  const [events, setEvents] = useState<OutboxEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const { isOnline } = useConnectivity();

  const loadStatus = async () => {
    const statusData = await getOutboxStatus();
    setStatus(statusData);
    
    // Cargar eventos pendientes y fallidos
    const pendingEvents = await db.outbox.where('status').anyOf(['pending', 'failed']).toArray();
    setEvents(pendingEvents);
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleSync = async () => {
    if (!isOnline) {
      toast.error("No hay conexión a internet");
      return;
    }

    setLoading(true);
    try {
      await trySync();
      toast.success("Sincronización completada");
      await loadStatus();
    } catch (error) {
      toast.error("Error en la sincronización");
      console.error('Sync error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRetryFailed = async () => {
    const retried = await retryFailedEvents();
    if (retried > 0) {
      toast.info(`${retried} eventos marcados para reintento`);
      await loadStatus();
    }
  };

  const getEventTypeName = (type: string) => {
    switch (type) {
      case 'ANIMAL_INSERT': return 'Nuevo Animal';
      case 'ANIMAL_UPDATE': return 'Actualizar Animal';
      case 'ACTIVITY_INSERT': return 'Nueva Actividad';
      case 'ACTIVITY_UPDATE': return 'Actualizar Actividad';
      default: return type;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Falló</Badge>;
      case 'synced':
        return <Badge variant="default"><CheckCircle className="h-3 w-3 mr-1" />Sincronizado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Centro de Sincronización
          <Button 
            onClick={handleSync} 
            disabled={loading || !isOnline}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Sincronizando...' : 'Sincronizar Ahora'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isOnline && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Sin conexión. La sincronización se realizará automáticamente al reconectar.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{status.pending}</div>
            <div className="text-sm text-muted-foreground">Pendientes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{status.failed}</div>
            <div className="text-sm text-muted-foreground">Fallidos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{status.synced}</div>
            <div className="text-sm text-muted-foreground">Sincronizados</div>
          </div>
        </div>

        {status.failed > 0 && (
          <div className="flex justify-center">
            <Button 
              onClick={handleRetryFailed}
              variant="outline"
              size="sm"
            >
              Reintentar Fallidos
            </Button>
          </div>
        )}

        {events.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold">Eventos Pendientes</h4>
            {events.map((event) => (
              <div key={event.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <div className="font-medium">{getEventTypeName(event.type)}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString()}
                  </div>
                  {event.reason && (
                    <div className="text-sm text-red-600">{event.reason}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {event.retries > 0 && (
                    <span className="text-xs text-muted-foreground">
                      Reintentos: {event.retries}
                    </span>
                  )}
                  {getStatusBadge(event.status)}
                </div>
              </div>
            ))}
          </div>
        )}

        {events.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No hay eventos pendientes de sincronización
          </div>
        )}
      </CardContent>
    </Card>
  );
}