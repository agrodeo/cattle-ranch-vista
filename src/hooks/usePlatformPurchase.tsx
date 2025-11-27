import { useState, useEffect } from 'react';
import { detectPlatform, isNativeApp } from '@/lib/platformDetection';
import { IOSPurchaseService } from '@/services/iosPurchaseService';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { getAppStoreProductId } from '@/config/appStoreProducts';

export interface PurchaseData {
  planId: string;
  billingCycle: 'monthly' | 'annual';
  platform: string;
}

export const usePlatformPurchase = () => {
  const [loading, setLoading] = useState(false);
  const [offerings, setOfferings] = useState<any[]>([]);
  const { toast } = useToast();
  const { session } = useSupabaseAuth();
  const platform = detectPlatform();

  useEffect(() => {
    if (platform === 'ios' && session?.user?.id) {
      initializeIOS();
    }
  }, [platform, session?.user?.id]);

  const initializeIOS = async () => {
    try {
      await IOSPurchaseService.initialize(session!.user!.id);
      const offeringsData = await IOSPurchaseService.getOfferings();
      setOfferings(offeringsData);
    } catch (error) {
      console.error('Failed to initialize iOS purchases:', error);
    }
  };

  const initiatePurchase = async (purchaseData: PurchaseData) => {
    setLoading(true);
    
    try {
      if (platform === 'ios') {
        return await purchaseIOS(purchaseData);
      } else if (platform === 'android') {
        return await purchaseAndroid(purchaseData);
      } else {
        return await purchaseWeb(purchaseData);
      }
    } catch (error: any) {
      console.error('Purchase failed:', error);
      
      // Handle user cancellation gracefully
      if (error?.code === 'PURCHASE_CANCELLED' || error?.userCancelled) {
        return { success: false, cancelled: true };
      }
      
      toast({
        title: "Error en la compra",
        description: error.message || "No se pudo completar la compra. Intenta nuevamente.",
        variant: "destructive",
      });
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const purchaseIOS = async (data: PurchaseData) => {
    try {
      const productId = getAppStoreProductId(data.planId as any, data.billingCycle);
      
      const customerInfo = await IOSPurchaseService.purchaseProduct(productId);
      
      // Sync purchase with backend
      await IOSPurchaseService.syncWithBackend(customerInfo, supabase.functions.invoke.bind(supabase.functions));
      
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
      const customerInfo = await IOSPurchaseService.restorePurchases();
      await IOSPurchaseService.syncWithBackend(customerInfo, supabase.functions.invoke.bind(supabase.functions));
      
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