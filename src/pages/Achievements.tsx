import { PageHeader } from '@/components/ui/page-header';
import { Trophy } from 'lucide-react';
import { AchievementsGallery } from '@/components/achievements/AchievementsGallery';
import { useTranslation } from 'react-i18next';

export default function Achievements() {
  const { t } = useTranslation(['common']);

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden space-y-6">
      <div className="flex items-center gap-2 sm:gap-3 mb-6">
        <div className="p-2 sm:p-3 rounded-full bg-primary/10 flex-shrink-0">
          <Trophy className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">{t('common:achievements.title')}</h1>
          <p className="text-muted-foreground text-sm sm:text-base">{t('common:achievements.subtitle')}</p>
        </div>
      </div>
      
      <AchievementsGallery />
    </div>
  );
}