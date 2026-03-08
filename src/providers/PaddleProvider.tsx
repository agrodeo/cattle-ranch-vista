import React, { createContext, useContext, useEffect, useState } from 'react';
import { initializePaddle, type Paddle } from '@paddle/paddle-js';
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
    // Only initialize Paddle on web, not on native
    if (isNativeApp()) return;
    if (!PADDLE_CLIENT_TOKEN || PADDLE_CLIENT_TOKEN.includes('XXXXX')) {
      console.warn('[Paddle] Client token is a placeholder — skipping initialization');
      return;
    }

    initializePaddle({
      environment: PADDLE_ENV,
      token: PADDLE_CLIENT_TOKEN,
    }).then((paddleInstance) => {
      if (paddleInstance) {
        setPaddle(paddleInstance);
        console.log('[Paddle] Initialized successfully');
      }
    }).catch((err) => {
      console.error('[Paddle] Initialization failed:', err);
    });
  }, []);

  return (
    <PaddleContext.Provider value={{ paddle }}>
      {children}
    </PaddleContext.Provider>
  );
}
