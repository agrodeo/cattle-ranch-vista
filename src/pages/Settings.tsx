import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/ui/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BenchmarkSettings } from "@/components/settings/BenchmarkSettings";
import { VaccinationRequirementsManager } from "@/components/settings/VaccinationRequirementsManager";
import { UserManagement } from "@/components/settings/UserManagement";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Syringe, Globe, Scale, Trash2, Users } from "lucide-react";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { BreedMixingToggle } from "@/components/settings/BreedMixingToggle";
import { Link } from "react-router-dom";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export const SettingsPage = () => {
  const { t } = useTranslation(['settings']);
  const { currentUser } = useSupabaseAuth();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "general";
  const canManageUsers = currentUser?.role === "owner" || currentUser?.role === "admin" || currentUser?.role === "manager";

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
          <TabsList className="bg-transparent border-b border-border rounded-none w-auto justify-start gap-0 h-auto p-0 inline-flex overflow-x-auto scrollbar-hide">
            {canManageUsers && (
              <TabsTrigger 
                value="users" 
                className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground font-medium transition-all"
              >
                <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Usuarios
              </TabsTrigger>
            )}
            <TabsTrigger 
              value="general" 
              className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground font-medium transition-all"
            >
              <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('settings:tabs.general')}
            </TabsTrigger>
            <TabsTrigger 
              value="benchmarks" 
              className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground font-medium transition-all"
            >
              <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('settings:tabs.benchmarks')}
            </TabsTrigger>
            <TabsTrigger 
              value="vaccines" 
              className="flex-shrink-0 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm px-4 py-2.5 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary text-muted-foreground font-medium transition-all"
            >
              <Syringe className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {t('settings:tabs.vaccines')}
            </TabsTrigger>
          </TabsList>

          {canManageUsers && (
            <TabsContent value="users" className="mt-4 sm:mt-6">
              <UserManagement />
            </TabsContent>
          )}

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
            <div className="mt-4">
              <BreedMixingToggle />
            </div>
          </TabsContent>

          <TabsContent value="benchmarks" className="mt-4 sm:mt-6">
            <BenchmarkSettings />
          </TabsContent>

          <TabsContent value="vaccines" className="mt-4 sm:mt-6">
            <VaccinationRequirementsManager />
          </TabsContent>
        </Tabs>

        <Card className="border-0 shadow-sm sm:border sm:shadow-md mt-4 sm:mt-6">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Scale className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg">{t('settings:legal.title', 'Legal')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-0.5">
                  {t('settings:legal.description', 'Términos y políticas de la aplicación')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Link to="/terminos-de-uso" className="text-sm text-primary hover:underline">
              {t('settings:legal.termsOfUse', 'Términos de Uso')}
            </Link>
            <Link to="/politica-de-privacidad" className="text-sm text-primary hover:underline">
              {t('settings:legal.privacyPolicy', 'Política de Privacidad')}
            </Link>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm sm:border sm:shadow-md mt-4 sm:mt-6 border-destructive/30">
          <CardHeader className="pb-3 sm:pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-lg text-destructive">{t('settings:deleteAccount.sectionTitle', 'Delete Account')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm mt-0.5">
                  {t('settings:deleteAccount.sectionDescription', 'Permanently delete your account and all associated data.')}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <DeleteAccountDialog />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
