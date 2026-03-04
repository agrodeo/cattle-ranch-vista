import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  actions?: ReactNode[];
  className?: string;
}

export function PageHeader({ title, subtitle, action, actions, className }: PageHeaderProps) {
  const actionElements = actions || (action ? [action] : []);

  return (
    <div className={cn("hidden lg:block space-y-1 mb-8", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="text-base text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {actionElements.length > 0 && (
          <div className="flex items-center gap-2 ml-4">
            {actionElements.map((el, i) => (
              <div key={i}>{el}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
