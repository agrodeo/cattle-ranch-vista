import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BillingToggle } from '@/components/subscription/BillingToggle';
import { PlansCarousel } from '@/components/subscription/PlansCarousel';
import { CompareSheet } from '@/components/subscription/CompareSheet';
import { StickyFooterCTA } from '@/components/subscription/StickyFooterCTA';
import { FAQAccordion } from '@/components/subscription/FAQAccordion';
import { useToast } from '@/hooks/use-toast';

export type BillingCycle = 'monthly' | 'annual';
export type Platform = 'web' | 'ios' | 'android';

export interface Plan {
  id: string;
  nombre: string;
  badge?: string;
  precio_mensual: number;
  precio_anual: number;
  bullets: string[];
}

const PLANS_DATA: Plan[] = [
  {
    id: "free",
    nombre: "Gratuito",
    precio_mensual: 0,
    precio_anual: 0,
    bullets: ["Hasta 50 animales", "1 usuario", "Funciones básicas"]
  },
  {
    id: "personal",
    nombre: "Personal",
    precio_mensual: 24900,
    precio_anual: 24900 * 12 * 0.8,
    bullets: ["Hasta 500 animales", "2 usuarios", "Soporte estándar"]
  },
  {
    id: "avanzado",
    nombre: "Avanzado",
    precio_mensual: 44900,
    precio_anual: 44900 * 12 * 0.8,
    bullets: ["Hasta 2.000 animales", "Usuarios ilimitados", "Integraciones básicas"]
  },
  {
    id: "productor",
    nombre: "Productor",
    badge: "Más popular",
    precio_mensual: 69900,
    precio_anual: 69900 * 12 * 0.8,
    bullets: ["Hasta 10.000 animales", "Usuarios ilimitados", "Soporte prioritario"]
  },
  {
    id: "cabana",
    nombre: "Cabaña",
    badge: "Pro",
    precio_mensual: 149000,
    precio_anual: 149000 * 12 * 0.8,
    bullets: ["Animales ilimitados", "Reportes avanzados", "Roles y permisos"]
  },
  {
    id: "corporativo",
    nombre: "Corporativo",
    badge: "Empresas",
    precio_mensual: 159000,
    precio_anual: 159000 * 12 * 0.8,
    bullets: ["Multi-establecimiento", "SSO/seguridad", "Éxito del cliente dedicado"]
  }
];

// Platform detection
const getPlatform = (): Platform => {
  return 'web';
};

// Purchase functions (to be implemented)
const createMercadoPagoPreference = async (plan: Plan, billingCycle: BillingCycle) => {
  throw new Error('Payment integration not yet implemented');
};

const initiateIOSPurchase = async (plan: Plan, billingCycle: BillingCycle) => {
  throw new Error('iOS payments not yet implemented');
};

const initiateAndroidPurchase = async (plan: Plan, billingCycle: BillingCycle) => {
  throw new Error('Android payments not yet implemented');
};

const restoreIOSTransactions = async () => {
  throw new Error('iOS transaction restoration not yet implemented');
};

export default function Plans() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [compareSheetOpen, setCompareSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const platform = getPlatform();

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    // Track event
    console.log('Event: plan_selected', { plan: plan.id, billingCycle });
  };

  const handleBillingToggle = (cycle: BillingCycle) => {
    setBillingCycle(cycle);
    // Track event
    console.log('Event: billing_toggled', { cycle });
  };

  const handleCompareOpen = () => {
    setCompareSheetOpen(true);
    // Track event
    console.log('Event: compare_opened');
  };

  const handleContinue = async () => {
    if (!selectedPlan) return;

    setLoading(true);
    // Track event
    console.log('Event: purchase_started', { plan: selectedPlan.id, billingCycle, platform });

    try {
      let result;

      switch (platform) {
        case 'ios':
          result = await initiateIOSPurchase(selectedPlan, billingCycle);
          break;
        case 'android':
          result = await initiateAndroidPurchase(selectedPlan, billingCycle);
          break;
        case 'web':
          result = await createMercadoPagoPreference(selectedPlan, billingCycle);
          break;
      }

      if (result) {
        // Track success
        console.log('Event: purchase_succeeded', { plan: selectedPlan.id, billingCycle });
        
        toast({
          title: "¡Suscripción activa!",
          description: "Tu plan ha sido activado exitosamente.",
        });
        
        navigate('/dashboard');
      }
    } catch (error) {
      // Track failure
      console.log('Event: purchase_failed', { plan: selectedPlan.id, billingCycle, error });
      
      toast({
        title: "No pudimos completar la compra",
        description: "Intentá de nuevo. Si persiste, escribinos a ayuda@agrodeo.farm",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (platform !== 'ios') return;

    try {
      console.log('Event: restore_purchases');
      await restoreIOSTransactions();
      toast({
        title: "Compras restauradas",
        description: "Se han verificado tus compras anteriores.",
      });
    } catch (error) {
      toast({
        title: "Error al restaurar compras",
        description: "No se pudieron restaurar las compras anteriores.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-4 max-w-lg mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          {platform === 'ios' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRestorePurchases}
              className="text-sm"
            >
              Restaurar compras
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-32">
        {/* Hero Section */}
        <section className="text-center px-4 py-8 max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Elegí tu plan
          </h1>
          <p className="text-muted-foreground">
            Probalo 7 días. Cancelás cuando quieras.
          </p>
        </section>

        {/* Billing Toggle */}
        <section className="px-4 mb-8 max-w-lg mx-auto">
          <BillingToggle
            billingCycle={billingCycle}
            onToggle={handleBillingToggle}
          />
        </section>

        {/* Plans Carousel */}
        <section className="mb-8">
          <PlansCarousel
            plans={PLANS_DATA}
            billingCycle={billingCycle}
            selectedPlan={selectedPlan}
            onPlanSelect={handlePlanSelect}
            loading={loading}
          />
        </section>

        {/* Compare Plans Button */}
        <section className="px-4 mb-8 max-w-lg mx-auto">
          <Button
            variant="outline"
            onClick={handleCompareOpen}
            className="w-full"
          >
            Comparar planes
          </Button>
        </section>

        {/* FAQ Section */}
        <section className="px-4 mb-8 max-w-lg mx-auto">
          <FAQAccordion />
        </section>

        {/* Footer Links */}
        <footer className="px-4 max-w-lg mx-auto text-center space-y-2">
          <div className="flex justify-center space-x-4 text-sm text-muted-foreground">
            <button className="hover:text-foreground">Términos</button>
            <button className="hover:text-foreground">Privacidad</button>
            <button className="hover:text-foreground">Centro de ayuda</button>
          </div>
        </footer>
      </main>

      {/* Sticky Footer CTA */}
      {selectedPlan && (
        <StickyFooterCTA
          selectedPlan={selectedPlan}
          billingCycle={billingCycle}
          onContinue={handleContinue}
          loading={loading}
        />
      )}

      {/* Compare Sheet */}
      <CompareSheet
        open={compareSheetOpen}
        onOpenChange={setCompareSheetOpen}
        plans={PLANS_DATA}
        billingCycle={billingCycle}
        onPlanSelect={handlePlanSelect}
      />
    </div>
  );
}