import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Activity, 
  Heart, 
  Syringe, 
  Calendar,
  TrendingUp,
  Weight,
  Baby,
  AlertTriangle,
  Plus,
  Stethoscope,
  Users,
  BarChart3
} from 'lucide-react';
import { useActivities } from '@/hooks/useActivities';
import { Accordion } from "@/components/ui/accordion";
import { CompactKpi } from '../mobile/CompactKpi';
import { FloatingActionBar } from '../mobile/FloatingActionBar';
import { ActivityAccordion } from '../mobile/ActivityAccordion';
import { CompactList } from '../mobile/CompactList';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Import components from other tabs
import { ArtificialInseminationManager } from '@/components/artificial-insemination/ArtificialInseminationManager';
import { PregnancyDetectionManager } from '../PregnancyDetectionManager';
import { ServiceManagement } from '@/components/artificial-insemination/ServiceManagement';
import { VaccinationDashboard } from '@/components/vaccination/VaccinationDashboard';
import { WeighingManager } from '../WeighingManager';
import { GeneralActivitiesManager } from '../GeneralActivitiesManager';
import { ImprovedArtificialInseminationDialog } from '@/components/artificial-insemination/ImprovedArtificialInseminationDialog';
import { NewTactoDialog } from '../NewTactoDialog';
import { NewWeighingDialog } from '../NewWeighingDialog';
import { NewGeneralActivityDialog } from '../NewGeneralActivityDialog';
import { NewVaccinationDialog } from '../NewVaccinationDialog';
import { ActivityTypeSelector } from '../ActivityTypeSelector';

interface FilterOptions {
  corrales: string[];
  sexo: 'all' | 'macho' | 'hembra';
  edad: [number, number];
  estado: string[];
}

export function ResumenTab() {
  const { t } = useTranslation('activities');
  const { stats } = useActivities();

  // Empty arrays - all activities will be user-created
  const services: any[] = [];
  const inseminations: any[] = [];
  const pregnancyDetections: any[] = [];
  const detectionHistory: any[] = [];
  const weighings: any[] = [];

  const kpis = [
    {
      title: t('kpis.activities30d'),
      value: stats.monthlyActivities || 0,
      icon: Activity,
      trend: {
        value: '+0%',
        direction: 'up' as const
      }
    },
    {
      title: t('kpis.iaMonth'),
      value: stats.inseminations || 0,
      icon: Heart
    },
    {
      title: t('kpis.vaccines7d'),
      value: 0,
      icon: Syringe
    },
    {
      title: t('kpis.services'),
      value: services.length,
      icon: TrendingUp
    }
  ];

  // Dialog states
  const [showActivityTypeSelector, setShowActivityTypeSelector] = useState(false);
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showIADialog, setShowIADialog] = useState(false);
  const [showTactoDialog, setShowTactoDialog] = useState(false);
  const [showWeighingDialog, setShowWeighingDialog] = useState(false);
  const [showVaccinationDialog, setShowVaccinationDialog] = useState(false);

  const handleRegisterActivity = () => {
    setShowActivityTypeSelector(true);
  };

  const handleActivityTypeSelect = (type: string) => {
    switch (type) {
      case 'general':
        setShowActivityDialog(true);
        break;
      case 'insemination':
        setShowIADialog(true);
        break;
      case 'vaccination':
        setShowVaccinationDialog(true);
        break;
      case 'weighing':
        setShowWeighingDialog(true);
        break;
      case 'pregnancy':
        setShowTactoDialog(true);
        break;
    }
  };

  const handleVaccinate = () => {
    setShowVaccinationDialog(true);
  };

  const handleRegisterService = () => {
    setShowServiceDialog(true);
  };

  const handleRegisterIA = () => {
    setShowIADialog(true);
  };

  const handleScheduleTacto = () => {
    setShowTactoDialog(true);
  };

  const handleRegisterWeighing = () => {
    setShowWeighingDialog(true);
  };

  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>(undefined);

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-6">
      {/* Main Content */}
      <section className="lg:col-span-2 space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {kpis.map((kpi, index) => (
            <CompactKpi key={index} {...kpi} />
          ))}
        </div>

        {/* Quick Actions */}
      <FloatingActionBar 
        onRegisterActivity={handleRegisterActivity}
      />

        {/* Activity Sections as Accordions */}
        <Accordion type="multiple" className="space-y-3">
          <ActivityAccordion
            value="servicios"
            title={t('sections.services.title')}
            summary={t('sections.services.summary')}
            count={services.length}
            primaryAction={{
              label: t('sections.services.action'),
              onClick: handleRegisterService
            }}
          >
            <div className="space-y-3">
              <ServiceManagement 
                onServiceSelect={setSelectedServiceId}
                selectedServiceId={selectedServiceId}
              />
            </div>
          </ActivityAccordion>

          <ActivityAccordion
            value="inseminacion"
            title={t('sections.artificialInsemination.title')}
            summary={t('sections.artificialInsemination.summary')}
            count={inseminations.length}
            primaryAction={{
              label: t('sections.artificialInsemination.action'),
              onClick: handleRegisterIA
            }}
          >
            <div className="space-y-3">
              <ArtificialInseminationManager />
            </div>
          </ActivityAccordion>

          <ActivityAccordion
            value="deteccion-prenez"
            title={t('sections.pregnancyDetection.title')}
            summary={t('sections.pregnancyDetection.summary')}
            count={pregnancyDetections.length}
            primaryAction={{
              label: t('sections.pregnancyDetection.action'),
              onClick: handleScheduleTacto
            }}
          >
            <div className="space-y-3">
              <PregnancyDetectionManager />
            </div>
          </ActivityAccordion>

          <ActivityAccordion
            value="vacunacion"
            title={t('sections.vaccination.title')}
            summary={t('sections.vaccination.summary')}
            count={0}
            primaryAction={{
              label: t('sections.vaccination.action'),
              onClick: handleVaccinate
            }}
           >
             <div className="space-y-3">
               <VaccinationDashboard />
             </div>
           </ActivityAccordion>

          <ActivityAccordion
            value="pesajes"
            title={t('sections.weighing.title')}
            summary={t('sections.weighing.summary')}
            count={weighings.length}
            primaryAction={{
              label: t('sections.weighing.action'),
              onClick: handleRegisterWeighing
            }}
          >
            <div className="space-y-3">
              <WeighingManager />
            </div>
          </ActivityAccordion>

          <ActivityAccordion
            value="manejo"
            title={t('sections.management.title')}
            summary={t('sections.management.summary')}
            count={0}
            primaryAction={{
              label: t('sections.management.action'),
              onClick: handleRegisterActivity
            }}
          >
            <div className="space-y-3">
              <GeneralActivitiesManager />
            </div>
          </ActivityAccordion>

          <ActivityAccordion
            value="calendario"
            title={t('sections.calendar.title')}
            summary={t('sections.calendar.summary')}
            count={0}
          >
            <div className="space-y-3">
              <CompactList items={[
                { id: '1', title: 'Calendario de Actividades', subtitle: 'Vista temporal próximamente', date: 'Hoy', status: 'pending' as const }
              ]} />
            </div>
          </ActivityAccordion>
        </Accordion>
      </section>

      {/* Right Rail - Desktop Only */}
      <aside className="hidden lg:block space-y-4">
        {/* Compact Calendar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-medium text-slate-900 mb-3">{t('sidebar.next7days')}</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900">{t('next7d.today')}</span>
              <Badge variant="outline">3</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900">{t('sidebar.in3Days')}</span>
              <Badge variant="outline">1</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900">+7 días</span>
              <Badge variant="outline">2</Badge>
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-3">
              <Calendar className="h-4 w-4 mr-2" />
              {t('sidebar.viewFullCalendar')}
            </Button>
          </div>
        </div>

        {/* Vaccines Due */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-medium text-slate-900 mb-3">{t('sidebar.upcomingVaccines')}</h3>
          <div className="space-y-3">
            <div className="text-center py-4 text-muted-foreground text-sm">
              No hay vacunas pendientes
            </div>
          </div>
        </div>
      </aside>

      {/* Dialogs */}
      <ActivityTypeSelector
        open={showActivityTypeSelector}
        onOpenChange={setShowActivityTypeSelector}
        onSelectType={handleActivityTypeSelect}
      />

      <ImprovedArtificialInseminationDialog
        open={showServiceDialog || showIADialog}
        onOpenChange={(open) => {
          setShowServiceDialog(open);
          setShowIADialog(open);
        }}
        onSuccess={() => {
          setShowServiceDialog(false);
          setShowIADialog(false);
        }}
      />

      <NewTactoDialog
        open={showTactoDialog}
        onOpenChange={setShowTactoDialog}
        onSuccess={() => setShowTactoDialog(false)}
      />

      <NewWeighingDialog
        open={showWeighingDialog}
        onOpenChange={setShowWeighingDialog}
        onSuccess={() => setShowWeighingDialog(false)}
      />

      <NewGeneralActivityDialog
        open={showActivityDialog}
        onOpenChange={setShowActivityDialog}
        onSuccess={() => setShowActivityDialog(false)}
      />

      <NewVaccinationDialog 
        open={showVaccinationDialog}
        onOpenChange={setShowVaccinationDialog}
        onSuccess={() => setShowVaccinationDialog(false)}
      />
    </div>
  );
}