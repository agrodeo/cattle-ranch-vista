import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Plus, Activity, Syringe, Heart, Weight, ListChecks } from 'lucide-react';
import { ActivityCreationFlow } from '@/components/mobile/flows/ActivityCreationFlow';
import { useAllActivities } from '@/hooks/useAllActivities';
import { ActivityCard } from './ActivityCard';
import { ActivityDetailDialog } from './ActivityDetailDialog';
import { ReportKpiCard } from '@/components/reports/shared/ReportKpiCard';
import type { UnifiedActivity } from '@/hooks/useAllActivities';
import { useTranslation } from 'react-i18next';

export function SimpleActivitiesList() {
  const { t } = useTranslation(['activities']);
  const [showActivityCreation, setShowActivityCreation] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<UnifiedActivity | null>(null);
  const { activities, isLoading } = useAllActivities();

  // KPI calculations
  const kpis = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const last30 = activities.filter(a => new Date(a.fecha) >= thirtyDaysAgo);
    const last7Vaccines = activities.filter(a => a.tipo === 'VACUNACION' && new Date(a.fecha) >= sevenDaysAgo);
    const iaCount = activities.filter(a => a.tipo === 'IA' && new Date(a.fecha) >= thirtyDaysAgo);
    
    return {
      total: activities.length,
      last30: last30.length,
      vaccines7d: last7Vaccines.length,
      ia30d: iaCount.length,
    };
  }, [activities]);

  const groupActivities = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const todayActivities = activities.filter(a => {
      const d = new Date(a.fecha);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });

    const last7Days = activities.filter(a => {
      const d = new Date(a.fecha);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < today.getTime() && d.getTime() >= sevenDaysAgo.getTime();
    });

    const older = activities.filter(a => {
      const d = new Date(a.fecha);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < sevenDaysAgo.getTime();
    });

    return { todayActivities, last7Days, older };
  };

  const { todayActivities, last7Days, older } = groupActivities();

  const renderSection = (title: string, items: UnifiedActivity[]) => (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
        <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map((activity) => (
          <ActivityCard
            key={activity.id}
            activity={activity}
            onClick={() => setSelectedActivity(activity)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            {t('activities:title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('activities:subtitle')}
          </p>
        </div>
        {/* Desktop register button */}
        <div className="hidden lg:block">
          <Button onClick={() => setShowActivityCreation(true)} size="lg" className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            {t('activities:quickActions.register')}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <ReportKpiCard
          label={t('activities:kpis.activities30d')}
          value={kpis.last30}
          icon={Activity}
          variant="default"
        />
        <ReportKpiCard
          label={t('activities:kpis.iaMonth')}
          value={kpis.ia30d}
          icon={Heart}
          variant="info"
        />
        <ReportKpiCard
          label={t('activities:kpis.vaccines7d')}
          value={kpis.vaccines7d}
          icon={Syringe}
          variant="success"
        />
        <ReportKpiCard
          label={t('activities:summary.total')}
          value={kpis.total}
          icon={ListChecks}
          variant="neutral"
        />
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      )}

      {/* Activities Sections */}
      {!isLoading && (
        <>
          {activities.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-16 w-16" />}
              title={t('activities:empty.noActivities')}
              description={t('activities:empty.description')}
            />
          ) : (
            <div className="space-y-6">
              {todayActivities.length > 0 && renderSection(t('activities:groupings.today'), todayActivities)}
              {last7Days.length > 0 && renderSection(t('activities:groupings.last7Days'), last7Days)}
              {older.length > 0 && renderSection(t('activities:groupings.older'), older)}
            </div>
          )}
        </>
      )}

      {/* Floating Action Button - Mobile */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 pointer-events-none">
        <div className="mx-auto max-w-screen-sm px-3 pb-[env(safe-area-inset-bottom)] pointer-events-auto">
          <div className="rounded-full bg-background/95 shadow-lg backdrop-blur border border-border p-2 mb-3">
            <Button
              onClick={() => setShowActivityCreation(true)}
              className="w-full h-11 shadow-none gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('activities:quickActions.register')}
            </Button>
          </div>
        </div>
      </div>

      {/* Activity Creation Flow */}
      {showActivityCreation && (
        <ActivityCreationFlow onClose={() => setShowActivityCreation(false)} />
      )}

      {/* Activity Detail Dialog */}
      <ActivityDetailDialog
        activity={selectedActivity}
        open={!!selectedActivity}
        onClose={() => setSelectedActivity(null)}
      />
    </div>
  );
}
