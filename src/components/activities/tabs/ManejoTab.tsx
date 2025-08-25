import { GeneralActivitiesManager } from '../GeneralActivitiesManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ManejoTab() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* General Activities */}
      <GeneralActivitiesManager />

      {/* Animal Movements */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Movimientos de Animales
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* TODO: Add animal movements component */}
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <p className="text-sm">
              Gestión de movimientos en desarrollo
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Facilities Management */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Gestión de Instalaciones
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* TODO: Add facilities management component */}
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <p className="text-sm">
              Gestión de instalaciones en desarrollo
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}