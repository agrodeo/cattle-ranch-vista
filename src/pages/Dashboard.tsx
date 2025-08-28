import { useState } from "react";
import { Users, Activity, DollarSign, TrendingUp, Plus, Calendar, Settings } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { MetricCard } from "@/components/ui/metric-card";
import { SectionCard } from "@/components/ui/section-card";
import { EmptyState } from "@/components/ui/empty-state";
import { StickyActionBar } from "@/components/ui/sticky-action-bar";
import { BadgePill } from "@/components/ui/badge-pill";
import { Button } from "@/components/ui/button";
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
      title: "Total Animales",
      value: counts.animalsActive,
      icon: Users,
      trend: { value: "+5%", direction: "up" as const }
    },
    {
      title: "Act. 30d",
      value: counts.activitiesLast7d,
      icon: Activity,
      trend: { value: "+12%", direction: "up" as const }
    },
    {
      title: "Ingresos mes",
      value: "$125k",
      icon: DollarSign,
      trend: { value: "+8%", direction: "up" as const }
    },
    {
      title: "Servicios",
      value: counts.servicesTotal,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
      <div className="space-y-3">
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

        {/* Page Header */}
        <PageHeader 
          title="Tablero"
          subtitle="Panel de control de tu operación ganadera"
          action={
            <Button 
              onClick={handleRegisterActivity}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={warnings.noCabana}
            >
              <Plus className="h-4 w-4 mr-2" />
              Registrar Actividad
            </Button>
          }
        />

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3 lg:gap-6">
          {/* Main Content */}
          <section className="lg:col-span-2 space-y-4">
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {stats.map((stat, index) => (
                <MetricCard
                  key={index}
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                  trend={stat.trend}
                />
              ))}
            </div>

            {/* Sticky Action Bar for Mobile */}
            <StickyActionBar>
              <Button 
                onClick={handleRegisterActivity}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={warnings.noCabana}
              >
                <Plus className="h-4 w-4 mr-1" />
                Registrar Actividad
              </Button>
            </StickyActionBar>

            {/* Recent Activities */}
            <SectionCard
              title="Actividades Recientes"
              subtitle="Últimos registros de la operación"
              count={counts.activitiesLast7d}
              primaryAction={!warnings.noCabana ? {
                label: "Ver Todas",
                onClick: () => navigate('/activities')
              } : undefined}
            >
              {counts.activitiesLast7d === 0 ? (
                <EmptyState
                  icon={<Activity className="h-12 w-12" />}
                  title="No hay actividades recientes"
                  description="Cuando registres actividades aparecerán aquí"
                  action={!warnings.noCabana ? {
                    label: "Registrar Primera Actividad",
                    onClick: handleRegisterActivity
                  } : undefined}
                />
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600">
                    {counts.activitiesLast7d} actividades registradas en los últimos 7 días
                  </p>
                </div>
              )}
            </SectionCard>
          </section>

          {/* Right Sidebar */}
          <aside className="space-y-4">
            <SectionCard
              title="Próximas Actividades"
              subtitle="Programadas para los próximos días"
              count={upcoming.activitiesNext7d.length}
            >
              {upcoming.activitiesNext7d.length > 0 ? (
                <div className="space-y-3">
                  {upcoming.activitiesNext7d.map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {activity.type}
                        </p>
                        <p className="text-xs text-slate-500">{activity.date}</p>
                      </div>
                      <BadgePill variant="neutral" className="ml-2">
                        Pendiente
                      </BadgePill>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 mb-4">
                    {warnings.noCabana ? "Configura tu cabaña primero:" : "Comienza por:"}
                  </p>
                  <div className="space-y-2">
                    {warnings.noCabana ? (
                      <div 
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={handleCreateCabana}
                      >
                        <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                        <span className="text-sm font-medium text-slate-900">Configurar cabaña</span>
                      </div>
                    ) : (
                      [
                        { label: "Agregar primer animal", action: handleAddAnimal },
                        { label: "Registrar actividad", action: handleRegisterActivity },
                        { label: "Crear corral", action: () => navigate('/corrales') },
                        { label: "Configurar finanzas", action: () => navigate('/finances') }
                      ].map((item, index) => (
                        <div 
                          key={index} 
                          className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                          onClick={item.action}
                        >
                          <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                          <span className="text-sm font-medium text-slate-900">{item.label}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </SectionCard>
          </aside>
        </div>

        {/* Development Diagnostics */}
        {process.env.NODE_ENV !== 'production' && diagnostics.some(d => d.error) && (
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
    </div>
  );
};

export default Dashboard;