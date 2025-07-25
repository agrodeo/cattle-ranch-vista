import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Syringe, Scale, Activity, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSimpleAuth } from "@/hooks/useSimpleAuth";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface AnimalActivity {
  id: string;
  date: string;
  type: string;
  description: string;
  result?: string;
  notes?: string;
}

interface AnimalActivitiesHistoryProps {
  animalId: string;
  animalName?: string;
}

export function AnimalActivitiesHistory({ animalId, animalName }: AnimalActivitiesHistoryProps) {
  const [activities, setActivities] = useState<AnimalActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { currentUser } = useSimpleAuth();

  useEffect(() => {
    fetchActivities();
  }, [animalId]);

  const fetchActivities = async () => {
    try {
      setIsLoading(true);
      
      // Fetch AI records
      const { data: aiData } = await supabase
        .from("artificial_inseminations")
        .select("*")
        .eq("female_id", animalId)
        .order("insemination_date", { ascending: false });

      const activities: AnimalActivity[] = [];

      // Add AI activities
      if (aiData) {
        aiData.forEach(record => {
          activities.push({
            id: record.id,
            date: record.insemination_date,
            type: "insemination",
            description: `Inseminación Artificial - ${record.bull_name}`,
            result: record.is_pregnant === null ? "Pendiente" : 
                   record.is_pregnant ? "Preñada" : "No preñada",
            notes: record.notes || undefined
          });
        });
      }

      // Sort all activities by date
      activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setActivities(activities);
    } catch (error) {
      console.error("Error fetching animal activities:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "insemination":
        return <Heart className="h-4 w-4 text-red-500" />;
      case "vaccination":
        return <Syringe className="h-4 w-4 text-blue-500" />;
      case "weighing":
        return <Scale className="h-4 w-4 text-green-500" />;
      default:
        return <Activity className="h-4 w-4 text-purple-500" />;
    }
  };

  const getActivityBadge = (type: string, result?: string) => {
    if (type === "insemination" && result) {
      if (result === "Pendiente") return <Badge variant="secondary">Pendiente</Badge>;
      if (result === "Preñada") return <Badge className="bg-green-500">Preñada</Badge>;
      if (result === "No preñada") return <Badge variant="destructive">No preñada</Badge>;
    }
    return null;
  };

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">Cargando actividades...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Historial de Actividades
          {animalName && <span className="text-muted-foreground">- {animalName}</span>}
        </CardTitle>
        <Link to="/activities">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Gestionar Actividades
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="mb-2">No hay actividades registradas para este animal</p>
            <Link to="/activities">
              <Button variant="outline" className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4" />
                Registrar primera actividad
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  {getActivityIcon(activity.type)}
                  <div>
                    <div className="font-medium text-sm">{activity.description}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(activity.date), "dd/MM/yyyy")}
                    </div>
                    {activity.notes && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {activity.notes.length > 50 
                          ? `${activity.notes.substring(0, 50)}...` 
                          : activity.notes}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getActivityBadge(activity.type, activity.result)}
                </div>
              </div>
            ))}
            
            {activities.length > 5 && (
              <div className="text-center pt-3">
                <Link to="/activities">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    Ver todas las actividades ({activities.length})
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}