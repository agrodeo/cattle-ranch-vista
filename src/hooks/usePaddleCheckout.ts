import { useCallback, useEffect } from 'react';
import { usePaddle } from '@/providers/PaddleProvider';
import { useToast } from '@/hooks/use-toast';

interface CheckoutOptions {
  priceId: string;
  customerEmail: string;
  cabanaId: string;
  onSuccess?: () => void;
}

const triggerSubscriptionRefresh = () => {
  [0, 2500, 6000, 10000].forEach((delay) => {
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('subscription-updated'));
    }, delay);
  });
};

export function usePaddleCheckout() {
  const { paddle } = usePaddle();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout') !== 'success') return;

    triggerSubscriptionRefresh();

    const nextUrl = `${window.location.origin}${window.location.pathname}`;
    window.history.replaceState({}, '', nextUrl);
  }, []);

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

    options.onSuccess?.();
  }, [paddle, toast]);

  return { openCheckout, isPaddleReady: !!paddle };
}
