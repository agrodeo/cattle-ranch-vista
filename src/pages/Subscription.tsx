import { useState } from "react";
import { SubscriptionAlert } from "@/components/subscription/SubscriptionAlert";
import { SubscriptionPlansModal } from "@/components/subscription/SubscriptionPlansModal";

export default function Subscription() {
  const [showPlansModal, setShowPlansModal] = useState(false);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Suscripción</h1>
        <p className="text-muted-foreground">Gestiona tu plan y límites de uso</p>
      </div>

      <SubscriptionAlert onUpgrade={() => setShowPlansModal(true)} />

      <SubscriptionPlansModal 
        open={showPlansModal} 
        onOpenChange={setShowPlansModal} 
      />
    </div>
  );
}