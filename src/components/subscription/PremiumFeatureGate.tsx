/**
 * Premium Feature Gate Component
 * 
 * Wraps premium features and shows appropriate UI based on subscription status.
 * Works offline using cached entitlement.
 */

import React, { useState } from 'react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { RevenueCatPaywall } from './RevenueCatPaywall';
import { Lock, WifiOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PremiumFeatureGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  featureName?: string;
}

export function PremiumFeatureGate({ 
  children, 
  fallback,
  featureName 
}: PremiumFeatureGateProps) {
  const { t } = useTranslation(['subscription']);
  const { 
    isPremium, 
    isLoading, 
    isOffline,
    needsConnectionToVerify,
    source 
  } = useSubscriptionStatus();
  const [showPaywall, setShowPaywall] = useState(false);
  
  // Loading state
  if (isLoading) {
    return fallback || null;
  }
  
  // Premium user - show content
  if (isPremium) {
    return <>{children}</>;
  }
  
  // Needs verification (first time or expired grace period)
  if (needsConnectionToVerify && source === 'none') {
    return (
      <div 
        className="relative cursor-pointer group"
        onClick={() => {
          if (!isOffline) {
            setShowPaywall(true);
          }
        }}
      >
        <div className="opacity-50 pointer-events-none">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <div className="text-center p-4">
            <WifiOff className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t('subscription:verification.connectFirst', 
                'Conecta a internet para verificar tu suscripción'
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Not premium - show locked state
  return (
    <>
      <div 
        className="relative cursor-pointer group"
        onClick={() => setShowPaywall(true)}
      >
        {fallback || (
          <>
            <div className="opacity-50 pointer-events-none">
              {children}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-[2px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="text-center p-4">
                <Lock className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium">
                  {featureName 
                    ? t('subscription:upgrade.featureLocked', { feature: featureName })
                    : t('subscription:upgrade.premiumRequired', 'Función Premium')
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('subscription:upgrade.clickToUpgrade', 'Toca para actualizar')}
                </p>
              </div>
            </div>
          </>
        )}
      </div>
      <RevenueCatPaywall 
        open={showPaywall} 
        onOpenChange={setShowPaywall} 
      />
    </>
  );
}
