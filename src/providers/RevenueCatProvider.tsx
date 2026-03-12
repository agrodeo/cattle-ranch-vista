import React, { createContext, useContext, useEffect, useState } from 'react';
import { revenueCatService } from '@/services/revenueCatService';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { isNativeApp, isRevenueCatCapacitorAvailable } from '@/lib/platformDetection';

interface RevenueCatContextType {
  isConfigured: boolean;
  configFailed: boolean;
}

const RevenueCatContext = createContext<RevenueCatContextType>({ 
  isConfigured: false,
  configFailed: false
});

export const useRevenueCat = () => useContext(RevenueCatContext);

export function RevenueCatProvider({ children }: { children: React.ReactNode }) {
  const [isConfigured, setIsConfigured] = useState(false);
  const [configFailed, setConfigFailed] = useState(false);
  const { session } = useSupabaseAuth();

  useEffect(() => {
    const configure = async () => {
      if (!isNativeApp()) {
        // On web, RevenueCat is not used — mark as configured so app doesn't block
        setIsConfigured(true);
        return;
      }

      if (!isRevenueCatCapacitorAvailable()) {
        // Despia runtime or plugin not linked in native shell.
        // Mark configured so app boot never blocks.
        setIsConfigured(true);
        setConfigFailed(false);
        return;
      }

      try {
        const success = await revenueCatService.configure(session?.user?.id);
        
        if (success && session?.user?.id) {
          await revenueCatService.login(session.user.id);
        }
        
        setIsConfigured(true);
        setConfigFailed(!success);
      } catch (error) {
        console.error('[RevenueCatProvider] Configuration failed:', error);
        // Mark configured=true so app doesn't block, but track failure
        // ensureInitialized() will retry on actual purchase attempts
        setIsConfigured(true);
        setConfigFailed(true);
      }
    };

    configure();
  }, [session?.user?.id]);

  return (
    <RevenueCatContext.Provider value={{ isConfigured, configFailed }}>
      {children}
    </RevenueCatContext.Provider>
  );
}
