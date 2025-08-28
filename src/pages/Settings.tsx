import { useEffect } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BenchmarkSettings } from "@/components/settings/BenchmarkSettings";
import { Settings as SettingsIcon, Target, Users, CreditCard } from "lucide-react";

export const SettingsPage = () => {
  useEffect(() => {
    document.title = "Configuración - AgroDeo";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', 'Configurar benchmarks personalizados, gestionar usuarios y ajustar preferencias del sistema de gestión ganadera');
    }
  }, []);

  return (
    <div className="mx-auto w-full max-w-screen-sm px-3 sm:px-4 lg:max-w-screen-2xl lg:px-6 pb-24 lg:pb-0 overflow-x-hidden">
      <div className="space-y-3">
        <PageHeader 
          title="Configuración"
          subtitle="Personaliza tu experiencia y configura parámetros específicos para tu operación ganadera"
        />

        <SectionCard
          title="Configuraciones del Sistema"
          subtitle="Gestiona las opciones y preferencias"
        >
          <Tabs defaultValue="benchmarks" className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-10">
              <TabsTrigger value="benchmarks" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
                <Target className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Benchmarks</span>
                <span className="sm:hidden">Config.</span>
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2" disabled>
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                Usuarios
              </TabsTrigger>
              <TabsTrigger value="general" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2" disabled>
                <SettingsIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2" disabled>
                <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Facturación</span>
                <span className="sm:hidden">Plan</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="benchmarks" className="mt-6">
              <SectionCard
                title="Benchmarks de Rendimiento"
                subtitle="Configura benchmarks personalizados para evaluar el rendimiento de tu ganado"
              >
                <BenchmarkSettings />
              </SectionCard>
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <SectionCard
                title="Gestión de Usuarios"
                subtitle="Administra usuarios y permisos"
              >
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Gestión de Usuarios</h3>
                  <p className="text-slate-600">
                    Esta sección estará disponible próximamente.
                  </p>
                </div>
              </SectionCard>
            </TabsContent>

            <TabsContent value="general" className="mt-6">
              <SectionCard
                title="Configuración General"
                subtitle="Ajustes generales del sistema"
              >
                <div className="text-center py-8">
                  <SettingsIcon className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Configuración General</h3>
                  <p className="text-slate-600">
                    Esta sección estará disponible próximamente.
                  </p>
                </div>
              </SectionCard>
            </TabsContent>

            <TabsContent value="billing" className="mt-6">
              <SectionCard
                title="Facturación y Suscripción"
                subtitle="Gestiona tu plan y facturación"
              >
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-slate-400 mb-4" />
                  <h3 className="text-lg font-medium mb-2">Facturación y Suscripción</h3>
                  <p className="text-slate-600">
                    Esta sección estará disponible próximamente.
                  </p>
                </div>
              </SectionCard>
            </TabsContent>
          </Tabs>
        </SectionCard>
      </div>
    </div>
  );
};