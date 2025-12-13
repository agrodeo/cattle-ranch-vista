import { PageHeader } from '@/components/ui/page-header';
import { Trophy } from 'lucide-react';
import { AchievementsGallery } from '@/components/achievements/AchievementsGallery';
import { useTranslation } from 'react-i18next';

export default function Achievements() {
  const { t } = useTranslation(['common']);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6 overflow-x-hidden">
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