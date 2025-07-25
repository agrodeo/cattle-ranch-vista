import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Check, Users, Zap, Crown, Building2, Briefcase } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

interface SubscriptionPlansModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const plans = [
  {
    id: 'personal',
    name: 'Personal',
    icon: Users,
    color: 'bg-blue-500',
    maxAnimals: 200,
    maxUsers: 3,
    features: [
      'Hasta 200 animales',
      'Hasta 3 usuarios',
      'Reportes básicos',
      'Soporte por email'
    ],
    monthly: 24900,
    annual: 249000
  },
  {
    id: 'avanzado',
    name: 'Avanzado',
    icon: Zap,
    color: 'bg-indigo-500',
    maxAnimals: 600,
    maxUsers: 4,
    features: [
      'Hasta 600 animales',
      'Hasta 4 usuarios',
      'Reportes intermedios',
      'Exportación de datos',
      'Soporte por email'
    ],
    monthly: 44900,
    annual: 449000
  },
  {
    id: 'productor',
    name: 'Productor',
    icon: Crown,
    color: 'bg-green-500',
    maxAnimals: 1000,
    maxUsers: 5,
    features: [
      'Hasta 1,000 animales',
      'Hasta 5 usuarios',
      'Reportes avanzados',
      'Analytics en tiempo real',
      'Exportación de datos',
      'Soporte prioritario'
    ],
    monthly: 69900,
    annual: 699000,
    popular: true
  },
  {
    id: 'cabana',
    name: 'Cabaña',
    icon: Building2,
    color: 'bg-purple-500',
    maxAnimals: 5000,
    maxUsers: 15,
    features: [
      'Hasta 5,000 animales',
      'Hasta 15 usuarios',
      'Todos los reportes',
      'Dashboard ejecutivo',
      'API access',
      'Integración con sistemas',
      'Soporte telefónico'
    ],
    monthly: 149000,
    annual: 1490000
  },
  {
    id: 'corporativo',
    name: 'Corporativo',
    icon: Briefcase,
    color: 'bg-orange-500',
    maxAnimals: 'Ilimitado',
    maxUsers: 'Ilimitado',
    features: [
      'Animales ilimitados',
      'Usuarios ilimitados',
      'Funcionalidades personalizadas',
      'Servidor dedicado',
      'Soporte 24/7',
      'Implementación personalizada'
    ],
    monthly: 159000,
    annual: 1590000
  }
];

export const SubscriptionPlansModal = ({ open, onOpenChange }: SubscriptionPlansModalProps) => {
  const [isAnnual, setIsAnnual] = useState(false);
  const { subscriptionStatus, upgradePlan } = useSubscription();

  const handleSelectPlan = async (planId: string) => {
    if (planId === 'corporativo') {
      // Handle corporate plan contact
      window.open('mailto:ventas@agrodeo.com?subject=Plan Corporativo', '_blank');
      return;
    }

    const success = await upgradePlan(planId as any);
    if (success) {
      onOpenChange(false);
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
          <DialogTitle className="text-2xl">Planes de Suscripción</DialogTitle>
          <DialogDescription>
            Elige el plan que mejor se adapte a las necesidades de tu operation ganadera
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center space-x-2 justify-center my-6">
          <Label htmlFor="billing-toggle">Mensual</Label>
          <Switch
            id="billing-toggle"
            checked={isAnnual}
            onCheckedChange={setIsAnnual}
          />
          <Label htmlFor="billing-toggle">Anual <Badge variant="secondary">-17%</Badge></Label>
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
                  Gratuito
                  {currentPlan === 'free' && <Badge>Plan Actual</Badge>}
                </CardTitle>
                <CardDescription>Perfecto para empezar</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <p className="text-2xl font-bold">$0</p>
                <p className="text-sm text-muted-foreground">30 días de prueba completa</p>
                <ul className="mt-4 space-y-2">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Hasta 50 animales</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Hasta 2 usuarios</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Funcionalidades básicas</span>
                  </li>
                </ul>
              </div>
              <div className="flex items-end">
                <Button 
                  variant="outline" 
                  className="w-full"
                  disabled={currentPlan === 'free'}
                >
                  {currentPlan === 'free' ? 'Plan Actual' : 'Downgrade'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid lg:grid-cols-2 xl:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = isAnnual ? plan.annual : plan.monthly;
            const isCurrentPlan = currentPlan === plan.id;
            
            return (
              <Card key={plan.id} className={`relative ${plan.popular ? 'ring-2 ring-primary' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                    Más Popular
                  </Badge>
                )}
                
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${plan.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="flex items-center gap-2">
                      {plan.name}
                      {isCurrentPlan && <Badge>Actual</Badge>}
                    </CardTitle>
                  </div>
                  <CardDescription>
                    {typeof plan.maxAnimals === 'number' 
                      ? `Hasta ${plan.maxAnimals.toLocaleString()} animales`
                      : `${plan.maxAnimals} animales`}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div>
                    <p className="text-3xl font-bold">{formatPrice(price)}</p>
                    <p className="text-sm text-muted-foreground">
                      {isAnnual ? 'por año' : 'por mes'}
                    </p>
                    {isAnnual && (
                      <p className="text-xs text-green-600">
                        Ahorras {formatPrice((plan.monthly * 12) - plan.annual)}
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
                    disabled={isCurrentPlan}
                  >
                    {isCurrentPlan 
                      ? 'Plan Actual' 
                      : plan.id === 'corporativo' 
                        ? 'Contactar Ventas'
                        : 'Seleccionar Plan'
                    }
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Todos los planes incluyen soporte técnico y actualizaciones gratuitas.</p>
          <p>Los precios están en pesos argentinos e incluyen IVA.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};