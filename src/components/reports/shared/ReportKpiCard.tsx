import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface ReportKpiCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: "default" | "success" | "danger" | "warning" | "info" | "neutral";
  children?: React.ReactNode;
}

const variantStyles = {
  default: {
    bg: "bg-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    valueColor: "text-foreground",
  },
  success: {
    bg: "bg-primary/5",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    valueColor: "text-primary",
  },
  danger: {
    bg: "bg-destructive/5",
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
    valueColor: "text-destructive",
  },
  warning: {
    bg: "bg-amber-500/5",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
    valueColor: "text-amber-600",
  },
  info: {
    bg: "bg-blue-500/5",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
    valueColor: "text-blue-600",
  },
  neutral: {
    bg: "bg-muted/50",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    valueColor: "text-foreground",
  },
};

export function ReportKpiCard({ label, value, subtitle, icon: Icon, variant = "default", children }: ReportKpiCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn("relative overflow-hidden border-0 shadow-sm", styles.bg)}>
      <CardContent className="p-3 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-medium uppercase tracking-wider text-muted-foreground leading-tight">
              {label}
            </p>
            <p className={cn("text-xl sm:text-2xl font-bold tracking-tight", styles.valueColor)}>
              {value}
            </p>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground">{subtitle}</p>
            )}
            {children}
          </div>
          <div className={cn("flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl", styles.iconBg)}>
            <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", styles.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
