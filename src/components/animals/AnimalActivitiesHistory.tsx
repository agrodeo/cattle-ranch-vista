import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Heart, Syringe, Scale, Activity, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { useAnimalActivities } from "@/hooks/useAnimalActivities";
import { useTranslation } from "react-i18next";


interface AnimalActivitiesHistoryProps {
  animalId: string;
  animalName?: string;
}

export function AnimalActivitiesHistory({ animalId, animalName }: AnimalActivitiesHistoryProps) {
  const { activities, isLoading } = useAnimalActivities(animalId);
  const { t } = useTranslation(['animals', 'common']);

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

  const getActivityBadge = (type: string, details: Record<string, string>) => {
    if (type === "insemination" && details.estado) {
      if (details.estado === "Pendiente") return <Badge variant="secondary">{t('animals:profile.summary.statusPending')}</Badge>;
      if (details.estado === "Preñada") return <Badge className="bg-primary">{t('animals:profile.summary.statusPregnant')}</Badge>;
      if (details.estado === "No preñada") return <Badge variant="destructive">{t('animals:profile.summary.statusNotPregnant')}</Badge>;
    }
    return null;
  };

  if (isLoading) {
    return <div className="text-center py-4 text-muted-foreground">{t('animals:profile.summary.loadingActivities')}</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Activity className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="truncate">{t('animals:profile.summary.activitiesHistory')}</span>
          {animalName && <span className="text-muted-foreground hidden sm:inline">- {animalName}</span>}
        </CardTitle>
        <Link to="/activities" className="shrink-0">
          <Button variant="outline" size="sm" className="w-full sm:w-auto h-8 text-xs">
            <ExternalLink className="h-3 w-3 mr-1" />
            {t('animals:profile.summary.manage')}
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="mb-4">{t('animals:profile.summary.noActivities')}</p>
            <Link to="/activities" className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto text-xs sm:text-sm">
                <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                <span className="hidden sm:inline">{t('animals:profile.summary.registerFirstActivity')}</span>
                <span className="sm:hidden">{t('animals:profile.summary.register')}</span>
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
                  {getActivityBadge(activity.type, activity.details)}
                </div>
              </div>
            ))}
            
            {activities.length > 5 && (
              <div className="text-center pt-3">
                <Link to="/activities">
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    {t('animals:profile.summary.viewAllActivities')} ({activities.length})
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