import { VaccinationManager } from '../VaccinationManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActivityPreferences } from '@/hooks/useActivityPreferences';
import { cn } from '@/lib/utils';

export function SanitariasTab() {
  const { preferences } = useActivityPreferences();
  const isCompact = preferences.density === 'compact';

  return (
    <div className={cn('space-y-6', isCompact && 'space-y-4')}>
      {/* Vaccination */}
      <Card>
        <CardHeader>
          <CardTitle className={cn(
            'text-lg',
            isCompact && 'text-base'
          )}>
            Vacunación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <VaccinationManager />
        </CardContent>
      </Card>

      {/* Treatments */}
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

      {/* Health Monitoring */}
      <Card>
        <CardHeader>
          <CardTitle className={cn(
            'text-lg',
            isCompact && 'text-base'
          )}>
            Monitoreo Sanitario
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* TODO: Add health monitoring component */}
          <div className="text-center py-8 text-muted-foreground">
            <p className={cn(isCompact && 'text-sm')}>
              Monitoreo sanitario en desarrollo
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}