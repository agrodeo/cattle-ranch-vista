import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Shield, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";
import { PageLoading } from "@/components/ui/page-loading";
import { useTranslation } from "react-i18next";

export function VaccinationDashboard() {
  const { t } = useTranslation(['settings', 'common']);
  const { requirements, loading } = useVaccinationRequirements();

  if (loading) {
    return <PageLoading cards={2} showKpis={false} message={t('settings:vaccines.loading')} />;
  }

  return (
    <div className="space-y-6">
      {requirements.length === 0 ? (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <div>
              <strong>{t('settings:vaccines.title')}:</strong> {t('settings:vaccines.noRequirements')}
            </div>
            <Button asChild size="sm">
              <Link to="/settings?tab=vaccines">
                <Settings className="h-4 w-4 mr-2" />
                {t('settings:vaccines.configure', 'Configurar')}
              </Link>
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>{t('settings:vaccines.activeSystem', 'Sistema de Vacunación Activo')}:</strong> {t('settings:vaccines.configuredCount', '{{count}} vacuna(s) configurada(s).', { count: requirements.length })}
            {' '}{t('settings:vaccines.autoMetrics', 'Las métricas de cumplimiento se calculan automáticamente.')}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {t('settings:vaccines.configuredVaccines', 'Vacunas Configuradas')}
            <Button asChild size="sm" variant="outline">
              <Link to="/settings?tab=vaccines">
                <Settings className="h-4 w-4 mr-2" />
                {t('settings:vaccines.manage', 'Gestionar')}
              </Link>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requirements.length > 0 ? (
            <div className="space-y-3">
              {requirements.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div>
                    <div className="font-medium">{req.vaccine_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {req.vaccine_type}
                      {req.is_mandatory && ` • ${t('settings:vaccines.mandatory')}`}
                      {req.sex_restriction && ` • ${req.sex_restriction}`}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {req.doses_required} {t('settings:vaccines.doses')} • {t('settings:vaccines.everyMonths')} {req.frequency_months} {t('settings:vaccines.months')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">
              {t('settings:vaccines.configurePrompt', 'Configure los requisitos de vacunación en Configuración para comenzar el seguimiento del rodeo.')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}