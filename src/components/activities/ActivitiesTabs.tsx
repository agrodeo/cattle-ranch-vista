import { useTranslation } from 'react-i18next';
import { ResumenTab } from './tabs/ResumenTab';

export function ActivitiesTabs() {
  const { t } = useTranslation('activities');

  return (
    <div className="space-y-3">
      {/* Header - Only on Desktop */}
      <div className="hidden lg:block space-y-2 mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
          {t('title')}
        </h1>
        <p className="text-base text-slate-600">
          {t('description')}
        </p>
      </div>

      {/* Unified Content */}
      <div className="pb-24">
        <ResumenTab />
      </div>
    </div>
  );
}