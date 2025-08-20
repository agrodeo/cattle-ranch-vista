import { useState, useEffect } from 'react';
import { COUNTRIES, AR_PROVINCES } from '@/data/locations';

export function useLocationOptions() {
  // No remote fetch needed; keeps UI instant and avoids disabled cursor bugs
  const [isReady, setReady] = useState(false);
  
  useEffect(() => { 
    setReady(true); 
  }, []);
  
  return { 
    isReady, 
    countries: COUNTRIES, 
    arProvinces: AR_PROVINCES 
  };
}
