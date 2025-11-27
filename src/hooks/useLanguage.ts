import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { setLanguage, type SupportedLanguage } from '@/i18n';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { supabase } from '@/integrations/supabase/client';

export const availableLanguages: SupportedLanguage[] = ['es', 'en', 'pt'];

export function useLanguage() {
  const { i18n } = useTranslation();
  const { currentUser } = useSupabaseAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Use i18n.language directly for reactive updates
  const currentLang = (i18n.language as SupportedLanguage) || 'es';

  // Initialize language from user profile or cabaña on login (only once)
  useEffect(() => {
    const initializeLanguage = async () => {
      if (!currentUser?.id) return;

      // Check if language is already set in localStorage (from a previous manual selection)
      const storedLang = localStorage.getItem('agrodeo:lang');
      if (storedLang && availableLanguages.includes(storedLang as SupportedLanguage)) {
        // Language already set, don't override
        return;
      }

      try {
        setIsLoading(true);

        // First, try to get language from user profile
        const { data: profileData } = await supabase
          .from('profiles')
          .select('language')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (profileData?.language && availableLanguages.includes(profileData.language as SupportedLanguage)) {
          setLanguage(profileData.language as SupportedLanguage);
          return;
        }

        // If not found in profile, try to get from cabaña
        const { data: userCabanaData } = await supabase.rpc('get_user_cabana_info', {
          user_uuid: currentUser.id
        });

        if (userCabanaData?.[0]?.cabana_id) {
          const { data: cabanaData } = await supabase
            .from('cabañas')
            .select('language')
            .eq('id', userCabanaData[0].cabana_id)
            .maybeSingle();

          if (cabanaData?.language && availableLanguages.includes(cabanaData.language as SupportedLanguage)) {
            setLanguage(cabanaData.language as SupportedLanguage);
            
            // Save to user profile for future use
            await supabase
              .from('profiles')
              .upsert({
                user_id: currentUser.id,
                language: cabanaData.language
              });
            return;
          }
        }

        // If no language found in profile or cabaña, detect from browser and save
        const browserLang = i18n.language;
        const detectedLang = availableLanguages.includes(browserLang as SupportedLanguage) 
          ? browserLang as SupportedLanguage 
          : 'es';

        setLanguage(detectedLang);

        // Save detected language to profile
        await supabase
          .from('profiles')
          .upsert({
            user_id: currentUser.id,
            language: detectedLang
          });

      } catch (error) {
        console.error('Error initializing language:', error);
        // Fallback to browser detection or default
        const browserLang = i18n.language;
        const fallbackLang = availableLanguages.includes(browserLang as SupportedLanguage) 
          ? browserLang as SupportedLanguage 
          : 'es';
        setLanguage(fallbackLang);
      } finally {
        setIsLoading(false);
      }
    };

    initializeLanguage();
  }, [currentUser?.id]); // Only run when user changes

  // Handle query parameter language override
  useEffect(() => {
    const handleQueryParam = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const langParam = urlParams.get('lang') as SupportedLanguage;
      
      if (langParam && availableLanguages.includes(langParam)) {
        setLanguage(langParam);
        
        // Persist to profile if user is logged in
        if (currentUser?.id) {
          try {
            await supabase
              .from('profiles')
              .upsert({
                user_id: currentUser.id,
                language: langParam
              });
            console.log('Language updated from query parameter:', langParam);
          } catch (error) {
            console.error('Error updating language from query parameter:', error);
          }
        }
      }
    };

    handleQueryParam();
  }, [currentUser?.id]);

  const setLang = useCallback(async (newLang: SupportedLanguage) => {
    if (!availableLanguages.includes(newLang)) {
      console.warn(`Unsupported language: ${newLang}`);
      return;
    }

    try {
      setIsLoading(true);
      
      // Update i18n and dayjs locale immediately
      setLanguage(newLang);

      // Persist to Supabase profile if user is logged in
      if (currentUser?.id) {
        try {
          const { error } = await supabase
            .from('profiles')
            .upsert({
              user_id: currentUser.id,
              language: newLang
            });

          if (error) {
            console.error('Error saving language to profile:', error);
          }
        } catch (error) {
          console.error('Error saving language to profile:', error);
        }
      }
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id]);

  return {
    lang: currentLang,
    setLang,
    available: availableLanguages,
    isLoading
  };
}