import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Heart, Syringe, Scale, Calendar, ClipboardList, Activity, BarChart3, Stethoscope } from "lucide-react";
import { ArtificialInseminationManager } from "@/components/artificial-insemination/ArtificialInseminationManager";
import { VaccinationManager } from "@/components/activities/VaccinationManager";
import { WeighingManager } from "@/components/activities/WeighingManager";
import { GeneralActivitiesManager } from "@/components/activities/GeneralActivitiesManager";
import { ActivitiesCalendar } from "@/components/activities/ActivitiesCalendar";
import { ActivitiesStats } from "@/components/activities/ActivitiesStats";
import { PregnancyDetectionManager } from "@/components/activities/PregnancyDetectionManager";

const Activities = () => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Actividades</h1>
          <p className="text-muted-foreground">
            Registra, gestiona y monitorea todas las actividades de manejo ganadero
          </p>
        </div>
      </div>

      {/* Statistics Overview */}
      <ActivitiesStats />

      {/* Activity Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Resumen
          </TabsTrigger>
          <TabsTrigger value="insemination" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Inseminación
          </TabsTrigger>
          <TabsTrigger value="pregnancy" className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4" />
            Tacto
          </TabsTrigger>
          <TabsTrigger value="vaccination" className="flex items-center gap-2">
            <Syringe className="h-4 w-4" />
            Vacunación
          </TabsTrigger>
          <TabsTrigger value="weighing" className="flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Pesaje
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Generales
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Calendario
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Access Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover-scale"
              onClick={() => setActiveTab("insemination")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inseminación Artificial</CardTitle>
                <Heart className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">IA</div>
                <p className="text-xs text-muted-foreground">
                  Registro masivo de servicios reproductivos
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover-scale"
              onClick={() => setActiveTab("vaccination")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vacunación</CardTitle>
                <Syringe className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">VAC</div>
                <p className="text-xs text-muted-foreground">
                  Control y programas sanitarios
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover-scale"
              onClick={() => setActiveTab("weighing")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pesaje</CardTitle>
                <Scale className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KG</div>
                <p className="text-xs text-muted-foreground">
                  Control de peso y rendimiento
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover-scale"
              onClick={() => setActiveTab("pregnancy")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Detección de Preñez</CardTitle>
                <Stethoscope className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">TACTO</div>
                <p className="text-xs text-muted-foreground">
                  Tacto rectal y seguimiento
                </p>
              </CardContent>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-md transition-all duration-200 hover-scale"
              onClick={() => setActiveTab("general")}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Actividades Generales</CardTitle>
                <ClipboardList className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+</div>
                <p className="text-xs text-muted-foreground">
                  Destete, marcación, tratamientos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activities Summary */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Actividades Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Heart className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Inseminaciones del día</span>
                    </div>
                    <span className="text-sm font-medium">Ver todas</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Syringe className="h-4 w-4 text-blue-500" />
                      <span className="text-sm">Vacunaciones pendientes</span>
                    </div>
                    <span className="text-sm font-medium">Ver todas</span>
                  </div>
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Scale className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Pesajes programados</span>
                    </div>
                    <span className="text-sm font-medium">Ver todas</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Calendario de Actividades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Hoy</span>
                    <span className="text-sm font-medium">0 actividades</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Esta semana</span>
                    <span className="text-sm font-medium">0 programadas</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Este mes</span>
                    <span className="text-sm font-medium">0 planificadas</span>
                  </div>
                  <div className="pt-2">
                    <button 
                      onClick={() => setActiveTab("calendar")}
                      className="w-full text-sm text-primary hover:underline"
                    >
                      Ver calendario completo
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activity Types Quick Reference */}
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Actividades Disponibles</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Reproductivas</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">IA, tacto, gestación</p>
                </div>
                
                <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Syringe className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Sanitarias</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Vacunas, tratamientos</p>
                </div>
                
                <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Scale className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Productivas</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Pesajes, evaluaciones</p>
                </div>
                
                <div className="p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Manejo</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Destete, marcación, etc.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insemination">
          <ArtificialInseminationManager />
        </TabsContent>

        <TabsContent value="pregnancy">
          <PregnancyDetectionManager />
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
};

export default Activities;