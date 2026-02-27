import { useState } from 'react';
import { isNativeApp, getNativePlatform, isCapacitorNative, isDespiaRuntime } from '@/lib/platformDetection';
import { revenueCatService } from '@/services/revenueCatService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { getAppStoreProductId, type PlanId } from '@/config/appStoreProducts';

export interface PurchaseData {
  planId: string;
  billingCycle: 'monthly' | 'annual';
  platform?: string; // ignored — platform is resolved at click-time
}

export interface PurchaseResult {
  success: boolean;
  pending?: boolean;
}

// Known plan keys that need mapping to store product IDs
const KNOWN_PLAN_KEYS = ['personal', 'avanzado', 'productor', 'cabana', 'corporativo'];

/**
 * Resolve a planId to a store product ID.
 * If it's a known plan key (e.g. "personal"), map via appStoreProducts.
 * If it's already a product ID (e.g. "Personal_Monthly"), return as-is.
 */
const resolveProductId = (planId: string, billingCycle: 'monthly' | 'annual'): string => {
  if (KNOWN_PLAN_KEYS.includes(planId)) {
    return getAppStoreProductId(planId as PlanId, billingCycle);
  }
  // Already a product identifier (from RevenueCat paywall)
  return planId;
};

export const usePlatformPurchase = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { session } = useSupabaseAuth();
  const { offerings, refreshCustomerInfo } = useEntitlements();

  /**
   * Unified purchase entry point.
   * Resolves platform at call-time (not render-time) for safety.
   */
  const initiatePurchase = async (purchaseData: PurchaseData): Promise<PurchaseResult> => {
    const native = isNativeApp();
    const capacitorNative = isCapacitorNative();
    const despia = isDespiaRuntime();
    const nativePlatform = getNativePlatform();
    
    console.log('[Purchase] initiatePurchase called', {
      planId: purchaseData.planId,
      billingCycle: purchaseData.billingCycle,
      native,
      capacitorNative,
      despia,
      nativePlatform,
      hostname: window.location.hostname,
      bundleNumber: (window as any).bundleNumber,
    });
    
    setLoading(true);
    
    try {
      // Route 1: Capacitor native bridge available → RevenueCat native
      if (capacitorNative && (nativePlatform === 'ios' || nativePlatform === 'android')) {
        console.log(`[Purchase] Route: Capacitor native (${nativePlatform})`);
        return await purchaseNative(purchaseData, nativePlatform);
      }
      
      // Route 2: Despia runtime (no Capacitor bridge) → still try RevenueCat
      // RevenueCat Capacitor plugin may work via Despia's bridge
      if (despia && (nativePlatform === 'ios' || nativePlatform === 'android')) {
        console.log(`[Purchase] Route: Despia native (${nativePlatform})`);
        return await purchaseNative(purchaseData, nativePlatform);
      }
      
      // Route 3: Web → MercadoPago
      console.log('[Purchase] Route: Web (MercadoPago)');
      return await purchaseWeb(purchaseData);
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
      } else if (error?.message?.includes('only available on native')) {
        description = 'La compra nativa no está disponible en este entorno.';
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
  const purchaseNative = async (data: PurchaseData, nativePlatform: 'ios' | 'android'): Promise<PurchaseResult> => {
    const productId = resolveProductId(data.planId, data.billingCycle);
    console.log('[Purchase:Native] productId resolved:', productId, 'from planId:', data.planId);

    if (!productId) {
      throw new Error(`No product ID configured for plan: ${data.planId} (${data.billingCycle})`);
    }

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

    await refreshCustomerInfo();

    toast({
      title: "¡Compra exitosa!",
      description: "Tu suscripción ha sido activada.",
    });

    return { success: true };
  };

  const purchaseWeb = async (data: PurchaseData): Promise<PurchaseResult> => {
    const { data: response, error } = await supabase.functions.invoke('mp-sub-create-link', {
      body: {
        cabanaId: session?.user?.id,
        productCode: data.planId
      }
    });

    if (error) throw error;

    const paymentUrl = response?.url || response?.init_point;
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
      toast({
        title: "Redirigiendo a Mercado Pago",
        description: "Completa tu pago en la ventana que se abrió.",
      });
      return { success: false, pending: true };
    }
    
    throw new Error('No se recibió el link de pago');
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
