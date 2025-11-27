import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BenchmarkSettings } from "@/components/settings/BenchmarkSettings";
import { VaccinationRequirementsManager } from "@/components/settings/VaccinationRequirementsManager";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Settings as SettingsIcon, Target, Users, CreditCard, Syringe, Globe } from "lucide-react";

export const SettingsPage = () => {
  const { t } = useTranslation(['settings']);
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "benchmarks";

  useEffect(() => {
    document.title = `${t('settings:title')} - AgroDeo`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', t('settings:subtitle'));
    }
  }, [t]);

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
      <div className="space-y-3">
        <PageHeader 
          title={t('settings:title')}
          subtitle={t('settings:subtitle')}
        />

        <SectionCard
          title={t('settings:title')}
          subtitle={t('settings:subtitle')}
        >
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto sm:h-10">
              <TabsTrigger value="benchmarks" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('settings:tabs.benchmarks')}</span>
                <span className="sm:hidden">Config.</span>
              </TabsTrigger>
              <TabsTrigger value="vaccines" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <Syringe className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('settings:tabs.vaccines')}</span>
                <span className="sm:hidden">{t('settings:tabs.vaccines')}</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2" disabled>
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                {t('settings:tabs.users')}
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <SettingsIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                {t('settings:tabs.general')}
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2" disabled>
                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('settings:tabs.billing')}</span>
                <span className="sm:hidden">Plan</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="benchmarks" className="mt-6">
              <SectionCard
                title={t('settings:benchmarks.title')}
                subtitle={t('settings:benchmarks.subtitle')}
              >
                <BenchmarkSettings />
              </SectionCard>
            </TabsContent>

            <TabsContent value="vaccines" className="mt-6">
              <VaccinationRequirementsManager />
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <SectionCard
                title={t('settings:users.title')}
                subtitle={t('settings:users.subtitle')}
              >
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('settings:users.title')}</h3>
                  <p className="text-muted-foreground">
                    {t('settings:users.comingSoon')}
                  </p>
                </div>
              </SectionCard>
            </TabsContent>

            <TabsContent value="general" className="mt-6">
              <SectionCard
                title={t('settings:general.title')}
                subtitle={t('settings:general.subtitle')}
              >
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        {t('settings:general.language.title')}
                      </CardTitle>
                      <CardDescription>
                        {t('settings:general.language.description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <LanguageSwitcher variant="full" />
                    </CardContent>
                  </Card>
                </div>
              </SectionCard>
            </TabsContent>

            <TabsContent value="billing" className="mt-6">
              <SectionCard
                title={t('settings:billing.title')}
                subtitle={t('settings:billing.subtitle')}
              >
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">{t('settings:billing.title')}</h3>
                  <p className="text-muted-foreground">
                    {t('settings:billing.comingSoon')}
                  </p>
                </div>
              </SectionCard>
            </TabsContent>
          </Tabs>
        </SectionCard>
      </div>
    </div>
  );
};