import { useState } from 'react';
import { detectPlatform, isNativeApp } from '@/lib/platformDetection';
import { revenueCatService } from '@/services/revenueCatService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { useEntitlements } from '@/hooks/useEntitlements';
import { getAppStoreProductId } from '@/config/appStoreProducts';

export interface PurchaseData {
  planId: string;
  billingCycle: 'monthly' | 'annual';
  platform: string;
}

export const usePlatformPurchase = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { session } = useSupabaseAuth();
  const { offerings } = useEntitlements();
  const platform = detectPlatform();

  const initiatePurchase = async (purchaseData: PurchaseData) => {
    console.log('[Purchase] initiatePurchase called', { planId: purchaseData.planId, billingCycle: purchaseData.billingCycle, platform });
    setLoading(true);
    
    try {
      let result;
      if (platform === 'ios') {
        console.log('[Purchase] Routing to iOS purchase flow');
        result = await purchaseIOS(purchaseData);
      } else if (platform === 'android') {
        console.log('[Purchase] Routing to Android purchase flow');
        result = await purchaseAndroid(purchaseData);
      } else {
        console.log('[Purchase] Routing to Web purchase flow');
        result = await purchaseWeb(purchaseData);
      }
      console.log('[Purchase] Purchase result:', result);
      return result;
    } catch (error: any) {
      console.error('[Purchase] Purchase failed:', error);
      
      // Handle user cancellation gracefully - don't show toast, just re-throw
      if (error?.code === 'PURCHASE_CANCELLED' || error?.userCancelled) {
        const cancelError = new Error('Purchase cancelled');
        (cancelError as any).cancelled = true;
        throw cancelError;
      }
      
      toast({
        title: "Error en la compra",
        description: error.message || "No se pudo completar la compra. Intenta nuevamente.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const purchaseIOS = async (data: PurchaseData) => {
    try {
      const productId = getAppStoreProductId(data.planId as any, data.billingCycle);
      console.log('[Purchase:iOS] productId resolved:', productId);
      
      // Use the unified revenueCatService instead of IOSPurchaseService
      const customerInfo = await revenueCatService.purchaseProduct(productId);
      console.log('[Purchase:iOS] purchaseProduct succeeded, syncing with backend...');
      
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
        console.error('Failed to sync purchase with backend:', syncError);
      }
      
      toast({
        title: "¡Compra exitosa!",
        description: "Tu suscripción ha sido activada.",
      });
      
      // Refresh page to update subscription status
      setTimeout(() => window.location.reload(), 1000);
      
      return { success: true };
    } catch (error) {
      console.error('iOS purchase error:', error);
      throw error;
    }
  };

  const purchaseAndroid = async (data: PurchaseData) => {
    // TODO: Implement Android purchase flow
    toast({
      title: "Próximamente",
      description: "Las compras en Android estarán disponibles pronto.",
    });
    return { success: false };
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
      console.error('Mercado Pago error:', error);
      throw error;
    }
  };

  const restorePurchases = async () => {
    if (platform !== 'ios') {
      toast({
        title: "Función no disponible",
        description: "Restaurar compras solo está disponible en iOS.",
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
        console.error('Failed to sync restored purchases:', syncError);
      }
      
      toast({
        title: "Compras restauradas",
        description: "Se han verificado tus compras anteriores.",
      });
      
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Restore purchases failed:', error);
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
    platform,
    loading,
    offerings,
    initiatePurchase,
    restorePurchases,
    isNativeApp: isNativeApp(),
  };
};
