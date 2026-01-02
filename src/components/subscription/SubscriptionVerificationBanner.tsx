/**
 * Subscription Verification Banner
 * 
 * Shows when:
 * - User needs to connect to verify subscription (first time)
 * - Grace period is expiring soon (< 2 days)
 * - Grace period has expired (user was premium but offline too long)
 */

import React from 'react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useConnectivity } from '@/services/connectivity';
import { AlertTriangle, WifiOff, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export function SubscriptionVerificationBanner() {
  const { t } = useTranslation(['subscription', 'common']);
  const {
    isPremium,
    isLoading,
    needsConnectionToVerify,
    gracePeriodDaysRemaining,
    source,
    refresh
  } = useSubscriptionStatus();
  const { isOnline } = useConnectivity();
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Don't show while loading
  if (isLoading) return null;
  
  // Case 1: First time user, needs to verify
  if (source === 'none' && needsConnectionToVerify) {
    return (
      <Alert variant="default" className="mb-4 border-amber-500/50 bg-amber-500/10">
        <WifiOff className="h-4 w-4 text-amber-500" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-amber-700 dark:text-amber-300">
            {t('subscription:verification.firstTime', 'Conecta a internet para verificar tu suscripción')}
          </span>
          {isOnline && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="ml-2"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('common:actions.verify', 'Verificar')}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Case 2: Grace period expiring soon (premium, cached, < 2 days left)
  if (isPremium && source === 'cached' && gracePeriodDaysRemaining !== null && gracePeriodDaysRemaining <= 2) {
    return (
      <Alert variant="default" className="mb-4 border-yellow-500/50 bg-yellow-500/10">
        <AlertTriangle className="h-4 w-4 text-yellow-500" />
        <AlertDescription className="flex items-center justify-between">
          <span className="text-yellow-700 dark:text-yellow-300">
            {gracePeriodDaysRemaining === 0
              ? t('subscription:verification.expiresToday', 'Tu acceso premium expira hoy. Conecta para renovar.')
              : t('subscription:verification.expiresIn', {
                  days: gracePeriodDaysRemaining,
                  defaultValue: `Tu acceso premium expira en ${gracePeriodDaysRemaining} día(s). Conecta para renovar.`
                })
            }
          </span>
          {isOnline && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="ml-2"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('common:actions.verify', 'Verificar')}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  
  // Case 3: Grace period expired (was premium, now expired offline)
  if (source === 'expired' && needsConnectionToVerify) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between">
          <span>
            {t('subscription:verification.expired', 
              'Tu período de gracia ha expirado. Conecta a internet para verificar tu suscripción.'
            )}
          </span>
          {isOnline && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="ml-2 border-white/20 hover:bg-white/10"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('common:actions.verify', 'Verificar')}
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }
  
  return null;
}
