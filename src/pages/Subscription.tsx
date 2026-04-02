import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { SubscriptionAlert } from "@/components/subscription/SubscriptionAlert";
import { SubscriptionPlansModal } from "@/components/subscription/SubscriptionPlansModal";
import { CustomerCenter } from "@/components/subscription/CustomerCenter";
import { CreditCard, Settings } from "lucide-react";
import { isNativeApp } from "@/lib/platformDetection";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export default function Subscription() {
  const { t } = useTranslation(['subscription', 'common']);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showCustomerCenter, setShowCustomerCenter] = useState(false);
  const isNative = isNativeApp();

  useEffect(() => {
    document.title = "Suscripción | agrodeo";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Gestiona tu plan de suscripción y límites de uso");
  }, []);

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
      <div className="space-y-3">
        <PageHeader 
          title={t('subscription:title', 'Suscripción')}
          subtitle={t('subscription:subtitle', 'Gestiona tu plan y límites de uso')}
          action={
            <div className="flex gap-2">
              {isNative && (
                <Button 
                  onClick={() => setShowCustomerCenter(true)}
                  variant="outline"
                >
                  <Settings className="h-4 w-4 mr-2" />
                  {t('subscription:customerCenter', 'Centro de Suscripción')}
                </Button>
              )}
              <Button 
                onClick={() => setShowPlansModal(true)}
              >
                <CreditCard className="h-4 w-4 mr-2" />
                {t('subscription:viewPlans', 'Ver Planes')}
              </Button>
            </div>
          }
        />

        <SectionCard
          title={t('subscription:status', 'Estado de Suscripción')}
          subtitle={t('subscription:currentPlan', 'Información de tu plan actual')}
        >
          <SubscriptionAlert onUpgrade={() => setShowPlansModal(true)} />
        </SectionCard>

        <SubscriptionPlansModal 
          open={showPlansModal} 
          onOpenChange={setShowPlansModal} 
        />

        {isNative && (
          <CustomerCenter 
            open={showCustomerCenter} 
            onOpenChange={setShowCustomerCenter} 
          />
        )}
      </div>
    </div>
  );
}