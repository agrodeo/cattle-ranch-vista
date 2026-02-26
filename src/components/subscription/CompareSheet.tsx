import React from 'react';
import { Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plan, BillingCycle } from '@/pages/Plans';

interface CompareSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plans: Plan[];
  billingCycle: BillingCycle;
  onPlanSelect: (plan: Plan) => void;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(price);
};

export function CompareSheet({ 
  open, 
  onOpenChange, 
  plans, 
  billingCycle, 
  onPlanSelect 
}: CompareSheetProps) {
  const { t } = useTranslation(['subscription']);

  const FEATURES = [
    {
      name: t('plansPage.compare.animals'),
      getValue: (plan: Plan) => {
        const map: Record<string, string> = {
          free: t('plansPage.compare.upTo50'),
          personal: t('plansPage.compare.upTo125'),
          avanzado: t('plansPage.compare.upTo250'),
          productor: t('plansPage.compare.upTo500'),
          cabana: t('plansPage.compare.upTo1000'),
          corporativo: t('plansPage.compare.unlimited'),
        };
        return map[plan.id] ?? '—';
      }
    },
    {
      name: t('plansPage.compare.aiChat'),
      getValue: (plan: Plan): string | boolean => {
        if (plan.id === 'free') return false;
        if (plan.id === 'personal') return t('plansPage.compare.limited20mo');
        return t('plansPage.compare.unlimitedChat');
      }
    },
    {
      name: t('plansPage.compare.support'),
      getValue: (plan: Plan) => {
        const map: Record<string, string> = {
          free: t('plansPage.compare.basic'),
          personal: t('plansPage.compare.email'),
          avanzado: t('plansPage.compare.email'),
          productor: t('plansPage.compare.priority'),
          cabana: t('plansPage.compare.priority'),
          corporativo: t('plansPage.compare.support247'),
        };
        return map[plan.id] ?? '—';
      }
    }
  ];

  const renderFeatureValue = (value: string | boolean | number) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check className="h-4 w-4 text-green-600 mx-auto" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground mx-auto" />
      );
    }
    return <span className="text-sm text-center">{value}</span>;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl">
        <SheetHeader className="pb-4">
          <SheetTitle>{t('plansPage.compare.title')}</SheetTitle>
          <SheetDescription>
            {t('plansPage.compare.description')}
          </SheetDescription>
        </SheetHeader>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left p-2 w-32"></th>
                {plans.map((plan) => (
                  <th key={plan.id} className="text-center p-2 min-w-28">
                    <div className="space-y-2">
                      {plan.badge && (
                        <Badge variant="secondary" className="text-xs">
                          {plan.badge}
                        </Badge>
                      )}
                      <div className="font-semibold text-sm">{plan.nombre}</div>
                      <div className="text-xs text-muted-foreground">
                        {plan.precio_mensual === 0 
                          ? t('plansPage.compare.free')
                          : formatPrice(billingCycle === 'monthly' 
                              ? plan.precio_mensual 
                              : plan.precio_anual / 12
                            ) + t('plansPage.perMonth')
                        }
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feature, index) => (
                <tr key={index} className="border-t">
                  <td className="p-3 font-medium text-sm text-left">
                    {feature.name}
                  </td>
                  {plans.map((plan) => (
                    <td key={plan.id} className="p-3 text-center">
                      {renderFeatureValue(feature.getValue(plan))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-6 lg:grid-cols-3">
          {plans.slice(1).map((plan) => (
            <Button
              key={plan.id}
              onClick={() => {
                onPlanSelect(plan);
                onOpenChange(false);
              }}
              variant={plan.id === 'productor' ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
            >
              {t('plansPage.compare.choosePlan', { name: plan.nombre })}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
