import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, Plus, Activity } from "lucide-react";
import { NewGeneralActivityDialog } from "./NewGeneralActivityDialog";
import { useActivities } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";

export function GeneralActivitiesManager() {
  const [generalActivitiesCount, setGeneralActivitiesCount] = useState(0);
  const [monthlyGeneralActivitiesCount, setMonthlyGeneralActivitiesCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [selectedActivityType, setSelectedActivityType] = useState<string>("");
  
  const { stats } = useActivities();
  const { currentUser } = useSupabaseAuth();

  useEffect(() => {
    fetchGeneralActivitiesStats();
    fetchRecentActivities();
  }, [currentUser]);

  const fetchGeneralActivitiesStats = async () => {
    if (!currentUser?.cabañaId) return;

    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const { data: events } = await supabase
        .from("eventos")
        .select("tipo, fecha")
        .eq("cabaña_id", currentUser.cabañaId)
        .eq("tipo", "GENERAL");

      const total = events?.length || 0;
      const monthly = events?.filter(e => e.fecha?.startsWith(currentMonth)).length || 0;

      setGeneralActivitiesCount(total);
      setMonthlyGeneralActivitiesCount(monthly);
    } catch (error) {
      console.error("Error fetching general activities stats:", error);
    }
  };

  const fetchRecentActivities = async () => {
    if (!currentUser?.cabañaId) return;

    try {
      const { data: events } = await supabase
        .from("eventos")
        .select("*")
        .eq("cabaña_id", currentUser.cabañaId)
        .eq("tipo", "GENERAL")
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentActivities(events || []);
    } catch (error) {
      console.error("Error fetching recent activities:", error);
    }
  };

  const handleActivityTypeClick = (activityValue: string) => {
    setSelectedActivityType(activityValue);
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
        <NewGeneralActivityDialog 
          preselectedType={selectedActivityType} 
          onClose={() => setSelectedActivityType("")}
          onSuccess={fetchGeneralActivitiesStats}
        >
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
            <div className="text-2xl font-bold">{generalActivitiesCount}</div>
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
            <div className="text-2xl font-bold">{monthlyGeneralActivitiesCount}</div>
            <p className="text-xs text-muted-foreground">
              Actividades nuevas
            </p>
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader>
          <CardTitle>Actividades Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivities.length > 0 ? (
            <div className="space-y-3">
              {recentActivities.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {activity.payload?.tipo_actividad ? 
                        activity.payload.tipo_actividad.charAt(0).toUpperCase() + activity.payload.tipo_actividad.slice(1) : 
                        'Actividad General'
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(activity.fecha).toLocaleDateString('es-ES')} - {activity.payload?.animales_ids?.length || 0} animal(es)
                    </p>
                    {activity.notas && (
                      <p className="text-xs text-muted-foreground mt-1">{activity.notas}</p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {activity.payload?.responsable || 'Sin responsable'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h4 className="text-lg font-medium mb-2">No hay actividades registradas</h4>
              <p className="mb-4">
                Comienza registrando actividades de manejo ganadero haciendo clic en "Nueva Actividad" o en cualquier tipo de actividad específica.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}