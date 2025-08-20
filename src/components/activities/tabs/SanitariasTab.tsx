import { VaccinationManager } from '../VaccinationManager';
import { VaccinationDashboard } from '@/components/vaccination/VaccinationDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActivityPreferences } from '@/hooks/useActivityPreferences';
import { cn } from '@/lib/utils';

export function SanitariasTab() {
  const { preferences } = useActivityPreferences();
  const isCompact = preferences.density === 'compact';

  return (
    <div className={cn('space-y-6', isCompact && 'space-y-4')}>
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="dashboard">Panel de Control</TabsTrigger>
          <TabsTrigger value="vaccination">Nueva Vacunación</TabsTrigger>
          <TabsTrigger value="treatments">Tratamientos</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <VaccinationDashboard />
        </TabsContent>

        <TabsContent value="vaccination" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className={cn(
                'text-lg',
                isCompact && 'text-base'
              )}>
                Registrar Nueva Vacunación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VaccinationManager />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="treatments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className={cn(
                'text-lg',
                isCompact && 'text-base'
              )}>
                Tratamientos Veterinarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* TODO: Add treatments component */}
              <div className="text-center py-8 text-muted-foreground">
                <p className={cn(isCompact && 'text-sm')}>
                  Gestión de tratamientos en desarrollo
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}