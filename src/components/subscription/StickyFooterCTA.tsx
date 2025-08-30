import React from 'react';
import { Button } from '@/components/ui/button';
import { Plan, BillingCycle } from '@/pages/Plans';

interface StickyFooterCTAProps {
  selectedPlan: Plan;
  billingCycle: BillingCycle;
  onContinue: () => void;
  loading?: boolean;
}

const formatPrice = (price: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(price);
};

export function StickyFooterCTA({ 
  selectedPlan, 
  billingCycle, 
  onContinue, 
  loading 
}: StickyFooterCTAProps) {
  const price = billingCycle === 'monthly' 
    ? selectedPlan.precio_mensual 
    : selectedPlan.precio_anual / 12;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-lg z-50">
      <div className="max-w-lg mx-auto p-4 space-y-3">
        {/* Plan and Price */}
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-foreground">
              {selectedPlan.nombre}
            </div>
            <div className="text-sm text-muted-foreground">
              {selectedPlan.precio_mensual === 0 
                ? 'Plan gratuito' 
                : `${formatPrice(price)}/mes`
              }
              {billingCycle === 'annual' && selectedPlan.precio_mensual > 0 && (
                <span className="ml-1">
                  ({formatPrice(selectedPlan.precio_anual)}/año)
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
            {loading ? 'Procesando...' : 'Continuar'}
          </Button>
        </div>

        {/* Legal Text */}
        <p className="text-xs text-muted-foreground text-center">
          Suscripción auto-renovable. Administrás/cancelás desde tu cuenta.
        </p>
      </div>
    </div>
  );
}