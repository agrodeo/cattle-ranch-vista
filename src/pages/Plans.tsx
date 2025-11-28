import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { BillingToggle } from '@/components/subscription/BillingToggle';
import { PlansCarousel } from '@/components/subscription/PlansCarousel';
import { CompareSheet } from '@/components/subscription/CompareSheet';
import { StickyFooterCTA } from '@/components/subscription/StickyFooterCTA';
import { FAQAccordion } from '@/components/subscription/FAQAccordion';
import { useToast } from '@/hooks/use-toast';
import { useEntitlements } from '@/hooks/useEntitlements';
import { revenueCatService } from '@/services/revenueCatService';
import { detectPlatform, isNativeApp } from '@/lib/platformDetection';
import { usePlatformPurchase } from '@/hooks/usePlatformPurchase';

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

const getPlanData = (t: any): Plan[] => [
  {
    id: "free",
    nombre: t('subscription:plans.free.name'),
    precio_mensual: 0,
    precio_anual: 0,
    bullets: t('subscription:plans.free.bullets', { returnObjects: true }) as string[]
  },
  {
    id: "personal",
    nombre: t('subscription:plans.personal.name'),
    precio_mensual: 24900,
    precio_anual: 24900 * 12 * 0.8,
    bullets: t('subscription:plans.personal.bullets', { returnObjects: true }) as string[]
  },
  {
    id: "avanzado",
    nombre: t('subscription:plans.avanzado.name'),
    precio_mensual: 44900,
    precio_anual: 44900 * 12 * 0.8,
    bullets: t('subscription:plans.avanzado.bullets', { returnObjects: true }) as string[]
  },
  {
    id: "productor",
    nombre: t('subscription:plans.productor.name'),
    badge: t('subscription:plans.productor.badge'),
    precio_mensual: 69900,
    precio_anual: 69900 * 12 * 0.8,
    bullets: t('subscription:plans.productor.bullets', { returnObjects: true }) as string[]
  },
  {
    id: "cabana",
    nombre: t('subscription:plans.cabana.name'),
    badge: t('subscription:plans.cabana.badge'),
    precio_mensual: 149000,
    precio_anual: 149000 * 12 * 0.8,
    bullets: t('subscription:plans.cabana.bullets', { returnObjects: true }) as string[]
  },
  {
    id: "corporativo",
    nombre: t('subscription:plans.corporativo.name'),
    badge: t('subscription:plans.corporativo.badge'),
    precio_mensual: 159000,
    precio_anual: 159000 * 12 * 0.8,
    bullets: t('subscription:plans.corporativo.bullets', { returnObjects: true }) as string[]
  }
];

// Remove mock platform detection - use real one
// Remove mock purchase functions - use real RevenueCat

export default function Plans() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation(['subscription']);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [compareSheetOpen, setCompareSheetOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { offerings, refreshCustomerInfo } = useEntitlements();
  const { initiatePurchase, restorePurchases: restoreRevenueCat } = usePlatformPurchase();
  
  const platform = detectPlatform();
  const isNative = isNativeApp();
  
  const PLANS_DATA = getPlanData(t);
  
  // Get real packages from RevenueCat if available
  const realPackages = offerings?.current?.availablePackages || [];
  
  // Use real offerings if available on native, otherwise use PLANS_DATA for web
  const displayPlans = isNative && realPackages.length > 0 
    ? realPackages.map(pkg => {
        const id = pkg.identifier.toLowerCase();
        return {
          id: pkg.identifier,
          nombre: id.includes('lifetime') ? t('subscription:plansPage.free') : id.includes('year') ? t('subscription:plansModal.annual') : t('subscription:plansModal.monthly'),
          precio_mensual: pkg.product.price,
          precio_anual: pkg.product.price,
          bullets: [pkg.product.title, pkg.product.description],
          badge: id.includes('year') ? t('subscription:plansModal.mostPopular') : undefined
        } as Plan;
      })
    : PLANS_DATA;

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
    console.log('Event: purchase_started', { plan: selectedPlan.id, billingCycle, platform });

    try {
      if (isNative) {
        // Use RevenueCat for native platforms
        const pkg = realPackages.find(p => p.identifier === selectedPlan.id);
        if (pkg) {
          await revenueCatService.purchasePackage(pkg);
          await refreshCustomerInfo();
        } else {
          throw new Error('Package not found');
        }
      } else {
        // Use web purchase flow (MercadoPago)
        await initiatePurchase({
          planId: selectedPlan.id as any,
          billingCycle,
          platform
        });
      }

      console.log('Event: purchase_succeeded', { plan: selectedPlan.id, billingCycle });
      
      toast({
        title: t('subscription:plansPage.subscriptionActive'),
        description: t('subscription:plansPage.planActivated'),
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      if (error?.userCancelled) {
        return;
      }
      
      console.log('Event: purchase_failed', { plan: selectedPlan.id, billingCycle, error });
      
      toast({
        title: t('subscription:plansPage.purchaseFailed'),
        description: t('subscription:plansPage.purchaseFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestorePurchases = async () => {
    if (!isNative) return;

    try {
      console.log('Event: restore_purchases');
      
      if (platform === 'ios') {
        await revenueCatService.restorePurchases();
        await refreshCustomerInfo();
      } else {
        await restoreRevenueCat();
      }
      
      toast({
        title: t('subscription:plansPage.purchasesRestored'),
        description: t('subscription:plansPage.purchasesRestoredDesc'),
      });
    } catch (error) {
      toast({
        title: t('subscription:plansPage.restoreError'),
        description: t('subscription:plansPage.restoreErrorDesc'),
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
          {isNative && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRestorePurchases}
              className="text-sm"
            >
              {t('subscription:plansPage.restorePurchases')}
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-32">
        {/* Hero Section */}
        <section className="text-center px-4 py-8 max-w-lg mx-auto">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('subscription:plansPage.title')}
          </h1>
          <p className="text-muted-foreground">
            {t('subscription:plansPage.subtitle')}
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
            plans={displayPlans}
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
            {t('subscription:plansPage.comparePlans')}
          </Button>
        </section>

        {/* FAQ Section */}
        <section className="px-4 mb-8 max-w-lg mx-auto">
          <FAQAccordion />
        </section>

        {/* Footer Links */}
        <footer className="px-4 max-w-lg mx-auto text-center space-y-2">
          <div className="flex justify-center space-x-4 text-sm text-muted-foreground">
            <button className="hover:text-foreground">{t('subscription:plansPage.terms')}</button>
            <button className="hover:text-foreground">{t('subscription:plansPage.privacy')}</button>
            <button className="hover:text-foreground">{t('subscription:plansPage.helpCenter')}</button>
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