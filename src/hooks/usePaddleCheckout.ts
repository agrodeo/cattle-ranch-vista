import { useCallback } from 'react';
import { usePaddle } from '@/providers/PaddleProvider';
import { useToast } from '@/hooks/use-toast';

interface CheckoutOptions {
  priceId: string;
  customerEmail: string;
  cabanaId: string;
  onSuccess?: () => void;
}

export function usePaddleCheckout() {
  const { paddle } = usePaddle();
  const { toast } = useToast();

  const openCheckout = useCallback((options: CheckoutOptions) => {
    if (!paddle) {
      toast({
        title: 'Error',
        description: 'El sistema de pago no está disponible. Intenta recargar la página.',
        variant: 'destructive',
      });
      return;
    }

    paddle.Checkout.open({
      items: [{ priceId: options.priceId }],
      customer: { email: options.customerEmail },
      customData: { cabanaId: options.cabanaId },
      settings: {
        locale: 'es',
        theme: 'light',
        successUrl: `${window.location.origin}/subscription?checkout=success`,
      },
    });

    // Listen for checkout events via Paddle's event callback
    // Paddle.js fires events through the EventEmitter on the paddle instance
    // The actual completion is handled by the webhook; we use the success URL redirect
    // and the subscription-updated CustomEvent pattern for UI refresh.
  }, [paddle, toast]);

  return { openCheckout, isPaddleReady: !!paddle };
}
