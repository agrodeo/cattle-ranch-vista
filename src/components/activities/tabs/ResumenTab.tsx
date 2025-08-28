import { useState } from 'react';
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

interface FilterOptions {
  corrales: string[];
  sexo: 'all' | 'macho' | 'hembra';
  edad: [number, number];
  estado: string[];
}

export function ResumenTab() {
  const { stats } = useActivities();

  // Mock data - replace with real data hooks
  const services = [
    { id: '1', title: 'Servicio Natural #301', subtitle: 'Toro ABC-123 → Vaca DEF-456', date: 'Hace 2 días', location: 'Corral A', status: 'completed' as const },
    { id: '2', title: 'Servicio Natural #302', subtitle: 'Toro ABC-123 → Vaca GHI-789', date: 'Hace 1 día', location: 'Corral A', status: 'completed' as const },
  ];

  const inseminations = [
    { id: '1', title: 'IA Pajuela Premium', subtitle: 'Vaca JKL-012 - Angus Select', date: 'Hoy', location: 'Manga IA', status: 'pending' as const, priority: 'medium' as const },
  ];

  const pregnancyDetections = [
    { id: '1', title: 'Tacto Reproductivo', subtitle: '8 vacas programadas', date: 'En 3 días', location: 'Manga Principal', status: 'pending' as const, animalCount: 8 },
  ];

  const detectionHistory = [
    { id: '1', title: 'Detección Ecográfica', subtitle: '5 preñeces confirmadas', date: 'Hace 1 semana', user: 'Dr. Martínez', location: 'Corral B', status: 'completed' as const },
  ];

  const weighings = [
    { id: '1', title: 'Pesaje Mensual', subtitle: 'Terneros destete', date: 'Hace 3 días', user: 'Juan López', location: 'Manga Principal', animalCount: 15, status: 'completed' as const },
  ];

  const kpis = [
    {
      title: 'Act. 30d',
      value: stats.monthlyActivities || 0,
      icon: Activity,
      trend: {
        value: '+12%',
        direction: 'up' as const
      }
    },
    {
      title: 'IA (mes)',
      value: stats.inseminations || 1,
      icon: Heart
    },
    {
      title: 'Vacunas 7d',
      value: 12,
      icon: Syringe
    },
    {
      title: 'Servicios',
      value: services.length,
      icon: TrendingUp
    }
  ];

  // Dialog states
  const [showActivityDialog, setShowActivityDialog] = useState(false);
  const [showServiceDialog, setShowServiceDialog] = useState(false);
  const [showIADialog, setShowIADialog] = useState(false);
  const [showTactoDialog, setShowTactoDialog] = useState(false);
  const [showWeighingDialog, setShowWeighingDialog] = useState(false);
  const [showVaccinationDialog, setShowVaccinationDialog] = useState(false);

  const handleRegisterActivity = () => {
    setShowActivityDialog(true);
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
            title="Servicios"
            summary="Gestión de servicios naturales"
            count={services.length}
            primaryAction={{
              label: "Gestionar Servicios",
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
            title="Inseminación Artificial"
            summary="Programación y registro de IA"
            count={inseminations.length}
            primaryAction={{
              label: "Registrar IA",
              onClick: handleRegisterIA
            }}
          >
            <div className="space-y-3">
              <ArtificialInseminationManager />
            </div>
          </ActivityAccordion>

          <ActivityAccordion
            value="deteccion-prenez"
            title="Detección de Preñez"
            summary="Tactos y confirmaciones"
            count={pregnancyDetections.length}
            primaryAction={{
              label: "Programar Tacto",
              onClick: handleScheduleTacto
            }}
          >
            <div className="space-y-3">
              <PregnancyDetectionManager />
            </div>
          </ActivityAccordion>

          <ActivityAccordion
            value="vacunacion"
            title="Vacunación y Sanidad"
            summary="Control sanitario y vacunas"
            count={12}
            primaryAction={{
              label: "Nueva Vacunación",
              onClick: handleVaccinate
            }}
           >
             <div className="space-y-3">
               <VaccinationDashboard />
             </div>
           </ActivityAccordion>

          <ActivityAccordion
            value="pesajes"
            title="Gestión de Pesajes"
            summary="Control productivo y pesos"
            count={weighings.length}
            primaryAction={{
              label: "Registrar Pesaje",
              onClick: handleRegisterWeighing
            }}
          >
            <div className="space-y-3">
              <WeighingManager />
            </div>
          </ActivityAccordion>

          <ActivityAccordion
            value="manejo"
            title="Manejo General"
            summary="Actividades generales y movimientos"
            count={8}
            primaryAction={{
              label: "Nueva Actividad",
              onClick: handleRegisterActivity
            }}
          >
            <div className="space-y-3">
              <GeneralActivitiesManager />
            </div>
          </ActivityAccordion>

          <ActivityAccordion
            value="calendario"
            title="Calendario de Actividades"
            summary="Vista temporal de actividades"
            count={15}
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
          <h3 className="font-medium text-slate-900 mb-3">Próximos 7 días</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900">Hoy</span>
              <Badge variant="outline">3</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900">+3 días</span>
              <Badge variant="outline">1</Badge>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-900">+7 días</span>
              <Badge variant="outline">2</Badge>
            </div>
            <Button variant="ghost" size="sm" className="w-full mt-3">
              <Calendar className="h-4 w-4 mr-2" />
              Ver calendario completo
            </Button>
          </div>
        </div>

        {/* Vaccines Due */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="font-medium text-slate-900 mb-3">Vacunas Próximas</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg border border-red-200">
              <div>
                <p className="text-sm font-medium text-red-900">Antiaftosa</p>
                <p className="text-xs text-red-600">Vence hoy</p>
              </div>
              <Badge className="bg-red-100 text-red-800 text-xs">
                15 animales
              </Badge>
            </div>
            <div className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200">
              <div>
                <p className="text-sm font-medium text-amber-900">Brucelosis</p>
                <p className="text-xs text-amber-600">En 3 días</p>
              </div>
              <Badge className="bg-amber-100 text-amber-800 text-xs">
                8 animales
              </Badge>
            </div>
          </div>
        </div>
      </aside>

      {/* Dialogs */}
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

      {showActivityDialog && (
        <NewGeneralActivityDialog onSuccess={() => setShowActivityDialog(false)}>
          <></>
        </NewGeneralActivityDialog>
      )}

      <NewVaccinationDialog 
        open={showVaccinationDialog}
        onOpenChange={setShowVaccinationDialog}
        onSuccess={() => setShowVaccinationDialog(false)}
      />
    </div>
  );
}