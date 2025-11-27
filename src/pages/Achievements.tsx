import { PageHeader } from '@/components/ui/page-header';
import { Trophy } from 'lucide-react';
import { AchievementsGallery } from '@/components/achievements/AchievementsGallery';
import { useTranslation } from 'react-i18next';

export default function Achievements() {
  const { t } = useTranslation(['common']);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 rounded-full bg-primary/10">
          <Trophy className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">{t('common:achievements.title')}</h1>
          <p className="text-muted-foreground">{t('common:achievements.subtitle')}</p>
        </div>
      </div>
      
      <AchievementsGallery />
    </div>
  );
}