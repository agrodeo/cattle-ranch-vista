import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BenchmarkSettings } from "@/components/settings/BenchmarkSettings";
import { VaccinationRequirementsManager } from "@/components/settings/VaccinationRequirementsManager";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Syringe, Globe } from "lucide-react";

export const SettingsPage = () => {
  const { t } = useTranslation(['settings']);
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "general";

  useEffect(() => {
    document.title = `${t('settings:title')} - agrodeo`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', t('settings:subtitle'));
    }
  }, [t]);

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-xl lg:px-6 pb-24 lg:pb-6 overflow-x-hidden">
      <div className="space-y-4 sm:space-y-6">
        <PageHeader 
          title={t('settings:title')}
          subtitle={t('settings:subtitle')}
        />

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="inline-flex w-auto overflow-x-auto scrollbar-hide h-11 sm:h-12 bg-muted/50 rounded-xl p-1 gap-1">
            <TabsTrigger 
              value="general" 
              className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-2 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('settings:tabs.general')}
            </TabsTrigger>
            <TabsTrigger 
              value="benchmarks" 
              className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-2 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('settings:tabs.benchmarks')}
            </TabsTrigger>
            <TabsTrigger 
              value="vaccines" 
              className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-2 px-3 sm:px-4 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all"
            >
              <Syringe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('settings:tabs.vaccines')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-4 sm:mt-6">
            <Card className="border-0 shadow-sm sm:border sm:shadow-md">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base sm:text-lg">{t('settings:general.language.title')}</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-0.5">
                      {t('settings:general.language.description')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <LanguageSwitcher variant="full" />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="benchmarks" className="mt-4 sm:mt-6">
            <BenchmarkSettings />
          </TabsContent>

          <TabsContent value="vaccines" className="mt-4 sm:mt-6">
            <VaccinationRequirementsManager />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
