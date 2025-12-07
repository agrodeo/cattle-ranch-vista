import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Users, Zap, Crown, Building2, Briefcase, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { usePlatformPurchase } from "@/hooks/usePlatformPurchase";
import { isNativeApp } from "@/lib/platformDetection";
import { toast } from "sonner";

interface SubscriptionPlansModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getPlansData = (t: any) => [
  {
    id: 'personal',
    name: t('plans.personal.name'),
    icon: Users,
    color: 'bg-blue-500',
    maxAnimals: 125,
    features: [
      t('plansModal.aiChatLimited'),
      t('plansModal.emailSupport')
    ],
    monthly: 24900,
    annual: 249000
  },
  {
    id: 'avanzado',
    name: t('plans.avanzado.name'),
    icon: Zap,
    color: 'bg-indigo-500',
    maxAnimals: 250,
    features: [
      t('plansModal.aiChatUnlimited'),
      t('plansModal.emailSupport')
    ],
    monthly: 44900,
    annual: 449000
  },
  {
    id: 'productor',
    name: t('plans.productor.name'),
    icon: Crown,
    color: 'bg-primary',
    maxAnimals: 500,
    features: [
      t('plansModal.aiChatUnlimited'),
      t('plansModal.prioritySupport')
    ],
    monthly: 69900,
    annual: 699000,
    popular: true
  },
  {
    id: 'cabana',
    name: t('plans.cabana.name'),
    icon: Building2,
    color: 'bg-purple-500',
    maxAnimals: 1000,
    features: [
      t('plansModal.aiChatUnlimited'),
      t('plansModal.prioritySupport')
    ],
    monthly: 149000,
    annual: 1490000
  },
  {
    id: 'corporativo',
    name: t('plans.corporativo.name'),
    icon: Briefcase,
    color: 'bg-orange-500',
    maxAnimals: 'unlimited',
    features: [
      t('plansModal.aiChatUnlimited'),
      t('plansModal.support24x7')
    ],
    monthly: 159000,
    annual: 1590000
  }
];

export const SubscriptionPlansModal = ({ open, onOpenChange }: SubscriptionPlansModalProps) => {
  const { t } = useTranslation('subscription');
  const [isAnnual, setIsAnnual] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const { subscriptionStatus, upgradePlan, fetchSubscriptionStatus } = useSubscription();
  const { initiatePurchase } = usePlatformPurchase();
  const isNative = isNativeApp();
  
  const plans = getPlansData(t);

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'corporativo') {
      // Handle corporate plan contact
      window.open('mailto:ventas@agrodeo.com?subject=Plan Corporativo', '_blank');
      return;
    }

    setIsPurchasing(true);
    
    try {
      if (isNative) {
        // Use RevenueCat for iOS/Android purchases
        await initiatePurchase({
          planId,
          billingCycle: isAnnual ? 'annual' : 'monthly',
          platform: 'ios'
        });
        
        // Refresh subscription status after purchase
        await fetchSubscriptionStatus();
        toast.success(t('plansModal.purchaseSuccess', 'Suscripción activada exitosamente'));
        onOpenChange(false);
      } else {
        // Use web payment (MercadoPago) for web users
        const success = await upgradePlan(planId as any);
        if (success) {
          onOpenChange(false);
        }
      }
    } catch (error: any) {
      console.error('Purchase error:', error);
      // Don't show error for user cancellation
      if (!error.message?.includes('cancelled') && !error.message?.includes('canceled')) {
        toast.error(t('plansModal.purchaseError', 'Error al procesar la compra'));
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(price);
  };

  const currentPlan = subscriptionStatus?.plan;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{t('plansModal.title')}</DialogTitle>
          <DialogDescription>
            {t('plansModal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 justify-center my-6">
          <Label htmlFor="billing-toggle">{t('plansModal.monthly')}</Label>
          <Switch
            id="billing-toggle"
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
          />
          <Label htmlFor="billing-toggle">{t('plansModal.annual')} <Badge variant="secondary">{t('plansModal.discount')}</Badge></Label>
        </div>

        {/* Free Plan */}
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-500 text-white">
                <Briefcase className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  {t('plansModal.free')}
                  {currentPlan === 'free' && <Badge>{t('plansModal.currentPlan')}</Badge>}
                </CardTitle>
                <CardDescription>{t('plansModal.freePlanDesc', 'Perfecto para empezar')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">$0</p>
                <p className="text-sm text-muted-foreground">{t('plansModal.freeTrial', '30 días de prueba completa')}</p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{t('plansModal.upTo')} 50 {t('plansModal.animals')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{t('plansModal.aiChatLimited')}</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{t('plansModal.emailSupport')}</span>
                  </li>
                </ul>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={currentPlan === 'free'}
                >
                  {currentPlan === 'free' ? t('plansModal.currentPlan') : t('plansModal.downgrade', 'Downgrade')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = isAnnual ? plan.annual : plan.monthly;
            const isCurrentPlan = currentPlan === plan.id;
            
            return (
              <Card key={plan.id} className={`relative ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                    {t('plansModal.mostPopular', 'Más Popular')}
                  </Badge>
                )}
                
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${plan.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="flex items-center gap-2">
                      {plan.name}
                      {isCurrentPlan && <Badge>{t('plansModal.currentPlan')}</Badge>}
                    </CardTitle>
                  </div>
                  <CardDescription>
                    {typeof plan.maxAnimals === 'number' 
                      ? `${t('plansModal.upTo')} ${plan.maxAnimals.toLocaleString()} ${t('plansModal.animals')}`
                      : t('plansModal.unlimitedAnimals')}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <p className="text-3xl font-bold">{formatPrice(price)}</p>
                    <p className="text-sm text-muted-foreground">
                      {isAnnual ? t('plansModal.perYear') : t('plansModal.perMonth')}
                    </p>
                    {isAnnual && (
                      <p className="text-xs text-green-600">
                        {t('plansModal.youSave', 'Ahorras')} {formatPrice((plan.monthly * 12) - plan.annual)}
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSelectPlan(plan.id)}
                    disabled={isCurrentPlan || isPurchasing}
                  >
                    {isPurchasing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isCurrentPlan 
                      ? t('plansModal.currentPlan')
                      : plan.id === 'corporativo' 
                        ? t('plansModal.contactSales', 'Contactar Ventas')
                        : t('plansModal.selectPlan')
                    }
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>{t('plansModal.allPlansInclude', 'Todos los planes incluyen soporte técnico y actualizaciones gratuitas.')}</p>
          <p>{t('plansModal.pricesDisclaimer', 'Los precios están en pesos argentinos e incluyen IVA.')}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};