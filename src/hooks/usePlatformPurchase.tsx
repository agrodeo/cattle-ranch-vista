import { useState } from 'react';
import { isNativeApp, getNativePlatform } from '@/lib/platformDetection';
import { revenueCatService } from '@/services/revenueCatService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { getAppStoreProductId } from '@/config/appStoreProducts';

export interface PurchaseData {
  planId: string;
  billingCycle: 'monthly' | 'annual';
  platform?: string; // ignored — platform is resolved at click-time
}

export const usePlatformPurchase = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { session } = useSupabaseAuth();
  const { offerings, refreshCustomerInfo } = useEntitlements();

  /**
   * Unified purchase entry point.
   * Resolves platform at call-time (not render-time) for safety.
   */
  const initiatePurchase = async (purchaseData: PurchaseData) => {
    // Resolve platform RIGHT NOW, not from cached state
    const native = isNativeApp();
    const nativePlatform = getNativePlatform();
    
    console.log('[Purchase] initiatePurchase called', {
      planId: purchaseData.planId,
      billingCycle: purchaseData.billingCycle,
      native,
      nativePlatform
    });
    
    setLoading(true);
    
    try {
      let result;
      if (native && (nativePlatform === 'ios' || nativePlatform === 'android')) {
        console.log(`[Purchase] Routing to ${nativePlatform} native purchase flow`);
        result = await purchaseNative(purchaseData, nativePlatform);
      } else {
        console.log('[Purchase] Routing to Web purchase flow (MercadoPago)');
        result = await purchaseWeb(purchaseData);
      }
      console.log('[Purchase] Purchase result:', result);
      return result;
    } catch (error: any) {
      console.error('[Purchase] Purchase failed:', {
        message: error?.message,
        code: error?.code,
        domain: error?.domain,
        userCancelled: error?.userCancelled,
        raw: JSON.stringify(error)
      });
      
      // Handle user cancellation gracefully
      if (
        error?.userCancelled ||
        error?.code === 'PURCHASE_CANCELLED' ||
        error?.code === 1
      ) {
        const cancelError = new Error('Purchase cancelled');
        (cancelError as any).cancelled = true;
        throw cancelError;
      }
      
      // Provide actionable error messages
      let description = 'No se pudo completar la compra. Intenta nuevamente.';
      if (error?.message?.includes('not found in store')) {
        description = 'Producto no encontrado. Intenta cerrar y reabrir la app.';
      } else if (error?.message?.includes('failed to initialize')) {
        description = 'No se pudo conectar con la tienda. Verifica tu conexión a internet.';
      }
      
      toast({
        title: "Error en la compra",
        description,
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Native purchase flow (iOS / Android) via RevenueCat
   */
  const purchaseNative = async (data: PurchaseData, nativePlatform: 'ios' | 'android') => {
    const productId = getAppStoreProductId(data.planId as any, data.billingCycle);
    console.log('[Purchase:Native] productId resolved:', productId, 'platform:', nativePlatform);

    if (!productId) {
      throw new Error(`No product ID configured for plan: ${data.planId} (${data.billingCycle})`);
    }

    // purchaseProduct calls ensureInitialized() internally — will auto-retry config
    const customerInfo = await revenueCatService.purchaseProduct(productId);
    console.log('[Purchase:Native] purchase succeeded, syncing with backend...');

    // Sync purchase with backend
    try {
      await supabase.functions.invoke('sync-ios-purchase', {
        body: {
          customerInfo: {
            originalAppUserId: customerInfo.originalAppUserId,
            activeSubscriptions: customerInfo.activeSubscriptions,
            allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
            entitlements: customerInfo.entitlements
          }
        }
      });
    } catch (syncError) {
      console.error('[Purchase:Native] Failed to sync purchase with backend:', syncError);
    }

    // Refresh entitlements
    await refreshCustomerInfo();

    toast({
      title: "¡Compra exitosa!",
      description: "Tu suscripción ha sido activada.",
    });

    return { success: true };
  };

  const purchaseWeb = async (data: PurchaseData) => {
    try {
      const { data: response, error } = await supabase.functions.invoke('mp-sub-create-link', {
        body: {
          cabanaId: session?.user?.id,
          productCode: data.planId
        }
      });

      if (error) throw error;

      if (response?.init_point) {
        window.open(response.init_point, '_blank');
        toast({
          title: "Redirigiendo a Mercado Pago",
          description: "Completa tu pago en la ventana que se abrió.",
        });
        return { success: true };
      }
      
      throw new Error('No se recibió el link de pago');
    } catch (error) {
      console.error('[Purchase:Web] Mercado Pago error:', error);
      throw error;
    }
  };

  const restorePurchases = async () => {
    if (!isNativeApp()) {
      toast({
        title: "Función no disponible",
        description: "Restaurar compras solo está disponible en la app nativa.",
      });
      return;
    }
    
    setLoading(true);
    try {
      const customerInfo = await revenueCatService.restorePurchases();
      
      // Sync with backend
      try {
        await supabase.functions.invoke('sync-ios-purchase', {
          body: { 
            customerInfo: {
              originalAppUserId: customerInfo.originalAppUserId,
              activeSubscriptions: customerInfo.activeSubscriptions,
              allPurchasedProductIdentifiers: customerInfo.allPurchasedProductIdentifiers,
              entitlements: customerInfo.entitlements
            }
          }
        });
      } catch (syncError) {
        console.error('[Purchase] Failed to sync restored purchases:', syncError);
      }

      await refreshCustomerInfo();
      
      toast({
        title: "Compras restauradas",
        description: "Se han verificado tus compras anteriores.",
      });
    } catch (error) {
      console.error('[Purchase] Restore purchases failed:', error);
      toast({
        title: "Error al restaurar",
        description: "No se pudieron restaurar las compras.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    offerings,
    initiatePurchase,
    restorePurchases,
    isNativeApp: isNativeApp(),
  };
};
