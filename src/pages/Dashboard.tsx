import React, { useState } from "react";
import { Activity, Fence, TrendingUp, Plus, Calendar, Settings, Shield, Syringe, ArrowRight, ChevronRight, ChevronDown, Icon, LucideProps, Baby, Heart, ClipboardList, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

import { cowHead } from "@lucide/lab";

const CowHeadIcon = React.forwardRef<SVGSVGElement, LucideProps>((props, ref) => <Icon iconNode={cowHead} ref={ref} {...props} />);
CowHeadIcon.displayName = 'CowHeadIcon';
import { VaccinationPrompt } from "@/components/dashboard/VaccinationPrompt";
import { useVaccinationRequirements } from "@/hooks/useVaccinationRequirements";
import { ReportKpiCard } from "@/components/reports/shared/ReportKpiCard";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { SubscriptionPlansModal } from "@/components/subscription/SubscriptionPlansModal";
import { PlanLimitAlert } from "@/components/dashboard/PlanLimitAlert";
import { NoCabanaAlert } from "@/components/dashboard/NoCabanaAlert";
import { RecentActivityItem } from "@/components/dashboard/RecentActivityItem";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useAchievementTriggers } from "@/hooks/useAchievementTriggers";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateActivityDialog } from "@/components/activities/CreateActivityDialog";
import { ActivityTaskCard } from "@/components/activities/ActivityTaskCard";
import { useActivityTasks, useMyActivityTasks } from "@/hooks/useActivityTasks";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { isPast, isToday } from "date-fns";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const { t } = useTranslation(['dashboard', 'common', 'animals', 'corrals', 'finance', 'activities']);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const navigate = useNavigate();
  const { currentUser } = useSupabaseAuth();
  const { data: myTasks, isLoading: myTasksLoading } = useMyActivityTasks();
  const { data: pendingTasks } = useActivityTasks("pending");
  const { data: completedTasks } = useActivityTasks("completed");
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

  useAchievementTriggers();

  const handleCreateCabana = () => navigate('/settings');
  const handleRegisterActivity = () => navigate('/activities');
  const handleAddAnimal = () => navigate('/animals');
  const canCreateTasks = ["owner", "manager", "admin"].includes(currentUser?.role || "");
  const taskDueDate = (date: string) => new Date(`${date}T00:00:00`);
  const overdueTaskCount = (pendingTasks || []).filter((task) => task.due_date && isPast(taskDueDate(task.due_date)) && !isToday(taskDueDate(task.due_date))).length;
  const pendingTaskCount = (pendingTasks || []).length;
  const myTaskCount = myTasks?.assignedToMe?.length || 0;
  const completedTodayCount = (completedTasks || []).filter((task) => task.completed_at && new Date(task.completed_at).toDateString() === new Date().toDateString()).length;

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
      <div className="space-y-6">
        {/* Alerts */}
        {warnings.noCabana && <NoCabanaAlert onCreateCabana={handleCreateCabana} />}
        {warnings.overAnimalLimit && cabana && (
          <PlanLimitAlert type="error" currentCount={counts.animalsActive} maxCount={cabana.animal_limit} planName={cabana.plan} onUpgrade={() => setShowPlansModal(true)} />
        )}
        {warnings.nearAnimalLimit && !warnings.overAnimalLimit && cabana && (
          <PlanLimitAlert type="warning" currentCount={counts.animalsActive} maxCount={cabana.animal_limit} planName={cabana.plan} onUpgrade={() => setShowPlansModal(true)} />
        )}

        {/* Header */}
        <div className="hidden lg:flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
              {t('activities:dashboard.title')}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {t('activities:dashboard.subtitle')}
            </p>
          </div>
          <div>
            {canCreateTasks && !warnings.noCabana ? <CreateActivityDialog /> : (
              <Button onClick={handleRegisterActivity} size="lg" className="gap-2 shadow-sm" disabled={warnings.noCabana}>
                <Plus className="h-4 w-4" />
                {t('dashboard:actions.registerActivity')}
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 lg:hidden">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-foreground">{t('activities:dashboard.title')}</h1>
            <p className="truncate text-sm text-muted-foreground">{t('activities:dashboard.subtitle')}</p>
          </div>
        </div>

        {/* Mobile compact tasks summary */}
        {!warnings.noCabana && (
          <button
            type="button"
            onClick={() => navigate('/activities')}
            className="lg:hidden flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {t('activities:dashboard.myTasks')}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {myTaskCount} {t('activities:dashboard.pending')}
                  {overdueTaskCount > 0 && ` · ${overdueTaskCount} ${t('activities:dashboard.overdue')}`}
                </p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        )}

        {/* Activity Tasks Hub - Desktop only */}
        {!warnings.noCabana && (
          <section className="hidden lg:block space-y-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Card><CardContent className="flex items-center gap-3 p-4"><ClipboardList className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{pendingTaskCount}</p><p className="text-xs text-muted-foreground">{t('activities:dashboard.pending')}</p></div></CardContent></Card>
              <Card><CardContent className="flex items-center gap-3 p-4"><AlertTriangle className={overdueTaskCount ? "h-5 w-5 text-destructive" : "h-5 w-5 text-muted-foreground"} /><div><p className={overdueTaskCount ? "text-2xl font-bold text-destructive" : "text-2xl font-bold"}>{overdueTaskCount}</p><p className="text-xs text-muted-foreground">{t('activities:dashboard.overdue')}</p></div></CardContent></Card>
              <Card><CardContent className="flex items-center gap-3 p-4"><Clock className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{myTaskCount}</p><p className="text-xs text-muted-foreground">{t('activities:dashboard.myTasks')}</p></div></CardContent></Card>
              <Card><CardContent className="flex items-center gap-3 p-4"><CheckCircle2 className="h-5 w-5 text-primary" /><div><p className="text-2xl font-bold">{completedTodayCount}</p><p className="text-xs text-muted-foreground">{t('activities:dashboard.completedToday')}</p></div></CardContent></Card>
            </div>

            <Tabs defaultValue="mine" className="w-full">
              <TabsList className="grid h-auto w-full grid-cols-3">
                <TabsTrigger value="mine" className="gap-2">{t('activities:tabs.mine')}{myTaskCount > 0 && <Badge variant="secondary">{myTaskCount}</Badge>}</TabsTrigger>
                <TabsTrigger value="all" className="gap-2">{t('activities:tabs.all')}{pendingTaskCount > 0 && <Badge variant="secondary">{pendingTaskCount}</Badge>}</TabsTrigger>
                <TabsTrigger value="created">{t('activities:tabs.created')}</TabsTrigger>
              </TabsList>
              <TabsContent value="mine" className="space-y-3 pt-2">
                {myTasksLoading ? <Skeleton className="h-20 w-full" /> : myTasks?.assignedToMe?.length ? myTasks.assignedToMe.map((task) => <ActivityTaskCard key={task.id} activity={task} showAssignee={false} />) : <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">{t('activities:dashboard.allCaughtUp')}</CardContent></Card>}
              </TabsContent>
              <TabsContent value="all" className="space-y-3 pt-2">
                {pendingTasks?.length ? pendingTasks.map((task) => <ActivityTaskCard key={task.id} activity={task} />) : <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">{t('activities:dashboard.noActivities')}</CardContent></Card>}
              </TabsContent>
              <TabsContent value="created" className="space-y-3 pt-2">
                {myTasks?.createdByMe?.length ? myTasks.createdByMe.map((task) => <ActivityTaskCard key={task.id} activity={task} />) : <Card><CardContent className="p-6 text-center text-sm text-muted-foreground">{t('activities:dashboard.noCreated')}</CardContent></Card>}
              </TabsContent>
            </Tabs>

            <div className="space-y-3">
              <Button variant="ghost" className="w-full justify-between" onClick={() => setShowCompletedTasks((value) => !value)}>
                {t('activities:dashboard.completed')} ({completedTasks?.length || 0})
                <ChevronDown className={cn("h-4 w-4 transition-transform", showCompletedTasks && "rotate-180")} />
              </Button>
              {showCompletedTasks && <div className="space-y-3">{(completedTasks || []).slice(0, 20).map((task) => <ActivityTaskCard key={task.id} activity={task} compact />)}</div>}
            </div>
          </section>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <ReportKpiCard
            label={t('dashboard:kpis.totalAnimals')}
            value={counts.animalsActive}
            icon={CowHeadIcon}
            variant="default"
          />
          <ReportKpiCard
            label={t('dashboard:kpis.activitiesLast30Days')}
            value={counts.activitiesLast30d}
            icon={Activity}
            variant="info"
          />
          <ReportKpiCard
            label={t('corrals:title')}
            value={counts.corrals}
            icon={Fence}
            variant="neutral"
          />
          <ReportKpiCard
            label={t('dashboard:kpis.pregnancyRate')}
            value={`${counts.pregnancyPercentage}%`}
            subtitle={`${counts.pregnantFemales}/${counts.reproductiveFemales} ${t('animals:sex.female')}`}
            icon={TrendingUp}
            variant={counts.pregnancyPercentage >= 60 ? "success" : counts.pregnancyPercentage >= 40 ? "warning" : "danger"}
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        )}

        {!isLoading && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Main Content */}
            <section className="lg:col-span-2 space-y-6">
              {/* Recent Activities */}
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('dashboard:sections.recentActivities')}
                    </h3>
                    <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {recentActivities.length}
                    </span>
                  </div>
                  {!warnings.noCabana && recentActivities.length > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground hover:text-foreground" onClick={() => navigate('/activities')}>
                      {t('dashboard:actions.viewAll')}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>

                {recentActivities.length === 0 ? (
                  <EmptyState
                    icon={<Activity className="h-16 w-16" />}
                    title={t('dashboard:empty.noRecentActivities')}
                    description={t('dashboard:empty.startTracking')}
                    action={!warnings.noCabana ? {
                      label: t('dashboard:actions.registerActivity'),
                      onClick: handleRegisterActivity
                    } : undefined}
                  />
                ) : (
                  <div className="space-y-2">
                    {recentActivities.map((activity) => (
                      <RecentActivityItem key={activity.id} activity={activity} />
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Right Sidebar */}
            <aside className="space-y-6">
              {/* Vaccination Setup Prompt */}
              {vaccinationRequirements.length === 0 && <VaccinationPrompt />}

              {/* Warnings */}
              {warnings.alerts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t('dashboard:sections.warnings')}
                    </h3>
                    <span className="text-xs font-medium text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                      {warnings.alerts.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {warnings.alerts.map((alert) => {
                      const bgColor = alert.severity === 'high'
                        ? 'bg-destructive/5' : alert.severity === 'medium'
                        ? 'bg-amber-500/5' : 'bg-blue-500/5';
                      const hoverBg = alert.severity === 'high'
                        ? 'hover:bg-destructive/10' : alert.severity === 'medium'
                        ? 'hover:bg-amber-500/10' : 'hover:bg-blue-500/10';
                      const iconBg = alert.severity === 'high'
                        ? 'bg-destructive/10' : alert.severity === 'medium'
                        ? 'bg-amber-500/10' : 'bg-blue-500/10';
                      const iconColor = alert.severity === 'high'
                        ? 'text-destructive' : alert.severity === 'medium'
                        ? 'text-amber-600' : 'text-blue-600';
                      const countBg = alert.severity === 'high'
                        ? 'bg-destructive/10 text-destructive' : 'bg-amber-500/10 text-amber-700';

                      const alertIcon = alert.type === 'consanguinity' ? Shield
                        : (alert.type === 'birth_upcoming' || alert.type === 'birth_overdue') ? Baby
                        : alert.type === 'reproductive' ? Heart
                        : Syringe;
                      const AlertIcon = alertIcon;

                      const hasAnimals = alert.animals && alert.animals.length > 0;

                      return (
                        <Collapsible key={alert.id}>
                          <CollapsibleTrigger className="w-full text-left">
                            <div className={`flex items-center gap-3 p-4 rounded-xl border-0 shadow-sm cursor-pointer transition-colors ${bgColor} ${hoverBg}`}>
                              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
                                <AlertIcon className={`h-5 w-5 ${iconColor}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground">
                                  {alert.titleKey ? t(alert.titleKey) : alert.title}
                                </p>
                                {alert.vaccine_name && (
                                  <p className="text-xs text-muted-foreground mt-0.5">{alert.vaccine_name}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {alert.affected_count && (
                                  <span className={`text-xs font-medium px-2 py-1 rounded-lg ${countBg}`}>
                                    {alert.affected_count}
                                  </span>
                                )}
                                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className={`px-4 pb-3 pt-1 -mt-2 rounded-b-xl ${bgColor}`}>
                              {hasAnimals ? (
                                <ul className="space-y-1.5 pt-1">
                                  {alert.animals!.map((a) => (
                                    <li
                                      key={a.animal_id}
                                      className="flex items-center justify-between text-xs bg-background/60 rounded-lg px-3 py-2 cursor-pointer hover:bg-background transition-colors"
                                      onClick={() => navigate(`/animals/${a.animal_id}`)}
                                    >
                                      <span className="font-medium text-foreground">
                                        {a.animal_name || a.animal_tag || a.animal_id.slice(0, 8)}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {a.days_overdue != null
                                          ? `${a.days_overdue}d ${t('dashboard:warnings.overdue', { defaultValue: 'vencida' })}`
                                          : a.days_until != null
                                          ? `${a.days_until}d`
                                          : ''}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-xs text-muted-foreground pt-1">
                                  {alert.descriptionKey ? String(t(alert.descriptionKey, alert.descriptionParams || {})) : alert.description}
                                </p>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Upcoming Activities */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('dashboard:sections.upcomingActivities')}
                  </h3>
                  <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {upcoming.activitiesNext7d.length}
                  </span>
                </div>

                {upcoming.activitiesNext7d.length > 0 ? (
                  <div className="space-y-2">
                    {upcoming.activitiesNext7d.map((activity) => (
                      <div key={activity.id} className="flex items-center gap-3 p-4 rounded-xl border-0 shadow-sm bg-muted/50">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <Calendar className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {t(`dashboard:activityTypes.${activity.type}`, { defaultValue: activity.type })}
                          </p>
                          <p className="text-xs text-muted-foreground">{activity.date}</p>
                        </div>
                        <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-lg shrink-0">
                          {t('dashboard:states.pending')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {warnings.noCabana ? (
                      <div className="rounded-xl border-0 shadow-sm bg-primary/5 p-5">
                        <p className="text-sm text-muted-foreground mb-4">
                          {t('dashboard:noCabana.description')}
                        </p>
                        <button
                          className="flex items-center gap-3 w-full p-3 rounded-xl bg-primary/10 hover:bg-primary/15 transition-colors"
                          onClick={handleCreateCabana}
                        >
                          <div className="h-2 w-2 rounded-full bg-primary" />
                          <span className="text-sm font-medium text-foreground">{t('dashboard:actions.setupCabana')}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 ml-auto" />
                        </button>
                      </div>
                    ) : counts.animalsActive === 0 || counts.activitiesLast30d === 0 || counts.corrals === 0 ? (
                      <div className="rounded-xl border-0 shadow-sm bg-muted/50 p-5">
                        <p className="text-sm text-muted-foreground mb-4">
                          {t('dashboard:empty.startTracking')}
                        </p>
                        <div className="space-y-2">
                          {[
                            counts.animalsActive === 0 && { label: t('dashboard:actions.addFirstAnimal'), action: handleAddAnimal },
                            counts.activitiesLast30d === 0 && { label: t('dashboard:actions.registerActivity'), action: handleRegisterActivity },
                            counts.corrals === 0 && { label: t('corrals:actions.create'), action: () => navigate('/corrales') },
                          ].filter(Boolean).map((item: any, index) => (
                            <button
                              key={index}
                              className="flex items-center gap-3 w-full p-3 rounded-xl bg-background hover:bg-primary/5 transition-colors"
                              onClick={item.action}
                            >
                              <div className="h-2 w-2 rounded-full bg-primary" />
                              <span className="text-sm font-medium text-foreground">{item.label}</span>
                              <ChevronRight className="h-4 w-4 text-muted-foreground/50 ml-auto" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border-0 shadow-sm bg-muted/50 p-8 text-center">
                        <p className="text-sm text-muted-foreground">{t('dashboard:empty.noUpcomingActivities')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}


        {/* Dev Diagnostics */}
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

        <SubscriptionPlansModal open={showPlansModal} onOpenChange={setShowPlansModal} />
      </div>
    </div>
  );
};

export default Dashboard;
