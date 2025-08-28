import { useState, useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Button } from "@/components/ui/button";
import { SubscriptionAlert } from "@/components/subscription/SubscriptionAlert";
import { SubscriptionPlansModal } from "@/components/subscription/SubscriptionPlansModal";
import { CreditCard } from "lucide-react";

export default function Subscription() {
  const [showPlansModal, setShowPlansModal] = useState(false);

  useEffect(() => {
    document.title = "Suscripción | AgroDeo";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute("content", "Gestiona tu plan de suscripción y límites de uso");
  }, []);

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
      <div className="space-y-3">
        <PageHeader 
          title="Suscripción"
          subtitle="Gestiona tu plan y límites de uso"
          action={
            <Button 
              onClick={() => setShowPlansModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Ver Planes
            </Button>
          }
        />

        <SectionCard
          title="Estado de Suscripción"
          subtitle="Información de tu plan actual"
        >
          <SubscriptionAlert onUpgrade={() => setShowPlansModal(true)} />
        </SectionCard>

        <SubscriptionPlansModal 
          open={showPlansModal} 
          onOpenChange={setShowPlansModal} 
        />
      </div>
    </div>
  );
}