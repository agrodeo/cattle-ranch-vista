import { invokeEdgeFunction } from "@/lib/invokeEdgeFunction";
  import { useState, useEffect, useCallback } from 'react';
  import { isNativeApp, getNativePlatform, isDespiaRuntime } from '@/lib/platformDetection';
  import { useToast } from '@/hooks/use-toast';
  import { supabase } from '@/integrations/supabase/client';
  import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
  import { useEntitlements } from '@/hooks/useEntitlements';
  import { getRevenueCatProductId, type PlanId } from '@/config/revenueCatProducts';
  import { usePaddleCheckout } from '@/hooks/usePaddleCheckout';
  import { getPaddlePriceId } from '@/config/paddleProducts';
  import { useUserAccess } from '@/hooks/useUserAccess';

  const getDespiaClient = async () => {
    try {
      const module = await import('despia-native');
      return module.default;
    } catch (e) {
      console.warn('[Purchase] despia-native not available in this runtime:', e);
      return null;
    }
  };

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
    const { openCheckout } = usePaddleCheckout();
    const { trialUsed } = useUserAccess();

    const triggerSubscriptionRefresh = useCallback(() => {
      [0, 2500, 6000].forEach((delay) => {
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('subscription-updated'));
        }, delay);
      });
    }, []);

    // Register global callback for Despia purchase completion
    useEffect(() => {
      if (!isDespiaRuntime()) return;

    (window as any).onRevenueCatPurchase = async () => {
      console.log('[Purchase:Despia] onRevenueCatPurchase callback fired');

      try {
        // Get the snapshot of subs that existed BEFORE this purchase was initiated
        const prePurchaseSubs: string[] = (window as any).__prePurchaseActiveSubscriptions || [];
        console.log('[Purchase:Despia] Pre-purchase active subs snapshot:', prePurchaseSubs);

        // Get purchase history from Despia bridge
        const despiaClient = await getDespiaClient();
        const data = await despiaClient("getpurchasehistory://", ["restoredData"]);
        const purchases = (data as any)?.restoredData || [];
        console.log('[Purchase:Despia] Purchase history for sync:', purchases);

        // Extract active product IDs from purchase history
        const activeSubscriptions = purchases
          .filter((p: any) => p.isActive)
          .map((p: any) => p.productIdentifier || p.productId || p.product_id)
          .filter(Boolean);

        console.log('[Purchase:Despia] Active subscriptions for sync:', activeSubscriptions);

        // Determine if there are genuinely NEW subscriptions compared to pre-purchase snapshot
        const newSubscriptions = activeSubscriptions.filter(
          (sub: string) => !prePurchaseSubs.includes(sub)
        );
        console.log('[Purchase:Despia] NEW subscriptions (not in pre-purchase snapshot):', newSubscriptions);

        // If no active subscriptions at all, inform the user
        if (activeSubscriptions.length === 0) {
          console.log('[Purchase:Despia] No active subscriptions detected, aborting sync');
          toast({
            title: "Compra no completada",
            description: "No se detectó una suscripción activa. Si ya pagaste, usa 'Restaurar compras'.",
            variant: "destructive",
          });
          return;
        }

        // If active subs exist but are ALL the same as before the purchase,
        // the user likely cancelled or the payment sheet was dismissed without paying.
        if (newSubscriptions.length === 0 && prePurchaseSubs.length > 0) {
          console.log('[Purchase:Despia] No NEW subscriptions detected — purchase was likely cancelled');
          // Don't show any toast — the user simply dismissed the payment sheet
          return;
        }

        const userId = session?.user?.id;
        // Call sync-ios-purchase directly with constructed customerInfo
        const { error } = await invokeEdgeFunction('sync-ios-purchase', {
          body: {
            customerInfo: {
              originalAppUserId: userId || 'anonymous',
              activeSubscriptions,
              entitlements: { active: {} }
            }
          }
        });

        if (error) {
          console.error('[Purchase:Despia] sync-ios-purchase error:', error);
          toast({
            title: "Error al sincronizar",
            description: "La compra se procesó pero hubo un error al activarla. Intenta 'Restaurar compras'.",
            variant: "destructive",
          });
          return;
        }

        console.log('[Purchase:Despia] Backend sync completed');

        // Only show success after verified NEW subscription AND successful sync
        toast({
          title: "¡Compra exitosa!",
          description: "Tu suscripción ha sido activada.",
        });

        // Signal useSubscription to refresh from Supabase (with retries)
        triggerSubscriptionRefresh();

        // Try refreshing entitlements (may fail in Despia, that's ok)
        try { await refreshCustomerInfo(); } catch {}
      } catch (callbackError) {
        console.error('[Purchase:Despia] onRevenueCatPurchase failed:', callbackError);
      } finally {
        // Clean up pending state
        delete (window as any).__pendingDespiaProductId;
        delete (window as any).__prePurchaseActiveSubscriptions;
      }
    };

      return () => {
        delete (window as any).onRevenueCatPurchase;
      };
    }, [refreshCustomerInfo, toast, session?.user?.id, triggerSubscriptionRefresh]);

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
      
      // Despia's native RevenueCat bridge expects just the subscription ID
      // (without the :basePlanId suffix). The native SDK resolves the base plan
      // automatically from the Google Play product configuration.
      const despiaProductId = productId.includes(':') 
        ? productId.split(':')[0] 
        : productId;
      
      console.log('[Purchase:Despia] Triggering purchase', { 
        userId, 
        productId,
        despiaProductId,
        planId: data.planId, 
        billingCycle: data.billingCycle 
      });
      
      // Store normalized product ID so callback can always sync consistently
      (window as any).__pendingDespiaProductId = despiaProductId;

      // CRITICAL: Snapshot current active subscriptions BEFORE opening payment sheet.
      // This allows onRevenueCatPurchase to detect genuinely NEW purchases and avoid
      // false positives from pre-existing subscriptions.
      try {
        const despiaClient = await getDespiaClient();
        const historyData = await despiaClient("getpurchasehistory://", ["restoredData"]);
        const currentPurchases = (historyData as any)?.restoredData || [];
        const currentActiveSubs = currentPurchases
          .filter((p: any) => p.isActive)
          .map((p: any) => p.productIdentifier || p.productId || p.product_id)
          .filter(Boolean);
        (window as any).__prePurchaseActiveSubscriptions = currentActiveSubs;
        console.log('[Purchase:Despia] Pre-purchase active subs snapshot:', currentActiveSubs);
      } catch (snapshotErr) {
        console.warn('[Purchase:Despia] Could not snapshot pre-purchase subs:', snapshotErr);
        (window as any).__prePurchaseActiveSubscriptions = [];
      }
      
      // IMPORTANT: Despia bridge expects raw `product` (no URI encoding, no base-plan suffix)
      const purchaseUrl = `revenuecat://purchase?external_id=${encodeURIComponent(userId)}&product=${encodeURIComponent(productId)}`;
      console.log('[Purchase:Despia] Purchase URL prepared', { despiaProductId, purchaseUrl });

      const despiaClientForPurchase = await getDespiaClient();
      await despiaClientForPurchase(purchaseUrl);
      
      // Purchase completion comes via onRevenueCatPurchase callback
      return { success: false, pending: true };
    };

    /**
     * Web purchase via Paddle overlay checkout
     */
    const purchaseWeb = async (data: PurchaseData): Promise<PurchaseResult> => {
      const cabanaId = currentUser?.cabañaId;
      if (!cabanaId) throw new Error('No se encontró la cabaña del usuario');

      const priceId = getPaddlePriceId(data.planId, data.billingCycle, { trialUsed });
      if (!priceId) {
        throw new Error(`No se encontró precio Paddle para "${data.planId}" (${data.billingCycle})`);
      }
      console.log('[Purchase:Web] Using Paddle price', { planId: data.planId, billingCycle: data.billingCycle, trialUsed, priceId });

      const customerEmail = session?.user?.email || '';

      openCheckout({
        priceId,
        customerEmail,
        cabanaId,
        onSuccess: () => {
          triggerSubscriptionRefresh();
        },
      });

      // Paddle overlay handles the rest; webhook finalizes the subscription
      return { success: false, pending: true };
    };

    /**
     * Restore purchases
     */
    const restorePurchases = async () => {
      if (isDespiaRuntime()) {
        setLoading(true);
        try {
          console.log('[Purchase:Despia] Restoring purchases...');
          const despiaClient = await getDespiaClient();
          const data = await despiaClient("getpurchasehistory://", ["restoredData"]);
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
