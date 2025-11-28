import { useState } from "react";
import { Users, Activity, Fence, TrendingUp, Plus, Calendar, Settings, AlertTriangle, Shield, Syringe } from "lucide-react";
import { VaccinationPrompt } from "@/components/dashboard/VaccinationPrompt";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";
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
import { RecentActivityItem } from "@/components/dashboard/RecentActivityItem";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Dashboard = () => {
  const { t } = useTranslation(['dashboard', 'common', 'animals', 'corrals', 'finance']);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const navigate = useNavigate();
  const { requirements: vaccinationRequirements } = useVaccinationRequirements();
  const { 
    cabana, 
    counts, 
    recentActivities,
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
      title: t('dashboard:kpis.totalAnimals'),
      value: counts.animalsActive,
      icon: Users,
    },
    {
      title: t('dashboard:kpis.activitiesLast30Days'),
      value: counts.activitiesLast30d,
      icon: Activity,
    },
    {
      title: t('corrals:title'),
      value: counts.corrals,
      icon: Fence,
    },
    {
      title: t('dashboard:kpis.pregnancyRate'),
      value: `${counts.pregnancyPercentage}%`,
      subtitle: `${counts.pregnantFemales}/${counts.reproductiveFemales} ${t('animals:sex.female')}`,
      icon: TrendingUp,
      colored: true,
      percentage: counts.pregnancyPercentage,
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
          title={t('dashboard:title')}
          subtitle={t('dashboard:subtitle')}
          action={
            <Button 
              onClick={handleRegisterActivity}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={warnings.noCabana}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard:actions.registerActivity')}
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
                {t('dashboard:actions.registerActivity')}
              </Button>
            </StickyActionBar>

            {/* Recent Activities */}
            <SectionCard
              title={t('dashboard:sections.recentActivities')}
              subtitle={t('common:common.operations')}
              count={recentActivities.length}
              primaryAction={!warnings.noCabana ? {
                label: t('dashboard:actions.viewAll'),
                onClick: () => navigate('/activities')
              } : undefined}
            >
              {recentActivities.length === 0 ? (
                <EmptyState
                  icon={<Activity className="h-6 w-6" />}
                  title={t('dashboard:empty.noRecentActivities')}
                  description={t('dashboard:empty.startTracking')}
                  action={!warnings.noCabana ? {
                    label: t('dashboard:actions.registerActivity'),
                    onClick: handleRegisterActivity
                  } : undefined}
                />
              ) : (
                <div className="space-y-3">
                  {recentActivities.map((activity) => (
                    <RecentActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </SectionCard>
          </section>

          {/* Right Sidebar */}
          <aside className="space-y-4">
            {/* Vaccination Setup Prompt */}
            {vaccinationRequirements.length === 0 && (
              <VaccinationPrompt />
            )}

            {/* Warnings Card */}
            {warnings.alerts.length > 0 && (
              <SectionCard
                title={t('dashboard:sections.warnings')}
                subtitle={t('common:common.requiresAttention')}
                count={warnings.alerts.length}
              >
                <div className="space-y-3">
                  {warnings.alerts.map((alert) => (
                    <div 
                      key={alert.id} 
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        alert.severity === 'high' 
                          ? 'bg-red-50 border-red-200' 
                          : alert.severity === 'medium'
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-blue-50 border-blue-200'
                      }`}
                    >
                      <div className={`flex-shrink-0 ${
                        alert.severity === 'high' 
                          ? 'text-red-600' 
                          : alert.severity === 'medium'
                          ? 'text-amber-600'
                          : 'text-blue-600'
                      }`}>
                        {alert.type === 'consanguinity' ? (
                          <Shield className="h-5 w-5" />
                        ) : (
                          <Syringe className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900">
                          {alert.title}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {alert.description}
                        </p>
                      </div>
                      {alert.affected_count && (
                        <BadgePill 
                          variant={alert.severity === 'high' ? 'danger' : 'warning'}
                          className="ml-2"
                        >
                          {alert.affected_count}
                        </BadgePill>
                      )}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            <SectionCard
              title={t('dashboard:sections.upcomingActivities')}
              subtitle={t('common:common.scheduledNext')}
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
                        {t('dashboard:states.pending')}
                      </BadgePill>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-slate-600 mb-4">
                    {warnings.noCabana ? t('dashboard:noCabana.description') : t('dashboard:empty.startTracking')}
                  </p>
                  <div className="space-y-2">
                    {warnings.noCabana ? (
                      <div 
                        className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
                        onClick={handleCreateCabana}
                      >
                        <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                        <span className="text-sm font-medium text-slate-900">{t('dashboard:actions.setupCabana')}</span>
                      </div>
                    ) : (
                      [
                        { label: t('dashboard:actions.addFirstAnimal'), action: handleAddAnimal },
                        { label: t('dashboard:actions.registerActivity'), action: handleRegisterActivity },
                        { label: t('corrals:actions.create'), action: () => navigate('/corrales') },
                        { label: t('finance:title'), action: () => navigate('/finances') }
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