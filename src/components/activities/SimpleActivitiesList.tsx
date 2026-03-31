import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Plus, Activity, Syringe, Heart, Weight, ListChecks, Stethoscope, Baby, ClipboardList } from 'lucide-react';
import { ActivityCreationFlow } from '@/components/mobile/flows/ActivityCreationFlow';
import { useAllActivities } from '@/hooks/useAllActivities';
import { ActivityCard } from './ActivityCard';
import { ActivityDetailDialog } from './ActivityDetailDialog';
import { ReportKpiCard } from '@/components/reports/shared/ReportKpiCard';
import type { UnifiedActivity } from '@/hooks/useAllActivities';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type FilterType = 'ALL' | 'PESAJE' | 'TACTO' | 'VACUNACION' | 'IA' | 'GENERAL' | 'PARTO';

const filterConfig: { type: FilterType; labelKey: string; icon: any; color: string }[] = [
  { type: 'ALL',        labelKey: 'filters.all',           icon: ListChecks,   color: '' },
  { type: 'PESAJE',     labelKey: 'activityTypes.weighing', icon: Weight,       color: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  { type: 'TACTO',      labelKey: 'activityTypes.tacto',    icon: Stethoscope,  color: 'bg-violet-500/10 text-violet-700 border-violet-200' },
  { type: 'VACUNACION', labelKey: 'activityTypes.vaccination', icon: Syringe,   color: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' },
  { type: 'IA',         labelKey: 'activityTypes.ia',       icon: Heart,        color: 'bg-pink-500/10 text-pink-700 border-pink-200' },
  { type: 'GENERAL',    labelKey: 'activityTypes.general',  icon: ClipboardList, color: 'bg-slate-500/10 text-slate-700 border-slate-200' },
  { type: 'PARTO',      labelKey: 'activityTypes.birth',    icon: Baby,         color: 'bg-amber-500/10 text-amber-700 border-amber-200' },
];

export function SimpleActivitiesList() {
  const { t } = useTranslation(['activities']);
  const [showActivityCreation, setShowActivityCreation] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<UnifiedActivity | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const { activities, isLoading } = useAllActivities();

  // Filtered activities
  const filteredActivities = useMemo(() => {
    if (activeFilter === 'ALL') return activities;
    return activities.filter(a => a.tipo === activeFilter);
  }, [activities, activeFilter]);

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

  const groupActivities = (items: UnifiedActivity[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const todayActivities = items.filter(a => {
      const d = new Date(a.fecha);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    });

    const last7Days = items.filter(a => {
      const d = new Date(a.fecha);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < today.getTime() && d.getTime() >= sevenDaysAgo.getTime();
    });

    const older = items.filter(a => {
      const d = new Date(a.fecha);
      d.setHours(0, 0, 0, 0);
      return d.getTime() < sevenDaysAgo.getTime();
    });

    return { todayActivities, last7Days, older };
  };

  const { todayActivities, last7Days, older } = groupActivities(filteredActivities);

  const renderSection = (title: string, items: UnifiedActivity[]) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 px-1">
        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</h3>
        <div className="flex-1 h-px bg-border/50" />
        <span className="text-xs font-semibold text-muted-foreground tabular-nums">{items.length}</span>
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

  const activeFilterLabel = activeFilter === 'ALL'
    ? ''
    : t(`activities:activityTypes.${activeFilter === 'VACUNACION' ? 'vaccination' : activeFilter === 'PESAJE' ? 'weighing' : activeFilter === 'TACTO' ? 'tacto' : activeFilter === 'IA' ? 'ia' : activeFilter === 'PARTO' ? 'birth' : 'general'}`);

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
            {t('activities:title')}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground/70 mt-0.5">
            {t('activities:subtitle')}
          </p>
        </div>
        {/* Desktop register button */}
        <div className="hidden lg:block">
          <Button
            onClick={() => setShowActivityCreation(true)}
            size="lg"
            className="gap-2 shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5"
          >
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

      {/* Filter Tabs */}
      <div className="overflow-x-auto -mx-3 px-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}>
        <div className="flex items-center gap-2 min-w-max pb-1 [&::-webkit-scrollbar]:hidden">
          {filterConfig.map(({ type, labelKey, icon: Icon, color }) => {
            const isActive = activeFilter === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setActiveFilter(type)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold border transition-all duration-200",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : type === 'ALL'
                      ? "bg-background text-muted-foreground border-border hover:bg-muted"
                      : cn("border-transparent hover:border-current/20", color || "bg-muted text-muted-foreground")
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t(`activities:${labelKey}`)}
                {isActive && activeFilter !== 'ALL' && (
                  <span className="ml-0.5 bg-primary-foreground/20 rounded-full px-1.5 py-0 text-[10px]">
                    {filteredActivities.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl border border-border/50 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-14 rounded-md" />
                    <Skeleton className="h-5 w-14 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Activities Sections */}
      {!isLoading && (
        <>
          {filteredActivities.length === 0 ? (
            <EmptyState
              icon={<Calendar className="h-16 w-16" />}
              title={
                activeFilter === 'ALL'
                  ? t('activities:empty.noActivities')
                  : t('activities:filters.noResults', { type: activeFilterLabel })
              }
              description={
                activeFilter === 'ALL'
                  ? t('activities:empty.description')
                  : t('activities:filters.noResultsDesc')
              }
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
