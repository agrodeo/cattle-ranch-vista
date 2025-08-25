import { WeighingManager } from '../WeighingManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ProductivasTab() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Weighing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
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
          <CardTitle className="text-base sm:text-lg">
            Evaluaciones Productivas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* TODO: Add production evaluations component */}
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <p className="text-sm">
              Evaluaciones productivas en desarrollo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Performance Analytics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Análisis de Rendimiento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* TODO: Add performance analytics component */}
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <p className="text-sm">
              Análisis de rendimiento en desarrollo
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}