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

  // Fallback countries that are always available
  const fallbackCountries: Country[] = [
    { code: 'AR', name: 'Argentina' },
    { code: 'UY', name: 'Uruguay' },
    { code: 'BR', name: 'Brasil' },
    { code: 'PY', name: 'Paraguay' },
    { code: 'CL', name: 'Chile' },
    { code: 'CO', name: 'Colombia' },
    { code: 'MX', name: 'México' }
  ];

  useEffect(() => {
    console.log('🏗️ useCountries mounting, starting fetch...');
    
    let isActive = true;
    let timeoutId: NodeJS.Timeout;
    
    // Force stop loading after 10 seconds maximum
    const forceStopLoading = () => {
      console.log('⏰ Forcing stop loading after timeout');
      if (isActive) {
        setIsLoadingCountries(false);
        setCountries(fallbackCountries);
      }
    };
    
    timeoutId = setTimeout(forceStopLoading, 10000);
    
    const fetchCountries = async () => {
      try {
        console.log('📡 Fetching countries from database...');
        setIsLoadingCountries(true);
        setCountriesError(null);
        
        const { data: jurisdictions, error } = await supabase
          .from('jurisdictions')
          .select('*')
          .order('name');
        
        console.log('📊 Database response:', { 
          error: !!error, 
          dataLength: jurisdictions?.length || 0 
        });
        
        if (error) {
          console.error('❌ Database error:', error);
          throw error;
        }
        
        let countriesToSet = fallbackCountries;
        
        if (jurisdictions && jurisdictions.length > 0) {
          // Filter for countries only (parent_code is null)
          const countryJurisdictions = jurisdictions.filter((j: any) => !j.parent_code);
          console.log('🌍 Found countries:', countryJurisdictions.length);
          
          if (countryJurisdictions.length > 0) {
            countriesToSet = countryJurisdictions.map((j: any) => ({
              code: j.code,
              name: j.name
            })).sort((a: any, b: any) => a.name.localeCompare(b.name));
          }
        }
        
        if (isActive) {
          console.log('✅ Setting countries:', countriesToSet.length);
          setCountries(countriesToSet);
          setIsLoadingCountries(false);
          clearTimeout(timeoutId);
        }
        
      } catch (error: any) {
        console.error('❌ Error in fetchCountries:', error);
        if (isActive) {
          setCountriesError(error);
          setCountries(fallbackCountries);
          setIsLoadingCountries(false);
          clearTimeout(timeoutId);
        }
      }
    };
    
    // Start the fetch immediately
    fetchCountries();
    
    return () => {
      console.log('🧹 useCountries cleanup');
      isActive = false;
      clearTimeout(timeoutId);
    };
  }, []);

  return { countries, isLoadingCountries, countriesError };
}