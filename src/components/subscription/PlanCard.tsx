import React from 'react';
import { Check, Users, Shield, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Plan, BillingCycle } from '@/pages/Plans';

interface PlanCardProps {
  plan: Plan;
  billingCycle: BillingCycle;
  isSelected: boolean;
  onSelect: () => void;
  loading?: boolean;
}

const getIcon = (index: number) => {
  const icons = [Users, Shield, Zap];
  const Icon = icons[index % icons.length];
  return Icon;
};

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(price);
};

export function PlanCard({ plan, billingCycle, isSelected, onSelect, loading }: PlanCardProps) {
  const { t } = useTranslation(['subscription']);
  const price = billingCycle === 'monthly' ? plan.precio_mensual : plan.precio_anual / 12;
  const totalAnual = plan.precio_anual;
  const isFree = plan.precio_mensual === 0;

  return (
    <Card 
      className={cn(
        "w-72 rounded-2xl transition-all duration-200 cursor-pointer hover:shadow-lg",
        isSelected && "ring-2 ring-green-500 ring-offset-2 shadow-lg"
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-4">
        {/* Badge */}
        {plan.badge && (
          <Badge 
            variant={plan.badge === 'Más popular' ? 'default' : 'secondary'}
            className="self-start mb-2"
          >
            {plan.badge}
          </Badge>
        )}
        
        {/* Plan Name */}
        <h3 className="text-xl font-bold text-foreground">{plan.nombre}</h3>
        
        {/* Price */}
        <div className="space-y-1">
          <div className="flex items-baseline">
            <span className="text-3xl font-bold text-foreground">
              {isFree ? t('subscription:plansPage.free') : formatPrice(price)}
            </span>
            {!isFree && <span className="text-muted-foreground ml-1">{t('subscription:plansPage.perMonth')}</span>}
          </div>
          {billingCycle === 'annual' && !isFree && (
            <p className="text-sm text-muted-foreground">
              {formatPrice(totalAnual)}{t('subscription:plansPage.perYear')}
            </p>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Features */}
        <ul className="space-y-3">
          {plan.bullets.map((bullet, index) => {
            const Icon = getIcon(index);
            return (
              <li key={index} className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm text-foreground">{bullet}</span>
              </li>
            );
          })}
        </ul>

        {/* Action Button */}
        <Button
          onClick={(e) => {
            e.stopPropagation();
            onSelect();
          }}
          disabled={loading}
          className={cn(
            "w-full min-h-[44px] font-medium"
          )}
          variant={isSelected ? 'default' : 'outline'}
        >
          {isSelected && <Check className="h-4 w-4 mr-2" />}
          {isSelected ? t('subscription:plansPage.selected') : `${t('subscription:plansPage.choose')} ${plan.nombre}`}
        </Button>
      </CardContent>
    </Card>
  );
}