import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ActivityFormHeaderProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  subtitle?: string;
}

export function ActivityFormHeader({ icon: Icon, iconColor = "text-primary", title, subtitle }: ActivityFormHeaderProps) {
  return (
    <div className="flex items-center gap-3 pb-2">
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10")}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="min-w-0">
        <h2 className="text-lg font-bold text-foreground leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}
