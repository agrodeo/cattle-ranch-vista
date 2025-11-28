import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { Bell, Calendar, AlertTriangle, Syringe, TrendingUp, TrendingDown } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { es, enUS, pt } from "date-fns/locale";

interface NotificationsSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationsSheet({ isOpen, onClose }: NotificationsSheetProps) {
  const { t, i18n } = useTranslation('common');
  const navigate = useNavigate();
  const { warnings, upcoming } = useDashboardSummary();

  const dateLocale = i18n.language === 'es' ? es : i18n.language === 'pt' ? pt : enUS;

  const handleActivityClick = (activityId: string) => {
    navigate('/actividades');
    onClose();
  };

  const handleWarningClick = (warningType: string) => {
    if (warningType === 'consanguinity') {
      navigate('/corrales');
    } else if (warningType === 'vaccination') {
      navigate('/actividades');
    }
    onClose();
  };

  const handleLimitClick = () => {
    navigate('/planes');
    onClose();
  };

  const totalNotifications = 
    warnings.alerts.length + 
    upcoming.activitiesNext7d.length + 
    (warnings.nearAnimalLimit ? 1 : 0) + 
    (warnings.overAnimalLimit ? 1 : 0);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{t('notifications.notifications')}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Plan Limit Warnings */}
          {warnings.overAnimalLimit && (
            <div 
              onClick={handleLimitClick}
              className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 cursor-pointer hover:bg-destructive/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                <TrendingDown className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-destructive">
                    {t('common:notifications.animalLimitExceeded')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('common:notifications.upgradeRequired')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {warnings.nearAnimalLimit && !warnings.overAnimalLimit && (
            <div 
              onClick={handleLimitClick}
              className="p-4 rounded-lg bg-warning/10 border border-warning/20 cursor-pointer hover:bg-warning/20 transition-colors"
            >
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-warning mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-warning">
                    {t('common:notifications.nearAnimalLimit')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('common:notifications.considerUpgrade')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* System Alerts */}
          {warnings.alerts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                {t('common:notifications.systemAlerts')}
              </h3>
              {warnings.alerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => handleWarningClick(alert.type)}
                  className="p-4 rounded-lg bg-card border border-border cursor-pointer hover:bg-accent transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Syringe className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {alert.description}
                      </p>
                      {alert.affected_count && (
                        <Badge variant="secondary" className="mt-2">
                          {alert.affected_count} {t('common:notifications.affected')}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming Activities */}
          {upcoming.activitiesNext7d.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('common:notifications.upcomingActivities')}
              </h3>
              {upcoming.activitiesNext7d.map((activity) => (
                <div
                  key={activity.id}
                  onClick={() => handleActivityClick(activity.id)}
                  className="p-4 rounded-lg bg-card border border-border cursor-pointer hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{activity.type}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {activity.description}
                      </p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {format(new Date(activity.date), 'dd MMM', { locale: dateLocale })}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {totalNotifications === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">
                {t('common:notifications.noNotifications')}
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
