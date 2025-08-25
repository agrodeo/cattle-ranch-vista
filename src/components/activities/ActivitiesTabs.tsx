import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActivityPreferences } from '@/hooks/useActivityPreferences';
import { ResumenTab } from './tabs/ResumenTab';
import { ReproductivasTab } from './tabs/ReproductivasTab';
import { SanitariasTab } from './tabs/SanitariasTab';
import { ProductivasTab } from './tabs/ProductivasTab';
import { ManejoTab } from './tabs/ManejoTab';
import { CalendarioTab } from './tabs/CalendarioTab';
import { cn } from '@/lib/utils';

export function ActivitiesTabs() {
  const { preferences, setActiveTab } = useActivityPreferences();

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Actividades
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Gestiona todas las actividades de tu cabaña
        </p>
      </div>

      {/* Tabs */}
      <Tabs 
        value={preferences.activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto sm:h-10">
          <TabsTrigger 
            value="resumen"
            className="text-xs sm:text-sm px-1 sm:px-3 py-2"
          >
            <span className="hidden sm:inline">Resumen</span>
            <span className="sm:hidden">Inicio</span>
          </TabsTrigger>
          <TabsTrigger 
            value="reproductivas"
            className="text-xs sm:text-sm px-1 sm:px-3 py-2"
          >
            <span className="hidden sm:inline">Reproductivas</span>
            <span className="sm:hidden">Reprod.</span>
          </TabsTrigger>
          <TabsTrigger 
            value="sanitarias"
            className="text-xs sm:text-sm px-1 sm:px-3 py-2"
          >
            <span className="hidden sm:inline">Sanitarias</span>
            <span className="sm:hidden">Sanit.</span>
          </TabsTrigger>
          <TabsTrigger 
            value="productivas"
            className="text-xs sm:text-sm px-1 sm:px-3 py-2"
          >
            <span className="hidden sm:inline">Productivas</span>
            <span className="sm:hidden">Prod.</span>
          </TabsTrigger>
          <TabsTrigger 
            value="manejo"
            className="text-xs sm:text-sm px-1 sm:px-3 py-2"
          >
            <span className="hidden sm:inline">Manejo</span>
            <span className="sm:hidden">Manejo</span>
          </TabsTrigger>
          <TabsTrigger 
            value="calendario"
            className="text-xs sm:text-sm px-1 sm:px-3 py-2"
          >
            <span className="hidden sm:inline">Calendario</span>
            <span className="sm:hidden">Cal.</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-4 sm:mt-6">
          <ResumenTab />
        </TabsContent>

        <TabsContent value="reproductivas" className="mt-4 sm:mt-6">
          <ReproductivasTab />
        </TabsContent>

        <TabsContent value="sanitarias" className="mt-4 sm:mt-6">
          <SanitariasTab />
        </TabsContent>

        <TabsContent value="productivas" className="mt-4 sm:mt-6">
          <ProductivasTab />
        </TabsContent>

        <TabsContent value="manejo" className="mt-4 sm:mt-6">
          <ManejoTab />
        </TabsContent>

        <TabsContent value="calendario" className="mt-4 sm:mt-6">
          <CalendarioTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}