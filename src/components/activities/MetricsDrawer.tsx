import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Heart, Scale, Activity, Syringe } from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';

interface MetricsDrawerProps {
  children: React.ReactNode;
}

export function MetricsDrawer({ children }: MetricsDrawerProps) {
  const { stats } = useActivities();

  const allMetrics = [
    {
      title: 'Total Actividades',
      value: stats.totalActivities,
      icon: Activity,
      description: 'Histórico completo'
    },
    {
      title: 'Inseminaciones',
      value: stats.inseminations,
      icon: Heart,
      description: 'Total realizadas'
    },
    {
      title: 'Preñeces Confirmadas',
      value: stats.pregnancies,
      icon: TrendingUp,
      description: 'Actualmente gestantes'
    },
    {
      title: 'Vacunaciones',
      value: stats.vaccinations,
      icon: Syringe,
      description: 'Total aplicadas'
    },
    {
      title: 'Pesajes',
      value: stats.weighings,
      icon: Scale,
      description: 'Controles realizados'
    },
    {
      title: 'Actividades Mensuales',
      value: stats.monthlyActivities,
      icon: BarChart3,
      description: 'Este mes'
    }
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-[90vw] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>Todas las Métricas</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          <div className="grid gap-4">
            {allMetrics.map((metric, index) => (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.title}
                  </CardTitle>
                  <metric.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metric.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {metric.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}