import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MobilePageHeader } from "@/components/mobile/MobilePageHeader";
import { FinancesSummary } from "@/components/finances/FinancesSummary";
import { FinancesMovements } from "@/components/finances/FinancesMovements";
import FinancesRecurring from "@/components/finances/FinancesRecurring";

const Finances = () => {
  const { t } = useTranslation(['finance', 'common']);
  const isMobile = useIsMobile();

  useEffect(() => {
    document.title = "Finanzas - Agrodeo";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Gestión financiera completa para tu establecimiento ganadero');
    }
  }, []);

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background overflow-x-hidden">
        <MobilePageHeader 
          title={t('finance:title', 'Finanzas')}
          subtitle={t('finance:subtitle', 'Gestión de movimientos financieros')}
        />
        
        <div className="p-4">
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-0 h-auto p-0 mb-6">
              <TabsTrigger value="summary" className="text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary px-4 py-2.5 text-muted-foreground">
                {t('finance:tabs.summary', 'Resumen')}
              </TabsTrigger>
              <TabsTrigger value="movements" className="text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary px-4 py-2.5 text-muted-foreground">
                {t('finance:tabs.movements', 'Movimientos')}
              </TabsTrigger>
              <TabsTrigger value="recurring" className="text-sm rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary px-4 py-2.5 text-muted-foreground">
                {t('finance:tabs.recurring', 'Recurrentes')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-0">
              <FinancesSummary />
            </TabsContent>

            <TabsContent value="movements" className="mt-0">
              <FinancesMovements />
            </TabsContent>

            <TabsContent value="recurring" className="mt-0">
              <FinancesRecurring />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
      <div className="space-y-6">
      <PageHeader
        title={t('finance:title', 'Finanzas')}
        subtitle={t('finance:subtitle', 'Gestión de movimientos financieros')}
      />

      <SectionCard>
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="bg-transparent border-b border-border rounded-none w-full justify-start gap-0 h-auto p-0 mb-4">
            <TabsTrigger value="summary" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary px-5 py-2.5 text-muted-foreground font-medium">
              {t('finance:tabs.summary', 'Resumen')}
            </TabsTrigger>
            <TabsTrigger value="movements" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary px-5 py-2.5 text-muted-foreground font-medium">
              {t('finance:tabs.movements', 'Movimientos')}
            </TabsTrigger>
            <TabsTrigger value="recurring" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:text-primary px-5 py-2.5 text-muted-foreground font-medium">
              {t('finance:tabs.recurring', 'Recurrentes')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <FinancesSummary />
          </TabsContent>

          <TabsContent value="movements">
            <FinancesMovements />
          </TabsContent>

          <TabsContent value="recurring">
            <FinancesRecurring />
          </TabsContent>
        </Tabs>
      </SectionCard>
      </div>
    </div>
  );
};

export default Finances;