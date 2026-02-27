import React, { createContext, useContext, useEffect, useState } from 'react';
import { revenueCatService } from '@/services/revenueCatService';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { isNativeApp } from '@/lib/platformDetection';

interface RevenueCatContextType {
  isConfigured: boolean;
}

const RevenueCatContext = createContext<RevenueCatContextType>({ 
  isConfigured: false 
});

export const useRevenueCat = () => useContext(RevenueCatContext);

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const [isConfigured, setIsConfigured] = useState(false);
  const { session } = useSupabaseAuth();

  useEffect(() => {
    const configure = async () => {
      if (!isNativeApp()) {
        setIsConfigured(true);
        return;
      }

      try {
        await revenueCatService.configure(session?.user?.id);
        
        if (session?.user?.id) {
          await revenueCatService.login(session.user.id);
        }
        
        setIsConfigured(true);
      } catch (error) {
        console.error('Failed to configure RevenueCat:', error);
        // Still set configured so the app doesn't block — ensureInitialized will retry on purchase
        setIsConfigured(true);
      }
    };

    configure();
  }, [session?.user?.id]);

  return (
    <RevenueCatContext.Provider value={{ isConfigured }}>
      {children}
    </RevenueCatContext.Provider>
  );
}
