import { useActivityPreferences } from '@/hooks/useActivityPreferences';
import { StickyTabs } from './mobile/StickyTabs';
import { ResumenTab } from './tabs/ResumenTab';
import { ReproductivasTab } from './tabs/ReproductivasTab';
import { SanitariasTab } from './tabs/SanitariasTab';
import { ProductivasTab } from './tabs/ProductivasTab';
import { ManejoTab } from './tabs/ManejoTab';
import { CalendarioTab } from './tabs/CalendarioTab';

const tabs = [
  { id: 'resumen', label: 'Resumen', shortLabel: 'Inicio' },
  { id: 'reproductivas', label: 'Reproductivas', shortLabel: 'Reprod.' },
  { id: 'sanitarias', label: 'Sanitarias', shortLabel: 'Sanit.' },
  { id: 'productivas', label: 'Productivas', shortLabel: 'Prod.' },
  { id: 'manejo', label: 'Manejo', shortLabel: 'Manejo' },
  { id: 'calendario', label: 'Calendario', shortLabel: 'Cal.' }
];

export function ActivitiesTabs() {
  const { preferences, setActiveTab } = useActivityPreferences();

  const renderTabContent = () => {
    switch (preferences.activeTab) {
      case 'resumen':
        return <ResumenTab />;
      case 'reproductivas':
        return <ReproductivasTab />;
      case 'sanitarias':
        return <SanitariasTab />;
      case 'productivas':
        return <ProductivasTab />;
      case 'manejo':
        return <ManejoTab />;
      case 'calendario':
        return <CalendarioTab />;
      default:
        return <ResumenTab />;
    }
  };

  return (
    <div className="space-y-3">
      {/* Header - Only on Desktop */}
      <div className="hidden lg:block space-y-2 mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-slate-900">
          Actividades
        </h1>
        <p className="text-base text-slate-600">
          Gestiona todas las actividades de tu cabaña
        </p>
      </div>

      {/* Sticky Tabs Navigation */}
      <StickyTabs
        tabs={tabs}
        activeTab={preferences.activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      <div>
        {renderTabContent()}
      </div>
    </div>
  );
}