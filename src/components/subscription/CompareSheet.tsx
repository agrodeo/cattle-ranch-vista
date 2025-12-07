import React from 'react';
import { Check, X } from 'lucide-react';
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

interface Feature {
  name: string;
  getValue: (plan: Plan) => string | boolean | number;
}

const FEATURES: Feature[] = [
  {
    name: 'Capacidad de animales',
    getValue: (plan) => {
      if (plan.id === 'free') return 'Hasta 50';
      if (plan.id === 'personal') return 'Hasta 125';
      if (plan.id === 'avanzado') return 'Hasta 250';
      if (plan.id === 'productor') return 'Hasta 500';
      if (plan.id === 'cabana') return 'Hasta 1.000';
      if (plan.id === 'corporativo') return 'Ilimitados';
      return '—';
    }
  },
  {
    name: 'Chat IA',
    getValue: (plan) => {
      if (plan.id === 'free') return false;
      if (plan.id === 'personal') return '20 mensajes/mes';
      return 'Ilimitado';
    }
  },
  {
    name: 'Usuarios',
    getValue: (plan) => {
      if (plan.id === 'free') return '1 usuario';
      return 'Ilimitados';
    }
  },
  {
    name: 'Soporte',
    getValue: (plan) => {
      if (plan.id === 'free') return 'Básico';
      if (plan.id === 'personal' || plan.id === 'avanzado') return 'Estándar';
      if (plan.id === 'productor') return 'Prioritario';
      if (plan.id === 'cabana') return 'Avanzado';
      if (plan.id === 'corporativo') return 'Dedicado';
      return '—';
    }
  },
  {
    name: 'Integraciones',
    getValue: (plan) => {
      if (plan.id === 'free' || plan.id === 'personal') return false;
      if (plan.id === 'avanzado') return 'Básicas';
      return true;
    }
  },
  {
    name: 'Roles y permisos',
    getValue: (plan) => ['cabana', 'corporativo'].includes(plan.id)
  },
  {
    name: 'Reportes avanzados',
    getValue: (plan) => ['cabana', 'corporativo'].includes(plan.id)
  },
  {
    name: 'Multi-establecimiento',
    getValue: (plan) => plan.id === 'corporativo'
  },
  {
    name: 'SSO/Seguridad',
    getValue: (plan) => plan.id === 'corporativo'
  }
];

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
          <SheetTitle>Comparar planes</SheetTitle>
          <SheetDescription>
            Encontrá el plan perfecto para tu operación
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
                          ? 'Gratis' 
                          : formatPrice(billingCycle === 'monthly' 
                              ? plan.precio_mensual 
                              : plan.precio_anual / 12
                            ) + '/mes'
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

        {/* CTA Buttons */}
        <div className="grid grid-cols-2 gap-2 mt-6 lg:grid-cols-3">
          {plans.slice(1).map((plan) => ( // Skip free plan for CTAs
            <Button
              key={plan.id}
              onClick={() => {
                onPlanSelect(plan);
                onOpenChange(false);
              }}
              variant={plan.badge === 'Más popular' ? 'default' : 'outline'}
              size="sm"
              className="text-xs"
            >
              Elegir {plan.nombre}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}