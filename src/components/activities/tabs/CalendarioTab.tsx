import { ActivitiesCalendar } from '../ActivitiesCalendar';
import { useActivityPreferences } from '@/hooks/useActivityPreferences';
import { cn } from '@/lib/utils';

export function CalendarioTab() {
  const { preferences } = useActivityPreferences();
  const isCompact = preferences.density === 'compact';

  return (
    <div className={cn('space-y-6', isCompact && 'space-y-4')}>
      <ActivitiesCalendar />
    </div>
  );
}