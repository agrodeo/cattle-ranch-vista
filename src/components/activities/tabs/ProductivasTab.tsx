import { WeighingManager } from '../WeighingManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActivityPreferences } from '@/hooks/useActivityPreferences';
import { cn } from '@/lib/utils';

export function ProductivasTab() {
  const { preferences } = useActivityPreferences();
  const isCompact = preferences.density === 'compact';

  return (
    <div className={cn('space-y-6', isCompact && 'space-y-4')}>
      {/* Weighing */}
      <Card>
        <CardHeader>
          <CardTitle className={cn(
            'text-lg',
            isCompact && 'text-base'
          )}>
            Pesaje y Control
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WeighingManager />
        </CardContent>
      </Card>

      {/* Production Evaluations */}
      <Card>
        <CardHeader>
          <CardTitle className={cn(
            'text-lg',
            isCompact && 'text-base'
          )}>
            Evaluaciones Productivas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* TODO: Add production evaluations component */}
          <div className="text-center py-8 text-muted-foreground">
            <p className={cn(isCompact && 'text-sm')}>
              Evaluaciones productivas en desarrollo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Performance Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className={cn(
            'text-lg',
            isCompact && 'text-base'
          )}>
            Análisis de Rendimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* TODO: Add performance analytics component */}
          <div className="text-center py-8 text-muted-foreground">
            <p className={cn(isCompact && 'text-sm')}>
              Análisis de rendimiento en desarrollo
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}