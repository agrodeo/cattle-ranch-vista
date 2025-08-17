import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, Activity } from "lucide-react";
import { NewGeneralActivityDialog } from "./NewGeneralActivityDialog";
import { useToast } from "@/hooks/use-toast";

export function GeneralActivitiesManager() {
  const { toast } = useToast();

  const handleActivityTypeClick = (activityName: string) => {
    toast({
      title: "Próximamente",
      description: `El registro de ${activityName} estará disponible pronto`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold">Actividades Generales</h3>
          <p className="text-muted-foreground">
            Registro de otras actividades de manejo ganadero
          </p>
        </div>
        <NewGeneralActivityDialog>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Actividad
          </Button>
        </NewGeneralActivityDialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Actividades Registradas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Total histórico
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Actividades nuevas
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tipos de Actividades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { name: "Destete", description: "Separación de crías", icon: "🐄" },
              { name: "Marcación", description: "Identificación con hierro", icon: "🔥" },
              { name: "Castración", description: "Procedimiento quirúrgico", icon: "✂️" },
              { name: "Descorne", description: "Remoción de cuernos", icon: "🦏" },
              { name: "Traslado", description: "Movimiento entre corrales", icon: "📦" },
              { name: "Tratamiento", description: "Cuidados veterinarios", icon: "💊" },
              { name: "Revisión", description: "Control general de salud", icon: "🔍" },
              { name: "Apareamiento", description: "Servicio natural", icon: "💕" },
              { name: "Parto", description: "Registro de nacimientos", icon: "👶" },
            ].map((activity, index) => (
              <div
                key={index}
                className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => handleActivityTypeClick(activity.name)}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{activity.icon}</span>
                  <div>
                    <h4 className="font-medium">{activity.name}</h4>
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Actividades Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <h4 className="text-lg font-medium mb-2">Sistema de Actividades Generales</h4>
            <p className="mb-4">
              Próximamente podrás registrar todo tipo de actividades de manejo ganadero
            </p>
            <div className="text-sm space-y-2">
              <p>• Registro detallado por actividad</p>
              <p>• Historial completo por animal</p>
              <p>• Programación de actividades</p>
              <p>• Reportes de manejo</p>
              <p>• Integración con calendario</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}