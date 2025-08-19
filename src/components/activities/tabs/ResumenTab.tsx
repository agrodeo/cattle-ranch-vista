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
import { cn } from '@/lib/utils';
import { MetricsDrawer } from '../MetricsDrawer';

export function ResumenTab() {
  const { stats } = useActivities();
  const { preferences, toggleSection } = useActivityPreferences();
  
  const isCompact = preferences.density === 'compact';
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
    <div className={cn('space-y-6', isCompact && 'space-y-4')}>
      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        {mainKPIs.map((kpi, index) => (
          <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardHeader className={cn(
              'flex flex-row items-center justify-between space-y-0 pb-2',
              isCompact && 'pb-1'
            )}>
              <CardTitle className={cn(
                'text-sm font-medium',
                isCompact && 'text-xs'
              )}>
                {kpi.title}
              </CardTitle>
              <kpi.icon className={cn(
                'h-4 w-4 text-muted-foreground',
                isCompact && 'h-3 w-3'
              )} />
            </CardHeader>
            <CardContent className={cn(isCompact && 'pt-1')}>
              <div className={cn(
                'text-2xl font-bold',
                isCompact && 'text-xl'
              )}>
                {kpi.value}
              </div>
              <p className={cn(
                'text-xs text-muted-foreground',
                isCompact && 'text-[10px]'
              )}>
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
          <CardTitle className={cn(
            'text-lg',
            isCompact && 'text-base'
          )}>
            Acciones Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button size="lg" className={cn(
              'h-16 flex-col gap-2',
              isCompact && 'h-12 gap-1'
            )}>
              <Plus className={cn('h-5 w-5', isCompact && 'h-4 w-4')} />
              <span className={cn(isCompact && 'text-sm')}>Registrar Actividad</span>
            </Button>
            <Button size="lg" variant="outline" className={cn(
              'h-16 flex-col gap-2',
              isCompact && 'h-12 gap-1'
            )}>
              <Syringe className={cn('h-5 w-5', isCompact && 'h-4 w-4')} />
              <span className={cn(isCompact && 'text-sm')}>Vacunar Ahora</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Compact Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className={cn(
            'flex items-center justify-between text-lg',
            isCompact && 'text-base'
          )}>
            <span>Próximos 7 días</span>
            <Button variant="ghost" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Ver calendario completo
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className={cn(
            'space-y-3',
            isCompact && 'space-y-2'
          )}>
            {/* TODO: Implement upcoming activities */}
            <div className="text-center py-4 text-muted-foreground">
              <p className={cn(isCompact && 'text-sm')}>
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
              <CardTitle className={cn(
                'flex items-center justify-between text-lg',
                isCompact && 'text-base'
              )}>
                <span>Actividades Recientes</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">5 elementos</span>
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
              <div className={cn(
                'space-y-3',
                isCompact && 'space-y-2'
              )}>
                {/* TODO: Implement recent activities list */}
                <div className="text-center py-4 text-muted-foreground">
                  <p className={cn(isCompact && 'text-sm')}>
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