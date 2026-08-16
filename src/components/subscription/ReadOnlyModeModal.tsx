import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Crown, Zap, Smartphone, Globe } from "lucide-react";
import { detectPlatform, getPlatformStoreName } from "@/lib/platformDetection";
import { usePlatformPurchase } from "@/hooks/usePlatformPurchase";
import { useTranslation } from "react-i18next";
import { useSubscription } from "@/hooks/useSubscription";

interface ReadOnlyModeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpgrade: () => void;
}

export const ReadOnlyModeModal = ({ open, onOpenChange, onUpgrade }: ReadOnlyModeModalProps) => {
  const { t } = useTranslation('subscription');
  const { subscriptionStatus } = useSubscription();
  const platform = detectPlatform();
  // State B: the automatic 7-day signup trial ended and no plan was chosen yet
  const signupTrialEnded = !subscriptionStatus?.trialUsed;
  const { initiatePurchase } = usePlatformPurchase();
  const storeName = getPlatformStoreName(platform);

  const handleUpgrade = () => {
    onOpenChange(false);
    onUpgrade();
  };

  const handleQuickPurchase = async (planId: string) => {
    await initiatePurchase({
      planId,
      billingCycle: 'monthly',
      platform
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 p-3 rounded-full bg-orange-100">
            <Lock className="h-8 w-8 text-orange-600" />
          </div>
          <DialogTitle className="text-xl">
            {signupTrialEnded ? t('freeTrial.ended.title') : t('readOnlyModal.title')}
          </DialogTitle>
          <DialogDescription>
            {signupTrialEnded ? t('freeTrial.ended.description') : t('readOnlyModal.description')}
          </DialogDescription>
          <div className="flex items-center justify-center gap-2 mt-2 text-sm text-muted-foreground">
            {platform === 'web' ? <Globe className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
            <span>{t('readOnlyModal.buyIn')} {storeName}</span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-center">{t('readOnlyModal.whatCanYouDo')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-green-100">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <span className="text-sm">{t('readOnlyModal.viewData')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-green-100">
                  <span className="text-green-600 text-sm">✓</span>
                </div>
                <span className="text-sm">{t('readOnlyModal.generateReports')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-red-100">
                  <span className="text-red-600 text-sm">✗</span>
                </div>
                <span className="text-sm">{t('readOnlyModal.addAnimals')}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-red-100">
                  <span className="text-red-600 text-sm">✗</span>
                </div>
                <span className="text-sm">{t('readOnlyModal.editInfo')}</span>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Card 
              className="text-center cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleQuickPurchase('productor')}
            >
              <CardContent className="p-4">
                <Zap className="h-6 w-6 mx-auto mb-2 text-green-600" />
                <CardTitle className="text-sm">{t('readOnlyModal.planProducer')}</CardTitle>
                <CardDescription className="text-xs">{t('readOnlyModal.planProducerDesc')}</CardDescription>
                <p className="text-lg font-bold mt-1">$49.99{t('readOnlyModal.perMonth')}</p>
                <Button size="sm" className="w-full mt-2">
                  {t('readOnlyModal.buyIn')} {storeName}
                </Button>
              </CardContent>
            </Card>

            <Card 
              className="text-center cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleQuickPurchase('cabana')}
            >
              <CardContent className="p-4">
                <Crown className="h-6 w-6 mx-auto mb-2 text-purple-600" />
                <CardTitle className="text-sm">{t('readOnlyModal.planCabana')}</CardTitle>
                <CardDescription className="text-xs">{t('readOnlyModal.planCabanaDesc')}</CardDescription>
                <p className="text-lg font-bold mt-1">$89.99{t('readOnlyModal.perMonth')}</p>
                <Button size="sm" variant="outline" className="w-full mt-2">
                  {t('readOnlyModal.buyIn')} {storeName}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              {t('readOnlyModal.continueReadOnly')}
            </Button>
            <Button onClick={handleUpgrade} className="flex-1">
              {t('readOnlyModal.viewAllPlans')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};