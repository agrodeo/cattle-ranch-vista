import { useEffect } from "react";
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
    <main className="container mx-auto py-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Configuración</h1>
          <p className="text-muted-foreground">
            Personaliza tu experiencia y configura parámetros específicos para tu operación ganadera.
          </p>
        </div>

        <Card>
          <CardContent className="p-0">
            <Tabs defaultValue="benchmarks" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="benchmarks" className="flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Benchmarks
                </TabsTrigger>
                <TabsTrigger value="users" className="flex items-center gap-2" disabled>
                  <Users className="h-4 w-4" />
                  Usuarios
                </TabsTrigger>
                <TabsTrigger value="general" className="flex items-center gap-2" disabled>
                  <SettingsIcon className="h-4 w-4" />
                  General
                </TabsTrigger>
                <TabsTrigger value="billing" className="flex items-center gap-2" disabled>
                  <CreditCard className="h-4 w-4" />
                  Facturación
                </TabsTrigger>
              </TabsList>

              <TabsContent value="benchmarks" className="mt-6 px-6 pb-6">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-xl font-semibold">Benchmarks de Rendimiento</h2>
                    <p className="text-muted-foreground">
                      Configura benchmarks personalizados para evaluar el rendimiento de tu ganado. 
                      Puedes establecer benchmarks específicos por raza o benchmarks generales.
                    </p>
                  </div>
                  <BenchmarkSettings />
                </div>
              </TabsContent>

              <TabsContent value="users" className="mt-6 px-6 pb-6">
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Gestión de Usuarios</h3>
                  <p className="text-muted-foreground">
                    Esta sección estará disponible próximamente.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="general" className="mt-6 px-6 pb-6">
                <div className="text-center py-8">
                  <SettingsIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Configuración General</h3>
                  <p className="text-muted-foreground">
                    Esta sección estará disponible próximamente.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="billing" className="mt-6 px-6 pb-6">
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Facturación y Suscripción</h3>
                  <p className="text-muted-foreground">
                    Esta sección estará disponible próximamente.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};