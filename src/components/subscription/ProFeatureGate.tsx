import React, { useState } from 'react';
import { useEntitlements } from '@/hooks/useEntitlements';
import { RevenueCatPaywall } from './RevenueCatPaywall';

interface ProFeatureGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function ProFeatureGate({ children, fallback }: ProFeatureGateProps) {
  const { isPro, isLoading } = useEntitlements();
  const [showPaywall, setShowPaywall] = useState(false);
  
  if (isLoading) {
    return fallback || null;
  }
  
  if (!isPro) {
    return (
      <>
        <div 
          onClick={() => setShowPaywall(true)}
          className="cursor-pointer"
        >
          {fallback || (
            <div className="opacity-50 pointer-events-none">
              {children}
            </div>
          )}
        </div>
        <RevenueCatPaywall 
          open={showPaywall} 
          onOpenChange={setShowPaywall} 
        />
      </>
    );
  }
  
  return <>{children}</>;
}
