import { useState } from "react";
import { Bell } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { NotificationsSheet } from "./NotificationsSheet";

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { warnings, upcoming } = useDashboardSummary();

  // Calculate total notification count
  const notificationCount = 
    warnings.alerts.length + 
    upcoming.activitiesNext7d.length + 
    (warnings.nearAnimalLimit ? 1 : 0) + 
    (warnings.overAnimalLimit ? 1 : 0);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-primary hover:text-primary/80 transition-colors"
        aria-label="Notificaciones"
      >
        <Bell className="h-5 w-5" />
        {notificationCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground animate-pulse">
            {notificationCount > 9 ? '9+' : notificationCount}
          </span>
        )}
      </button>

      <NotificationsSheet 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
      />
    </>
  );
}
