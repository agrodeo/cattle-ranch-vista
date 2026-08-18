import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, Users, Zap, Crown, Building2, Briefcase, CalendarDays, WifiOff } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useConnectivity } from "@/services/connectivity";
import { useTranslation } from 'react-i18next';
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SubscriptionAlertProps {
  onUpgrade?: () => void;
}

export const SubscriptionAlert = ({ onUpgrade }: SubscriptionAlertProps) => {
  const { subscriptionStatus, planNames } = useSubscription();
  const { isOnline } = useConnectivity();
  const { t } = useTranslation('subscription');

  if (!subscriptionStatus) return null;

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'personal': return <Users className="h-4 w-4" />;
      case 'productor': return <Zap className="h-4 w-4" />;
      case 'cabana': return <Crown className="h-4 w-4" />;
      case 'corporativo': return <Building2 className="h-4 w-4" />;
      default: return <Briefcase className="h-4 w-4" />;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'personal': return 'bg-blue-500';
      case 'avanzado': return 'bg-primary';
      case 'productor': return 'bg-primary';
      case 'cabana': return 'bg-purple-500';
      case 'corporativo': return 'bg-orange-500';
      default: return 'bg-muted-foreground';
    }
  };

  // Trial ending soon warning
  if (subscriptionStatus.isTrialActive && subscriptionStatus.trialDaysRemaining <= 7) {
    return (
      <Alert className="mb-4 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/30">
        <Clock className="h-4 w-4" />
        <AlertTitle>{t('trial.ending', { days: subscriptionStatus.trialDaysRemaining })}</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            {t('trial.daysRemaining', { days: subscriptionStatus.trialDaysRemaining })}. {t('trial.readOnlyMode')}
          </span>
          <Button onClick={onUpgrade} variant="outline" size="sm">
            {t('plan.upgradePlan')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Read-only mode warning
  if (subscriptionStatus.isReadOnly) {
    return (
      <Alert className="mb-4 border-destructive/30 bg-destructive/5">
        <Clock className="h-4 w-4" />
        <AlertTitle>{t('trial.readOnlyMode')}</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{t('trial.expired')}</span>
          <Button onClick={onUpgrade} variant="outline" size="sm">
            {t('plan.upgradePlan')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Automatic 7-day signup trial: show the trial, not the inflated "free" limit
  const inSignupTrial = !!subscriptionStatus.signupTrialActive && !subscriptionStatus.isSubscriptionActive;
  const signupDaysRemaining = Math.max(0, Math.min(7, subscriptionStatus.signupTrialDaysRemaining ?? 0));
  const unlimitedAnimals = subscriptionStatus.maxAnimals >= 99999;

  // Limit warnings
  const animalUsagePercent = unlimitedAnimals
    ? 0
    : (subscriptionStatus.currentAnimalsCount / subscriptionStatus.maxAnimals) * 100;

  return (
    <div className="space-y-4">
      {/* Offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <WifiOff className="h-3.5 w-3.5" />
          <span>{t('offline.cachedData', { defaultValue: 'Mostrando datos en caché' })}</span>
        </div>
      )}

      {/* Animal limit warning */}
      {animalUsagePercent >= 80 && (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <Clock className="h-4 w-4" />
          <AlertTitle>{t('plan.approachingLimit')}</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {t('animals.count', { current: subscriptionStatus.currentAnimalsCount, max: subscriptionStatus.maxAnimals })}
            </span>
            <Button onClick={onUpgrade} variant="outline" size="sm">
              {t('plan.upgradePlan')}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Current plan card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${inSignupTrial ? 'bg-primary' : getPlanColor(subscriptionStatus.plan)} text-white`}>
                {inSignupTrial ? <Clock className="h-4 w-4" /> : getPlanIcon(subscriptionStatus.plan)}
              </div>
              <div>
                <CardTitle className="text-lg">
                  {inSignupTrial
                    ? t('freeTrial.card.title', { defaultValue: 'Prueba gratuita de 7 días' })
                    : `Plan ${planNames[subscriptionStatus.plan]}`}
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  {inSignupTrial
                    ? t('freeTrial.card.subtitle', {
                        days: signupDaysRemaining,
                        defaultValue: 'Acceso completo — te quedan {{days}} días',
                      })
                    : subscriptionStatus.isSubscriptionActive
                    ? t('plan.active', { defaultValue: 'Suscripción activa' })
                    : subscriptionStatus.isTrialActive && subscriptionStatus.plan !== 'free'
                    ? t('trial.active', { defaultValue: 'Prueba gratuita activa' })
                    : t('plan.free', { defaultValue: 'Plan gratuito' })}
                </CardDescription>
              </div>
            </div>
            <Button onClick={onUpgrade} variant="outline" size="sm">
              {t('plan.viewPlans')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trial days remaining — hide for free plan (free is forever, no trial) */}
          {subscriptionStatus.isTrialActive && subscriptionStatus.plan !== 'free' && (
            <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  {t('trial.freeTrialLabel', { defaultValue: 'Prueba gratuita' })}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {subscriptionStatus.trialDaysRemaining} {t('common:days', { defaultValue: 'días' })}
                </Badge>
              </div>
              <Progress
                value={Math.max(0, ((14 - subscriptionStatus.trialDaysRemaining) / 14) * 100)}
                className="h-1.5"
              />
              {subscriptionStatus.trialEndDate && (
                <p className="text-xs text-muted-foreground">
                  {t('trial.endsOn', { defaultValue: 'Vence el' })}{' '}
                  {format(new Date(subscriptionStatus.trialEndDate), "d 'de' MMMM, yyyy", { locale: es })}
                </p>
              )}
            </div>
          )}

          {/* Subscription info */}
          {subscriptionStatus.isSubscriptionActive && (
            <div className="rounded-xl bg-primary/5 border border-primary/10 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  {t('plan.subscriptionLabel', { defaultValue: 'Suscripción' })}
                </div>
                {subscriptionStatus.subscriptionDaysRemaining != null ? (
                  <Badge variant="default" className="text-xs">
                    {subscriptionStatus.subscriptionDaysRemaining} {t('common:days', { defaultValue: 'días' })}
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs">
                    {t('plan.activeLabel', { defaultValue: 'Activa' })}
                  </Badge>
                )}
              </div>
              {subscriptionStatus.subscriptionEndDate ? (
                <p className="text-xs text-muted-foreground">
                  {t('plan.renewsOn', { defaultValue: 'Se renueva el' })}{' '}
                  {format(new Date(subscriptionStatus.subscriptionEndDate), "d 'de' MMMM, yyyy", { locale: es })}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t('plan.noExpiration', { defaultValue: 'Sin fecha de vencimiento configurada' })}
                </p>
              )}
            </div>
          )}

          {/* Animal usage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('animals.label', { defaultValue: 'Animales' })}</span>
              <span className="font-medium">
                {subscriptionStatus.currentAnimalsCount} / {subscriptionStatus.maxAnimals}
              </span>
            </div>
            <Progress value={Math.min(100, animalUsagePercent)} className="h-1.5" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
