import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { 
  Calendar, 
  Activity, 
  Heart, 
  Syringe, 
  Weight, 
  Stethoscope,
  Baby,
  Plus,
  Users
} from 'lucide-react';
import { ActivityCreationFlow } from '@/components/mobile/flows/ActivityCreationFlow';

export function SimpleActivitiesList() {
  const { t } = useTranslation('activities');
  const [showActivityCreation, setShowActivityCreation] = useState(false);

  // Mock data for demonstration - this will be empty until real activities are created
  const activities: any[] = [];

  const getActivityIcon = (tipo: string) => {
    switch (tipo) {
      case 'vacunacion': return Syringe;
      case 'inseminacion': return Heart;
      case 'pesaje': return Weight;
      case 'tacto': return Stethoscope;
      case 'parto': return Baby;
      case 'muerte': return Activity;
      case 'servicio': return Users;
      default: return Activity;
    }
  };

  const formatActivityType = (tipo: string) => {
    const types: Record<string, string> = {
      vacunacion: 'Vacunación',
      inseminacion: 'Inseminación',
      pesaje: 'Pesaje',
      tacto: 'Tacto',
      parto: 'Parto',
      muerte: 'Muerte',
      servicio: 'Servicio'
    };
    return types[tipo] || tipo;
  };

  const renderSection = (title: string, activities: any[], emptyMessage: string) => {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <Badge variant="secondary">{activities.length}</Badge>
        </div>
        
        {activities.length === 0 ? (
          <EmptyState 
            icon={<Calendar className="h-12 w-12" />}
            title={emptyMessage}
            description="Usa el botón 'Registrar Actividad' para comenzar"
          />
        ) : (
          <div className="space-y-2">
            {activities.map((activity, index) => {
              const IconComponent = getActivityIcon(activity.tipo);
              
              return (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-full bg-slate-100">
                        <IconComponent className="h-4 w-4" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {formatActivityType(activity.tipo)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {activity.fecha}
                          </span>
                        </div>
                        
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {activity.animal_id_tag}
                            {activity.animal_name && (
                              <span className="text-muted-foreground"> - {activity.animal_name}</span>
                            )}
                          </p>
                          
                          {activity.observaciones && (
                            <p className="text-xs text-muted-foreground">
                              {activity.observaciones}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
          Actividades
        </h1>
        <p className="text-base text-slate-600">
          Registro de todas las actividades del ganado
        </p>
      </div>

      {/* Main Action Button - Desktop */}
      <div className="hidden lg:block">
        <Button 
          onClick={() => {
            console.log('Desktop button clicked, opening activity creation');
            setShowActivityCreation(true);
          }}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          Registrar Actividad
        </Button>
      </div>

      {/* Activities Sections */}
      <div className="space-y-8">
        {renderSection('Próximas Actividades', [], 'No hay actividades programadas')}
        {renderSection('Actividades de Hoy', [], 'No hay actividades para hoy')}
        {renderSection('Actividades Pasadas', activities, 'No hay actividades registradas')}
      </div>

      {/* Floating Action Button - Mobile */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none">
        <div className="mx-auto max-w-screen-sm px-3 pb-[env(safe-area-inset-bottom)] pointer-events-auto">
          <div className="rounded-full bg-white/95 shadow-lg backdrop-blur border border-slate-200 p-2 mb-3">
            <Button 
              onClick={() => {
                console.log('Mobile button clicked, opening activity creation');
                setShowActivityCreation(true);
              }}
              className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white shadow-none"
            >
              <Plus className="h-4 w-4 mr-1" />
              Registrar Actividad
            </Button>
          </div>
        </div>
      </div>

      {/* Activity Creation Flow */}
      {showActivityCreation && (
        <ActivityCreationFlow onClose={() => setShowActivityCreation(false)} />
      )}
    </div>
  );
}