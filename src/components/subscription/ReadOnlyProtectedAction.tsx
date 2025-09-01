import React, { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { ReadOnlyModeModal } from "./ReadOnlyModeModal";
import { useNavigate } from "react-router-dom";

interface ReadOnlyProtectedActionProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  disabled?: boolean;
}

export const ReadOnlyProtectedAction = ({ 
  children, 
  fallback,
  disabled = false
}: ReadOnlyProtectedActionProps) => {
  const { subscriptionStatus } = useSubscription();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  // If subscription is loading, show disabled state
  if (!subscriptionStatus) {
    return fallback || (
      <div className="opacity-50 pointer-events-none">
        {children}
      </div>
    );
  }

  // If in read-only mode, intercept clicks and show upgrade modal
  if (subscriptionStatus.isReadOnly && !disabled) {
    return (
      <>
        <div 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setShowModal(true);
          }}
          className="cursor-not-allowed"
        >
          <div className="opacity-50 pointer-events-none">
            {children}
          </div>
        </div>
        
        <ReadOnlyModeModal 
          open={showModal}
          onOpenChange={setShowModal}
          onUpgrade={() => navigate("/plans")}
        />
      </>
    );
  }

  // Normal operation - render children as-is
  return <>{children}</>;
};