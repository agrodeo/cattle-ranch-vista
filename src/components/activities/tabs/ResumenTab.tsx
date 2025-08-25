import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Activity, 
  Heart, 
  Syringe, 
  Plus, 
  Calendar,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useActivityPreferences } from '@/hooks/useActivityPreferences';
import { MetricsDrawer } from '../MetricsDrawer';

export function ResumenTab() {
  const { stats } = useActivities();
  const { preferences, toggleSection } = useActivityPreferences();
  
  const isRecentActivitiesOpen = !preferences.collapsedSections.recentActivities;
  
  const mainKPIs = [
    {
      title: 'Actividades (30 días)',
      value: stats.monthlyActivities,
      icon: Activity,
      description: 'Este mes'
    },
    {
      title: 'Inseminaciones',
      value: stats.inseminations,
      icon: Heart,
      description: 'Del mes'
    },
    {
      title: 'Vacunas próximas',
      value: 12, // TODO: implement upcoming vaccines count
      icon: Syringe,
      description: 'Próximos 7 días'
    }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Main KPIs */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        {mainKPIs.map((kpi, index) => (
          <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl sm:text-2xl font-bold">
                {kpi.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {kpi.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* More Metrics Button */}
      <div className="flex justify-center">
        <MetricsDrawer>
          <Button variant="outline" className="gap-2">
            <Activity className="h-4 w-4" />
            Ver más métricas
          </Button>
        </MetricsDrawer>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
            <Button size="lg" className="h-12 sm:h-16 flex-col gap-1 sm:gap-2">
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm">Registrar Actividad</span>
            </Button>
            <Button size="lg" variant="outline" className="h-12 sm:h-16 flex-col gap-1 sm:gap-2">
              <Syringe className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="text-sm">Vacunar Ahora</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Compact Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-base sm:text-lg">
            <span>Próximos 7 días</span>
            <Button variant="ghost" size="sm" className="text-xs sm:text-sm">
              <Calendar className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Ver calendario completo</span>
              <span className="sm:hidden">Ver más</span>
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 sm:space-y-3">
            {/* TODO: Implement upcoming activities */}
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">
                No hay actividades programadas para los próximos 7 días
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activities - Collapsible */}
      <Collapsible open={isRecentActivitiesOpen}>
        <Card>
          <CollapsibleTrigger asChild>
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                <span>Actividades Recientes</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-muted-foreground">5 elementos</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      toggleSection('recentActivities');
                    }}
                  >
                    {isRecentActivitiesOpen ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="space-y-2 sm:space-y-3">
                {/* TODO: Implement recent activities list */}
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm">
                    No hay actividades recientes
                  </p>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}