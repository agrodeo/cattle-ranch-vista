import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Syringe, Scale, Calendar, ClipboardList, Activity } from "lucide-react";
import { ArtificialInseminationManager } from "@/components/artificial-insemination/ArtificialInseminationManager";
import { VaccinationManager } from "./VaccinationManager";
import { WeighingManager } from "./WeighingManager";
import { GeneralActivitiesManager } from "./GeneralActivitiesManager";
import { ActivitiesCalendar } from "./ActivitiesCalendar";
import { ActivitiesStats } from "./ActivitiesStats";
import { useTranslation } from 'react-i18next';

export function ActivitiesManager() {
  const [activeTab, setActiveTab] = useState("overview");
  const { t } = useTranslation('activities');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('managers.overview.title')}</h2>
          <p className="text-muted-foreground">
            {t('managers.overview.subtitle')}
          </p>
        </div>
      </div>

      {/* Statistics Overview */}
      <ActivitiesStats />

      {/* Activity Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t('managers.overview.summary')}
          </TabsTrigger>
          <TabsTrigger value="insemination" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            {t('managers.overview.insemination')}
          </TabsTrigger>
          <TabsTrigger value="vaccination" className="flex items-center gap-2">
            <Syringe className="h-4 w-4" />
            {t('managers.overview.vaccination')}
          </TabsTrigger>
          <TabsTrigger value="weighing" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            {t('managers.overview.weighing')}
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            {t('managers.overview.general')}
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {t('managers.overview.calendar')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setActiveTab("insemination")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('managers.overview.artificialInsemination')}</CardTitle>
                <Heart className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">IA</div>
                <p className="text-xs text-muted-foreground">
                  {t('managers.overview.massiveServices')}
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setActiveTab("vaccination")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('managers.overview.vaccination')}</CardTitle>
                <Syringe className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">VAC</div>
                <p className="text-xs text-muted-foreground">
                  {t('managers.overview.healthControl')}
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setActiveTab("weighing")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('managers.overview.weighing')}</CardTitle>
                <Scale className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KG</div>
                <p className="text-xs text-muted-foreground">
                  {t('managers.overview.weightControl')}
                </p>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setActiveTab("general")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('managers.overview.generalActivities')}</CardTitle>
                <ClipboardList className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+</div>
                <p className="text-xs text-muted-foreground">
                  {t('managers.overview.otherActivities')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{t('managers.overview.recentActivitiesTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>{t('managers.overview.recentActivitiesPlaceholder')}</p>
                <p>{t('managers.overview.lastInseminations')}</p>
                <p>{t('managers.overview.pendingVaccinations')}</p>
                <p>{t('managers.overview.scheduledWeighings')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insemination">
          <ArtificialInseminationManager />
        </TabsContent>

        <TabsContent value="vaccination">
          <VaccinationManager />
        </TabsContent>

        <TabsContent value="weighing">
          <WeighingManager />
        </TabsContent>

        <TabsContent value="general">
          <GeneralActivitiesManager />
        </TabsContent>

        <TabsContent value="calendar">
          <ActivitiesCalendar />
        </TabsContent>
      </Tabs>
    </div>
  );
}