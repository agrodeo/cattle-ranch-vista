import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResumenTab } from './tabs/ResumenTab';
import { ReproductivasTab } from './tabs/ReproductivasTab';
import { SanitariasTab } from './tabs/SanitariasTab';
import { ProductivasTab } from './tabs/ProductivasTab';
import { ManejoTab } from './tabs/ManejoTab';
import { CalendarioTab } from './tabs/CalendarioTab';

export function ActivitiesTabs() {
  const { t } = useTranslation('activities');

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

      {/* Tabs */}
      <Tabs defaultValue="resumen" className="pb-24">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="reproductivas">Reproductivas</TabsTrigger>
          <TabsTrigger value="sanitarias">Sanitarias</TabsTrigger>
          <TabsTrigger value="productivas">Productivas</TabsTrigger>
          <TabsTrigger value="manejo">Manejo</TabsTrigger>
          <TabsTrigger value="calendario">Calendario</TabsTrigger>
        </TabsList>
        
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