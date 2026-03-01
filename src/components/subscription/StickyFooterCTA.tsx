import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Plan, BillingCycle } from '@/pages/Plans';

interface StickyFooterCTAProps {
  selectedPlan: Plan;
  billingCycle: BillingCycle;
  onContinue: () => void;
  loading?: boolean;
}

const formatPrice = (cents: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
};

export function StickyFooterCTA({ 
  selectedPlan, 
  billingCycle, 
  onContinue, 
  loading 
}: StickyFooterCTAProps) {
  const { t } = useTranslation(['subscription']);
  const price = billingCycle === 'monthly' 
    ? selectedPlan.precio_mensual 
    : Math.round(selectedPlan.precio_anual / 12);
  const isFree = selectedPlan.precio_mensual === 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50 pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="max-w-lg mx-auto p-4 space-y-3">
        {/* Plan and Price */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-foreground">
              {selectedPlan.nombre}
            </div>
            <div className="text-sm text-muted-foreground">
              {isFree 
                ? t('subscription:plansPage.freePlanLabel') 
                : `${formatPrice(price)}${t('subscription:plansPage.perMonth')}`
              }
              {billingCycle === 'annual' && !isFree && (
                <span className="ml-1">
                  ({formatPrice(selectedPlan.precio_anual)}{t('subscription:plansPage.perYear')})
                </span>
              )}
            </div>
          </div>
          
          <Button
            onClick={onContinue}
            disabled={loading}
            className="min-h-[44px] px-8 font-medium"
            size="lg"
          >
            {loading 
              ? t('subscription:plansPage.processing') 
              : isFree 
                ? t('subscription:plansPage.continue') 
                : t('subscription:plansPage.startTrial')
            }
          </Button>
        </div>

        {/* Legal Text */}
        <p className="text-xs text-muted-foreground text-center">
          {isFree
            ? t('subscription:plansPage.continue')
            : t('subscription:plansPage.trialLegal')
          }
        </p>
      </div>
    </div>
  );
}
