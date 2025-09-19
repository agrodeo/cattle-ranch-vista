import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TabsChips } from './mobile/TabsChips';
import { ResumenTab } from './tabs/ResumenTab';
import { ReproductivasTab } from './tabs/ReproductivasTab';
import { SanitariasTab } from './tabs/SanitariasTab';
import { ProductivasTab } from './tabs/ProductivasTab';
import { ManejoTab } from './tabs/ManejoTab';
import { CalendarioTab } from './tabs/CalendarioTab';

export function ActivitiesTabs() {
  const { t } = useTranslation('activities');
  const [activeTab, setActiveTab] = useState("resumen");

  const tabs = [
    { id: "resumen", label: "Resumen", shortLabel: "Resumen" },
    { id: "reproductivas", label: "Reproductivas", shortLabel: "Repro" },
    { id: "sanitarias", label: "Sanitarias", shortLabel: "Sanit" },
    { id: "productivas", label: "Productivas", shortLabel: "Prod" },
    { id: "manejo", label: "Manejo", shortLabel: "Manejo" },
    { id: "calendario", label: "Calendario", shortLabel: "Cal" }
  ];

  return (
    <div className="space-y-3">
      {/* Header - Only on Desktop */}
      <div className="hidden lg:block space-y-2 mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
          {t('title')}
        </h1>
        <p className="text-base text-slate-600">
          {t('description')}
        </p>
      </div>

      {/* Mobile Navigation - Scrollable Chips */}
      <div className="lg:hidden mb-4">
        <TabsChips 
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="pb-24">
        {/* Desktop Navigation - Standard Tabs */}
        <div className="hidden lg:block">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="reproductivas">Reproductivas</TabsTrigger>
            <TabsTrigger value="sanitarias">Sanitarias</TabsTrigger>
            <TabsTrigger value="productivas">Productivas</TabsTrigger>
            <TabsTrigger value="manejo">Manejo</TabsTrigger>
            <TabsTrigger value="calendario">Calendario</TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="resumen">
          <ResumenTab />
        </TabsContent>
        
        <TabsContent value="reproductivas">
          <ReproductivasTab />
        </TabsContent>
        
        <TabsContent value="sanitarias">
          <SanitariasTab />
        </TabsContent>
        
        <TabsContent value="productivas">
          <ProductivasTab />
        </TabsContent>
        
        <TabsContent value="manejo">
          <ManejoTab />
        </TabsContent>
        
        <TabsContent value="calendario">
          <CalendarioTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}