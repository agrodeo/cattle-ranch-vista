import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportChartCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconVariant?: "success" | "danger" | "info" | "neutral";
  legend?: { label: string; color: string }[];
  children: React.ReactNode;
  className?: string;
}

const iconVariants = {
  success: { bg: "bg-primary/10", color: "text-primary" },
  danger: { bg: "bg-destructive/10", color: "text-destructive" },
  info: { bg: "bg-blue-500/10", color: "text-blue-600" },
  neutral: { bg: "bg-muted", color: "text-muted-foreground" },
};

export function ReportChartCard({ title, subtitle, icon: Icon, iconVariant = "neutral", legend, children, className }: ReportChartCardProps) {
  const iv = iconVariants[iconVariant];

  return (
    <Card className={cn("border-0 shadow-sm", className)}>
      <CardContent className="p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            {Icon && (
              <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iv.bg)}>
                <Icon className={cn("h-4 w-4", iv.color)} />
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-foreground">{title}</h3>
              {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
          </div>
          {legend && (
            <div className="flex items-center gap-3 flex-wrap">
              {legend.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}
