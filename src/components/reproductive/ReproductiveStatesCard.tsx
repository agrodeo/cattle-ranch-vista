import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, Activity, Calendar, TrendingUp } from 'lucide-react';
import { useReproductiveSystem } from '@/hooks/useReproductiveSystem';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';

export function ReproductiveStatesCard() {
  const { states, loading, loadStates, migrateExistingData } = useReproductiveSystem();
  const { currentUser } = useSupabaseAuth();

  useEffect(() => {
    if (currentUser?.cabañaId) {
      loadStates(currentUser.cabañaId);
    }
  }, [currentUser?.cabañaId]);

  const getStateColor = (estado: string) => {
    switch (estado) {
      case 'servicio_pendiente':
        return 'secondary';
      case 'ia_pendiente':
        return 'secondary';
      case 'preñez_servicio':
        return 'default';
      case 'preñez_ia':
        return 'default';
      case 'preñez_activa':
        return 'default';
      case 'servicio_fallido':
        return 'destructive';
      case 'ia_fallida':
        return 'destructive';
      case 'post_parto':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getStateLabel = (estado: string) => {
    switch (estado) {
      case 'servicio_pendiente':
        return 'Servicio Pendiente';
      case 'ia_pendiente':
        return 'IA Pendiente';
      case 'preñez_servicio':
        return 'Preñez por Servicio';
      case 'preñez_ia':
        return 'Preñez por IA';
      case 'preñez_activa':
        return 'Preñez Activa';
      case 'servicio_fallido':
        return 'Servicio Fallido';
      case 'ia_fallida':
        return 'IA Fallida';
      case 'post_parto':
        return 'Post Parto';
      default:
        return estado;
    }
  };

  const getStateIcon = (estado: string) => {
    if (estado.includes('preñez')) {
      return <Heart className="h-4 w-4" />;
    } else if (estado.includes('pendiente')) {
      return <Activity className="h-4 w-4" />;
    } else if (estado.includes('fallido')) {
      return <TrendingUp className="h-4 w-4" />;
    } else {
      return <Calendar className="h-4 w-4" />;
    }
  };

  // Group states by status
  const stateGroups = states.reduce((groups, state) => {
    const key = state.estado_reproductivo;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(state);
    return groups;
  }, {} as Record<string, typeof states>);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Estados Reproductivos</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={migrateExistingData}
          disabled={loading}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Migrar Datos
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">Cargando estados...</p>
          </div>
        ) : Object.keys(stateGroups).length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-2">No hay estados reproductivos registrados</p>
            <p className="text-xs text-muted-foreground">
              Los estados se crean automáticamente al registrar servicios, IA o tactos
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(stateGroups).map(([estado, stateList]) => (
              <div key={estado} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getStateIcon(estado)}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{getStateLabel(estado)}</span>
                      <Badge variant={getStateColor(estado)} className="text-xs">
                        {stateList.length}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stateList.length} animal{stateList.length !== 1 ? 'es' : ''}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">
                    Última actualización
                  </p>
                  <p className="text-xs font-medium">
                    {new Date(Math.max(...stateList.map(s => new Date(s.updated_at).getTime()))).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}