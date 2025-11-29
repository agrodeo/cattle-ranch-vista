import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, Activity } from "lucide-react";
import { useActivities } from "@/hooks/useActivities";
import { supabase } from "@/integrations/supabase/client";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useTranslation } from 'react-i18next';

export function GeneralActivitiesManager() {
  const [generalActivitiesCount, setGeneralActivitiesCount] = useState(0);
  const [monthlyGeneralActivitiesCount, setMonthlyGeneralActivitiesCount] = useState(0);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [selectedActivityType, setSelectedActivityType] = useState<string>("");
  
  const { stats } = useActivities();
  const { currentUser } = useSupabaseAuth();
  const { t } = useTranslation('activities');

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
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('managers.general.activitiesRegistered')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{generalActivitiesCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('managers.general.historicalTotal')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('managers.general.thisMonth')}</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{monthlyGeneralActivitiesCount}</div>
            <p className="text-xs text-muted-foreground">
              {t('managers.general.newActivities')}
            </p>
          </CardContent>
        </Card>
      </div>


      <Card>
        <CardHeader>
          <CardTitle>{t('managers.general.recentActivities')}</CardTitle>
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
                        t('managers.general.generalActivity')
                      }
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(activity.fecha).toLocaleDateString('es-ES')} - {activity.payload?.animales_ids?.length || 0} {t('managers.general.animals')}
                    </p>
                    {activity.notas && (
                      <p className="text-xs text-muted-foreground mt-1">{activity.notas}</p>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {activity.payload?.responsable || t('managers.general.noResponsible')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h4 className="text-lg font-medium mb-2">{t('managers.general.noActivitiesRegistered')}</h4>
              <p className="mb-4">
                {t('managers.general.startRegisteringActivities')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}