import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Country = { 
  code: string; 
  name: string; 
};

export function useCountries() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);
  const [countriesError, setCountriesError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    
    const fetchCountries = async (): Promise<Country[]> => {
      try {
        setIsLoadingCountries(true);
        setCountriesError(null);
        
        const { data: jurisdictions, error } = await supabase
          .from('jurisdictions')
          .select('*')
          .order('name');
        
        if (error) throw error;
        
        if (!jurisdictions || jurisdictions.length === 0) {
          // Fallback data for common countries
          return [
            { code: 'AR', name: 'Argentina' },
            { code: 'UY', name: 'Uruguay' },
            { code: 'BR', name: 'Brasil' },
            { code: 'PY', name: 'Paraguay' },
            { code: 'CL', name: 'Chile' },
            { code: 'CO', name: 'Colombia' },
            { code: 'MX', name: 'México' }
          ];
        }
        
        // Filter for countries only (parent_code is null)
        const countryJurisdictions = jurisdictions.filter((j: any) => !j.parent_code);
        
        // Map countries with proper code and name
        return countryJurisdictions.map((j: any) => ({
          code: j.code,
          name: j.name
        })).sort((a: any, b: any) => a.name.localeCompare(b.name));
        
      } catch (error: any) {
        console.error('Error loading countries:', error);
        // Return fallback countries so user can still register
        return [
          { code: 'AR', name: 'Argentina' },
          { code: 'UY', name: 'Uruguay' },
          { code: 'BR', name: 'Brasil' },
          { code: 'PY', name: 'Paraguay' },
          { code: 'CL', name: 'Chile' },
          { code: 'CO', name: 'Colombia' },
          { code: 'MX', name: 'México' }
        ];
      }
    };

    (async () => {
      try {
        const data = await fetchCountries();
        if (active) {
          setCountries(data);
        }
      } catch (e: any) {
        if (active) {
          setCountriesError(e);
          // Set fallback countries even on error
          setCountries([
            { code: 'AR', name: 'Argentina' },
            { code: 'UY', name: 'Uruguay' },
            { code: 'BR', name: 'Brasil' },
            { code: 'PY', name: 'Paraguay' },
            { code: 'CL', name: 'Chile' }
          ]);
        }
      } finally {
        if (active) {
          setIsLoadingCountries(false);
        }
      }
    })();
    
    return () => { active = false; };
  }, []);

  return { countries, isLoadingCountries, countriesError };
}