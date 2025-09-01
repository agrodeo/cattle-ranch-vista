import { useState } from 'react';
import { detectPlatform, openPlatformStore } from '@/lib/platformDetection';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface PurchaseData {
  planId: string;
  billingCycle: 'monthly' | 'annual';
  platform: string;
}

export const usePlatformPurchase = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const platform = detectPlatform();

  const initiatePurchase = async (purchaseData: PurchaseData) => {
    setLoading(true);
    
    try {
      switch (platform) {
        case 'ios':
          await initiateIOSPurchase(purchaseData);
          break;
        case 'android':
          await initiateAndroidPurchase(purchaseData);
          break;
        case 'web':
          await initiateMercadoPagoPurchase(purchaseData);
          break;
      }
    } catch (error) {
      console.error('Purchase failed:', error);
      toast({
        title: "Error en la compra",
        description: "No se pudo completar la compra. Intenta nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initiateIOSPurchase = async (data: PurchaseData) => {
    // Check if running in iOS app context
    if ((window as any).webkit?.messageHandlers?.purchase) {
      // Send purchase request to native iOS app
      (window as any).webkit.messageHandlers.purchase.postMessage({
        planId: data.planId,
        billingCycle: data.billingCycle,
      });
    } else {
      // Fallback: open App Store
      openPlatformStore('ios', data.planId);
      toast({
        title: "Redirigiendo al App Store",
        description: "Completa tu compra en la app oficial de AgroDeo.",
      });
    }
  };

  const initiateAndroidPurchase = async (data: PurchaseData) => {
    // Check if running in Android app context
    if ((window as any).AndroidInterface?.purchase) {
      // Send purchase request to native Android app
      (window as any).AndroidInterface.purchase(JSON.stringify({
        planId: data.planId,
        billingCycle: data.billingCycle,
      }));
    } else {
      // Fallback: open Google Play
      openPlatformStore('android', data.planId);
      toast({
        title: "Redirigiendo a Google Play",
        description: "Completa tu compra en la app oficial de AgroDeo.",
      });
    }
  };

  const initiateMercadoPagoPurchase = async (data: PurchaseData) => {
    try {
      const { data: response, error } = await supabase.functions.invoke('mp-sub-create-link', {
        body: {
          cabanaId: (await supabase.auth.getUser()).data.user?.id,
          productCode: data.planId
        }
      });

      if (error) throw error;

      if (response?.init_point) {
        // Open Mercado Pago checkout in new tab
        window.open(response.init_point, '_blank');
      }
    } catch (error) {
      console.error('Mercado Pago error:', error);
      throw error;
    }
  };

  const verifyPurchase = async (receiptData: any) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-purchase', {
        body: {
          platform,
          receiptData,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "¡Compra verificada!",
          description: "Tu suscripción ha sido activada.",
        });
        
        // Refresh subscription status
        window.location.reload();
      }
    } catch (error) {
      console.error('Purchase verification failed:', error);
      toast({
        title: "Error de verificación",
        description: "No se pudo verificar la compra. Contacta soporte.",
        variant: "destructive",
      });
    }
  };

  return {
    platform,
    loading,
    initiatePurchase,
    verifyPurchase,
  };
};