import { Link } from "react-router-dom";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { enUS, es, ptBR } from "date-fns/locale";
import { Calendar, Check, MapPin, MoreVertical, Tag, Trash2, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCompleteActivityTask, useDeleteActivityTask, type ActivityTask } from "@/hooks/useActivityTasks";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { cn } from "@/lib/utils";

interface ActivityTaskCardProps {
  activity: ActivityTask;
  showAssignee?: boolean;
  compact?: boolean;
}

const priorityStyles = {
  alta: "border-l-destructive bg-destructive/5",
  media: "border-l-warning bg-warning/5",
  baja: "border-l-primary bg-primary/5",
};

const priorityBadges = {
  alta: "bg-destructive/10 text-destructive border-destructive/20",
  media: "bg-warning/10 text-warning-foreground border-warning/20",
  baja: "bg-primary/10 text-primary border-primary/20",
};

const getLocale = (language: string) => {
  if (language.startsWith("pt")) return ptBR;
  if (language.startsWith("en")) return enUS;
  return es;
};

export function ActivityTaskCard({ activity, showAssignee = true, compact = false }: ActivityTaskCardProps) {
  const { t, i18n } = useTranslation("activities");
  const completeActivity = useCompleteActivityTask();
  const deleteActivity = useDeleteActivityTask();
  const { currentUser } = useSupabaseAuth();

  const canModify = ["owner", "manager", "admin"].includes(currentUser?.role || "");
  const canComplete = canModify || activity.assigned_to === currentUser?.id;
  const dueDate = activity.due_date ? new Date(`${activity.due_date}T00:00:00`) : null;
  const isOverdue = !!dueDate && isPast(dueDate) && !isToday(dueDate) && activity.status === "pending";

  const formatDueDate = () => {
    if (!dueDate) return null;
    if (isToday(dueDate)) return t("card.today");
    if (isTomorrow(dueDate)) return t("card.tomorrow");
    return format(dueDate, "d MMM", { locale: getLocale(i18n.language) });
  };

  const handleDelete = () => {
    if (window.confirm(t("card.confirmDelete"))) deleteActivity.mutate(activity.id);
  };

  return (
    <Card className={cn("border-l-4 p-4", priorityStyles[activity.priority], activity.status === "completed" && "opacity-70")}>
      <div className="flex items-start gap-3">
        {canComplete && activity.status === "pending" && (
          <Checkbox
            className="mt-1"
            checked={false}
            disabled={completeActivity.isPending}
            onCheckedChange={() => completeActivity.mutate(activity.id)}
            aria-label={t("card.complete")}
          />
        )}
        {activity.status === "completed" && (
          <div className="mt-1 flex h-4 w-4 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            <Check className="h-3 w-3" />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className={cn("text-sm font-semibold text-foreground", activity.status === "completed" && "line-through")}>{activity.title}</h3>
            <Badge variant="outline" className={cn("shrink-0", priorityBadges[activity.priority])}>{t(`priority.${activity.priority}`)}</Badge>
          </div>

          {!compact && activity.description && <p className="text-sm text-muted-foreground">{activity.description}</p>}

          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {dueDate && (
              <span className={cn("inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1", isOverdue && "text-destructive")}>
                <Calendar className="h-3 w-3" />
                {formatDueDate()}{isOverdue ? ` · ${t("card.overdue")}` : ""}
              </span>
            )}
            {showAssignee && activity.assigned_profile && (
              <span className="inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1">
                <User className="h-3 w-3" />
                {activity.assigned_profile.full_name || activity.assigned_profile.email}
              </span>
            )}
            {activity.animal && (
              <Link to={`/animales/${activity.animal_id}`} className="inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-primary hover:underline">
                <Tag className="h-3 w-3" />
                {activity.animal.id_tag}
              </Link>
            )}
            {activity.corral && (
              <span className="inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1">
                <MapPin className="h-3 w-3" />
                {activity.corral.name}
              </span>
            )}
          </div>
        </div>

        {canModify && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><MoreVertical className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {activity.status === "pending" && (
                <DropdownMenuItem onClick={() => completeActivity.mutate(activity.id)}>
                  <Check className="mr-2 h-4 w-4" /> {t("card.complete")}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" /> {t("card.delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </Card>
  );
}
