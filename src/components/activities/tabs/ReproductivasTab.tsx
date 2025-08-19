import { ArtificialInseminationManager } from '@/components/artificial-insemination/ArtificialInseminationManager';
import { PregnancyDetectionManager } from '../PregnancyDetectionManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useActivityPreferences } from '@/hooks/useActivityPreferences';
import { cn } from '@/lib/utils';

export function ReproductivasTab() {
  const { preferences } = useActivityPreferences();
  const isCompact = preferences.density === 'compact';

  return (
    <div className={cn('space-y-6', isCompact && 'space-y-4')}>
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
          {/* TODO: Add pregnancy management component */}
          <div className="text-center py-8 text-muted-foreground">
            <p className={cn(isCompact && 'text-sm')}>
              Gestión de preñeces en desarrollo
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}