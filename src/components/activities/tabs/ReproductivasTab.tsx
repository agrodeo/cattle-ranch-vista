import { ArtificialInseminationManager } from '@/components/artificial-insemination/ArtificialInseminationManager';
import { PregnancyManagement } from '@/components/artificial-insemination/PregnancyManagement';
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
      
      {/* Artificial Insemination Management - Full Width */}
      <Card>
        <CardHeader>
          <CardTitle className={cn(
            'text-lg',
            isCompact && 'text-base'
          )}>
            Registro de Inseminación Artificial
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ArtificialInseminationManager />
        </CardContent>
      </Card>

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
    </div>
  );
}