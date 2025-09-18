import { ArtificialInseminationManager } from '@/components/artificial-insemination/ArtificialInseminationManager';
import { PregnancyDetectionManager } from '../PregnancyDetectionManager';
import { PregnancyManagement } from '@/components/artificial-insemination/PregnancyManagement';
import { ReproductiveEventManager } from '@/components/reproductive/ReproductiveEventManager';
import { ServiceManagement } from '@/components/artificial-insemination/ServiceManagement';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActivityPreferences } from '@/hooks/useActivityPreferences';
import { cn } from '@/lib/utils';
import { useState } from 'react';

export function ReproductivasTab() {
  const { preferences } = useActivityPreferences();
  const isCompact = preferences.density === 'compact';
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);

  return (
    <div className={cn('space-y-6', isCompact && 'space-y-4')}>
      {/* Service Management - Full Width */}
      <ServiceManagement 
        onServiceSelect={setSelectedServiceId}
        selectedServiceId={selectedServiceId}
      />
      
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Artificial Insemination */}
        <Card>
          <CardHeader>
            <CardTitle className={cn(
              'text-lg',
              isCompact && 'text-base'
            )}>
              Inseminación Artificial
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ArtificialInseminationManager />
          </CardContent>
        </Card>

        {/* Pregnancy Detection */}
        <Card>
          <CardHeader>
            <CardTitle className={cn(
              'text-lg',
              isCompact && 'text-base'
            )}>
              Detección de Preñez
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PregnancyDetectionManager />
          </CardContent>
        </Card>
      </div>

      {/* Pregnancy Management - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className={cn(
            'text-lg',
            isCompact && 'text-base'
          )}>
            Gestión de Preñeces
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PregnancyManagement 
            serviceId={selectedServiceId}
            onClose={() => setSelectedServiceId(undefined)}
          />
        </CardContent>
      </Card>

      {/* Reproductive Events & Loss Management - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className={cn(
            'text-lg',
            isCompact && 'text-base'
          )}>
            Eventos Reproductivos y Pérdidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReproductiveEventManager />
        </CardContent>
      </Card>
    </div>
  );
}