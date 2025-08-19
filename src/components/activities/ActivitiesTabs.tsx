import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActivityPreferences } from '@/hooks/useActivityPreferences';
import { DensityToggle } from './DensityToggle';
import { ResumenTab } from './tabs/ResumenTab';
import { ReproductivasTab } from './tabs/ReproductivasTab';
import { SanitariasTab } from './tabs/SanitariasTab';
import { ProductivasTab } from './tabs/ProductivasTab';
import { ManejoTab } from './tabs/ManejoTab';
import { CalendarioTab } from './tabs/CalendarioTab';
import { cn } from '@/lib/utils';

export function ActivitiesTabs() {
  const { preferences, setActiveTab, setDensity } = useActivityPreferences();
  const isCompact = preferences.density === 'compact';

  return (
    <div className={cn('space-y-6', isCompact && 'space-y-4')}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={cn(
            'text-3xl font-bold tracking-tight',
            isCompact && 'text-2xl'
          )}>
            Actividades
          </h1>
          <p className={cn(
            'text-muted-foreground',
            isCompact && 'text-sm'
          )}>
            Gestiona todas las actividades de tu cabaña
          </p>
        </div>
        <DensityToggle 
          density={preferences.density} 
          onChange={setDensity}
        />
      </div>

      {/* Tabs */}
      <Tabs 
        value={preferences.activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className={cn(
          'grid w-full grid-cols-6',
          isCompact && 'h-9'
        )}>
          <TabsTrigger 
            value="resumen"
            className={cn(isCompact && 'text-xs px-2')}
          >
            Resumen
          </TabsTrigger>
          <TabsTrigger 
            value="reproductivas"
            className={cn(isCompact && 'text-xs px-2')}
          >
            Reproductivas
          </TabsTrigger>
          <TabsTrigger 
            value="sanitarias"
            className={cn(isCompact && 'text-xs px-2')}
          >
            Sanitarias
          </TabsTrigger>
          <TabsTrigger 
            value="productivas"
            className={cn(isCompact && 'text-xs px-2')}
          >
            Productivas
          </TabsTrigger>
          <TabsTrigger 
            value="manejo"
            className={cn(isCompact && 'text-xs px-2')}
          >
            Manejo
          </TabsTrigger>
          <TabsTrigger 
            value="calendario"
            className={cn(isCompact && 'text-xs px-2')}
          >
            Calendario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="resumen" className="mt-6">
          <ResumenTab />
        </TabsContent>

        <TabsContent value="reproductivas" className="mt-6">
          <ReproductivasTab />
        </TabsContent>

        <TabsContent value="sanitarias" className="mt-6">
          <SanitariasTab />
        </TabsContent>

        <TabsContent value="productivas" className="mt-6">
          <ProductivasTab />
        </TabsContent>

        <TabsContent value="manejo" className="mt-6">
          <ManejoTab />
        </TabsContent>

        <TabsContent value="calendario" className="mt-6">
          <CalendarioTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}