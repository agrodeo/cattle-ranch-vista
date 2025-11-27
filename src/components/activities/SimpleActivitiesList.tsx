import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, Plus } from 'lucide-react';
import { ActivityCreationFlow } from '@/components/mobile/flows/ActivityCreationFlow';
import { useAllActivities } from '@/hooks/useAllActivities';
import { ActivityCard } from './ActivityCard';
import { ActivityDetailDialog } from './ActivityDetailDialog';
import type { UnifiedActivity } from '@/hooks/useAllActivities';
import { useTranslation } from 'react-i18next';

export function SimpleActivitiesList() {
  const { t } = useTranslation(['activities']);
  const [showActivityCreation, setShowActivityCreation] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<UnifiedActivity | null>(null);
  const { activities, isLoading } = useAllActivities();

  const groupActivities = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const todayActivities = activities.filter(a => {
      const activityDate = new Date(a.fecha);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate.getTime() === today.getTime();
    });

    const last7Days = activities.filter(a => {
      const activityDate = new Date(a.fecha);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate.getTime() < today.getTime() && activityDate.getTime() >= sevenDaysAgo.getTime();
    });

    const older = activities.filter(a => {
      const activityDate = new Date(a.fecha);
      activityDate.setHours(0, 0, 0, 0);
      return activityDate.getTime() < sevenDaysAgo.getTime();
    });

    return { todayActivities, last7Days, older };
  };

  const { todayActivities, last7Days, older } = groupActivities();

  const renderSection = (title: string, activities: UnifiedActivity[], emptyMessage: string) => {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold text-foreground">{title}</h3>
          <span className="text-sm text-muted-foreground">({activities.length})</span>
        </div>
        
        {activities.length === 0 ? (
          <EmptyState 
            icon={<Calendar className="h-10 w-10" />}
            title={emptyMessage}
            description=""
          />
        ) : (
          <div className="space-y-2">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                onClick={() => setSelectedActivity(activity)}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
          {t('activities:title')}
        </h1>
        <p className="text-base text-muted-foreground">
          {t('activities:subtitle')}
        </p>
      </div>

      {/* Main Action Button - Desktop */}
      <div className="hidden lg:block">
        <Button 
          onClick={() => setShowActivityCreation(true)}
          className="w-full h-12"
          size="lg"
        >
          <Plus className="h-5 w-5 mr-2" />
          {t('activities:quickActions.register')}
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
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
            <div className="space-y-8">
              {todayActivities.length > 0 && renderSection(t('activities:groupings.today'), todayActivities, t('activities:empty.today'))}
              {last7Days.length > 0 && renderSection(t('activities:groupings.last7Days'), last7Days, t('activities:empty.recent'))}
              {older.length > 0 && renderSection(t('activities:groupings.older'), older, t('activities:empty.older'))}
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
              className="w-full h-11 shadow-none"
            >
              <Plus className="h-4 w-4 mr-1" />
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
