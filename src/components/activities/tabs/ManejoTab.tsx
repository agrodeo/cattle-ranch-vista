import { GeneralActivitiesManager } from '../GeneralActivitiesManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActivityPreferences } from '@/hooks/useActivityPreferences';
import { cn } from '@/lib/utils';

export function ManejoTab() {
  const { preferences } = useActivityPreferences();
  const isCompact = preferences.density === 'compact';

  return (
    <div className={cn('space-y-6', isCompact && 'space-y-4')}>
      {/* General Activities */}
      <GeneralActivitiesManager />

      {/* Animal Movements */}
      <Card>
        <CardHeader>
          <CardTitle className={cn(
            'text-lg',
            isCompact && 'text-base'
          )}>
            Movimientos de Animales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* TODO: Add animal movements component */}
          <div className="text-center py-8 text-muted-foreground">
            <p className={cn(isCompact && 'text-sm')}>
              Gestión de movimientos en desarrollo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Facilities Management */}
      <Card>
        <CardHeader>
          <CardTitle className={cn(
            'text-lg',
            isCompact && 'text-base'
          )}>
            Gestión de Instalaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* TODO: Add facilities management component */}
          <div className="text-center py-8 text-muted-foreground">
            <p className={cn(isCompact && 'text-sm')}>
              Gestión de instalaciones en desarrollo
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}