import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Paddle } from '@paddle/paddle-js';
import { isNativeApp } from '@/lib/platformDetection';
import { PADDLE_CLIENT_TOKEN, PADDLE_ENV } from '@/config/paddleProducts';

interface PaddleContextValue {
  paddle: Paddle | null;
}

const PaddleContext = createContext<PaddleContextValue>({ paddle: null });

export const usePaddle = () => useContext(PaddleContext);

export function PaddleProvider({ children }: { children: React.ReactNode }) {
  const [paddle, setPaddle] = useState<Paddle | null>(null);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      // Only initialize Paddle on web, not on native
      if (isNativeApp()) return;
      if (!PADDLE_CLIENT_TOKEN || PADDLE_CLIENT_TOKEN.includes('XXXXX')) {
        console.warn('[Paddle] Client token is a placeholder — skipping initialization');
        return;
      }

      try {
        const { initializePaddle } = await import('@paddle/paddle-js');
        const paddleInstance = await initializePaddle({
          environment: PADDLE_ENV,
          token: PADDLE_CLIENT_TOKEN,
        });

        if (paddleInstance && mounted) {
          setPaddle(paddleInstance);
          console.log('[Paddle] Initialized successfully');
        }
      } catch (err) {
        console.error('[Paddle] Initialization failed:', err);
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <PaddleContext.Provider value={{ paddle }}>
      {children}
    </PaddleContext.Provider>
  );
}
