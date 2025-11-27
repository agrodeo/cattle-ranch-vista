import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, Zap, Crown, Building2, Briefcase } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useTranslation } from 'react-i18next';

interface SubscriptionAlertProps {
  onUpgrade?: () => void;
}

export const SubscriptionAlert = ({ onUpgrade }: SubscriptionAlertProps) => {
  const { subscriptionStatus, planNames } = useSubscription();
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
      case 'productor': return 'bg-green-500';
      case 'cabana': return 'bg-purple-500';
      case 'corporativo': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  // Trial ending soon warning
  if (subscriptionStatus.isTrialActive && subscriptionStatus.trialDaysRemaining <= 7) {
    return (
      <Alert className="mb-4 border-orange-200 bg-orange-50">
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
      <Alert className="mb-4 border-red-200 bg-red-50">
        <Clock className="h-4 w-4" />
        <AlertTitle>{t('trial.readOnlyMode')}</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>
            {t('trial.expired')}
          </span>
          <Button onClick={onUpgrade} variant="outline" size="sm">
            {t('plan.upgradePlan')}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Limit warnings
  const animalUsagePercent = (subscriptionStatus.currentAnimalsCount / subscriptionStatus.maxAnimals) * 100;

  if (animalUsagePercent >= 80) {
    return (
      <Alert className="mb-4 border-yellow-200 bg-yellow-50">
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
    );
  }

  // Current plan status
  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${getPlanColor(subscriptionStatus.plan)} text-white`}>
              {getPlanIcon(subscriptionStatus.plan)}
            </div>
            <div>
              <CardTitle className="text-lg">Plan {planNames[subscriptionStatus.plan]}</CardTitle>
              {subscriptionStatus.isTrialActive && (
                <Badge variant="secondary">
                  {t('trial.daysRemaining', { days: subscriptionStatus.trialDaysRemaining })}
                </Badge>
              )}
            </div>
          </div>
          <Button onClick={onUpgrade} variant="outline" size="sm">
            {t('plan.viewPlans')}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 text-sm">
          <div>
            <CardDescription>{t('animals.count', { current: subscriptionStatus.currentAnimalsCount, max: subscriptionStatus.maxAnimals })}</CardDescription>
            <p className="font-medium">
              {subscriptionStatus.currentAnimalsCount} / {subscriptionStatus.maxAnimals}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};