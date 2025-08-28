import { useActivityPreferences } from '@/hooks/useActivityPreferences';
import { TabsChips } from './mobile/TabsChips';
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-ink-900">
          Actividades
        </h1>
        <p className="text-sm sm:text-base text-ink-600">
          Gestiona todas las actividades de tu cabaña
        </p>
      </div>

      {/* Tabs Navigation */}
      <TabsChips
        tabs={tabs}
        activeTab={preferences.activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  );
}