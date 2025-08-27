import { useState } from "react";
import { Users, Activity, DollarSign, TrendingUp, Plus, Calendar, Settings } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { DataCard } from "@/components/ui/data-card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { EmptyState } from "@/components/ui/empty-state";
import { SubscriptionPlansModal } from "@/components/subscription/SubscriptionPlansModal";
import { PlanLimitAlert } from "@/components/dashboard/PlanLimitAlert";
import { NoCabanaAlert } from "@/components/dashboard/NoCabanaAlert";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [showPlansModal, setShowPlansModal] = useState(false);
  const navigate = useNavigate();
  const { 
    cabana, 
    counts, 
    upcoming, 
    warnings, 
    isLoading, 
    isError, 
    diagnostics,
    refetch 
  } = useDashboardSummary();

  const handleCreateCabana = () => {
    navigate('/settings');
  };

  const handleRegisterActivity = () => {
    navigate('/activities');
  };

  const handleAddAnimal = () => {
    navigate('/animals');
  };

  const stats = [
    {
      title: "Total de Animales",
      value: counts.animalsActive,
      icon: Users,
      loading: isLoading,
      error: isError,
    },
    {
      title: "Actividades (7 días)",
      value: counts.activitiesLast7d,
      icon: Activity,
      loading: isLoading,
      error: isError,
    },
    {
      title: "Corrales",
      value: counts.corrals,
      icon: Settings,
      loading: isLoading,
      error: isError,
    },
    {
      title: "Servicios IA",
      value: counts.servicesTotal,
      icon: TrendingUp,
      loading: isLoading,
      error: isError,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Alert Messages */}
      {warnings.noCabana && (
        <NoCabanaAlert onCreateCabana={handleCreateCabana} />
      )}
      
      {warnings.overAnimalLimit && cabana && (
        <PlanLimitAlert
          type="error"
          currentCount={counts.animalsActive}
          maxCount={cabana.animal_limit}
          planName={cabana.plan}
          onUpgrade={() => setShowPlansModal(true)}
        />
      )}
      
      {warnings.nearAnimalLimit && !warnings.overAnimalLimit && cabana && (
        <PlanLimitAlert
          type="warning"
          currentCount={counts.animalsActive}
          maxCount={cabana.animal_limit}
          planName={cabana.plan}
          onUpgrade={() => setShowPlansModal(true)}
        />
      )}
      
      {/* Page Header - Responsive */}
      <div className="flex flex-col gap-4 sm:hidden">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900 tracking-tight">Tablero</h1>
          <p className="text-sm text-ink-600 mt-1">Panel de control de tu operación ganadera</p>
        </div>
        <PrimaryButton 
          onClick={handleRegisterActivity}
          className="w-full"
          disabled={warnings.noCabana}
        >
          <Plus className="h-4 w-4 mr-2" />
          Registrar Actividad
        </PrimaryButton>
      </div>
      
      <div className="hidden sm:block">
        <PageHeader 
          title="Tablero"
          description="Panel de control de tu operación ganadera"
          actions={
            <PrimaryButton 
              onClick={handleRegisterActivity}
              disabled={warnings.noCabana}
            >
              <Plus className="h-4 w-4 mr-2" />
              Registrar Actividad
            </PrimaryButton>
          }
        />
      </div>
      
      {/* KPI Grid - Responsive */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <KpiCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            loading={stat.loading}
            error={stat.error}
            onRetry={refetch}
          />
        ))}
      </div>

      {/* Content Grid - Responsive */}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-7">
        <DataCard 
          title="Actividades Recientes"
          icon={Activity}
          className="lg:col-span-4"
        >
          {counts.activitiesLast7d === 0 ? (
            <EmptyState
              icon={Activity}
              title="No hay actividades recientes"
              description="Cuando registres actividades aparecerán aquí"
              action={!warnings.noCabana ? {
                label: "Registrar Primera Actividad",
                onClick: handleRegisterActivity
              } : undefined}
            />
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-ink-600">
                {counts.activitiesLast7d} actividades registradas en los últimos 7 días
              </p>
              <PrimaryButton onClick={handleRegisterActivity} className="text-sm px-3 py-1.5">
                Ver todas las actividades
              </PrimaryButton>
            </div>
          )}
        </DataCard>
        
        <DataCard 
          title="Próximas Actividades"
          icon={Calendar}
          className="lg:col-span-3"
        >
          {upcoming.activitiesNext7d.length > 0 ? (
            <div className="space-y-3">
              {upcoming.activitiesNext7d.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3 p-3 rounded-lg bg-ink-50">
                  <div className="h-2 w-2 rounded-full bg-brand-500"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-800 truncate">
                      {activity.type}
                    </p>
                    <p className="text-xs text-ink-600">{activity.date}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-ink-600 mb-4">
                {warnings.noCabana ? "Configura tu cabaña primero:" : "Comienza por:"}
              </div>
              <div className="space-y-3">
                {warnings.noCabana ? (
                  <div 
                    className="flex items-center gap-3 p-3 rounded-lg bg-ink-50 hover:bg-ink-100 transition-colors cursor-pointer"
                    onClick={handleCreateCabana}
                  >
                    <div className="h-2 w-2 rounded-full bg-brand-500"></div>
                    <span className="text-sm font-medium text-ink-800">Configurar cabaña</span>
                  </div>
                ) : (
                  [
                    { label: "Agregar tu primer animal", action: handleAddAnimal },
                    { label: "Registrar una actividad", action: handleRegisterActivity },
                    { label: "Crear un corral", action: () => navigate('/corrales') },
                    { label: "Configurar finanzas", action: () => navigate('/finances') }
                  ].map((item, index) => (
                    <div 
                      key={index} 
                      className="flex items-center gap-3 p-3 rounded-lg bg-ink-50 hover:bg-ink-100 transition-colors cursor-pointer"
                      onClick={item.action}
                    >
                      <div className="h-2 w-2 rounded-full bg-brand-500"></div>
                      <span className="text-sm font-medium text-ink-800">{item.label}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </DataCard>
      </div>

      {/* Development Diagnostics */}
      {process.env.NODE_ENV !== 'production' && diagnostics.length > 0 && (
        <div className="mt-4 p-4 bg-zinc-900 text-zinc-200 rounded-lg text-xs font-mono">
          <h3 className="font-semibold mb-2">🔍 Dashboard Diagnostics</h3>
          <div className="space-y-1">
            {diagnostics.map((d, i) => (
              <div key={i} className="flex justify-between">
                <span>{d.label}:</span>
                <span className={d.error ? 'text-red-400' : 'text-green-400'}>
                  {d.error ? `Error: ${d.error}` : `${d.count} animals`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <SubscriptionPlansModal 
        open={showPlansModal} 
        onOpenChange={setShowPlansModal} 
      />
    </div>
  );
};

export default Dashboard;