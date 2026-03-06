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
    <Card className={cn("relative overflow-hidden border border-border/40 shadow-sm", styles.bg)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-0 flex-1">
            <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-muted-foreground leading-tight">
              {label}
            </p>
            <p className={cn("text-2xl sm:text-3xl font-bold tracking-tight", styles.valueColor)}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground font-medium">{subtitle}</p>
            )}
            {children}
          </div>
          <div className={cn("flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl", styles.iconBg)}>
            <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", styles.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
