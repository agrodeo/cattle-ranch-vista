import { useState } from 'react';
import { 
  Activity, 
  Heart, 
  Syringe, 
  Calendar,
  TrendingUp,
  Filter
} from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { useActivityPreferences } from '@/hooks/useActivityPreferences';
import { MetricsDrawer } from '../MetricsDrawer';
import { KpiGrid } from '../mobile/KpiGrid';
import { QuickActionsBar } from '../mobile/QuickActionsBar';
import { Section } from '../mobile/Section';
import { UpcomingList } from '../mobile/UpcomingList';
import { RecentList } from '../mobile/RecentList';
import { FiltersSheet } from '../mobile/FiltersSheet';
import { Button } from '@/components/ui/button';

interface FilterOptions {
  corrales: string[];
  sexo: 'all' | 'macho' | 'hembra';
  edad: [number, number];
  estado: string[];
}

export function ResumenTab() {
  const { stats } = useActivities();
  const { preferences, toggleSection } = useActivityPreferences();
  
  const [filters, setFilters] = useState<FilterOptions>({
    corrales: [],
    sexo: 'all',
    edad: [0, 120],
    estado: ['activo']
  });

  // Mock data - replace with real data hooks
  const upcomingActivities = [
    {
      id: '1',
      title: 'Vacunación Antiaftosa',
      type: 'Vacuna',
      date: 'Hoy',
      location: 'Corral A',
      priority: 'high' as const,
      animalCount: 15
    },
    {
      id: '2',
      title: 'Tacto Reproductivo',
      type: 'Tacto',
      date: 'Mañana',
      location: 'Corral B',
      priority: 'medium' as const,
      animalCount: 8
    }
  ];

  const recentActivities = [
    {
      id: '1',
      title: 'Inseminación Artificial',
      type: 'Inseminación',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      user: 'Juan Pérez',
      location: 'Corral C',
      animalCount: 5,
      status: 'completed' as const
    },
    {
      id: '2',
      title: 'Pesaje Mensual',
      type: 'Pesaje',
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      user: 'María García',
      location: 'Manga Principal',
      animalCount: 25,
      status: 'completed' as const
    }
  ];

  const availableCorrales = [
    { id: '1', name: 'Corral A' },
    { id: '2', name: 'Corral B' },
    { id: '3', name: 'Corral C' },
    { id: '4', name: 'Manga Principal' }
  ];

  const kpis = [
    {
      title: 'Actividades (30 días)',
      value: stats.monthlyActivities || 0,
      icon: Activity,
      trend: {
        value: '+12%',
        trend: 'up' as const
      }
    },
    {
      title: 'Inseminaciones',
      value: stats.inseminations || 0,
      icon: Heart
    },
    {
      title: 'Vacunas próximas',
      value: 12,
      icon: Syringe
    },
    {
      title: 'Servicios',
      value: 8,
      icon: TrendingUp
    }
  ];

  const handleRegisterActivity = () => {
    console.log('Opening activity registration');
  };

  const handleVaccinate = () => {
    console.log('Opening vaccination');
  };

  const handleFiltersChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    console.log('Filters applied:', newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      corrales: [],
      sexo: 'all',
      edad: [0, 120],
      estado: ['activo']
    });
  };

  const isRecentActivitiesOpen = !preferences.collapsedSections?.recentActivities;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-6">
      {/* Main Content */}
      <section className="lg:col-span-2 space-y-4">
        {/* KPIs */}
        <KpiGrid kpis={kpis} />

        {/* More Metrics Button */}
        <div className="flex justify-center lg:justify-start">
          <MetricsDrawer>
            <Button variant="outline" className="gap-2">
              <Activity className="h-4 w-4" />
              Ver más métricas
            </Button>
          </MetricsDrawer>
        </div>

        {/* Quick Actions */}
        <QuickActionsBar
          onRegisterActivity={handleRegisterActivity}
          onVaccinate={handleVaccinate}
        />

        {/* Upcoming Activities */}
        <Section
          title="Próximas Actividades"
          count={upcomingActivities.length}
          collapsible
          defaultOpen={upcomingActivities.length > 0}
          onFilter={() => {
            // Open filters sheet
          }}
        >
          <FiltersSheet
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            availableCorrales={availableCorrales}
          >
            <Button variant="ghost" size="sm" className="lg:hidden">
              <Filter className="h-4 w-4" />
            </Button>
          </FiltersSheet>
          <UpcomingList activities={upcomingActivities} />
        </Section>

        {/* Recent Activities */}
        <Section
          title="Actividades Recientes"
          count={recentActivities.length}
          collapsible
          defaultOpen={isRecentActivitiesOpen}
        >
          <RecentList activities={recentActivities} />
        </Section>
      </section>

      {/* Right Rail */}
      <aside className="space-y-4">
        {/* Compact Calendar */}
        <Section title="Próximos 7 días">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink-900">Hoy</span>
              <span className="text-ink-600">3 actividades</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink-900">+3 días</span>
              <span className="text-ink-600">1 actividad</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-ink-900">+7 días</span>
              <span className="text-ink-600">2 actividades</span>
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-3">
              <Calendar className="h-4 w-4 mr-2" />
              Ver calendario completo
            </Button>
          </div>
        </Section>

        {/* Vaccines Due */}
        <Section title="Vacunas Próximas">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
              <div>
                <p className="text-sm font-medium text-red-900">Antiaftosa</p>
                <p className="text-xs text-red-600">Vence hoy</p>
              </div>
              <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                15 animales
              </span>
            </div>
            <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200">
              <div>
                <p className="text-sm font-medium text-amber-900">Brucelosis</p>
                <p className="text-xs text-amber-600">En 3 días</p>
              </div>
              <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                8 animales
              </span>
            </div>
          </div>
        </Section>
      </aside>
    </div>
  );
}