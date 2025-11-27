import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Clock, CheckCircle, Calendar } from 'lucide-react';
import { useReproductiveSystem } from '@/hooks/useReproductiveSystem';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

export function ReproductiveAlertsCard() {
  const { alerts, loading, loadAlerts, markAlertAsResolved, checkOverduePregnancies } = useReproductiveSystem();
  const { currentUser } = useSupabaseAuth();
  const { t } = useTranslation('reproductive');

  useEffect(() => {
    if (currentUser?.cabañaId) {
      loadAlerts();
    }
  }, [currentUser?.cabañaId]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta':
        return 'destructive';
      case 'media':
        return 'secondary';
      case 'baja':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'parto_vencido':
        return <Calendar className="h-4 w-4" />;
      case 'overdue_calving':
        return <Clock className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getAlertTitle = (alertType: string) => {
    switch (alertType) {
      case 'parto_vencido':
        return t('alerts.overdueCalving');
      case 'overdue_calving':
        return t('alerts.overdueCalving');
      case 'overdue_pregnancy_resolution':
        return t('alerts.pregnancyToResolve');
      default:
        return t('alerts.reproductiveAlert');
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">{t('alerts.title')}</CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkOverduePregnancies}
            disabled={loading}
          >
            <Clock className="h-4 w-4 mr-2" />
            {t('alerts.verify')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">{t('alerts.loadingAlerts')}</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{t('alerts.noAlerts')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div key={alert.id} className="flex items-start justify-between p-3 border rounded-lg">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getAlertIcon(alert.alert_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium">{getAlertTitle(alert.alert_type)}</h4>
                      <Badge variant={getPriorityColor(alert.prioridad)} className="text-xs">
                        {alert.prioridad}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Animal: {alert.animal_tag || alert.animal_id}
                    </p>
                    {alert.notes && (
                      <p className="text-xs text-muted-foreground mb-2">{alert.notes}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Vencido: {alert.days_overdue} días</span>
                      {alert.expected_date && (
                        <span>
                          Esperado: {formatDistanceToNow(new Date(alert.expected_date), { 
                            addSuffix: true, 
                            locale: es 
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => markAlertAsResolved(alert.id)}
                  className="ml-2"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {t('alerts.resolve')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}