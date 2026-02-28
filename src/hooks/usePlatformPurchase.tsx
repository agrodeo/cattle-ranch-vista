import { useState, useEffect, useCallback } from 'react';
import despia from 'despia-native';
import { isNativeApp, getNativePlatform, isDespiaRuntime } from '@/lib/platformDetection';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { getRevenueCatProductId, type PlanId } from '@/config/revenueCatProducts';

export interface PurchaseData {
  planId: string;
  billingCycle: 'monthly' | 'annual';
  platform?: string;
}

export interface PurchaseResult {
  success: boolean;
  pending?: boolean;
}

export const usePlatformPurchase = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { session, currentUser } = useSupabaseAuth();
  const { offerings, refreshCustomerInfo } = useEntitlements();

  // Register global callback for Despia purchase completion
  useEffect(() => {
    if (!isDespiaRuntime()) return;

    (window as any).onRevenueCatPurchase = () => {
      console.log('[Purchase:Despia] onRevenueCatPurchase callback fired');
      // Refresh entitlements after successful purchase
      refreshCustomerInfo();
      toast({
        title: "¡Compra exitosa!",
        description: "Tu suscripción ha sido activada.",
      });
    };

    return () => {
      delete (window as any).onRevenueCatPurchase;
    };
  }, [refreshCustomerInfo, toast]);

  /**
   * Unified purchase entry point.
   */
  const initiatePurchase = async (purchaseData: PurchaseData): Promise<PurchaseResult> => {
    const native = isNativeApp();
    const despiaActive = isDespiaRuntime();
    const nativePlatform = getNativePlatform();
    
    console.log('[Purchase] initiatePurchase called', {
      planId: purchaseData.planId,
      billingCycle: purchaseData.billingCycle,
      native,
      despiaActive,
      nativePlatform,
    });
    
    setLoading(true);
    
    try {
      // Route 1: Despia runtime → use despia-native SDK for RevenueCat paywall
      if (despiaActive) {
        console.log('[Purchase] Route: Despia native paywall');
        return await purchaseDespia(purchaseData);
      }
      
      // Route 2: Web → MercadoPago
      console.log('[Purchase] Route: Web (MercadoPago)');
      return await purchaseWeb(purchaseData);
    } catch (error: any) {
      console.error('[Purchase] Purchase failed:', {
        message: error?.message,
        code: error?.code,
        userCancelled: error?.userCancelled,
        raw: JSON.stringify(error)
      });
      
      if (
        error?.userCancelled ||
        error?.cancelled ||
        error?.code === 'PURCHASE_CANCELLED' ||
        error?.code === 1
      ) {
        const cancelError = new Error('Purchase cancelled');
        (cancelError as any).cancelled = true;
        throw cancelError;
      }
      
      let description = 'No se pudo completar la compra. Intenta nuevamente.';
      if (error?.message?.includes('not found in store')) {
        description = 'Producto no encontrado. Intenta cerrar y reabrir la app.';
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
   * Despia native purchase via RevenueCat direct product purchase
   */
  const purchaseDespia = async (data: PurchaseData): Promise<PurchaseResult> => {
    const userId = session?.user?.id || 'anonymous';
    
    // Resolve the RevenueCat product ID from plan + billing cycle
    const productId = getRevenueCatProductId(data.planId as PlanId, data.billingCycle);
    
    if (!productId) {
      console.error('[Purchase:Despia] No product ID found for', data.planId, data.billingCycle);
      throw new Error(`No se encontró producto para el plan "${data.planId}" (${data.billingCycle})`);
    }
    
    console.log('[Purchase:Despia] Triggering purchase', { 
      userId, 
      productId, 
      planId: data.planId, 
      billingCycle: data.billingCycle 
    });
    
    // Use the documented Despia purchase command:
    // revenuecat://purchase?external_id={USER_ID}&product={PRODUCT_ID}
    despia(
      `revenuecat://purchase?external_id=${encodeURIComponent(userId)}&product=${encodeURIComponent(productId)}`
    );
    
    // Purchase completion comes via onRevenueCatPurchase callback
    return { success: false, pending: true };
  };

  /**
   * Web purchase via MercadoPago
   */
  const purchaseWeb = async (data: PurchaseData): Promise<PurchaseResult> => {
    const cabanaId = currentUser?.cabañaId;
    if (!cabanaId) throw new Error('No se encontró la cabaña del usuario');
    
    const { data: response, error } = await supabase.functions.invoke('mp-sub-create-link', {
      body: {
        cabanaId,
        productCode: data.planId,
        payerEmail: session?.user?.email
      }
    });

    if (error) throw error;

    const paymentUrl = response?.url || response?.init_point;
    if (paymentUrl) {
      window.open(paymentUrl, '_blank');
      return { success: false, pending: true };
    }
    
    throw new Error('No se recibió el link de pago');
  };

  /**
   * Restore purchases
   */
  const restorePurchases = async () => {
    if (isDespiaRuntime()) {
      setLoading(true);
      try {
        console.log('[Purchase:Despia] Restoring purchases...');
        const data = await despia("getpurchasehistory://", ["restoredData"]);
        const purchases = (data as any)?.restoredData || [];
        console.log('[Purchase:Despia] Restored purchases:', purchases);
        
        const hasActive = purchases.some((p: any) => p.isActive);
        
        if (hasActive) {
          await refreshCustomerInfo();
          toast({
            title: "Compras restauradas",
            description: "Se encontraron compras activas.",
          });
        } else {
          toast({
            title: "Sin compras activas",
            description: "No se encontraron suscripciones activas.",
          });
        }
      } catch (error) {
        console.error('[Purchase:Despia] Restore failed:', error);
        toast({
          title: "Error al restaurar",
          description: "No se pudieron restaurar las compras.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
      return;
    }

    // Web: not supported
    toast({
      title: "Función no disponible",
      description: "Restaurar compras solo está disponible en la app nativa.",
    });
  };

  return {
    loading,
    offerings,
    initiatePurchase,
    restorePurchases,
    isNativeApp: isNativeApp(),
  };
};
